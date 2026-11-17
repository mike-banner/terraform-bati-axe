import { serverSupabaseServiceRole } from '#supabase/server'
import { getClientMeta } from '../../../../utils/signature'
import { isRateLimited } from '../../../../utils/rateLimit'
import { verifyDossiersToken } from '../../../../utils/partnerDossiersToken'
import { dossiersSecret, listDossiers } from '../../../../utils/partnerDossiers'

// « Mes dossiers » : la possession du lien (signé, 24 h) authentifie ; l'adresse vient du jeton.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const ip = getClientMeta(event).ip ?? 'unknown'
  if (isRateLimited('b2b-mes-dossiers-read:' + ip, { max: 60, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const email = await verifyDossiersToken(dossiersSecret(event), getRouterParam(event, 'token') ?? '')
  if (!email) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const supabase = await serverSupabaseServiceRole(event) as any
  return await listDossiers(supabase, email)
})
