import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// 05.10-06 (B2B-04) : file d'attente des demandes partenaires B2B.
// Retourne les demandes triées par created_at DESC + la liste des admins (assignation).
// NB : les emails (assigné + admins) sont résolus via l'API admin — l'embedding
// PostgREST `assigned:auth.users(email)` échoue (parse error) sur cette instance.

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
    .select('*', { count: 'exact' })

  if (status) builder = builder.eq('status', status)

  const { data, error, count } = await builder
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Résolution des emails (assigné + admins) via l'API admin — un seul appel
  const emailById = new Map<string, string>()
  let admins: { id: string; email: string }[] = []
  try {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    for (const u of (users?.users || [])) {
      if (u.email) emailById.set(u.id, u.email)
      if (u.app_metadata?.role === 'admin') admins.push({ id: u.id, email: u.email })
    }
  } catch {
    // non bloquant — le dropdown d'assignation restera vide
  }

  const requests = (data || []).map((r: any) => ({
    ...r,
    assigned: r.assigned_to ? { email: emailById.get(r.assigned_to) || null } : null,
  }))

  return {
    requests,
    admins,
    total: count || 0,
  }
})
