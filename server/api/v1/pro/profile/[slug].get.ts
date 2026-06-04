import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  const parts = slug.split('-')
  const shortId = parts[parts.length - 1]

  if (!shortId || shortId.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de profil invalide.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any

  const { data: pro, error } = await supabase
    .from('professionals')
    .select('id, company_name, full_name, canonical_slug, short_id, category, is_verified, is_claimed, decennal_status, created_at')
    .eq('short_id', shortId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur serveur.' })
  if (!pro) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable.' })

  const needsRedirect = slug !== pro.canonical_slug

  return {
    status: 'SUCCESS',
    needsRedirect,
    canonicalSlug: pro.canonical_slug as string,
    pro: {
      id: pro.id as string,
      company_name: pro.company_name as string,
      full_name: pro.full_name as string,
      category: pro.category as string | null,
      is_verified: pro.is_verified as boolean,
      is_claimed: pro.is_claimed as boolean,
      decennal_status: pro.decennal_status as string,
      member_since: pro.created_at as string,
    }
  }
})
