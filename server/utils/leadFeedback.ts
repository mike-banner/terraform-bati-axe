// Logique pure du feedback loop particulier (REQ-06), isolée pour être testable.
// Voir server/api/v1/magic-link/[token]/decision.post.ts pour l'orchestration.

export interface LeadDecisionRow {
  status: string // lead_status métier ('new' | 'claimed' | 'lost' | ...)
  customer_decision: string // 'pending' | 'refused' | 'selected'
}

// Un pro est "engagé" sur le projet quand il a débloqué/réclamé le lead.
// Dans le modèle actuel, l'état verrouillé/débloqué = status 'claimed'.
export function isEngaged(lead: LeadDecisionRow): boolean {
  return lead.status === 'claimed'
}

// Le projet doit repartir au marché quand il y a au moins un pro engagé
// et que TOUS les pros engagés ont été refusés par le particulier.
// (Si un pro est 'selected', on ne relance pas : le client a trouvé.)
export function shouldRelaunch(leads: LeadDecisionRow[]): boolean {
  const engaged = leads.filter(isEngaged)
  if (engaged.length === 0) return false
  return engaged.every((l) => l.customer_decision === 'refused')
}

// Garde-fou anti-spam : borne le nombre de remises au marché automatiques.
export const MAX_RELAUNCHES = 3

export function canRelaunch(relaunchCount: number): boolean {
  return relaunchCount < MAX_RELAUNCHES
}
