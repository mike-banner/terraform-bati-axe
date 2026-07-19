import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event) as any

  const { data, error } = await supabase
    .from('completed_projects')
    .select('id, professional_id, title, description, city, image_urls, created_at, likes(count), professionals(company_name, canonical_slug)')
    .eq('is_showcased', true)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur serveur.' })

  return { status: 'SUCCESS', projects: data ?? [] }
})
