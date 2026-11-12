import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { loadCommissionRows } from '../../../../../utils/b2bCommissionsQuery'
import { readB2bFlowConfig } from '../../../../../utils/b2bCommissionPlan'
import { requireAdminOperator } from '../../../../../utils/adminOperator'
import { parseAmountToCents } from '../../../../../utils/commission'
import { AMOUNT_INPUT_MAXLENGTH } from '../../../../../../app/utils/commissionTiers'
import { REASON_MIN, REASON_MAX, CANCEL_CASE_LABELS } from '../../../../../../app/utils/b2bCommissionRules'

const bodySchema = z.object({
  case: z.enum(['never_started', 'legal_withdrawal', 'partner_input_error', 'dispute_for_pro', 'commercial_gesture']),
  reason: z.string().trim().min(REASON_MIN).max(REASON_MAX),
  partner_share_kept: z.string().trim().max(AMOUNT_INPUT_MAXLENGTH).optional(),
  operator: z.string().max(60).optional(),
})

// Phase 05.23 (D-10) — annulation manuelle motivée d'une commission. Rien n'est supprimé ; aucun remboursement automatique.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const idParsed = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  const id = idParsed.data

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Requête invalide.' })
  const body = parsed.data

  // Avant tout audit : un opérateur inconnu n'écrit rien.
  const operator = requireAdminOperator(useRuntimeConfig(event) as any, body.operator)
  const kept = body.partner_share_kept ? parseAmountToCents(body.partner_share_kept) : 0
  if (kept == null) throw createError({ statusCode: 422, statusMessage: 'Part partenaire conservée invalide.' })

  const supabase = serverSupabaseServiceRole(event) as any
  const flow = readB2bFlowConfig(useRuntimeConfig(event) as any)
  const row = (await loadCommissionRows(supabase, flow, { engagementId: id }))[0]
  if (!row) {
    // Un devis seulement déposé (ou un statut antérieur) existe mais ne s'annule pas ici.
    const { data: exists } = await supabase.from('b2b_engagements').select('id').eq('id', id).eq('type', 'lot_amendment').maybeSingle()
    if (exists) throw createError({ statusCode: 409, statusMessage: 'Annulation impossible depuis ce statut.' })
    throw createError({ statusCode: 404, statusMessage: 'Engagement introuvable.' })
  }
  if (!['contested', 'quote_confirmed'].includes(row.engagement_status)) {
    throw createError({ statusCode: 409, statusMessage: 'Annulation impossible depuis ce statut.' })
  }
  if (kept > row.partner_share_cents) throw createError({ statusCode: 422, statusMessage: 'Part partenaire conservée supérieure à la part prévue.' })

  const s = row.state
  const refund = Math.max(0, s.paid_cents - s.refunded_cents)
  const partnerToRecover = Math.max(0, s.partner_paid_cents - kept)
  const warning = partnerToRecover > 0
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  // 1. Audit BLOQUANT avant toute écriture (pattern D-07 de 05.21).
  const { error: auditError } = await supabase.from('audit_logs').insert({
    actor_id: (user as any).id, action: 'b2b_commission_cancelled', target_table: 'b2b_engagements', target_id: id,
    metadata: {
      case: body.case, reason: body.reason, from_status: row.engagement_status, refund_due_cents: refund,
      partner_paid_cents: s.partner_paid_cents, partner_share_kept_cents: kept, partner_to_recover_cents: partnerToRecover,
      warning_partner_already_paid: warning, operator,
    },
  })
  if (auditError) throw createError({ statusCode: 500, statusMessage: 'Traçabilité impossible, annulation abandonnée.' })

  // 2. Passage à l'état annulé.
  const { data: moved } = await supabase
    .from('b2b_engagements')
    .update({ status: 'commission_cancelled', cancelled_at: now, cancel_case: body.case, cancel_reason: body.reason, partner_share_kept_cents: kept })
    .eq('id', id).eq('status', row.engagement_status).select('id')
  if (!moved || moved.length === 0) throw createError({ statusCode: 409, statusMessage: 'L\'engagement a été modifié entre-temps.' })

  // 3. Le remboursement à traiter est consigné ; il n'est jamais effectué automatiquement.
  await supabase.from('b2b_commission_movements').insert({
    engagement_id: id, type: 'annulation', amount_cents: refund, occurred_on: today,
    actor_id: (user as any).id, operator,
    note: `${CANCEL_CASE_LABELS[body.case]} — ${body.reason}`.slice(0, 500),
  })

  // 4. Un dépôt encore ouvert est refusé.
  await supabase
    .from('b2b_quote_submissions')
    .update({ status: 'rejected', decided_at: now, decided_by: 'admin', arbitration_note: 'Commission annulée par BÂTI-AXE.' })
    .eq('engagement_id', id).in('status', ['pending', 'contested'])

  return { status: 'commission_cancelled', refund_due_cents: refund, partner_to_recover_cents: partnerToRecover, warning_partner_already_paid: warning }
})
