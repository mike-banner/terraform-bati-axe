import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { maskLead } from '../../../utils/maskLead'

export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de lead manquant.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: pro, error: proError } = await supabase
    .from('professionals')
    .select('id, subscription_status, free_leads_used')
    .eq('id', user.id)
    .single()

  if (proError || !pro) {
    throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })
  }

  const isPremium = pro.subscription_status === 'active'

  // 1. Check if project exists
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, category, budget_range, timeline_range, description, customer_name, customer_email, customer_phone, postal_code, created_at')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable.' })
  }

  // 2. Fetch or mock the lead claim
  const { data: lead } = await supabase
    .from('leads')
    .select('id, status, unlocked_at')
    .eq('project_id', id)
    .eq('pro_id', user.id)
    .single()

  const virtualLead = {
    id: lead?.id || project.id,
    status: lead?.status || 'new',
    unlocked_at: lead?.unlocked_at || null,
    created_at: project.created_at,
    projects: project
  }

  // D-01/D-02/D-03/D-04: determine free-grant status and atomically issue grant if eligible
  let isFreeGranted = false
  const now = new Date()
  const alreadyTimeUnlocked = virtualLead.unlocked_at !== null && new Date(virtualLead.unlocked_at) <= now

  // Handle free grant logic
  if (!isPremium && !alreadyTimeUnlocked) {
    if (lead) {
      // Lead exists, check for existing grant
      const { data: existingGrant } = await supabase
        .from('free_lead_grants')
        .select('id')
        .eq('pro_id', user.id)
        .eq('lead_id', lead.id)
        .maybeSingle()

      if (existingGrant) {
        isFreeGranted = true
      }
    }

    if (!isFreeGranted && (pro.free_leads_used ?? 0) < 3) {
      // We need to issue a free grant.
      // First, ensure the lead row exists.
      let activeLeadId = lead?.id
      if (!lead) {
        const { data: newLead, error: leadInsertError } = await supabase
          .from('leads')
          .insert({ project_id: id, pro_id: user.id, status: 'unlocked', unlocked_at: now.toISOString() })
          .select('id')
          .single()
        
        if (newLead) {
          activeLeadId = newLead.id
          virtualLead.id = newLead.id
          virtualLead.status = 'unlocked'
          virtualLead.unlocked_at = now.toISOString()
        }
      }

      if (activeLeadId) {
        // Atomic insert
        const { error: insertError } = await supabase
          .from('free_lead_grants')
          .insert({ pro_id: user.id, lead_id: activeLeadId })

        if (!insertError || insertError.code === '23505') {
          isFreeGranted = true
          await supabase
            .from('professionals')
            .update({ free_leads_used: (pro.free_leads_used ?? 0) + 1 })
            .eq('id', user.id)
            .eq('free_leads_used', pro.free_leads_used ?? 0)
        }
      }
    }
  }

  const masked = maskLead(virtualLead, isPremium, now, isFreeGranted)

  return { lead: { ...masked, id: project.id, claim_id: lead?.id || null } }
})
