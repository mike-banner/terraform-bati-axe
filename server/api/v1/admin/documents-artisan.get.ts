import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// 05.11-04 (B2B-SC-01/04) : coffre-fort juridique — liste des documents artisan
// avec devoir de vigilance (needs_review : last_reviewed_at null ou > 6 mois).

const REVIEW_INTERVAL_MS = 6 * 30 * 24 * 3600 * 1000

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const query = getQuery(event)
  const status = typeof query.status === 'string' && query.status ? query.status : null
  const onlyReview = query.needs_review === 'true'

  let builder = supabase
    .from('documents_artisan')
    .select('*, professional:professionals(id, company_name, full_name, is_verified, is_available_subcontracting, workforce_size)', { count: 'exact' })

  if (status) builder = builder.eq('status', status)

  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const now = Date.now()
  const docs = (data || []).map((d: any) => {
    const reviewedAt = d.last_reviewed_at ? new Date(d.last_reviewed_at).getTime() : null
    const needsReview = reviewedAt === null || (now - reviewedAt) > REVIEW_INTERVAL_MS
    return { ...d, needs_review: needsReview }
  })

  return {
    documents: onlyReview ? docs.filter((d: any) => d.needs_review) : docs,
    total: count || 0,
  }
})
