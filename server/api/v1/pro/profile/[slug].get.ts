import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  // Extract short_id — last segment after the final '-'
  const parts = slug.split('-')
  const shortId = parts[parts.length - 1]

  if (!shortId || shortId.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de profil invalide.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: pro, error } = await supabase
    .from('professionals')
    .select('id, company_name, full_name, phone, postal_code, canonical_slug, short_id, is_verified, decennal_status, created_at')
    .eq('short_id', shortId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur serveur.' })
  if (!pro) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable.' })

  // Only expose verified or claimed profiles
  if (!pro.is_verified && !pro.is_claimed) {
    throw createError({ statusCode: 404, statusMessage: 'Profil non encore disponible.' })
  }

  const slugFromUrl = slug
  const needsRedirect = slugFromUrl !== pro.canonical_slug

  return {
    status: 'SUCCESS',
    needsRedirect,
    canonicalSlug: pro.canonical_slug,
    pro: {
      id: pro.id,
      company_name: pro.company_name,
      full_name: pro.full_name,
      postal_code: pro.postal_code,
      is_verified: pro.is_verified,
      decennal_status: pro.decennal_status,
      member_since: pro.created_at,
    }
  }
})
