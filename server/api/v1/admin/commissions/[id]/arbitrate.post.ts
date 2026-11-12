import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { loadCommissionRows } from '../../../../../utils/b2bCommissionsQuery'
import { readB2bFlowConfig } from '../../../../../utils/b2bCommissionPlan'
import { confirmQuoteSubmission } from '../../../../../utils/b2bQuoteConfirm'
import { requireAdminOperator } from '../../../../../utils/adminOperator'
import { issuePartnerToken } from '../../../../../utils/signature'
import { sendEmail } from '../../../../../utils/email'
import { renderEmail } from '../../../../../utils/emailLayout'
import { escapeHtml } from '../../../../../utils/contracts'
import { REASON_MIN, REASON_MAX } from '../../../../../../app/utils/b2bCommissionRules'

const bodySchema = z.object({
  submission_id: z.string().uuid(),
  decision: z.enum(['confirm', 'reject']),
  note: z.string().trim().min(REASON_MIN).max(REASON_MAX),
  operator: z.string().max(60).optional(),
})

// Phase 05.23 (D-09) — arbitrage d'une contestation de montant : confirmer (commission calculée) ou refuser (redépôt).
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

  const supabase = serverSupabaseServiceRole(event) as any
  const flow = readB2bFlowConfig(useRuntimeConfig(event) as any)
  const row = (await loadCommissionRows(supabase, flow, { engagementId: id }))[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Engagement introuvable.' })

  const { data: sub } = await supabase
    .from('b2b_quote_submissions').select('id, status')
    .eq('id', body.submission_id).eq('engagement_id', id).maybeSingle()
  if (!sub) throw createError({ statusCode: 404, statusMessage: 'Dépôt introuvable.' })
  if (sub.status !== 'contested') throw createError({ statusCode: 409, statusMessage: 'Aucune contestation en cours sur ce dépôt.' })

  if (body.decision === 'confirm') {
    await confirmQuoteSubmission(supabase, {
      submissionId: body.submission_id, engagementId: id, from: 'contested', decidedBy: 'admin', note: body.note, capCents: flow.quoteBaseCapCents,
    })
  } else {
    const now = new Date().toISOString()
    const { data: rejected } = await supabase
      .from('b2b_quote_submissions')
      .update({ status: 'rejected', decided_at: now, decided_by: 'admin', arbitration_note: body.note })
      .eq('id', body.submission_id).eq('status', 'contested').select('id')
    if (!rejected || rejected.length === 0) throw createError({ statusCode: 409, statusMessage: 'Ce dépôt a déjà été traité.' })

    // Révision sur un engagement déjà confirmé : le statut ne bouge pas (le filtre ne trouve alors rien).
    await supabase.from('b2b_engagements').update({ status: 'selected' }).eq('id', id).eq('status', 'contested')

    // D-22 : l'e-mail du partenaire ne mentionne ni commission ni part partenaire.
    try {
      const { data: req } = await supabase.from('b2b_requests').select('id, contact_name, contact_email').eq('id', row.request_id).maybeSingle()
      if (req?.contact_email) {
        const token = await issuePartnerToken(supabase, req.id, { revokePrevious: false })
        const siteUrl = (useRuntimeConfig(event).public?.siteUrl as string) || 'https://bati-axe.com'
        const ref = String(req.id).slice(0, 8).toUpperCase()
        await sendEmail({
          to: req.contact_email,
          sender: 'notifications',
          subject: 'Devis à redéposer',
          html: renderEmail({
            title: 'Devis à redéposer',
            intro: `Bonjour ${escapeHtml(req.contact_name)}, après examen le devis déposé pour le dossier réf. ${escapeHtml(ref)} n'a pas été retenu par BÂTI-AXE : ${escapeHtml(body.note)}. Merci de déposer le devis corrigé.`,
            cta: { label: 'Ouvrir mon espace de suivi', href: `${siteUrl}/b2b/engagement/${token}` },
          }),
        })
      }
    } catch (err) {
      console.error('[05.23] Échec e-mail devis à redéposer:', err)
    }
  }

  try {
    await supabase.from('audit_logs').insert({
      actor_id: (user as any).id, action: 'b2b_quote_contested', target_table: 'b2b_quote_submissions', target_id: body.submission_id,
      metadata: { arbitration: body.decision, note: body.note, operator },
    })
  } catch { /* non bloquant */ }

  const fresh = (await loadCommissionRows(supabase, flow, { engagementId: id }))[0]
  return { decision: body.decision, state: fresh?.state ?? null }
})
