import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const schema = z.object({
  pro_id: z.string().uuid(),
  approved: z.boolean()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Données invalides.' })

  const { pro_id, approved } = parsed.data
  const supabase = await serverSupabaseServiceRole(event) as any

  await supabase
    .from('professionals')
    .update({ is_verified: approved })
    .eq('id', pro_id)

  await supabase.from('audit_logs').insert({
    actor_id: (user as any).id,
    action: 'doc_validated',
    target_table: 'professionals',
    target_id: pro_id,
    metadata: { manual_approval: true, approved }
  })

  return { status: 'SUCCESS', approved }
})
