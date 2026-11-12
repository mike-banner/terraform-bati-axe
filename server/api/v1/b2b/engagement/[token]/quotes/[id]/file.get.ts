import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { getClientMeta, findRequestByToken } from '../../../../../../../utils/signature'
import { isRateLimited } from '../../../../../../../utils/rateLimit'
import { signB2bObjectUrl } from '../../../../../../../utils/r2B2b'

// Phase 05.23 — le partenaire relit le PDF qu'il a déposé (D-13 / ADR-003 : URL pré-signée 5 min).
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const ip = getClientMeta(event).ip ?? 'unknown'
  if (isRateLimited('b2b-token:' + ip, { max: 30, windowMs: 600_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Réessayez plus tard.' })
  }

  const supabase = serverSupabaseServiceRole(event) as any
  const req = await findRequestByToken(supabase, getRouterParam(event, 'token') ?? '')
  if (!req) throw createError({ statusCode: 404, statusMessage: 'Lien invalide ou expiré.' })

  const id = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })

  const { data: row } = await supabase
    .from('b2b_quote_submissions').select('file_key')
    .eq('id', id.data).eq('request_id', req.id).maybeSingle()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Document introuvable.' })

  return sendRedirect(event, await signB2bObjectUrl(event, row.file_key, 'GET', 300), 302)
})
