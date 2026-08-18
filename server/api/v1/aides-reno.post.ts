import { z } from 'zod'
import { resolveInseeFromCodePostal } from '../../utils/codePostalToInsee'
import { buildSituationQuery, computeAidesSummary } from '../../utils/aidesReno'

const schema = z.object({
  situation: z.object({
    revenu_classe: z.string().max(30),
    logement_type: z.string().max(30),
    statut_proprietaire: z.string().max(30),
    periode_construction: z.string().max(30),
    residence_principale: z.boolean(),
    nb_personnes: z.number().int().min(1).max(12),
    code_postal: z.string().regex(/^\d{5}$/),
  }),
  cout_travaux_min: z.number().nonnegative(),
  cout_travaux_max: z.number().nonnegative(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validation = schema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation failed',
      data: validation.error.format(),
    })
  }

  const { situation, cout_travaux_min, cout_travaux_max } = validation.data

  const inseeCode = await resolveInseeFromCodePostal(situation.code_postal)
  if (!inseeCode) {
    return { ok: false, reason: 'unavailable' }
  }

  const query = {
    fields: 'eligibilite',
    ...buildSituationQuery(situation, inseeCode),
  }

  try {
    const reponse = await $fetch<any[]>('https://mesaides.france-renov.gouv.fr/api/v1', {
      query,
      signal: AbortSignal.timeout(8000),
    })
    return computeAidesSummary(reponse, cout_travaux_min, cout_travaux_max)
  } catch {
    // D-04 / RESEARCH Pitfall 2 : tout non-200 OU erreur réseau OU timeout → dégrader, jamais throw 500 vers le client.
    return { ok: false, reason: 'unavailable' }
  }
})
