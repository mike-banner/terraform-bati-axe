// D-01 (Phase 05.21) — commission d'apport d'affaires, calcul PAR TRANCHE.
// Tout en centimes entiers (pas de flottant sur des montants).
import { COMMISSION_THRESHOLD_CENTS, COMMISSION_RATE_LOW_PCT, COMMISSION_RATE_HIGH_PCT, AMOUNT_SERVER_REGEX } from '../../app/utils/commissionTiers'
export { COMMISSION_THRESHOLD_CENTS, COMMISSION_RATE_LOW_PCT, COMMISSION_RATE_HIGH_PCT }
export const MAX_AMOUNT_CENTS = 99_999_999_999 // plafond : 999 999 999 euros et 99 centimes

export function computeCommission(amountHtCents: number): number {
  if (!Number.isSafeInteger(amountHtCents) || amountHtCents < 0 || amountHtCents > MAX_AMOUNT_CENTS) {
    throw new RangeError('Montant HT invalide (centimes entiers positifs attendus).')
  }
  const low = Math.min(amountHtCents, COMMISSION_THRESHOLD_CENTS) * COMMISSION_RATE_LOW_PCT
  const high = Math.max(0, amountHtCents - COMMISSION_THRESHOLD_CENTS) * COMMISSION_RATE_HIGH_PCT
  return Math.round((low + high) / 100)
}

/** '250 000,50' → 25000050 ; null si invalide ou ≤ 0. Sans flottant. */
export function parseAmountToCents(input: string): number | null {
  const s = String(input).replace(/[\s  ]/g, '')
  if (!AMOUNT_SERVER_REGEX.test(s)) return null
  const [int, dec = ''] = s.split(/[.,]/)
  const cents = Number(int) * 100 + Number(dec.padEnd(2, '0'))
  return cents > 0 ? cents : null
}

export function formatEurCents(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
