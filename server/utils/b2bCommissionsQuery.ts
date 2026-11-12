// Phase 05.23-06 — lecture partagée des commissions (liste admin + export) : tout est recalculé
// depuis les dépôts confirmés, les validations d'étape et le journal des mouvements.
import { CATEGORY_LABELS } from './categoryLabels'
import {
  computeQuoteBase, computeCommissionPlan, deriveCommissionState, type CommissionState,
} from './b2bCommissionPlan'
import { PARTNER_SHARE_BPS, installmentCount, installmentLabels, type MovementType } from '../../app/utils/b2bCommissionRules'

export interface CommissionRow {
  engagement_id: string; request_id: string; request_ref: string; lot_label: string; partner_label: string; pro_company: string
  engagement_status: string; base_cents: number; commission_cents: number; partner_share_cents: number; platform_net_cents: number
  state: CommissionState; snapshot_mismatch: boolean
  // D-06 bis : seq, libellé (version admin), montant, date prévue, validé le.
  schedule: CommissionState['installments']
  open_contest: { submission_id: string; amount_ht_cents: number; reason: string | null } | null
  open_submission_id: string | null
  quote_files: Array<{ submission_id: string; amount_ht_cents: number; status: string; created_at: string; url: string }>
  amendment_url: string
  cancel: { case: string; reason: string; at: string; partner_share_kept_cents: number | null } | null
  movements: Array<{ id: string; type: MovementType; amount_cents: number; occurred_on: string; note: string | null; actor_id: string; operator: string; created_at: string }>
  // Nombre de versements différent de celui du 1er dépôt confirmé (avenant de travaux franchissant le seuil).
  schedule_changed: boolean
}

export interface CommissionsSummary {
  total_to_collect_cents: number
  total_collected_cents: number
  partner_shares_due_cents: number
  contested_count: number
  stale_without_quote_count: number
}

export async function loadCommissionRows(
  supabase: any,
  flow: { quoteBaseCapCents: number | null },
  opts?: { engagementId?: string },
): Promise<CommissionRow[]> {
  let q = supabase
    .from('b2b_engagements')
    .select('id, request_id, lot_id, status, confirmed_amount_cents, partner_share_bps, cancelled_at, cancel_case, cancel_reason, partner_share_kept_cents, b2b_tender_lots(category), professionals(company_name), b2b_requests(contact_name, contact_company)')
    .eq('type', 'lot_amendment')
    .in('status', ['contested', 'quote_confirmed', 'commission_cancelled'])
  if (opts?.engagementId) q = q.eq('id', opts.engagementId)
  const { data: engs } = await q.order('updated_at', { ascending: false }).limit(500)
  const list: any[] = engs ?? []
  if (list.length === 0) return []
  const ids = list.map(e => e.id)

  const [{ data: subs }, { data: vals }, { data: movs }] = await Promise.all([
    supabase.from('b2b_quote_submissions')
      .select('id, engagement_id, amount_ht_cents, planned_due_dates, status, contest_reason, created_at')
      .in('engagement_id', ids).order('created_at'),
    supabase.from('b2b_installment_validations').select('engagement_id, seq, validated_at').in('engagement_id', ids),
    supabase.from('b2b_commission_movements')
      .select('id, engagement_id, type, amount_cents, occurred_on, note, actor_id, operator, created_at')
      .in('engagement_id', ids).order('created_at'),
  ])

  return list.map((e): CommissionRow => {
    const mySubs = ((subs ?? []) as any[]).filter(s => s.engagement_id === e.id)
    const confirmed = mySubs.filter(s => s.status === 'confirmed')
    const open = [...mySubs].reverse().find(s => s.status === 'pending' || s.status === 'contested') ?? null
    const base = computeQuoteBase(confirmed.map(s => Number(s.amount_ht_cents)), flow.quoteBaseCapCents)
    const plan = computeCommissionPlan(base, e.partner_share_bps ?? PARTNER_SHARE_BPS)
    const plannedDates: string[] | null = confirmed.length > 0
      ? confirmed[confirmed.length - 1].planned_due_dates ?? null
      : (open?.planned_due_dates ?? null)
    const validations = ((vals ?? []) as any[]).filter(v => v.engagement_id === e.id)
    const movements = ((movs ?? []) as any[]).filter(m => m.engagement_id === e.id).map(m => ({ ...m, amount_cents: Number(m.amount_cents) }))

    const state = deriveCommissionState({
      engagement_status: e.status,
      has_open_contest: open?.status === 'contested',
      plan,
      planned_due_dates: plannedDates,
      validations,
      partner_share_kept_cents: e.partner_share_kept_cents != null ? Number(e.partner_share_kept_cents) : null,
    }, movements)

    // D-27 : « Facture suivante » n'est autorisé que dans la version admin.
    const labels = installmentLabels(base, 'admin')
    const schedule = state.installments.map((i, idx) => ({ ...i, label: labels[idx] ?? i.label }))
    const files = mySubs.map(s => ({
      submission_id: s.id, amount_ht_cents: Number(s.amount_ht_cents), status: s.status, created_at: s.created_at,
      url: `/api/v1/b2b/quotes/${s.id}/file`,
    }))

    return {
      engagement_id: e.id,
      request_id: e.request_id,
      request_ref: String(e.request_id).slice(0, 8).toUpperCase(),
      lot_label: CATEGORY_LABELS[e.b2b_tender_lots?.category] ?? e.b2b_tender_lots?.category ?? '',
      partner_label: e.b2b_requests?.contact_company || e.b2b_requests?.contact_name || '',
      pro_company: e.professionals?.company_name ?? '',
      engagement_status: e.status,
      base_cents: base,
      commission_cents: plan.commission_cents,
      partner_share_cents: plan.partner_share_cents,
      platform_net_cents: plan.platform_net_cents,
      state,
      // Un premier dépôt contesté n'a encore ni montant confirmé ni assiette : pas d'écart.
      snapshot_mismatch: e.confirmed_amount_cents != null ? Number(e.confirmed_amount_cents) !== base : base > 0,
      schedule,
      open_contest: open?.status === 'contested'
        ? { submission_id: open.id, amount_ht_cents: Number(open.amount_ht_cents), reason: open.contest_reason ?? null }
        : null,
      open_submission_id: open?.id ?? null,
      quote_files: files,
      amendment_url: `/api/v1/engagements/${e.id}/document`,
      cancel: e.cancelled_at
        ? { case: e.cancel_case, reason: e.cancel_reason, at: e.cancelled_at, partner_share_kept_cents: e.partner_share_kept_cents != null ? Number(e.partner_share_kept_cents) : null }
        : null,
      movements,
      schedule_changed: confirmed.length > 1 && installmentCount(Number(confirmed[0].amount_ht_cents)) !== plan.schedule.length,
    }
  })
}

export function summarizeCommissions(rows: CommissionRow[], staleWithoutQuoteCount: number): CommissionsSummary {
  const live = rows.filter(r => r.engagement_status !== 'commission_cancelled')
  return {
    total_to_collect_cents: live.reduce((a, r) => a + r.state.balance_cents, 0),
    total_collected_cents: rows.reduce((a, r) => a + (r.state.paid_cents - r.state.refunded_cents), 0),
    // D-26 : non nul seulement en fin de chantier, commission intégralement encaissée.
    partner_shares_due_cents: rows.reduce((a, r) => a + Math.max(0, r.state.partner_due_now_cents - r.state.partner_paid_cents), 0),
    contested_count: rows.filter(r => r.state.status === 'contestee').length,
    stale_without_quote_count: staleWithoutQuoteCount,
  }
}

export async function countStaleWithoutQuote(supabase: any, quoteStaleDays: number, now = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - quoteStaleDays * 86_400_000).toISOString()
  const { count } = await supabase
    .from('b2b_engagements')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'lot_amendment').eq('status', 'selected').lt('selected_at', limit)
  return count ?? 0
}
