import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const supabase = await serverSupabaseServiceRole(event) as any
  const query = getQuery(event)

  const limit = Math.min(parseInt(query.limit as string) || 50, 200)
  const offset = parseInt(query.offset as string) || 0

  const { data, error, count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Résolution des emails via l'API admin — l'embedding `actor:auth.users(email)`
  // échoue (parse error PostgREST) sur cette instance, comme pour b2b_requests.
  const emailById = new Map<string, string>()
  try {
    const actorIds = [...new Set((data || []).map((l: any) => l.actor_id).filter(Boolean))]
    if (actorIds.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      for (const u of (users?.users || [])) {
        if (u.email) emailById.set(u.id, u.email)
      }
    }
  } catch {
    // non bloquant
  }

  const logs = (data || []).map((l: any) => ({
    ...l,
    actor: l.actor_id ? { email: emailById.get(l.actor_id) || null } : null,
  }))

  return {
    logs,
    total: count || 0,
    limit,
    offset,
  }
})
