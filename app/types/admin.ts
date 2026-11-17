// ─── Admin shared types ───────────────────────────────────────────────────────

export type DocType = 'kbis' | 'decennale' | 'rge' | 'urssaf'
export const DOC_LABELS: Record<DocType, string> = { kbis: 'KBIS', decennale: 'Décennale', rge: 'RGE', urssaf: 'URSSAF' }

export interface Verification {
  id: string
  pro_id: string
  document_type: DocType
  file_key: string
  status: 'pending' | 'approved' | 'rejected'
  expiry_date: string | null
  created_at: string
}

export interface Professional {
  id: string
  company_name: string
  siret: string
  full_name: string
  email: string
  phone: string
  category: string | null
  categories?: string[] | null
  professional_type?: 'specialiste' | 'entreprise_generale' | null
  canonical_slug?: string
  is_verified: boolean
  decennal_status: 'pending' | 'valid' | 'expired' | 'none'
  rge_status?: 'none' | 'valid' | 'expired'
  verifications?: Verification[]
}

/** Dossier à traiter : pro non vérifié, ou pro vérifié ayant un document (RGE, URSSAF, KBIS, décennale) en attente. */
export const isPendingPro = (p: Professional) =>
  !p.is_verified || !!p.verifications?.some(v => v.status === 'pending')

const hasApproved = (p: Professional, t: DocType) => !!p.verifications?.some(v => v.document_type === t && v.status === 'approved')

/** « À valider » : un document attend une décision, ou KBIS + décennale sont approuvés mais le pro n'est pas encore approuvé. */
export const needsValidation = (p: Professional) =>
  !!p.verifications?.some(v => v.status === 'pending')
  || (!p.is_verified && hasApproved(p, 'kbis') && hasApproved(p, 'decennale'))

/** Pièces obligatoires (KBIS, décennale) sans justificatif approuvé ni en attente : « refusé » si seul un refus existe. */
export const missingDocuments = (p: Professional): { type: DocType, rejected: boolean }[] =>
  (['kbis', 'decennale'] as DocType[])
    .filter(t => !hasApproved(p, t) && !p.verifications?.some(v => v.document_type === t && v.status === 'pending'))
    .map(t => ({ type: t, rejected: !!p.verifications?.some(v => v.document_type === t && v.status === 'rejected') }))

/** « Documents manquants » : pro non approuvé, rien à valider, il reste des pièces à recevoir. */
export const isAwaitingDocuments = (p: Professional) => !p.is_verified && !needsValidation(p)

export interface Project {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  category: string | null
  status: string
  description: string | null
  budget_range: string | null
  timeline_range: string | null
  postal_code: string | null
  created_at: string
  lead_count: number
}

export interface Realisation {
  id: string
  title: string
  city: string | null
  image_urls: string[]
  is_showcased: boolean
  created_at: string
  professionals?: { company_name: string } | null
}

export interface Overview {
  professionals: { total: number; verified: number; pending: number; active_subscriptions: number }
  projects: { total: number; qualified: number; pending: number }
  leads: { total: number; unlocked: number }
  paywall_30d: { paywall_view: number; checkout_started: number; checkout_completed: number }
}

export const CATEGORY_LABELS: Record<string, string> = {
  maconnerie: 'Maçonnerie & Gros Œuvre',
  toiture: 'Charpente & Toiture',
  electricite: 'Électricité',
  plomberie: 'Plomberie & Chauffage',
  peinture: 'Peinture & Finitions',
  isolation: 'Isolation & Cloisons',
}

/** Métiers d'un pro (vocabulaire `professionals.categories`) — plus large que CATEGORY_LABELS (lots B2B). */
export const PRO_CATEGORY_LABELS: Record<string, string> = {
  ...CATEGORY_LABELS,
  maconnerie: 'Maçonnerie & Gros Œuvre',
  toiture: 'Toiture',
  peinture: 'Peinture',
  isolation: 'Isolation',
  carrelage: 'Carrelage',
  menuiserie: 'Menuiserie',
  renovation_energetique: 'Rénovation énergétique',
}
export const EGB_FILTER = 'entreprise_generale'

/** Métiers d'un pro : `categories[]`, à défaut l'ancienne colonne `category`. */
export const proCategories = (p: Pick<Professional, 'category' | 'categories'>): string[] =>
  p.categories?.length ? p.categories : (p.category ? [p.category] : [])

/** Un pro correspond au filtre : un métier précis, ou « Entreprise générale » (type EGB). */
export const proMatchesCategory = (p: Professional, filter: string): boolean =>
  !filter || (filter === EGB_FILTER ? p.professional_type === 'entreprise_generale' : proCategories(p).includes(filter))

export const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Validé',
  rejected: 'Rejeté',
}

export function leadAge(createdAt: string): { days: number; label: string; cls: string } {
  const ms = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor(ms / 3600000)
  if (hours < 24) return { days: 0, label: `${hours}h`, cls: 'border-border text-muted-foreground' }
  if (days < 3) return { days, label: `${days}j`, cls: 'border-amber-500/30 text-amber-400 bg-amber-500/10' }
  return { days, label: `${days}j`, cls: 'border-red-500/30 text-red-400 bg-red-500/10' }
}
