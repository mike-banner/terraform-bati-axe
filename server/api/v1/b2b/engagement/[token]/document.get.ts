import { serverSupabaseServiceRole } from '#supabase/server'
import { renderContractDocument } from '../../../../../utils/contracts'
import { getClientMeta, findRequestByToken, findSignedFramework } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'

// Phase 05.21 — convention partenaire signée imprimable (jeton). N'expose pas les avenants des pros.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const ip = getClientMeta(event).ip ?? 'unknown'
  if (isRateLimited('b2b-token:' + ip, { max: 30, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const req = await findRequestByToken(supabase, getRouterParam(event, 'token') ?? '')
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const framework = await findSignedFramework(supabase, { type: 'framework_partner', email: req.contact_email })
  if (!framework) throw createError({ statusCode: 404, statusMessage: 'Aucune convention signée.' })

  const { data: eng } = await supabase
    .from('b2b_engagements')
    .select('type, template_version, content_html, content_sha256, signed_at, signed_ip, signer_email')
    .eq('id', framework.id).single()
  if (!eng) throw createError({ statusCode: 404, statusMessage: 'Aucune convention signée.' })

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return renderContractDocument(eng)
})
