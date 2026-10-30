import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { renderContract, CONTRACT_VERSIONS } from '../../../../../utils/contracts'
import { sha256Hex, getClientMeta, issueOtpChallenge, verifyOtpChallenge, findRequestByToken, findSignedFramework, insertEngagement } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'
import { notifyAdmin } from '../../../../../utils/notifyAdmin'

const bodySchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Code à 6 chiffres attendu.').optional() })

// Phase 05.21 — signature en 2 temps de la convention partenaire (lien à jeton + OTP).
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const meta = getClientMeta(event)
  if (isRateLimited('b2b-token:' + (meta.ip ?? 'unknown'), { max: 30, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const req = await findRequestByToken(supabase, getRouterParam(event, 'token') ?? '')
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const parsed = bodySchema.safeParse((await readBody(event).catch(() => ({}))) ?? {})
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Requête invalide.' })
  const { code } = parsed.data

  const existing = await findSignedFramework(supabase, { type: 'framework_partner', email: req.contact_email })
  if (existing) return { status: 'ALREADY_SIGNED', engagement_id: existing.id, signed_at: existing.signed_at }

  const requestRef = String(req.id).slice(0, 8).toUpperCase()
  const version = CONTRACT_VERSIONS.framework_partner
  const html = renderContract('framework_partner', {
    contactName: req.contact_name, contactCompany: req.contact_company, email: req.contact_email, requestRef,
  })
  const sha = await sha256Hex(html)
  const subject = { type: 'framework_partner' as const, requestId: req.id, email: req.contact_email }

  if (!code) {
    const { emailHint } = await issueOtpChallenge(supabase, subject, sha, 'la convention de partenariat BÂTI-AXE')
    return { status: 'OTP_SENT', contract: { html, sha256: sha, version }, email_hint: emailHint }
  }

  const { challengeId } = await verifyOtpChallenge(supabase, subject, code, sha)
  const e = await insertEngagement(supabase, {
    type: 'framework_partner',
    request_id: req.id,
    signer_email: String(req.contact_email).toLowerCase(),
    template_version: version,
    content_html: html,
    content_sha256: sha,
    otp_challenge_id: challengeId,
    signed_ip: meta.ip,
    signed_user_agent: meta.userAgent,
  })

  try {
    await supabase.from('audit_logs').insert({
      actor_id: null,
      action: 'b2b_engagement_signed',
      target_table: 'b2b_engagements',
      target_id: e.id,
      metadata: { type: 'framework_partner', request_id: req.id },
    })
  } catch (err) {
    console.error('[05.21] Échec audit signature convention partenaire:', err)
  }

  if (e.created) {
    await notifyAdmin({
      subject: 'Convention partenaire signée',
      title: 'Convention partenaire signée',
      intro: `${req.contact_name} a signé la convention (dossier réf. ${requestRef}). Le dossier peut être diffusé.`,
    })
  }

  return { status: 'SIGNED', engagement_id: e.id, signed_at: e.signed_at }
})
