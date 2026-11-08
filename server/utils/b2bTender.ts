import { z } from 'zod'
import { PHONE_FR_REGEX, PERSON_NAME_REGEX, COMPANY_NAME_REGEX, CERTIFICATION_REGEX } from '../../app/utils/contactFields'

// Phase 7 — TEND-01 / TEND-05.
// Schéma extrait de server/api/v1/b2b/requests.post.ts pour être testable sans
// charger le handler Nitro (#supabase/server n'est pas résolvable sous vitest).

export const B2B_LOT_CATEGORIES = ['maconnerie', 'toiture', 'electricite', 'plomberie', 'peinture', 'isolation'] as const
export const B2B_CALENDRIERS = ['urgent', 'sous_3_mois', '3_6_mois', 'plus_6_mois'] as const
export type B2bLotCategory = typeof B2B_LOT_CATEGORIES[number]

export const b2bRequestSchema = z.object({
  apporteur_type: z.enum(['architecte', 'bet', 'agence_immo', 'syndic', 'diagnostiqueur', 'autre']),
  need_type: z.enum(['projet_immediat', 'partenariat_regulier']),
  project_location: z.string().trim().max(200).nullish(),
  // TEND-01 — même contrainte que le formulaire particulier (projects.post.ts).
  description: z.string().max(5000).nullish(),
  budget_range: z.enum(['<30k', '30-100k', '100-300k', '>300k']).nullish(),
  certification_number: z.string().trim().regex(CERTIFICATION_REGEX, 'Numéro de certification invalide.').nullish(),
  travaux_suggeres: z.array(z.enum(['isolation', 'chauffage', 'electricite', 'toiture'])).max(4).optional().nullable(),
  // TEND-05 — corps de métier demandés, 1 lot chacun.
  lots_categories: z.array(z.enum(B2B_LOT_CATEGORIES)).max(6).optional().nullable(),
  // 05.21 — travaux attendus par lot (clé = corps de métier) et infos structurées du chantier.
  lots_details: z.record(z.string().max(30), z.string().max(1000)).optional().nullable(),
  nb_logements: z.number().int().min(1).max(9999).optional().nullable(),
  surface_m2: z.number().int().min(1).max(1000000).optional().nullable(),
  calendrier_souhaite: z.enum(B2B_CALENDRIERS).optional().nullable(),
  files: z.array(z.object({
    file_key: z.string().max(500),
    filename: z.string().max(255),
    content_type: z.string().max(100),
    size: z.number().max(52428800), // 50 Mo
  })).max(10).optional().default([]),
  contact_name: z.string().trim().regex(PERSON_NAME_REGEX, 'Nom invalide (lettres, espaces, apostrophes et tirets uniquement, 2 à 100 caractères).'),
  contact_company: z.string().trim().regex(COMPANY_NAME_REGEX, 'Nom de structure invalide.').nullish(),
  contact_phone: z.string().trim().regex(PHONE_FR_REGEX, 'Téléphone invalide : chiffres uniquement, ex. 06 12 34 56 78 ou +33 6 12 34 56 78.'),
  contact_email: z.string().trim().toLowerCase().email().max(254),
  consent_accepted: z.boolean().refine(v => v === true, { message: 'Le consentement est obligatoire.' }),
}).superRefine((data, ctx) => {
  // L'étape 3 du tunnel (description + lots) est sautée pour un partenariat
  // régulier — la description n'est exigée que sur un projet immédiat.
  if (data.need_type !== 'projet_immediat') return
  // 05.21 — chaque lot demandé par un syndic doit dire quels travaux sont attendus.
  if (data.apporteur_type === 'syndic') {
    for (const c of data.lots_categories ?? []) {
      if ((data.lots_details?.[c] ?? '').trim().length < 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lots_details', c], message: 'Décrivez les travaux de ce lot (10 caractères minimum).' })
      }
    }
  }
  if (!data.description || data.description.trim().length < 20) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['description'],
      message: 'La description doit faire au moins 20 caractères.',
    })
  }
})

export type B2bRequestInput = z.infer<typeof b2bRequestSchema>

/**
 * TEND-05 — 1 lot par corps de métier. Réservé au persona syndic en Phase 7
 * (seul persona qui expose le sélecteur multi-lots dans le tunnel).
 * ponytail: dédoublonnage ici plutôt que de compter sur l'erreur
 * UNIQUE (request_id, category) qui ferait échouer l'insert en bloc.
 */
export function buildTenderLots(
  requestId: string,
  apporteurType: string,
  categories: string[] | null | undefined,
  details?: Record<string, string> | null,
): { request_id: string; category: B2bLotCategory; description: string | null }[] {
  if (apporteurType !== 'syndic' || !categories?.length) return []
  const seen = new Set<string>()
  const lots: { request_id: string; category: B2bLotCategory; description: string | null }[] = []
  for (const c of categories) {
    if (!B2B_LOT_CATEGORIES.includes(c as B2bLotCategory) || seen.has(c)) continue
    seen.add(c)
    lots.push({ request_id: requestId, category: c as B2bLotCategory, description: details?.[c]?.trim() || null })
  }
  return lots
}
