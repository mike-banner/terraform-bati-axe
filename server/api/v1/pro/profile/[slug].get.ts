import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  const parts = slug.split('-')
  const shortId = parts[parts.length - 1]

  if (!shortId || shortId.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de profil invalide.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any

  // Check if requester is admin (optional — anonymous requests are fine for public view)
  let isAdmin = false
  try {
    const user = await serverSupabaseUser(event)
    isAdmin = (user as any)?.app_metadata?.role === 'admin'
  } catch { /* anonymous visitor */ }

  const { data: pro, error } = await supabase
    .from('professionals')
    .select('id, company_name, full_name, email, phone, canonical_slug, short_id, category, bio, zone, logo_url, is_verified, is_claimed, decennal_status, created_at')
    .eq('short_id', shortId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur serveur.' })
  if (!pro) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable.' })

  const needsRedirect = slug !== pro.canonical_slug

  // Fetch verifications only for admin
  let verifications: any[] = []
  if (isAdmin) {
    const { data: verifs } = await supabase
      .from('verifications')
      .select('id, document_type, file_key, status, expiry_date, reviewed_at, created_at')
      .eq('pro_id', pro.id)
      .order('created_at', { ascending: false })
    verifications = verifs || []
  }

  return {
    status: 'SUCCESS',
    needsRedirect,
    canonicalSlug: pro.canonical_slug as string,
    isAdmin,
    pro: {
      id: pro.id as string,
      company_name: pro.company_name as string,
      full_name: pro.full_name as string,
      email: isAdmin ? (pro.email as string) : null,
      phone: isAdmin ? (pro.phone as string) : null,
      category: pro.category as string | null,
      bio: pro.bio as string | null,
      zone: pro.zone as string | null,
      logo_url: pro.logo_url as string | null,
      is_verified: pro.is_verified as boolean,
      is_claimed: pro.is_claimed as boolean,
      decennal_status: pro.decennal_status as string,
      member_since: pro.created_at as string,
    },
    verifications: verifications.map((v: any) => ({
      id: v.id as string,
      document_type: v.document_type as 'kbis' | 'decennale',
      file_key: v.file_key as string,
      status: v.status as 'pending' | 'approved' | 'rejected',
      expiry_date: v.expiry_date as string | null,
      reviewed_at: v.reviewed_at as string | null,
      created_at: v.created_at as string,
    }))
  }
})
