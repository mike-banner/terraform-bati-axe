// Phase 05.23-10 — alertes admin du flux B2B (D-23, D-24, D-25).
// D-23 : alertes calculées depuis l'état, aucune table d'alertes.
import { CATEGORY_LABELS } from './categoryLabels'
import { readB2bFlowConfig } from './b2bCommissionPlan'
import { loadCommissionRows, type CommissionRow } from './b2bCommissionsQuery'

export type AlertType =
  | 'choix_en_attente' | 'lot_expire' | 'devis_non_depose' | 'confirmation_en_attente' | 'devis_conteste'
  | 'ecart_suivi' | 'retro_a_verser' | 'avenant_sans_suite' | 'relance_planifiee' | 'validation_en_retard'
export type AlertSeverity = 'haute' | 'moyenne' | 'basse'

export interface B2bAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  request_id: string
  request_ref: string
  lot_id: string | null
  lot_label: string | null
  engagement_id: string | null
  age_days: number
  suggested_action: string
  call_order: ('demandeur' | 'artisan')[]
  snoozed_until: string | null
}

export interface AlertConfig {
  choiceDays: number
  choiceExpiryDays: number
  quoteDays: number
  quoteStaleDays: number
  confirmDays: number
  confirmCriticalDays: number
  orphanDays: number
}

export interface AlertInput {
  lots: { id: string; request_id: string; category: string; status: string; closed_reason: string | null }[]
  engagements: { id: string; lot_id: string; request_id: string; status: string; signed_at: string; selected_at: string | null }[]
  submissions: { id: string; engagement_id: string; status: string; created_at: string }[]
  commissionRows: CommissionRow[]
  followups: { request_id: string; next_followup_on: string | null; created_at: string }[]
  requestRefs: Record<string, string>
}

function boundedDays(raw: unknown, fallback: number): number {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 365 ? n : fallback
}

export function readAlertConfig(config: Record<string, any>): AlertConfig {
  const flow = readB2bFlowConfig(config)
  return {
    choiceDays: boundedDays(config.b2bAlertChoiceDays, 7),
    choiceExpiryDays: flow.choiceExpiryDays,
    quoteDays: boundedDays(config.b2bAlertQuoteDays, 14),
    quoteStaleDays: flow.quoteStaleDays,
    confirmDays: flow.confirmReminderDays,
    confirmCriticalDays: boundedDays(config.b2bAlertConfirmCriticalDays, 14),
    orphanDays: boundedDays(config.b2bAlertOrphanDays, 7),
  }
}

const DAY_MS = 86_400_000
const ageDays = (iso: string, now: Date) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS))
const SEVERITY_RANK: Record<AlertSeverity, number> = { haute: 0, moyenne: 1, basse: 2 }
const CALL_ORDER: ('demandeur' | 'artisan')[] = ['demandeur', 'artisan']

export function computeB2bAlerts(input: AlertInput, now: Date, cfg: AlertConfig): {
  alerts: B2bAlert[]; snoozed: B2bAlert[]
  counts: { total: number; by_request: Record<string, number>; by_engagement: Record<string, number> }
} {
  const all: B2bAlert[] = []
  const refOf = (requestId: string) => input.requestRefs[requestId] ?? requestId.slice(0, 8).toUpperCase()
  const lotById = new Map(input.lots.map(l => [l.id, l]))
  const lotLabel = (lotId: string | null) => {
    const l = lotId ? lotById.get(lotId) : null
    return l ? (CATEGORY_LABELS[l.category] ?? l.category) : null
  }
  const push = (a: Omit<B2bAlert, 'id' | 'request_ref' | 'lot_label' | 'call_order' | 'snoozed_until'>) => {
    all.push({
      ...a,
      id: `${a.type}:${a.engagement_id ?? a.lot_id ?? a.request_id}`,
      request_ref: refOf(a.request_id),
      lot_label: lotLabel(a.lot_id),
      call_order: CALL_ORDER,
      snoozed_until: null,
    })
  }

  // 1) Lots : choix du partenaire en attente, lot expiré, avenant sans suite.
  for (const lot of input.lots) {
    const engs = input.engagements.filter(e => e.lot_id === lot.id)
    const signed = engs.filter(e => e.status === 'signed')
    if (!signed.length || engs.some(e => e.selected_at)) continue
    const oldest = signed.reduce((min, e) => (new Date(e.signed_at) < new Date(min) ? e.signed_at : min), signed[0]!.signed_at)
    const age = ageDays(oldest, now)
    const base = { request_id: lot.request_id, lot_id: lot.id, engagement_id: null, age_days: age }

    if (lot.status === 'closed' && (lot.closed_reason === 'expired' || lot.closed_reason === 'manual')) {
      if (age >= cfg.orphanDays) {
        push({ ...base, type: 'avenant_sans_suite', severity: 'moyenne', suggested_action: 'Appeler le demandeur : le lot est clos sans artisan retenu.' })
      }
      continue
    }
    // Un lot clos par le plafond (cap) attend normalement le choix du partenaire : on suit l'âge.
    if (age >= cfg.choiceExpiryDays) {
      push({ ...base, type: 'lot_expire', severity: 'haute', suggested_action: 'Appeler le demandeur : relancer le dossier ou le clore.' })
    } else if (age >= cfg.choiceDays) {
      push({ ...base, type: 'choix_en_attente', severity: 'moyenne', suggested_action: 'Appeler le demandeur pour l\'aider à choisir un artisan, puis prévenir l\'artisan retenu.' })
    }
  }

  // 2) Engagements : devis non déposé, confirmation en attente, devis contesté.
  for (const eng of input.engagements) {
    const subs = input.submissions.filter(s => s.engagement_id === eng.id)
    const base = { request_id: eng.request_id, lot_id: eng.lot_id, engagement_id: eng.id }

    if (eng.status === 'selected' && eng.selected_at && !subs.some(s => ['pending', 'contested', 'confirmed'].includes(s.status))) {
      const age = ageDays(eng.selected_at, now)
      if (age >= cfg.quoteDays) {
        push({
          ...base, type: 'devis_non_depose', age_days: age,
          severity: age >= cfg.quoteStaleDays ? 'haute' : 'moyenne',
          suggested_action: 'Appeler le demandeur pour savoir où en est le devis, puis l\'artisan retenu.',
        })
      }
    }

    const pending = subs.find(s => s.status === 'pending')
    if (pending && eng.status === 'quote_submitted') {
      const age = ageDays(pending.created_at, now)
      if (age >= cfg.confirmDays) {
        push({
          ...base, type: 'confirmation_en_attente', age_days: age,
          severity: age >= cfg.confirmCriticalDays ? 'haute' : 'moyenne',
          suggested_action: 'Appeler l\'artisan pour qu\'il confirme ou conteste le devis déposé.',
        })
      }
    }

    const contested = subs.find(s => s.status === 'contested')
    if (contested) {
      push({
        ...base, type: 'devis_conteste', severity: 'haute', age_days: ageDays(contested.created_at, now),
        suggested_action: 'Arbitrer dans Commissions en cours après avoir appelé le demandeur puis l\'artisan.',
      })
    }
  }

  // 3) Suivi des commissions : écart, rétro-commission, validation d'avancement en retard (D-06 bis).
  const today = now.toISOString().slice(0, 10)
  for (const row of input.commissionRows) {
    const base = { request_id: row.request_id, lot_id: null, engagement_id: row.engagement_id }
    const lotId = input.engagements.find(e => e.id === row.engagement_id)?.lot_id ?? null
    const b = { ...base, lot_id: lotId }

    if (row.snapshot_mismatch && row.engagement_status !== 'commission_cancelled') {
      push({ ...b, type: 'ecart_suivi', severity: 'haute', age_days: 0, suggested_action: 'Vérifier les montants du dossier (dépôts confirmés / suivi).' })
    }
    if (row.state.partner_status === 'a_verser') {
      push({ ...b, type: 'retro_a_verser', severity: 'basse', age_days: 0, suggested_action: 'Enregistrer le versement de la rétro-commission au partenaire.' })
    } else if (row.state.partner_status === 'a_recuperer') {
      push({ ...b, type: 'retro_a_verser', severity: 'haute', age_days: 0, suggested_action: 'Récupérer la rétro-commission versée à tort.' })
    }

    if (row.engagement_status === 'quote_confirmed') {
      const next = [...row.schedule].sort((a, c) => a.seq - c.seq).find(i => !i.validated_at)
      if (next?.due_on && next.due_on < today) {
        const late = Math.max(1, Math.floor((new Date(today).getTime() - new Date(next.due_on).getTime()) / DAY_MS))
        push({
          ...b, type: 'validation_en_retard', age_days: late,
          severity: late >= 14 ? 'haute' : 'moyenne',
          suggested_action: `Appeler le demandeur pour savoir si l'étape « ${next.label} » est atteinte et lui faire valider l'avancement, puis l'artisan.`,
        })
      }
    }
  }

  // 4) Journal de suivi : relance planifiée (D-25). La dernière note de chaque dossier fait foi.
  const latest = new Map<string, AlertInput['followups'][number]>()
  for (const f of input.followups) {
    const cur = latest.get(f.request_id)
    if (!cur || new Date(f.created_at) > new Date(cur.created_at)) latest.set(f.request_id, f)
  }
  const snoozeUntil = new Map<string, string>()
  for (const [requestId, f] of latest) {
    if (!f.next_followup_on) continue
    if (f.next_followup_on > today) snoozeUntil.set(requestId, f.next_followup_on)
    else {
      all.push({
        id: `relance_planifiee:${requestId}`, type: 'relance_planifiee', severity: 'haute', request_id: requestId,
        request_ref: refOf(requestId), lot_id: null, lot_label: null, engagement_id: null,
        age_days: Math.max(0, Math.floor((new Date(today).getTime() - new Date(f.next_followup_on).getTime()) / DAY_MS)),
        suggested_action: 'Relance planifiée échue : rappeler selon la dernière note de suivi.',
        call_order: CALL_ORDER, snoozed_until: null,
      })
    }
  }

  const sort = (a: B2bAlert, b: B2bAlert) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.age_days - a.age_days
  const alerts: B2bAlert[] = []
  const snoozed: B2bAlert[] = []
  for (const a of all) {
    const until = snoozeUntil.get(a.request_id) ?? null
    if (until) snoozed.push({ ...a, snoozed_until: until })
    else alerts.push(a)
  }
  alerts.sort(sort)
  snoozed.sort(sort)

  const by_request: Record<string, number> = {}
  const by_engagement: Record<string, number> = {}
  for (const a of alerts) {
    by_request[a.request_id] = (by_request[a.request_id] ?? 0) + 1
    if (a.engagement_id) by_engagement[a.engagement_id] = (by_engagement[a.engagement_id] ?? 0) + 1
  }
  return { alerts, snoozed, counts: { total: alerts.length, by_request, by_engagement } }
}

export async function loadB2bAlertInput(supabase: any, flow: { quoteBaseCapCents: number | null }): Promise<AlertInput> {
  const { data: engRows } = await supabase
    .from('b2b_engagements')
    .select('id, lot_id, request_id, status, signed_at, selected_at')
    .eq('type', 'lot_amendment')
    .in('status', ['signed', 'selected', 'quote_submitted', 'contested', 'quote_confirmed', 'commission_cancelled'])
    .limit(2000)
  const engagements: AlertInput['engagements'] = engRows ?? []
  const lotIds = [...new Set(engagements.map(e => e.lot_id))]
  const engIds = engagements.map(e => e.id)

  const [lotsRes, subsRes, commissionRows, fuRes] = await Promise.all([
    lotIds.length ? supabase.from('b2b_tender_lots').select('id, request_id, category, status, closed_reason').in('id', lotIds) : { data: [] },
    engIds.length
      ? supabase.from('b2b_quote_submissions').select('id, engagement_id, status, created_at').in('engagement_id', engIds).in('status', ['pending', 'contested', 'confirmed'])
      : { data: [] },
    loadCommissionRows(supabase, flow),
    supabase.from('b2b_admin_followups').select('request_id, next_followup_on, created_at').order('created_at', { ascending: false }).limit(2000),
  ])

  const requestRefs: Record<string, string> = {}
  for (const e of engagements) requestRefs[e.request_id] = e.request_id.slice(0, 8).toUpperCase()
  return {
    lots: lotsRes.data ?? [],
    engagements,
    submissions: subsRes.data ?? [],
    commissionRows,
    followups: fuRes.data ?? [],
    requestRefs,
  }
}
