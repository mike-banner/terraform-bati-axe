// « Mes projets » (espace pro) : appels d'offres sur lesquels le pro s'est positionné,
// classés selon la réponse du partenaire (demandeur) :
//   pending = demande faite, le partenaire n'a pas encore validé ;
//   won     = retenu par le partenaire (devis, commission en cours) ;
//   lost    = non retenu ou commission annulée.
export interface ProProject {
  lot_id: string
  positioned?: boolean
  engagement?: { status?: string | null } | null
  created_at?: string | null
}

export type ProjectPhase = 'pending' | 'won' | 'lost'

const LOST_STATUSES = new Set(['not_awarded', 'commission_cancelled'])

export function projectPhase(t: ProProject): ProjectPhase {
  const status = t.engagement?.status
  if (!status || status === 'signed') return 'pending'
  return LOST_STATUSES.has(status) ? 'lost' : 'won'
}

// L'onglet « Appels d'offres » ne garde que ce qui est encore ouvert ou en attente du partenaire.
export function isOpenTender(t: ProProject): boolean {
  return !t.positioned || projectPhase(t) === 'pending'
}

export function splitProjects<T extends ProProject>(tenders: T[]): { pending: T[]; won: T[]; lost: T[] } {
  const mine = tenders.filter(t => t.positioned)
  const byRecent = (a: T, b: T) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  const phase = (p: ProjectPhase) => mine.filter(t => projectPhase(t) === p).sort(byRecent)
  return { pending: phase('pending'), won: phase('won'), lost: phase('lost') }
}

// Chantiers particuliers : un lead entre dans « Projets en cours » dès que le pro l'a travaillé
// (contacté, gagné). « Nouveau » reste dans Leads ; « perdu » va dans « Non retenus ».
export type LeadPhase = 'available' | 'active' | 'closed'

export function leadPhase(lead: { status?: string; db_status?: string | null }): LeadPhase {
  if (lead.status === 'claimed') return 'available'
  const s = lead.db_status
  if (s === 'contacted' || s === 'won') return 'active'
  if (s === 'lost') return 'closed'
  return 'available'
}
