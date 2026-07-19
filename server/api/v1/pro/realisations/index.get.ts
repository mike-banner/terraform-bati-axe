import { serverSupabaseClient } from '#supabase/server'

// 05.5-03: liste des réalisations du pro authentifié
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const { data, error } = await supabase
    .from('completed_projects')
    .select('*')
    .eq('professional_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { status: 'SUCCESS', realisations: data ?? [] }
})
