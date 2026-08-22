import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// 05.10-06 (B2B-04) : file d'attente des demandes partenaires B2B.
// Retourne les demandes triées par created_at DESC + la liste des admins (assignation).

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any

  const query = getQuery(event)
  const status = typeof query.status === 'string' && query.status ? query.status : null

  let builder = supabase
    .from('b2b_requests')
    .select('*, assigned:auth.users(email)', { count: 'exact' })

  if (status) builder = builder.eq('status', status)

  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Liste des admins pour le champ « chargé d'affaires » (assigned_to)
  let admins: { id: string; email: string }[] = []
  try {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 200 })
    admins = (users?.users || [])
      .filter((u: any) => u.app_metadata?.role === 'admin')
      .map((u: any) => ({ id: u.id, email: u.email }))
  } catch {
    // non bloquant — le dropdown d'assignation restera vide
  }

  return {
    requests: data || [],
    admins,
    total: count || 0,
  }
})
