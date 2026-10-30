import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { renderContract, CONTRACT_VERSIONS } from '../../../../utils/contracts'
import { sha256Hex, getClientMeta, issueOtpChallenge, verifyOtpChallenge, findSignedFramework, insertEngagement, sendSignedCopy } from '../../../../utils/signature'

const bodySchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Code à 6 chiffres attendu.').optional() })

// Phase 05.21 — signature en 2 temps (texte + OTP, puis code) de la convention cadre pro.
export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const parsed = bodySchema.safeParse((await readBody(event).catch(() => ({}))) ?? {})
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Requête invalide.' })
  const { code } = parsed.data

  const supabase = serverSupabaseServiceRole(event) as any

  const { data: pro, error: proError } = await supabase
    .from('professionals')
    .select('id, email, company_name, full_name, siret')
    .eq('id', user.id)
    .single()
  if (proError || !pro) throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })

  const existing = await findSignedFramework(supabase, { type: 'framework_pro', proId: user.id })
  if (existing) return { status: 'ALREADY_SIGNED', engagement_id: existing.id, signed_at: existing.signed_at }

  const version = CONTRACT_VERSIONS.framework_pro
  const html = renderContract('framework_pro', { companyName: pro.company_name, fullName: pro.full_name, siret: pro.siret, email: pro.email })
  const sha = await sha256Hex(html)
  const subject = { type: 'framework_pro' as const, proId: user.id, email: pro.email }

  if (!code) {
    const { emailHint } = await issueOtpChallenge(supabase, subject, sha, 'la convention cadre BÂTI-AXE')
    return { status: 'OTP_SENT', contract: { html, sha256: sha, version }, email_hint: emailHint }
  }

  const { challengeId } = await verifyOtpChallenge(supabase, subject, code, sha)
  const meta = getClientMeta(event)
  const e = await insertEngagement(supabase, {
    type: 'framework_pro',
    pro_id: user.id,
    signer_email: String(pro.email).toLowerCase(),
    template_version: version,
    content_html: html,
    content_sha256: sha,
    otp_challenge_id: challengeId,
    signed_ip: meta.ip,
    signed_user_agent: meta.userAgent,
  })

  await sendSignedCopy({ type: 'framework_pro', template_version: version, content_html: html, content_sha256: sha, signed_at: e.signed_at, signer_email: String(pro.email).toLowerCase(), created: e.created })

  try {
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'b2b_engagement_signed',
      target_table: 'b2b_engagements',
      target_id: e.id,
      metadata: { type: 'framework_pro', version, sha256: sha },
    })
  } catch (err) {
    console.error('[Phase05.21] Échec audit signature convention pro:', err)
  }

  return { status: 'SIGNED', engagement_id: e.id, signed_at: e.signed_at }
})
