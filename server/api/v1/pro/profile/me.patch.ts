import { z } from 'zod'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

// CNV-05 D-14/D-15: editable fields; canonical_slug is immutable (T-04.5-15)
const VALID_CATEGORIES = ['maconnerie', 'toiture', 'electricite', 'plomberie', 'peinture', 'isolation'] as const

const patchSchema = z.object({
  bio: z.string().max(500, 'La présentation ne peut dépasser 500 caractères.').optional(),
  zone: z.string().max(200, "La zone d'intervention ne peut dépasser 200 caractères.").optional(),
  category: z.enum(VALID_CATEGORIES, { message: 'Catégorie invalide.' }).optional(),
  logo_url: z.string().url('URL de logo invalide.').optional(),
}).strict() // D-15: canonical_slug, short_id, subscription_status etc. are rejected

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })

  const body = await readBody(event)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.message })

  const supabase = await serverSupabaseServiceRole(event) as any

  const { error } = await supabase
    .from('professionals')
    .update(parsed.data)
    .eq('id', user.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { data: pro } = await supabase
    .from('professionals')
    .select('id, canonical_slug, short_id, postal_code, category, bio, zone, logo_url, company_name, full_name, is_verified, subscription_status')
    .eq('id', user.id)
    .single()

  const dept = pro?.postal_code ? String(pro.postal_code).slice(0, 2) : null

  return { updated: true, profile: pro ? { ...pro, dept } : null }
})
