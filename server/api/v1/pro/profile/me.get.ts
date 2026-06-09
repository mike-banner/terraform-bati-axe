import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// CNV-05 D-14: authenticated pro reads own editable profile
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: pro, error } = await supabase
    .from('professionals')
    .select('id, canonical_slug, short_id, postal_code, category, bio, zone, logo_url, company_name, full_name, is_verified, subscription_status')
    .eq('id', user.id)
    .single()

  if (error || !pro) throw createError({ statusCode: 404, statusMessage: 'Profil professionnel introuvable.' })

  const dept = pro.postal_code ? String(pro.postal_code).slice(0, 2) : null

  return { profile: { ...pro, dept } }
})
