import { z } from 'zod'

// Phase 7 — TEND-01 / TEND-05.
// Schéma extrait de server/api/v1/b2b/requests.post.ts pour être testable sans
// charger le handler Nitro (#supabase/server n'est pas résolvable sous vitest).

export const B2B_LOT_CATEGORIES = ['maconnerie', 'toiture', 'electricite', 'plomberie', 'peinture', 'isolation'] as const
export type B2bLotCategory = typeof B2B_LOT_CATEGORIES[number]

export const b2bRequestSchema = z.object({
  apporteur_type: z.enum(['architecte', 'bet', 'agence_immo', 'syndic', 'diagnostiqueur', 'autre']),
  need_type: z.enum(['projet_immediat', 'partenariat_regulier']),
  project_location: z.string().max(200).optional(),
  // TEND-01 — même contrainte que le formulaire particulier (projects.post.ts).
  description: z.string().max(5000).optional(),
  budget_range: z.enum(['<30k', '30-100k', '100-300k', '>300k']).optional(),
  certification_number: z.string().max(50).optional().nullable(),
  travaux_suggeres: z.array(z.enum(['isolation', 'chauffage', 'electricite', 'toiture'])).max(4).optional().nullable(),
  // TEND-05 — corps de métier demandés, 1 lot chacun.
  lots_categories: z.array(z.enum(B2B_LOT_CATEGORIES)).max(6).optional().nullable(),
  files: z.array(z.object({
    file_key: z.string(),
    filename: z.string().max(255),
    content_type: z.string(),
    size: z.number().max(52428800), // 50 Mo
  })).max(10).optional().default([]),
  contact_name: z.string().min(2).max(100),
  contact_company: z.string().max(200).optional(),
  contact_phone: z.string().min(8).max(20),
  contact_email: z.string().email(),
  consent_accepted: z.boolean().refine(v => v === true, { message: 'Le consentement est obligatoire.' }),
}).superRefine((data, ctx) => {
  // L'étape 3 du tunnel (description + lots) est sautée pour un partenariat
  // régulier — la description n'est exigée que sur un projet immédiat.
  if (data.need_type !== 'projet_immediat') return
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
): { request_id: string; category: B2bLotCategory }[] {
  if (apporteurType !== 'syndic' || !categories?.length) return []
  const seen = new Set<string>()
  const lots: { request_id: string; category: B2bLotCategory }[] = []
  for (const c of categories) {
    if (!B2B_LOT_CATEGORIES.includes(c as B2bLotCategory) || seen.has(c)) continue
    seen.add(c)
    lots.push({ request_id: requestId, category: c as B2bLotCategory })
  }
  return lots
}
