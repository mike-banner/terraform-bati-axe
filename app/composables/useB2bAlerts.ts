export type B2bAlertType =
  | 'choix_en_attente' | 'lot_expire' | 'devis_non_depose' | 'confirmation_en_attente' | 'devis_conteste'
  | 'ecart_suivi' | 'retro_a_verser' | 'avenant_sans_suite' | 'relance_planifiee' | 'validation_en_retard'

export interface B2bAlertItem {
  id: string
  type: B2bAlertType
  severity: 'haute' | 'moyenne' | 'basse'
  request_id: string
  request_ref: string
  lot_id: string | null
  lot_label: string | null
  engagement_id: string | null
  age_days: number
  suggested_action: string
  snoozed_until: string | null
}

export interface B2bAlertsPayload {
  alerts: B2bAlertItem[]
  snoozed: B2bAlertItem[]
  counts: { total: number; by_request: Record<string, number>; by_engagement: Record<string, number> }
}

// Clé partagée : une seule requête pour l'onglet, la pastille du menu et les lignes (D-24).
// Après une action (note d'appel, mouvement, annulation, arbitrage) : refreshNuxtData('b2b-alerts').
export function useB2bAlerts() {
  return useFetch<B2bAlertsPayload>('/api/v1/admin/b2b-alerts', {
    key: 'b2b-alerts',
    server: false,
    default: () => ({ alerts: [], snoozed: [], counts: { total: 0, by_request: {}, by_engagement: {} } }),
  })
}
