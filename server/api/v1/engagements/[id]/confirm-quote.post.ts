import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { confirmQuoteSubmission } from '../../../../utils/b2bQuoteConfirm'
import { readB2bFlowConfig } from '../../../../utils/b2bCommissionPlan'
import { formatEurCents } from '../../../../utils/commission'
import { notifyAdmin, adminDetailsTable } from '../../../../utils/notifyAdmin'
import { escapeHtml } from '../../../../utils/contracts'
import { REASON_MIN, REASON_MAX } from '../../../../../app/utils/b2bCommissionRules'

// Le pro ne transmet jamais de montant : il confirme ou conteste celui que le partenaire a déposé.
const bodySchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('confirm'), submission_id: z.string().uuid() }),
  z.object({ decision: z.literal('contest'), submission_id: z.string().uuid(), reason: z.string().trim().min(REASON_MIN).max(REASON_MAX) }),
])

// Phase 05.23 (D-03, D-09) — l'artisan confirme en un clic le devis déposé par le partenaire, ou le conteste.
export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const idParsed = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  const id = idParsed.data

  const parsed = bodySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Requête invalide.' })
  const body = parsed.data

  const supabase = serverSupabaseServiceRole(event) as any
  const { data: eng } = await supabase
    .from('b2b_engagements').select('id, status, request_id, lot_id')
    .eq('id', id).eq('pro_id', user.id).eq('type', 'lot_amendment').maybeSingle()
  if (!eng) throw createError({ statusCode: 404, statusMessage: 'Avenant introuvable.' })

  const { data: sub } = await supabase
    .from('b2b_quote_submissions').select('id, amount_ht_cents, status')
    .eq('id', body.submission_id).eq('engagement_id', id).maybeSingle()
  if (!sub) throw createError({ statusCode: 404, statusMessage: 'Devis introuvable.' })
  if (sub.status !== 'pending') throw createError({ statusCode: 409, statusMessage: 'Ce dépôt a déjà été traité.' })

  const ref = String(eng.request_id).slice(0, 8).toUpperCase()

  if (body.decision === 'confirm') {
    const { quoteBaseCapCents } = readB2bFlowConfig(useRuntimeConfig(event) as any)
    const r = await confirmQuoteSubmission(supabase, {
      submissionId: body.submission_id, engagementId: id, from: 'pending', decidedBy: 'pro', capCents: quoteBaseCapCents,
    })

    await notifyAdmin({
      subject: 'Devis confirmé par l\'artisan',
      title: 'Devis confirmé par l\'artisan',
      bodyHtml: adminDetailsTable([
        ['Dossier', escapeHtml(ref)],
        ['Assiette HT', escapeHtml(formatEurCents(r.base_cents))],
        ['Commission HT', escapeHtml(formatEurCents(r.commission_cents))],
      ]),
    })

    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id, action: 'b2b_quote_confirmed', target_table: 'b2b_quote_submissions', target_id: body.submission_id,
        metadata: { engagement_id: id, base_cents: r.base_cents, commission_cents: r.commission_cents },
      })
    } catch (err) {
      console.error('[05.23] Échec audit confirmation de devis:', err)
    }

    return { status: 'quote_confirmed', confirmed_amount_cents: r.base_cents, commission_cents: r.commission_cents }
  }

  // D-09 : aucun calcul de commission tant que c'est contesté ; silence de l'artisan = blocage + relance + arbitrage (pas d'acceptation tacite).
  const now = new Date().toISOString()
  const { data: moved } = await supabase
    .from('b2b_quote_submissions')
    .update({ status: 'contested', contest_reason: body.reason, contested_at: now })
    .eq('id', body.submission_id).eq('status', 'pending').select('id')
  if (!moved || moved.length === 0) throw createError({ statusCode: 409, statusMessage: 'Ce dépôt a déjà été traité.' })

  if (eng.status === 'quote_submitted') {
    await supabase.from('b2b_engagements').update({ status: 'contested' }).eq('id', id).eq('status', 'quote_submitted')
  }

  await notifyAdmin({
    subject: 'Montant de devis contesté par l\'artisan',
    title: 'Devis contesté : arbitrage nécessaire',
    bodyHtml: adminDetailsTable([
      ['Dossier', escapeHtml(ref)],
      ['Montant déposé HT', escapeHtml(formatEurCents(Number(sub.amount_ht_cents)))],
      ['Motif', escapeHtml(body.reason)],
    ]),
  })

  try {
    await supabase.from('audit_logs').insert({
      actor_id: user.id, action: 'b2b_quote_contested', target_table: 'b2b_quote_submissions', target_id: body.submission_id,
      metadata: { engagement_id: id, amount_ht_cents: Number(sub.amount_ht_cents) },
    })
  } catch (err) {
    console.error('[05.23] Échec audit contestation de devis:', err)
  }

  return { status: 'contested' }
})
