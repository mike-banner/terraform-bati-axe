import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { sendEmail } from '../../../../../utils/email'
import { findSignedFramework, issuePartnerToken, renderPartnerLinkEmail } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'

// Phase 05.21 — renvoi explicite du lien partenaire (seule rotation : révoque les jetons précédents).
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  if ((user as any).app_metadata?.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const idParsed = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) throw createError({ statusCode: 400, statusMessage: 'id invalide.' })
  const id = idParsed.data

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: req } = await supabase.from('b2b_requests').select('id, contact_name, contact_email').eq('id', id).maybeSingle()
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Dossier introuvable.' })

  if (isRateLimited('partner-link:' + id, { max: 5, windowMs: 3_600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de renvois. Réessayez plus tard.' })
  }

  const signed = Boolean(await findSignedFramework(supabase, { type: 'framework_partner', email: req.contact_email }))
  let reason: 'framework' | 'choose_pro' | 'submit_quote' = 'framework'
  if (signed) {
    const { data: engs } = await supabase
      .from('b2b_engagements')
      .select('id, lot_id, status, selected_at')
      .eq('type', 'lot_amendment').eq('request_id', id)
    const { data: subs } = await supabase
      .from('b2b_quote_submissions')
      .select('engagement_id, status')
      .eq('request_id', id).in('status', ['pending', 'contested', 'confirmed'])
    const rows: any[] = engs ?? []
    const submitted = new Set((subs ?? []).map((s: any) => s.engagement_id))
    const decidedLots = new Set(rows.filter(e => e.selected_at).map(e => e.lot_id))
    if (rows.some(e => e.status === 'signed' && !decidedLots.has(e.lot_id))) reason = 'choose_pro'
    else if (rows.some(e => e.status === 'selected' && !submitted.has(e.id))) reason = 'submit_quote'
    else throw createError({ statusCode: 409, statusMessage: 'Convention signée et aucune action attendue du partenaire.' })
  }

  const token = await issuePartnerToken(supabase, id, { revokePrevious: true })
  const siteUrl = (useRuntimeConfig(event).public?.siteUrl as string) || 'https://bati-axe.com'
  const { subject, html } = renderPartnerLinkEmail({
    contactName: req.contact_name,
    requestRef: id.slice(0, 8).toUpperCase(),
    link: `${siteUrl}/b2b/engagement/${token}`,
    reason,
  })
  try {
    await sendEmail({ to: req.contact_email, sender: 'no-reply', subject, html })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Envoi impossible.' })
  }

  try {
    await supabase.from('audit_logs').insert({
      actor_id: (user as any).id,
      action: 'b2b_request_updated',
      target_table: 'b2b_requests',
      target_id: id,
      metadata: { partner_link_sent: true, reason },
    })
  } catch { /* non-blocking */ }

  return { status: 'SENT' }
})
