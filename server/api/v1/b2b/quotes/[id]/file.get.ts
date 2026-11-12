import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { signB2bObjectUrl } from '../../../../../utils/r2B2b'

// Phase 05.23 — lecture du devis signé par l'artisan retenu ou l'admin.
// D-13 / ADR-003 : PDF sur R2 privé, URL pré-signée 5 min, jamais en base ni en clair.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' })

  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const id = z.string().uuid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })

  const supabase = serverSupabaseServiceRole(event) as any
  const { data: row } = await supabase
    .from('b2b_quote_submissions').select('file_key, b2b_engagements(pro_id)')
    .eq('id', id.data).maybeSingle()

  // 404 uniforme : pas d'énumération des documents d'autrui.
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!row || !(isAdmin || row.b2b_engagements?.pro_id === user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Document introuvable.' })
  }

  return sendRedirect(event, await signB2bObjectUrl(event, row.file_key, 'GET', 300), 302)
})
