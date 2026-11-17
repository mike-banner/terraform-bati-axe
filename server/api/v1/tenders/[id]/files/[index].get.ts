import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { signB2bObjectUrl } from '../../../../../utils/r2B2b'
import { canReadAttachments, listAttachments, attachmentRead } from '../../../../../utils/tenderAttachments'

// Pièce jointe d'un appel d'offres partenaire, pour l'artisan positionné (avenant signé).
// ADR-003 : R2 privé, lien signé 5 min ; la clé n'est jamais exposée au navigateur.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const lotId = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  const index = z.coerce.number().int().min(0).max(9).safeParse(getRouterParam(event, 'index'))
  if (!lotId.success || !index.success) throw createError({ statusCode: 404, statusMessage: 'Document introuvable.' })

  const supabase = serverSupabaseServiceRole(event) as any
  const [{ data: claim }, { data: amendment }, { data: lot }] = await Promise.all([
    supabase.from('b2b_tender_claims').select('id, claimed_at').eq('lot_id', lotId.data).eq('pro_id', user.id).maybeSingle(),
    supabase.from('b2b_engagements').select('id, status').eq('type', 'lot_amendment').eq('lot_id', lotId.data).eq('pro_id', user.id).maybeSingle(),
    supabase.from('b2b_tender_lots').select('id, b2b_requests(files)').eq('id', lotId.data).maybeSingle(),
  ])

  // 404 uniforme : pas d'énumération des dossiers ni des pièces.
  if (!lot || !canReadAttachments(claim, amendment)) throw createError({ statusCode: 404, statusMessage: 'Document introuvable.' })

  const files = lot.b2b_requests?.files
  const att = listAttachments(files).find(a => a.index === index.data)
  if (!att) throw createError({ statusCode: 404, statusMessage: 'Document introuvable.' })

  const key = (files as any[])[att.index].file_key as string
  const read = attachmentRead(key, att.name)
  return sendRedirect(event, await signB2bObjectUrl(event, key, 'GET', 300, undefined, read), 302)
})
