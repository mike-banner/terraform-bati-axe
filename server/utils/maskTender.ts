export interface TenderLotRow {
  id: string
  category: string
  status: string
  created_at: string | null
  zone_name?: string | null
  claimed_at?: string | null
  description?: string | null // 05.21 — travaux attendus pour CE lot (saisis par le partenaire)
  b2b_requests?: {
    id: string
    description?: string | null
    project_location?: string | null
    nb_logements?: number | null
    surface_m2?: number | null
    calendrier_souhaite?: string | null
    project_postal_code?: string | null
    budget_range?: string | null
    qualifications_requises?: string[] | null
    planning_start?: string | null
    planning_end?: string | null
    decision_status?: string | null
    contact_name?: string | null
    contact_company?: string | null
    contact_phone?: string | null
    contact_email?: string | null
  } | null
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null
  return s.length <= n ? s : s.slice(0, n) + '…'
}

/**
 * TEND-09 / D-05 — miroir de maskLead() pour les AO partenaires.
 * Tant que l'artisan n'a pas claim le lot, aucune coordonnée ni donnée
 * géolocalisante ne sort du serveur (ADR-004).
 */
export function maskTender(lot: TenderLotRow, claimed: boolean): Record<string, any> {
  const req: Partial<NonNullable<TenderLotRow['b2b_requests']>> = lot.b2b_requests || {}

  const common = {
    lot_id: lot.id,
    request_ref: (req.id || '').slice(0, 8).toUpperCase(),
    category: lot.category,
    lot_status: lot.status,
    zone_name: lot.zone_name ?? null,
    budget_range: req.budget_range ?? null,
    decision_status: req.decision_status ?? 'en_attente',
    created_at: lot.created_at,
    // 05.21 — infos de chantier non identifiantes : visibles avant l'engagement pour décider en connaissance de cause.
    nb_logements: req.nb_logements ?? null,
    surface_m2: req.surface_m2 ?? null,
    calendrier_souhaite: req.calendrier_souhaite ?? null,
    lot_description: lot.description ?? null,
    // Qualification du dossier (non identifiante) : visible avant l'engagement pour que l'artisan s'auto-sélectionne.
    qualifications_requises: req.qualifications_requises ?? [],
    planning_start: req.planning_start ?? null,
    planning_end: req.planning_end ?? null,
  }

  if (!claimed) {
    return {
      ...common,
      status: 'locked',
      description: truncate(req.description, 200),
      contact_name: '*** *** ***',
      contact_company: '*** *** ***',
      contact_phone: '*** *** ***',
      contact_email: 'contact@***.fr',
    }
  }

  return {
    ...common,
    status: 'claimed',
    claimed_at: lot.claimed_at ?? null,
    description: req.description ?? null,
    postal_code: req.project_postal_code ?? null,
    project_location: req.project_location ?? null,
    contact_name: req.contact_name ?? null,
    contact_company: req.contact_company ?? null,
    contact_phone: req.contact_phone ?? null,
    contact_email: req.contact_email ?? null,
  }
}

// Phase 05.21 — règle UNIQUE de démasquage d'un AO : claim ET avenant signé.
export function isTenderRevealed(claim: { claimed_at?: string | null } | null | undefined, amendment: { id: string } | null | undefined): boolean {
  return Boolean(claim) && Boolean(amendment?.id)
}
