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
      leads!inner (
        project_id,
        pro_id,
        professionals (
          company_name
        )
      )
    `)
    .eq('leads.project_id', project.id)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Failed to load messages', messagesError)
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors du chargement des messages' })
  }

  // REQ-09 — Artisans engagés sur le projet (status 'claimed' = ont débloqué le lead),
  // avec de quoi lier vers leur fiche publique (/pro/[dept]/[slug]) + la décision
  // du particulier (REQ-06). On expose TOUS les pros engagés, même sans message échangé.
  const { data: engagedLeads } = await supabase
    .from('leads')
    .select(`
      id,
      customer_decision,
      status,
      professionals (
        company_name, canonical_slug, postal_code, category, logo_url, is_verified
      )
    `)
    .eq('project_id', project.id)
    .eq('status', 'claimed')

  const pros = (engagedLeads || []).map((l: any) => {
    const p = l.professionals || {}
    const postal = p.postal_code || ''
    return {
      lead_id: l.id,
      customer_decision: l.customer_decision || 'pending',
      company_name: p.company_name || 'Artisan',
      canonical_slug: p.canonical_slug || null,
      dept: postal ? postal.slice(0, 2) : null,
      category: p.category || null,
      logo_url: p.logo_url || null,
      is_verified: p.is_verified ?? false
    }
  })

  return { project, messages: messagesData || [], pros }
})
