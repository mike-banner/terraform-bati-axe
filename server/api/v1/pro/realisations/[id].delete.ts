import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

// 05.5-03: suppression scopée RLS (manage_own_completed_projects) — aucun check ownership manuel requis
const idSchema = z.string().uuid('Identifiant invalide.')

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const id = getRouterParam(event, 'id')
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.message })

  const { error } = await supabase
    .from('completed_projects')
    .delete()
    .eq('id', parsed.data)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { status: 'SUCCESS' }
})
