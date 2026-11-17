import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { getClientMeta, issuePartnerToken } from '../../../../../utils/signature'
import { isRateLimited } from '../../../../../utils/rateLimit'
import { verifyDossiersToken, escapeLike } from '../../../../../utils/partnerDossiersToken'
import { dossiersSecret } from '../../../../../utils/partnerDossiers'

// Ouvre le suivi détaillé d'un dossier : émet un lien de suivi sans révoquer les précédents
// (un lien déjà envoyé par e-mail continue de fonctionner). Le dossier doit appartenir à l'adresse du jeton.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store' })

  const ip = getClientMeta(event).ip ?? 'unknown'
  if (isRateLimited('b2b-mes-dossiers-open:' + ip, { max: 30, windowMs: 3_600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const email = await verifyDossiersToken(dossiersSecret(event), getRouterParam(event, 'token') ?? '')
  if (!email) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const parsed = z.object({ request_id: z.string().uuid() }).safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Dossier invalide.' })

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: req } = await supabase
    .from('b2b_requests').select('id')
    .eq('id', parsed.data.request_id).ilike('contact_email', escapeLike(email)).maybeSingle()
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Dossier introuvable.' })

  const token = await issuePartnerToken(supabase, req.id, { revokePrevious: false })
  return { url: `/b2b/engagement/${token}` }
})
