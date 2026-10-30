import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { sendEmail } from '../../../../../utils/email'
import { findSignedFramework, issuePartnerToken, renderPartnerLinkEmail } from '../../../../../utils/signature'
import { formatEurCents } from '../../../../../utils/commission'
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
  let reason: 'framework' | 'confirm_quote' = 'framework'
  let proCompany: string | undefined
  let amountLabel: string | undefined
  if (signed) {
    const { data: pending } = await supabase
      .from('b2b_engagements')
      .select('declared_amount_cents, professionals(company_name)')
      .eq('type', 'lot_amendment').eq('request_id', id).eq('status', 'quote_declared')
      .order('declared_at').limit(1).maybeSingle()
    if (!pending) throw createError({ statusCode: 409, statusMessage: 'Convention déjà signée et aucun montant à confirmer.' })
    reason = 'confirm_quote'
    proCompany = pending.professionals?.company_name ?? undefined
    amountLabel = formatEurCents(pending.declared_amount_cents)
  }

  const token = await issuePartnerToken(supabase, id, { revokePrevious: true })
  const siteUrl = (useRuntimeConfig(event).public?.siteUrl as string) || 'https://bati-axe.com'
  const { subject, html } = renderPartnerLinkEmail({
    contactName: req.contact_name,
    requestRef: id.slice(0, 8).toUpperCase(),
    link: `${siteUrl}/b2b/engagement/${token}`,
    reason, proCompany, amountLabel,
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
