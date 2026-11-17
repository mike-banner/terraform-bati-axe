import { findSignedFramework } from './signature'
import { escapeLike } from './partnerDossiersToken'
import { CATEGORY_LABELS } from './categoryLabels'
import { lotState, nextAction, type LotState, type NextAction } from './partnerDossierState'

/** Secret de signature des liens « Mes dossiers » : la clé service Supabase, déjà secrète côté serveur. */
export function dossiersSecret(event: any): string {
  const cfg = useRuntimeConfig(event) as any
  const secret = String(cfg.supabase?.serviceKey || cfg.supabase?.secretKey || '')
  if (!secret) throw createError({ statusCode: 500, statusMessage: 'Service indisponible.' })
  return secret
}

export interface DossierLot { label: string, state: LotState, pro: string | null }
export interface Dossier {
  id: string
  ref: string
  created_at: string
  need_type: string
  project_location: string | null
  lots: DossierLot[]
  next_action: NextAction
}

/** Dossiers d'une adresse (colonnes explicites : rien d'interne ne sort, ni notes ni statut de pipeline). */
export async function listDossiers(supabase: any, email: string): Promise<{ contact: { name: string, company: string | null, phone: string, email: string } | null, dossiers: Dossier[] }> {
  const { data: reqs, error } = await supabase
    .from('b2b_requests')
    .select('id, created_at, need_type, project_location, contact_name, contact_company, contact_phone, contact_email')
    .ilike('contact_email', escapeLike(email))
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Service indisponible.' })
  const requests: any[] = reqs ?? []
  if (!requests.length) return { contact: null, dossiers: [] }

  const ids = requests.map(r => r.id)
  const frameworkSigned = Boolean(await findSignedFramework(supabase, { type: 'framework_partner', email }))
  const [{ data: lotRows }, { data: engRows }, { data: subRows }] = await Promise.all([
    supabase.from('b2b_tender_lots').select('id, request_id, category, status').in('request_id', ids).order('created_at'),
    supabase.from('b2b_engagements').select('id, request_id, lot_id, status, selected_at, professionals(company_name)').eq('type', 'lot_amendment').in('request_id', ids),
    supabase.from('b2b_quote_submissions').select('engagement_id').in('request_id', ids).in('status', ['pending', 'contested', 'confirmed']),
  ])
  const engs: any[] = engRows ?? []
  const submitted = new Set((subRows ?? []).map((s: any) => s.engagement_id))

  const dossiers: Dossier[] = requests.map((r) => {
    const lots: DossierLot[] = (lotRows ?? []).filter((l: any) => l.request_id === r.id).map((l: any) => {
      const lotEngs = engs.filter(e => e.lot_id === l.id)
      const retained = lotEngs.find(e => e.selected_at)
      return { label: CATEGORY_LABELS[l.category] ?? l.category, state: lotState(l, lotEngs), pro: retained?.professionals?.company_name ?? null }
    })
    const quotePending = engs.some(e => e.request_id === r.id && e.status === 'selected' && !submitted.has(e.id))
    return {
      id: r.id,
      ref: String(r.id).slice(0, 8).toUpperCase(),
      created_at: r.created_at,
      need_type: r.need_type,
      project_location: r.project_location ?? null,
      lots,
      next_action: nextAction({ frameworkSigned, lots: lots.map(l => l.state), quotePending }),
    }
  })

  const last = requests[0]
  return { contact: { name: last.contact_name, company: last.contact_company ?? null, phone: last.contact_phone, email: last.contact_email }, dossiers }
}
