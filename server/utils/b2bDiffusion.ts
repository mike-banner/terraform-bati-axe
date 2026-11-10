/**
 * Phase 8 — Gardes de la diffusion automatique des AO partenaires.
 *
 * Écart D-09 résolu ici : CONTEXT.md évoque un statut 'clos' pour b2b_requests,
 * qui n'existe PAS dans la contrainte CHECK réelle
 * (nouveau|en_cours|rappele|qualifie|converti|perdu). Confusion avec
 * b2b_tender_lots.status (open|claimed|closed). Aucun mécanisme de la Phase 8 ne
 * pose 'clos' sur b2b_requests, et la clôture auto est en Phase 9 (TEND-12) :
 * on liste donc positivement les statuts actifs plutôt qu'un NOT IN.
 */
export const ACTIVE_TENDER_STATUSES = ['nouveau', 'en_cours', 'rappele', 'qualifie'] as const

/**
 * D-02 / TEND-10 : un AO n'est diffusable que si le DirCo a renseigné le statut
 * de décision ET un code postal exploitable par matchZone().
 */
export function assertDiffusable(req: { status?: string | null; assigned_to?: string | null; decision_status?: string | null; project_postal_code?: string | null }) {
  // Le dossier doit être qualifié (statut « qualifie ») et avoir un chargé d'affaires.
  if (req.status !== 'qualifie') {
    throw createError({
      statusCode: 422,
      statusMessage: 'Qualifiez le dossier (statut « Qualifié ») avant de diffuser aux artisans.',
    })
  }
  if (!req.assigned_to) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Assignez un chargé d\'affaires au dossier avant de diffuser aux artisans.',
    })
  }
  if (!req.decision_status) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Renseignez le statut de décision du dossier avant de diffuser aux artisans.',
    })
  }
  if (!req.project_postal_code || !/^\d{5}$/.test(req.project_postal_code)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Renseignez un code postal de chantier valide (5 chiffres) avant de diffuser aux artisans.',
    })
  }
}

/**
 * D-09 / TEND-11 : plafond d'AO actifs simultanés par partenaire.
 * `activeCount` inclut le dossier en cours de diffusion.
 */
export function assertTenderQuota(activeCount: number, max: number) {
  if (activeCount > max) {
    throw createError({
      statusCode: 409,
      statusMessage: `Ce partenaire a déjà ${activeCount} appels d'offres actifs (plafond : ${max}). Clôturez-en un (statut « converti » ou « perdu ») avant de diffuser celui-ci.`,
    })
  }
}

// Phase 05.21 — aucun dossier n'est diffusé (ni restitué) sans convention de partenariat signée (D-03 : pas de rattrapage).
export function assertPartnerFrameworkSigned(signed: boolean) {
  if (!signed) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Le partenaire n\'a pas encore signé la convention de partenariat : diffusion impossible. Renvoyez-lui le lien de signature depuis la fiche du dossier.',
    })
  }
}
