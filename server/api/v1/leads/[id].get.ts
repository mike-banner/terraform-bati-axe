import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { maskLead } from '../../../utils/maskLead'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

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

  // Ownership enforced via .eq('pro_id', user.id) — prevents cross-pro data access (T-04-07)
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, status, unlocked_at, created_at, projects(id, category, budget_range, timeline_range, description, customer_name, customer_email, customer_phone, postal_code)')
    .eq('id', id)
    .eq('pro_id', user.id)
    .single()

  if (leadError || !lead) {
    throw createError({ statusCode: 404, statusMessage: 'Lead introuvable.' })
  }

  // D-01/D-02/D-03/D-04: determine free-grant status and atomically issue grant if eligible
  let isFreeGranted = false
  const now = new Date()
  const alreadyTimeUnlocked = lead.unlocked_at !== null && new Date(lead.unlocked_at) <= now

  if (!isPremium && !alreadyTimeUnlocked) {
    // Check for existing grant (idempotent re-view — D-03)
    const { data: existingGrant } = await supabase
      .from('free_lead_grants')
      .select('id')
      .eq('pro_id', user.id)
      .eq('lead_id', id)
      .maybeSingle()

    if (existingGrant) {
      isFreeGranted = true
    } else if ((pro.free_leads_used ?? 0) < 3) {
      // Atomic insert — UNIQUE (pro_id, lead_id) guards against race conditions (T-04.5-08)
      const { error: insertError } = await supabase
        .from('free_lead_grants')
        .insert({ pro_id: user.id, lead_id: id })

      if (!insertError || insertError.code === '23505') {
        isFreeGranted = true
        // Optimistic concurrency: only increment if counter still matches read value
        await supabase
          .from('professionals')
          .update({ free_leads_used: (pro.free_leads_used ?? 0) + 1 })
          .eq('id', user.id)
          .eq('free_leads_used', pro.free_leads_used ?? 0)
      }
    }
  }

  const masked = maskLead(lead, isPremium, now, isFreeGranted)

  return { lead: masked }
})
