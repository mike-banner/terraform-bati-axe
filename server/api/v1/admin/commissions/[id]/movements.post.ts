import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { loadCommissionRows } from '../../../../../utils/b2bCommissionsQuery'
import { readB2bFlowConfig } from '../../../../../utils/b2bCommissionPlan'
import { requireAdminOperator } from '../../../../../utils/adminOperator'
import { parseAmountToCents } from '../../../../../utils/commission'
import { AMOUNT_INPUT_MAXLENGTH } from '../../../../../../app/utils/commissionTiers'
import { REASON_MAX } from '../../../../../../app/utils/b2bCommissionRules'

// 'annulation' est volontairement absent : il n'est écrit que par cancel.post.ts.
const bodySchema = z.object({
  type: z.enum(['commission_facturee', 'encaissement', 'remboursement', 'retro_commission_versee']),
  amount: z.string().trim().min(1).max(AMOUNT_INPUT_MAXLENGTH),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(REASON_MAX).optional(),
  operator: z.string().max(60).optional(),
})

// Phase 05.23 (D-12) — saisie d'un mouvement au journal (facture émise, encaissement, rétro-commission, remboursement).
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

  const operator = requireAdminOperator(useRuntimeConfig(event) as any, body.operator)
  const cents = parseAmountToCents(body.amount)
  if (cents == null || cents <= 0) throw createError({ statusCode: 422, statusMessage: 'Montant invalide.' })
  const today = new Date().toISOString().slice(0, 10)
  if (body.occurred_on > today || body.occurred_on < '2026-01-01' || Number.isNaN(Date.parse(body.occurred_on))) {
    throw createError({ statusCode: 422, statusMessage: 'Date invalide.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const flow = readB2bFlowConfig(useRuntimeConfig(event) as any)
  const row = (await loadCommissionRows(supabase, flow, { engagementId: id }))[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Engagement introuvable.' })
  const s = row.state
  const status = row.engagement_status

  if (status === 'contested') throw createError({ statusCode: 409, statusMessage: 'Commission non confirmée.' })
  const cancelled = status === 'commission_cancelled'

  switch (body.type) {
    case 'commission_facturee':
      if (cancelled) throw createError({ statusCode: 409, statusMessage: 'Commission annulée : aucune facture à émettre.' })
      // D-06 bis : seuls les versements validés par le partenaire sont facturables.
      if (cents > s.exigible_cents - s.invoiced_cents) {
        throw createError({ statusCode: 422, statusMessage: 'Montant supérieur au reste à facturer (versements validés).' })
      }
      break
    case 'encaissement':
      if (cents > row.commission_cents - s.paid_cents) {
        throw createError({ statusCode: 422, statusMessage: 'Montant supérieur au reste à encaisser.' })
      }
      break
    case 'retro_commission_versee': {
      const due = s.partner_due_now_cents - s.partner_paid_cents
      // D-26 : jamais d'avance, due seulement en fin de chantier commission intégralement encaissée.
      if (due <= 0) throw createError({ statusCode: 422, statusMessage: 'Rétro-commission pas encore due.' })
      if (cents > due) throw createError({ statusCode: 422, statusMessage: 'Montant supérieur à la rétro-commission due.' })
      break
    }
    case 'remboursement':
      if (!cancelled) throw createError({ statusCode: 409, statusMessage: 'Remboursement possible seulement sur une commission annulée.' })
      if (cents > s.refund_due_cents) throw createError({ statusCode: 422, statusMessage: 'Montant supérieur au remboursement à traiter.' })
      break
  }

  const { error } = await supabase.from('b2b_commission_movements').insert({
    engagement_id: id,
    type: body.type,
    amount_cents: cents,
    occurred_on: body.occurred_on,
    actor_id: (user as any).id,
    operator,
    note: body.note || null,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: 'Enregistrement du mouvement impossible.' })

  // Le journal est lui-même la trace : l'audit n'est pas bloquant.
  try {
    await supabase.from('audit_logs').insert({
      actor_id: (user as any).id, action: 'b2b_commission_movement', target_table: 'b2b_engagements', target_id: id,
      metadata: { type: body.type, amount_cents: cents, occurred_on: body.occurred_on, operator },
    })
  } catch { /* non bloquant */ }

  const fresh = (await loadCommissionRows(supabase, flow, { engagementId: id }))[0]
  return { state: fresh?.state ?? s }
})
