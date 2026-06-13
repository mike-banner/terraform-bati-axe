import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabaseAuth = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant de lead manquant.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: pro, error: proError } = await supabase
    .from('professionals')
    .select('id, subscription_status')
    .eq('id', user.id)
    .single()

  if (proError || !pro) {
    throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })
  }

  // Premium-only: BASIC pros cannot claim leads (D-08 — T-04-09)
  if (pro.subscription_status !== 'active') {
    throw createError({ statusCode: 403, statusMessage: 'Réservé aux pros Premium.' })
  }

  // Verify project exists
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable.' })
  }

  // Check how many siblings are already claimed (Cap at 3)
  const { count: claimedCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', id)
    .eq('status', 'claimed')
    
  if ((claimedCount || 0) >= 3) {
    throw createError({ statusCode: 409, statusMessage: 'Ce projet a déjà été réclamé par le nombre maximum de professionnels (3).' })
  }

  // Check if pro already has a lead row
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, status')
    .eq('project_id', id)
    .eq('pro_id', user.id)
    .maybeSingle()

  // Idempotence guard
  if (lead?.status === 'claimed') {
    throw createError({ statusCode: 409, statusMessage: 'Ce projet est déjà attribué.' })
  }

  // Claim or Create the pro's lead row
  let activeLeadId = lead?.id
  if (lead) {
    const { error: claimError } = await supabase
      .from('leads')
      .update({ status: 'claimed' })
      .eq('id', lead.id)
    if (claimError) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la mise à jour.' })
  } else {
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({ project_id: id, pro_id: user.id, status: 'claimed', unlocked_at: new Date().toISOString() })
      .select('id')
      .single()
    if (insertError) throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la création.' })
    activeLeadId = newLead.id
  }

  // If this was the 3rd claim, we lock out the remaining pros
  if ((claimedCount || 0) + 1 >= 3) {
    await supabase
      .from('leads')
      .update({ status: 'claimed' }) // 'claimed' serves as the locked/hidden state for other pros
      .eq('project_id', id)
      .neq('status', 'claimed')
  }

  return { claimed: true, lead_id: activeLeadId }
})
