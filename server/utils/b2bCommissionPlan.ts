// Phase 05.23 — calculs purs du flux devis / commissions (aucun accès base ni réseau).
// Tout en centimes entiers. computeCommission reste la seule fonction de calcul du taux (D-04).
// Pas de commentaire de fin de ligne sur un export : l'auto-import Nitro le lit mal.
import { computeCommission } from './commission'
import {
  PARTNER_SHARE_BPS, INSTALLMENT_SPLITS_LOW_BPS, INSTALLMENT_SPLITS_HIGH_BPS, installmentCount, installmentLabels,
  type CommissionStatus, type PartnerShareStatus, type MovementType,
} from '../../app/utils/b2bCommissionRules'

export function bpsOf(cents: number, bps: number): number {
  return Math.round(cents * bps / 10_000)
}

// D-17 : l'assiette cumule les devis confirmés (avenants de travaux) avec un plafond configurable.
export function computeQuoteBase(confirmedAmounts: number[], capCents: number | null): number {
  const sum = confirmedAmounts.reduce((a, n) => a + n, 0)
  return capCents != null ? Math.min(sum, capCents) : sum
}

export interface Installment {
  seq: 1 | 2 | 3
  label: string
  amount_cents: number
}

// D-06 bis : régime choisi par la base du devis (≤ seuil → 2 versements ; au-dessus → 3).
// Le dernier versement absorbe l'arrondi : la somme vaut exactement la commission.
export function computeCommissionSchedule(baseCents: number, commissionCents: number, audience: 'public' | 'admin' = 'public'): Installment[] {
  const splits = installmentCount(baseCents) === 2 ? INSTALLMENT_SPLITS_LOW_BPS : INSTALLMENT_SPLITS_HIGH_BPS
  const labels = installmentLabels(baseCents, audience)
  const out: Installment[] = []
  let allocated = 0
  splits.forEach((bps, i) => {
    const isLast = i === splits.length - 1
    const amount = isLast ? commissionCents - allocated : bpsOf(commissionCents, bps)
    allocated += amount
    out.push({ seq: (i + 1) as 1 | 2 | 3, label: labels[i] as string, amount_cents: amount })
  })
  return out
}

export interface CommissionPlan {
  base_cents: number
  commission_cents: number
  partner_share_cents: number
  platform_net_cents: number
  schedule: Installment[]
}

export function computeCommissionPlan(baseCents: number, partnerShareBps: number = PARTNER_SHARE_BPS): CommissionPlan {
  const commission = baseCents > 0 ? computeCommission(baseCents) : 0
  const partner = bpsOf(baseCents, partnerShareBps)
  return {
    base_cents: baseCents,
    commission_cents: commission,
    partner_share_cents: partner,
    platform_net_cents: commission - partner,
    schedule: computeCommissionSchedule(baseCents, commission),
  }
}

export interface MovementLike {
  type: MovementType
  amount_cents: number
}

export interface CommissionState {
  status: CommissionStatus
  partner_status: PartnerShareStatus
  invoiced_cents: number
  paid_cents: number
  refunded_cents: number
  refund_due_cents: number
  exigible_cents: number
  partner_due_cents: number
  partner_due_now_cents: number
  partner_paid_cents: number
  partner_to_recover_cents: number
  balance_cents: number
  installments: Array<Installment & { due_on: string | null; validated_at: string | null }>
  next_due: { seq: number; label: string; amount_cents: number; due_on: string | null; validated: boolean } | null
}

export interface CommissionStateInput {
  engagement_status: string
  has_open_contest: boolean
  plan: CommissionPlan
  planned_due_dates: string[] | null
  validations: Array<{ seq: number; validated_at: string }>
  partner_share_kept_cents: number | null
}

function sumOf(movements: MovementLike[], type: MovementType): number {
  return movements.filter(m => m.type === type).reduce((a, m) => a + m.amount_cents, 0)
}

// Dérive l'état de la commission et de la rétro-commission du seul journal des mouvements
// et des validations d'étape. Rien n'est stocké : le solde se recalcule toujours.
export function deriveCommissionState(input: CommissionStateInput, movements: MovementLike[]): CommissionState {
  const { plan } = input
  const commission = plan.commission_cents
  const cancelled = input.engagement_status === 'commission_cancelled'
  const contested = input.engagement_status === 'contested' || input.has_open_contest

  const invoiced = sumOf(movements, 'commission_facturee')
  const paid = sumOf(movements, 'encaissement')
  const refunded = sumOf(movements, 'remboursement')
  const partnerPaid = sumOf(movements, 'retro_commission_versee')
  const cancelledTotal = sumOf(movements, 'annulation')

  const installments = plan.schedule.map(i => ({
    ...i,
    due_on: input.planned_due_dates?.[i.seq - 1] ?? null,
    validated_at: input.validations.find(v => v.seq === i.seq)?.validated_at ?? null,
  }))
  const exigible = installments.filter(i => i.validated_at).reduce((a, i) => a + i.amount_cents, 0)

  let status: CommissionStatus
  if (cancelled) status = 'annulee'
  else if (contested) status = 'contestee'
  else if (commission > 0 && paid >= commission) status = 'encaissee'
  else if (exigible > invoiced) status = 'a_facturer'
  else if (paid > 0) status = 'partiellement_encaissee'
  else if (invoiced > 0) status = 'facturee'
  else status = 'echeance_a_venir'

  // D-26 : la rétro-commission n'est exigible qu'en fin de chantier, commission intégralement encaissée. Jamais d'avance.
  const lastValidated = input.validations.some(v => v.seq === plan.schedule.length)
  const partnerDue = cancelled ? (input.partner_share_kept_cents ?? 0) : plan.partner_share_cents
  const partnerDueNow = cancelled
    ? partnerDue
    : (lastValidated && commission > 0 && paid >= commission ? plan.partner_share_cents : 0)
  const partnerToRecover = Math.max(0, partnerPaid - partnerDueNow)

  let partnerStatus: PartnerShareStatus
  if (partnerDue === 0 && partnerPaid === 0) partnerStatus = 'sans_objet'
  else if (partnerToRecover > 0) partnerStatus = 'a_recuperer'
  else if (partnerDue > 0 && partnerPaid >= partnerDue) partnerStatus = 'versee'
  else if (partnerDueNow > partnerPaid) partnerStatus = 'a_verser'
  else partnerStatus = 'en_attente'

  // Prochain versement : le premier dont le cumul n'est pas encore facturé. Le montant restant se limite
  // à l'écart de cumul pour rester juste si l'échéancier a changé après un avenant de travaux.
  let nextDue: CommissionState['next_due'] = null
  if (!cancelled && !contested) {
    let cumulative = 0
    for (const i of installments) {
      cumulative += i.amount_cents
      if (cumulative > invoiced) {
        nextDue = {
          seq: i.seq,
          label: i.label,
          amount_cents: Math.min(i.amount_cents, cumulative - invoiced),
          due_on: i.due_on,
          validated: i.validated_at != null,
        }
        break
      }
    }
  }

  return {
    status,
    partner_status: partnerStatus,
    invoiced_cents: invoiced,
    paid_cents: paid,
    refunded_cents: refunded,
    refund_due_cents: cancelled ? Math.max(0, cancelledTotal - refunded) : 0,
    exigible_cents: exigible,
    partner_due_cents: partnerDue,
    partner_due_now_cents: partnerDueNow,
    partner_paid_cents: partnerPaid,
    partner_to_recover_cents: partnerToRecover,
    balance_cents: cancelled ? 0 : Math.max(0, commission - paid),
    installments,
    next_due: nextDue,
  }
}

// 123456 → '1234,56' (signe conservé).
export function centsToCsv(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.trunc(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

// Export CSV pour l'expert-comptable : BOM, point-virgule, CRLF. Une cellule texte qui commence par
// = + - @ ou une tabulation est préfixée d'une apostrophe (injection de formule dans le tableur).
export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (value: string | number | null): string => {
    if (value == null) return ''
    let s = String(value)
    if (typeof value === 'string' && /^[=+\-@\t]/.test(s)) s = `'${s}`
    if (/[;"\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
    return s
  }
  return '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n')
}

export interface B2bFlowConfig {
  choiceExpiryDays: number
  quoteStaleDays: number
  confirmReminderDays: number
  quoteBaseCapCents: number | null
}

function boundedDays(raw: unknown, fallback: number): number {
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 365 ? n : fallback
}

// Délais en jours (1 à 365) et plafond d'assiette en centimes (vide = aucun plafond).
export function readB2bFlowConfig(config: Record<string, any>): B2bFlowConfig {
  const capRaw = typeof config.b2bQuoteBaseCapCents === 'string' && config.b2bQuoteBaseCapCents.trim() !== ''
    ? Number(config.b2bQuoteBaseCapCents)
    : config.b2bQuoteBaseCapCents
  return {
    choiceExpiryDays: boundedDays(config.b2bChoiceExpiryDays, 30),
    quoteStaleDays: boundedDays(config.b2bQuoteStaleDays, 60),
    confirmReminderDays: boundedDays(config.b2bConfirmReminderDays, 7),
    quoteBaseCapCents: typeof capRaw === 'number' && Number.isSafeInteger(capRaw) && capRaw > 0 ? capRaw : null,
  }
}
