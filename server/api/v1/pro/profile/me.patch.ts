import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

// CNV-05 D-14/D-15: editable fields; canonical_slug is immutable (T-04.5-15)
const VALID_CATEGORIES = ['maconnerie', 'toiture', 'electricite', 'plomberie', 'peinture', 'isolation'] as const

const patchSchema = z.object({
  bio: z.string().max(500, 'La présentation ne peut dépasser 500 caractères.').nullable().optional(),
  zone: z.string().max(200, "La zone d'intervention ne peut dépasser 200 caractères.").nullable().optional(),
  categories: z.array(z.enum(VALID_CATEGORIES, { message: 'Catégorie invalide.' })).optional(),
  logo_url: z.string().url('URL de logo invalide.').nullable().optional(),
}).strict()

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event) as any
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const body = await readBody(event)
  if (body.bio === '') body.bio = null
  if (body.zone === '') body.zone = null
  if (body.logo_url === '') body.logo_url = null
  
  // Backwards compatibility during transition
  if (body.category !== undefined && body.categories === undefined) {
    if (body.category === '' || body.category === null) {
      body.categories = []
    } else {
      body.categories = [body.category]
    }
    delete body.category
  }
  
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.message })

  const { error } = await supabase
    .from('professionals')
    .update(parsed.data)
    .eq('id', user.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { data: pro } = await supabase
    .from('professionals')
    .select('id, canonical_slug, short_id, postal_code, categories, bio, zone, logo_url, company_name, full_name, is_verified, subscription_status')
    .eq('id', user.id)
    .single()

  const dept = pro?.postal_code ? String(pro.postal_code).slice(0, 2) : null

  return { updated: true, profile: pro ? { ...pro, dept } : null }
})
