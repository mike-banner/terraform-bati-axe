// ─── B2B Request types ────────────────────────────────────────────────────────

import { CATEGORY_LABELS } from '~/types/admin'

export type B2bApporteurType = 'architecte' | 'bet' | 'agence_immo' | 'syndic' | 'diagnostiqueur' | 'autre'
export type B2bTravauxSuggere = 'isolation' | 'chauffage' | 'electricite' | 'toiture'
export type B2bNeedType = 'projet_immediat' | 'partenariat_regulier'
export type B2bBudgetRange = '<30k' | '30-100k' | '100-300k' | '>300k'
export type B2bRequestStatus = 'nouveau' | 'en_cours' | 'rappele' | 'qualifie' | 'converti' | 'perdu'
export type B2bDecisionStatus = 'confirme' | 'en_attente'
export type B2bLotCategory = 'maconnerie' | 'toiture' | 'electricite' | 'plomberie' | 'peinture' | 'isolation'
export type B2bTenderLotStatus = 'open' | 'claimed' | 'closed'

export interface B2bTenderLot {
  id: string
  request_id: string
  category: B2bLotCategory
  zone_id: string | null
  status: B2bTenderLotStatus
  created_at: string
}

export interface B2bRequestFile {
  file_key: string
  filename: string
  content_type: string
  size: number
}

export interface B2bRequest {
  id: string
  apporteur_type: B2bApporteurType
  need_type: B2bNeedType
  project_location: string | null
  budget_range: B2bBudgetRange | null
  files: B2bRequestFile[]
  certification_number: string | null
  travaux_suggeres: B2bTravauxSuggere[] | null
  description: string | null
  decision_status: B2bDecisionStatus
  project_postal_code: string | null
  contact_name: string
  contact_company: string | null
  contact_phone: string
  contact_email: string
  consent_accepted: boolean
  consent_at: string | null
  status: B2bRequestStatus
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const APPORTEUR_LABELS: Record<B2bApporteurType, { label: string; icon: string; fear: string; promise: string }> = {
  architecte: {
    label: 'Architecte / Décorateur / Maître d\'œuvre',
    icon: '📐',
    fear: 'Que l\'artisan massacre son design ou ne respecte pas les détails techniques',
    promise: 'Nous lisons vos plans au millimètre et respectons vos choix de matériaux.',
  },
  bet: {
    label: 'Bureau d\'Études / Ingénieur Structure',
    icon: '🏗️',
    fear: 'Gros œuvre mal exécuté, ouverture de mur sans préconisation',
    promise: 'Assurance décennale béton, respect absolu des notes de calcul de structure.',
  },
  agence_immo: {
    label: 'Agence Immobilière / Chasseur',
    icon: '🏠',
    fear: 'Perdre une vente à cause d\'un devis qui met 3 semaines',
    promise: 'Un pré-chiffrage en 48h pour aider vos acheteurs à se positionner.',
  },
  syndic: {
    label: 'Syndic de Copropriété / Gestionnaire',
    icon: '🏢',
    fear: 'Manque de réactivité, travail bâlé, copropriétaires qui hurlent',
    promise: 'Habitués aux AG, respect du règlement de copro et rapports de chantier clairs.',
  },
  diagnostiqueur: {
    label: 'Diagnostiqueur Immobilier',
    icon: '📋',
    fear: 'Détecter des travaux nécessaires (isolation, électricité...) sans savoir à qui les recommander',
    promise: 'Transformez vos rapports DPE en opportunités de travaux qualifiées, sans effort.',
  },
  autre: {
    label: 'Autre Professionnel',
    icon: '🔧',
    fear: 'Ne pas trouver de partenaire fiable et réactif',
    promise: 'Un réseau d\'artisans audités, disponibles et qualifiés sur votre zone.',
  },
}

export const TRAVAUX_OPTIONS: { value: B2bTravauxSuggere; label: string }[] = [
  { value: 'isolation', label: 'Isolation' },
  { value: 'chauffage', label: 'Chauffage' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'toiture', label: 'Toiture' },
]

export const BUDGET_OPTIONS: { value: B2bBudgetRange; label: string }[] = [
  { value: '<30k', label: '< 30 000 €' },
  { value: '30-100k', label: '30 000 € – 100 000 €' },
  { value: '100-300k', label: '100 000 € – 300 000 €' },
  { value: '>300k', label: '> 300 000 €' },
]

// Corps de métier sélectionnables comme lots (TEND-05) — réutilise le
// vocabulaire unique de professionals.categories, pas de libellés dupliqués.
export const LOT_CATEGORY_OPTIONS: { value: B2bLotCategory; label: string }[] =
  (Object.keys(CATEGORY_LABELS) as B2bLotCategory[]).map(value => ({
    value,
    label: CATEGORY_LABELS[value] as string,
  }))

export const DECISION_STATUS_LABELS: Record<B2bDecisionStatus, string> = {
  confirme: 'Confirmé — travaux décidés et budgétés',
  en_attente: 'En attente de décision — devis à comparer avant validation (ex. avant AG)',
}
