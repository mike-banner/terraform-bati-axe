export interface TenderLotRow {
  id: string
  category: string
  status: string
  created_at: string | null
  zone_name?: string | null
  claimed_at?: string | null
  b2b_requests?: {
    id: string
    description?: string | null
    project_location?: string | null
    project_postal_code?: string | null
    budget_range?: string | null
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
  const req = lot.b2b_requests || {}

  const common = {
    lot_id: lot.id,
    request_ref: (req.id || '').slice(0, 8).toUpperCase(),
    category: lot.category,
    lot_status: lot.status,
    zone_name: lot.zone_name ?? null,
    budget_range: req.budget_range ?? null,
    decision_status: req.decision_status ?? 'en_attente',
    created_at: lot.created_at,
    project_location: req.project_location ?? null,
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
    contact_name: req.contact_name ?? null,
    contact_company: req.contact_company ?? null,
    contact_phone: req.contact_phone ?? null,
    contact_email: req.contact_email ?? null,
  }
}
