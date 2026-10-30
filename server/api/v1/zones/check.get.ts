import { z } from 'zod'
import { serverSupabaseServiceRole } from '#supabase/server'
import { matchZone } from '../../../utils/zoneMatcher'

// Couverture d'un code postal pour le simulateur : la table `zones` fait foi,
// ouvrir un secteur = activer une zone en base, sans toucher au front.
const querySchema = z.object({
  postal_code: z.string().regex(/^\d{5}$/, 'Le code postal doit comporter 5 chiffres.'),
})

export default defineEventHandler(async (event) => {
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Code postal invalide.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any
  const zone = await matchZone(supabase, parsed.data.postal_code)

  return { covered: !!zone, zone_name: zone?.name ?? null }
})
