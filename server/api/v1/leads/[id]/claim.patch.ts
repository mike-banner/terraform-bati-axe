import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

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

  // Verify ownership — prevents cross-pro access (T-04-10)
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, status, pro_id, project_id')
    .eq('id', id)
    .eq('pro_id', user.id)
    .single()

  if (leadError || !lead) {
    throw createError({ statusCode: 404, statusMessage: 'Lead introuvable.' })
  }

  // Idempotence guard — already claimed (T-04-11)
  if (lead.status === 'claimed') {
    throw createError({ statusCode: 409, statusMessage: 'Ce lead est déjà attribué.' })
  }

  // Claim the pro's own lead row (double ownership check on update — T-04-10)
  const { error: claimError } = await supabase
    .from('leads')
    .update({ status: 'claimed' })
    .eq('id', id)
    .eq('pro_id', user.id)

  if (claimError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la mise à jour du lead.' })
  }

  // Propagate claimed status to sibling leads so BASIC pros see "Déjà attribué" (D-10)
  await supabase
    .from('leads')
    .update({ status: 'claimed' })
    .eq('project_id', lead.project_id)
    .neq('pro_id', user.id)

  return { claimed: true, lead_id: id }
})
