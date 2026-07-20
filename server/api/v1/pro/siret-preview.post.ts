import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'

const previewSchema = z.object({
  siret: z.string().regex(/^\d{14}$/, 'Le numéro SIRET doit faire exactement 14 chiffres.')
})

export default defineEventHandler(async (event) => {
  // Authentification requise (aucun accès DB necessaire, service role non utilise)
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Non autorisé. Veuillez vous connecter.'
    })
  }

  const body = await readBody(event)
  const validation = previewSchema.safeParse(body)
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SIRET invalide.',
      data: validation.error.format()
    })
  }

  const result = await lookupSiret(validation.data.siret)

  if (result.status === 'not_found' || result.status === 'error') {
    return { status: result.status, suggested_categories: [] }
  }

  return {
    status: result.status,
    company_name: result.company_name ?? null,
    suggested_categories: suggestCategoriesFromNaf(result.naf_code)
  }
})
