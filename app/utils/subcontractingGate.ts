// 05.11-05 — Verrou sous-traitance : pièces obligatoires validées (spec client « appels d'offres publics »).
// Source de vérité TS (serveur + dashboard) ; la désactivation différée est dupliquée en SQL
// (sync_professional_subcontracting, migration 20261106) — garder les deux alignés.

export type RequiredDoc = 'kbis' | 'decennale' | 'urssaf' | 'rge'

export interface GateVerif {
  document_type: string
  status: string
  expiry_date?: string | null
  issued_on?: string | null
  created_at: string
}

export const KBIS_MAX_AGE_MONTHS = 3

export const REQUIRED_DOC_LABELS: Record<RequiredDoc, string> = {
  kbis: 'Extrait Kbis de moins de 3 mois',
  decennale: 'Attestation décennale valide',
  urssaf: 'Attestation de vigilance URSSAF valide',
  rge: 'Qualification RGE valide',
}

const today = () => new Date().toISOString().slice(0, 10)

/** Date YYYY-MM-DD la plus ancienne acceptée pour un Kbis (today − 3 mois). */
export function minKbisIssueDate(now = today()): string {
  const d = new Date(`${now}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - KBIS_MAX_AGE_MONTHS)
  return d.toISOString().slice(0, 10)
}

/** Dernier justificatif approuvé d'un type (un nouveau dépôt en attente ne remplace pas l'ancien tant qu'il n'est pas validé). */
function latestApproved(verifs: readonly GateVerif[], type: string): GateVerif | undefined {
  return verifs
    .filter(v => v.document_type === type && v.status === 'approved')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}

/** Pièces manquantes ou non valides pour activer la capacité de sous-traitance. Liste vide = éligible. */
export function missingDocuments(
  verifs: readonly GateVerif[] | null | undefined,
  pro: { categories?: readonly string[] | null; rge_status?: string | null },
  now = today(),
): RequiredDoc[] {
  const list = verifs ?? []
  const missing: RequiredDoc[] = []

  const kbis = latestApproved(list, 'kbis')
  if (!kbis?.issued_on || kbis.issued_on < minKbisIssueDate(now)) missing.push('kbis')

  for (const type of ['decennale', 'urssaf'] as const) {
    const v = latestApproved(list, type)
    if (!v?.expiry_date || v.expiry_date < now) missing.push(type)
  }

  // RGE exigée seulement pour les pros qui déclarent la rénovation énergétique
  if (pro.categories?.includes('renovation_energetique') && pro.rge_status !== 'valid') missing.push('rge')

  return missing
}

export const canSubcontract = (...args: Parameters<typeof missingDocuments>): boolean => missingDocuments(...args).length === 0
