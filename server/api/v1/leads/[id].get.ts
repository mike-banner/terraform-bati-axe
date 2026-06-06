import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { maskLead } from '~/server/utils/maskLead'

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

  const masked = maskLead(lead, isPremium, new Date())

  return { lead: masked }
})
