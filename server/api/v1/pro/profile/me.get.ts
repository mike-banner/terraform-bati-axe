import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

// CNV-05 D-14: authenticated pro reads own editable profile
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const { data: pro, error } = await supabase
    .from('professionals')
    .select('id, canonical_slug, short_id, postal_code, category, bio, zone, logo_url, company_name, full_name, is_verified, subscription_status')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('[API] /me.get.ts Supabase error:', error)
  }
  if (error || !pro) {
    throw createError({ 
      statusCode: 404, 
      statusMessage: `Erreur Supabase: ${error?.message || 'Aucune ligne retournée (pro null)'}` 
    })
  }

  const dept = pro.postal_code ? String(pro.postal_code).slice(0, 2) : null

  return { profile: { ...pro, dept } }
})
