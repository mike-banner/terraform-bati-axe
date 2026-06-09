import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { maskLead } from '../../../utils/maskLead'

export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const config = useRuntimeConfig(event)
  const env = event.context.cloudflare?.env || {}
  const supabaseUrl = env.NUXT_PUBLIC_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw createError({ statusCode: 500, statusMessage: 'Configuration Supabase manquante sur le serveur.' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: pro, error: proError } = await supabase
    .from('professionals')
    .select('id, subscription_status')
    .eq('id', user.id)
    .single()

  if (proError || !pro) {
    throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })
  }

  const isPremium = pro.subscription_status === 'active'

  // D-03: resolve free grants for this pro to pass to maskLead (read-only, no counter mutation here)
  const { data: grants } = await supabase
    .from('free_lead_grants')
    .select('lead_id')
    .eq('pro_id', user.id)
  const grantedSet = new Set((grants || []).map((g: any) => g.lead_id))

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, status, unlocked_at, created_at, projects(id, category, budget_range, timeline_range, description, customer_name, customer_email, customer_phone, postal_code, qualify_score, qualify_budget, qualify_phone, qualify_description, qualify_returning)')
    .eq('pro_id', user.id)
    .order('created_at', { ascending: false })

  if (leadsError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des leads.' })
  }

  const now = new Date()
  const enriched = (leads || []).map((lead: any) => {
    const masked = maskLead(lead, isPremium, now, grantedSet.has(lead.id))
    const proj = lead.projects || {}
    return {
      ...masked,
      qualify_score: proj.qualify_score ?? 0,
      qualify_budget: proj.qualify_budget ?? false,
      qualify_phone: proj.qualify_phone ?? false,
      qualify_description: proj.qualify_description ?? false,
      qualify_returning: proj.qualify_returning ?? false,
    }
  })

  return { leads: enriched, isPremium }
})
