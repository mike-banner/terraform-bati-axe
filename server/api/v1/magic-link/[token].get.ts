import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Token manquant' })

  const supabase = await serverSupabaseServiceRole(event) as any

  // Get project by token
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, category, description, budget_range, timeline_range, status, created_at')
    .eq('access_token', token)
    .single()

  if (error || !project) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable ou lien expiré' })
  }

  // Get messages associated with this project (via leads)
  // We want to group them by pro so the UI can show threads
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      is_pro_sender,
      created_at,
      lead_id,
      leads (
        pro_id,
        professionals (
          company_name
        )
      )
    `)
    .eq('project_id', project.id)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Failed to load messages', messagesError)
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors du chargement des messages' })
  }

  return { project, messages: messagesData || [] }
})
