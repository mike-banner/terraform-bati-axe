import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const schema = z.object({ project_id: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const isAdmin = (user as any).app_metadata?.role === 'admin'
  if (!isAdmin) throw createError({ statusCode: 403, statusMessage: 'Accès réservé aux administrateurs.' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Données invalides.' })

  const { project_id } = parsed.data
  const supabase = await serverSupabaseServiceRole(event) as any

  // Mark project as qualified and get its category
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .update({ status: 'qualified' })
    .eq('id', project_id)
    .select('category')
    .single()

  if (projectError || !project) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable.' })
  }

  return { qualified: true }
})
