import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { maskLead } from '../../../utils/maskLead'

export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  // Client service-role via le module : il lit la clé depuis runtimeConfig,
  // seul canal fiable au runtime Cloudflare (event.context.cloudflare.env et
  // process.env y sont vides). Nécessite NUXT_SUPABASE_SERVICE_KEY en env.
  const supabase = serverSupabaseServiceRole(event) as any

  const { data: pro, error: proError } = await supabase
    .from('professionals')
    .select('id, subscription_status, categories')
    .eq('id', user.id)
    .single()

  if (proError || !pro) {
    throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })
  }

  const isPremium = pro.subscription_status === 'active'

  // D-03: resolve free grants for this pro
  const { data: grants } = await supabase
    .from('free_lead_grants')
    .select('lead_id')
    .eq('pro_id', user.id)
  const grantedSet = new Set((grants || []).map((g: any) => g.lead_id))

  const proCategories = pro.categories || []

  // If pro has no categories, return empty leads
  if (proCategories.length === 0) {
    return { leads: [], isPremium }
  }

  // Fetch projects that match pro's categories and are qualified
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, category, budget_range, timeline_range, description, customer_name, customer_email, customer_phone, postal_code, qualify_score, qualify_budget, qualify_phone, qualify_description, qualify_returning, created_at, status')
    .eq('status', 'qualified')
    .in('category', proCategories)
    .order('created_at', { ascending: false })

  if (projectsError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des projets.' })
  }

  // Fetch pro's lead claims
  const { data: leads } = await supabase
    .from('leads')
    .select('id, project_id, status, unlocked_at')
    .eq('pro_id', user.id)

  const leadMap = new Map((leads || []).map((l: any) => [l.project_id, l]))

  const now = new Date()
  const enriched = (projects || []).map((proj: any) => {
    // Generate a virtual lead object
    const claim = leadMap.get(proj.id)
    const virtualLead = {
      id: claim?.id || proj.id, // Use claim ID if exists, otherwise project ID
      status: claim?.status || 'new',
      unlocked_at: claim?.unlocked_at || null,
      created_at: proj.created_at,
      projects: proj
    }
    
    // Check if granted using the claim ID
    const isGranted = claim ? grantedSet.has(claim.id) : false

    const masked = maskLead(virtualLead, isPremium, now, isGranted)
    return {
      ...masked,
      id: proj.id, // Explicitly expose project ID as primary ID for the frontend routing
      claim_id: claim?.id || null, // Pass claim ID for reference
      qualify_score: proj.qualify_score ?? 0,
      qualify_budget: proj.qualify_budget ?? false,
      qualify_phone: proj.qualify_phone ?? false,
      qualify_description: proj.qualify_description ?? false,
      qualify_returning: proj.qualify_returning ?? false,
    }
  })

  return { leads: enriched, isPremium }
})

