import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: pros, error: e1 } = await supabase
    .from('professionals')
    .select('id, company_name, siret, full_name, email, phone, canonical_slug, category, is_verified, is_claimed, decennal_status, created_at')
    .order('created_at', { ascending: false })

  if (e1) throw createError({ statusCode: 500, statusMessage: e1.message })

  const { data: verifs, error: e2 } = await supabase
    .from('verifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (e2) throw createError({ statusCode: 500, statusMessage: e2.message })

  const professionals = (pros || []).map((p: any) => ({
    ...p,
    verifications: (verifs || []).filter((v: any) => v.pro_id === p.id)
  }))

  return { professionals }
})
