import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, category, status, description, budget_range, timeline_range, created_at, leads(count)')
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    projects: projects.map((p: any) => ({
      ...p,
      lead_count: p.leads?.[0]?.count ?? 0,
      leads: undefined,
    }))
  }
})
