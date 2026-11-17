// Règles pures « Mes dossiers » (sans import Nitro : testables en vitest).

export type LotState = 'waiting' | 'to_choose' | 'retained' | 'closed'
export type NextAction = 'sign_framework' | 'choose_pro' | 'submit_quote' | null

/** État d'un lot vu du partenaire : retenu, à choisir (artisans positionnés), clos ou en attente d'artisans. */
export function lotState(lot: { status: string }, engs: { status: string, selected_at: string | null }[]): LotState {
  if (engs.some(e => e.selected_at)) return 'retained'
  if (lot.status === 'closed') return 'closed'
  if (engs.some(e => e.status === 'signed')) return 'to_choose'
  return 'waiting'
}

export function nextAction(o: { frameworkSigned: boolean, lots: LotState[], quotePending: boolean }): NextAction {
  if (!o.frameworkSigned) return 'sign_framework'
  if (o.lots.includes('to_choose')) return 'choose_pro'
  if (o.quotePending) return 'submit_quote'
  return null
}
