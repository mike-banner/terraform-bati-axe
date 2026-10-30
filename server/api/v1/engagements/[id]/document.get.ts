import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { renderContractDocument } from '../../../../utils/contracts'

// Phase 05.21 — avenant/convention signé imprimable avec sa preuve (pro propriétaire ou admin).
export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const parsedId = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })

  const supabase = serverSupabaseServiceRole(event) as any
  const { data: eng } = await supabase
    .from('b2b_engagements')
    .select('id, type, pro_id, template_version, content_html, content_sha256, signed_at, signed_ip, signer_email')
    .eq('id', parsedId.data).maybeSingle()

  // 404 uniforme : pas d'énumération des documents d'autrui.
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!eng || !(isAdmin || eng.pro_id === user.id)) throw createError({ statusCode: 404, statusMessage: 'Document introuvable.' })

  setResponseHeaders(event, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' })
  return renderContractDocument(eng)
})
