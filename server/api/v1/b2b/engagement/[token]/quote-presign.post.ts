import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { getClientMeta, findRequestByToken, findSignedFramework } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'
import { buildQuoteKey, signB2bObjectUrl } from '../../../../../utils/r2B2b'
import { QUOTE_MAX_FILE_BYTES } from '../../../../../../app/utils/b2bCommissionRules'

const bodySchema = z.object({
  engagement_id: z.string().uuid(),
  filename: z.string().trim().min(5).max(255),
  content_type: z.literal('application/pdf'),
  size: z.number().int().positive().max(QUOTE_MAX_FILE_BYTES),
})

// Phase 05.23 — URL pré-signée d'envoi du PDF du devis signé (partenaire, lien à jeton).
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
  if (!framework) {
    throw createError({ statusCode: 409, statusMessage: 'Signez d\'abord votre convention de partenariat.', data: { code: 'FRAMEWORK_REQUIRED' } })
  }

  const parsed = bodySchema.safeParse((await readBody(event).catch(() => ({}))) ?? {})
  if (!parsed.success) {
    if (parsed.error.issues[0]?.path[0] === 'content_type') throw createError({ statusCode: 415, statusMessage: 'Seuls les PDF sont acceptés.' })
    throw createError({ statusCode: 400, statusMessage: 'Requête invalide.' })
  }
  const body = parsed.data
  if (!body.filename.toLowerCase().endsWith('.pdf')) throw createError({ statusCode: 415, statusMessage: 'Seuls les PDF sont acceptés.' })

  const { data: eng } = await supabase
    .from('b2b_engagements').select('id, status')
    .eq('id', body.engagement_id).eq('request_id', req.id).eq('type', 'lot_amendment').maybeSingle()
  if (!eng) throw createError({ statusCode: 404, statusMessage: 'Avenant introuvable.' })
  if (!['selected', 'quote_confirmed'].includes(eng.status)) {
    throw createError({ statusCode: 409, statusMessage: 'Aucun artisan retenu sur ce lot.' })
  }

  const { data: open } = await supabase
    .from('b2b_quote_submissions').select('id')
    .eq('engagement_id', body.engagement_id).in('status', ['pending', 'contested']).limit(1)
  if (Array.isArray(open) && open.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Un devis est déjà en attente de confirmation.' })
  }

  const fileKey = buildQuoteKey(body.engagement_id)
  const signedUrl = await signB2bObjectUrl(event, fileKey, 'PUT', 600)
  return { status: 'SUCCESS', signedUrl, fileKey }
})
