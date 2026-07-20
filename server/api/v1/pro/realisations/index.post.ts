import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

// 05.5-03: création d'une réalisation. Le champ de mise en avant est réservé admin (plan 04).
const createSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.').max(100, 'Le titre ne peut dépasser 100 caractères.'),
  description: z.string().max(500, 'La description ne peut dépasser 500 caractères.').nullable().optional(),
  city: z.string().max(100, 'La ville ne peut dépasser 100 caractères.').nullable().optional(),
  image_urls: z.array(z.string().url('URL de photo invalide.')).min(1, 'Au moins une photo est requise.').max(20, 'Vous ne pouvez pas ajouter plus de 20 photos.'),
}).strict()

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const body = await readBody(event)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.message })

  const { data, error } = await supabase
    .from('completed_projects')
    .insert({ ...parsed.data, professional_id: user.id })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { status: 'SUCCESS', realisation: data }
})
