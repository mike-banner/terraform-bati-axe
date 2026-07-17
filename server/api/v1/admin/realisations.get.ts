import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// 05.5-06: liste admin de toutes les réalisations (showcased ou non) pour le toggle
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data, error } = await supabase
    .from('completed_projects')
    .select('id, title, city, image_urls, is_showcased, created_at, professionals(company_name)')
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { status: 'SUCCESS', realisations: data ?? [] }
})
