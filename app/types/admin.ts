// ─── Admin shared types ───────────────────────────────────────────────────────

export type DocType = 'kbis' | 'decennale' | 'rge'
export const DOC_LABELS: Record<DocType, string> = { kbis: 'KBIS', decennale: 'Décennale', rge: 'RGE' }

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
  canonical_slug?: string
  is_verified: boolean
  decennal_status: 'pending' | 'valid' | 'expired' | 'none'
  rge_status?: 'none' | 'valid' | 'expired'
  verifications?: Verification[]
}

/** Dossier à traiter : pro non vérifié, ou pro vérifié ayant déposé un RGE en attente. */
export const isPendingPro = (p: Professional) =>
  !p.is_verified || !!p.verifications?.some(v => v.document_type === 'rge' && v.status === 'pending')

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
