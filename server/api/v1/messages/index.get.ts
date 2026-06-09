import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lead_id = query.lead_id as string

  if (!lead_id) throw createError({ statusCode: 400, statusMessage: 'lead_id manquant' })

  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })

  const supabase = await serverSupabaseServiceRole(event) as any

  // Verify ownership
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('pro_id')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead || lead.pro_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Accès interdit' })
  }

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', lead_id)
    .order('created_at', { ascending: true })

  if (msgError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des messages' })
  }

  return { messages: messages || [] }
})
