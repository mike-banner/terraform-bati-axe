import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

// Renvoie le dernier message par lead pour le pro authentifié, afin que la liste
// de conversations (/espace/messages) affiche le VRAI dernier message échangé
// (et non la description du projet). Clé = leads.id (= claim_id).
export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: rows, error } = await supabase
    .from('messages')
    .select('content, created_at, is_pro_sender, lead_id, leads!inner(pro_id)')
    .eq('leads.pro_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors du chargement des conversations' })
  }

  // rows triés du plus récent au plus ancien → le premier vu par lead est le dernier message.
  const lastByLead: Record<string, { content: string; created_at: string; is_pro_sender: boolean }> = {}
  for (const m of (rows || []) as any[]) {
    if (!lastByLead[m.lead_id]) {
      lastByLead[m.lead_id] = { content: m.content, created_at: m.created_at, is_pro_sender: m.is_pro_sender }
    }
  }

  return { lastByLead }
})
