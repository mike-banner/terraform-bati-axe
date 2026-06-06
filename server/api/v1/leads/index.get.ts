import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { maskLead } from '~/server/utils/maskLead'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

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

  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id, status, unlocked_at, created_at, projects(id, category, budget_range, timeline_range, description, customer_name, customer_email, customer_phone, postal_code)')
    .eq('pro_id', user.id)
    .order('created_at', { ascending: false })

  if (leadsError) {
    throw createError({ statusCode: 500, statusMessage: 'Erreur lors de la récupération des leads.' })
  }

  const now = new Date()
  const masked = (leads || []).map((lead: any) => maskLead(lead, isPremium, now))

  return { leads: masked }
})
