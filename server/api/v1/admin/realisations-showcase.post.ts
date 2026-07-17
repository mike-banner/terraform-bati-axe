import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const schema = z.object({
  project_id: z.string().uuid(),
  is_showcased: z.boolean()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Données invalides.' })

  const { project_id, is_showcased } = parsed.data
  const supabase = await serverSupabaseServiceRole(event) as any

  await supabase.from('completed_projects').update({ is_showcased }).eq('id', project_id)

  await supabase.from('audit_logs').insert({
    actor_id: (user as any).id,
    action: 'showcase_toggled',
    target_table: 'completed_projects',
    target_id: project_id,
    metadata: { is_showcased }
  })

  return { status: 'SUCCESS', is_showcased }
})
