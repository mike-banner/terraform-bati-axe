import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { createHash } from 'node:crypto'

const schema = z.object({ project_id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const parsed = schema.safeParse({ project_id: getRouterParam(event, 'id') })
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Requête invalide.' })

  const { project_id: projectId } = parsed.data
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const ipHash = createHash('sha256').update(`${ip}:${projectId}`).digest('hex')

  const supabase = await serverSupabaseServiceRole(event) as any
  const { error } = await supabase.from('likes').insert({ project_id: projectId, ip_hash: ipHash })

  // Doublon (code Postgres 23505) = déjà liké, pas une erreur
  if (error && error.code !== '23505') {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  return { status: 'SUCCESS', likes: count ?? 0 }
})
