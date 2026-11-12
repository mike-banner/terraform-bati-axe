import { describe, it, expect, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('setResponseHeaders', () => {})
vi.stubGlobal('useRuntimeConfig', () => ({}))
const state: any = { user: null as any }
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async () => state.user,
  serverSupabaseServiceRole: () => ({}),
}))

const { computeB2bAlerts, readAlertConfig } = await import('../../server/utils/b2bAlerts')
const endpoint = (await import('../../server/api/v1/admin/b2b-alerts.get')).default as any

const NOW = new Date('2026-12-15T12:00:00Z')
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000 - 1000).toISOString()
const CFG = readAlertConfig({})
const REQ = 'aaaaaaaa-0000-4000-8000-000000000001'

const lot = (o: any = {}) => ({ id: 'lot1', request_id: REQ, category: 'toiture', status: 'open', closed_reason: null, ...o })
const eng = (o: any = {}) => ({ id: 'e1', lot_id: 'lot1', request_id: REQ, status: 'signed', signed_at: ago(0), selected_at: null, ...o })
const row = (o: any = {}): any => ({
  engagement_id: 'e1', request_id: REQ, request_ref: 'AAAAAAAA', engagement_status: 'quote_confirmed', snapshot_mismatch: false,
  state: { partner_status: 'sans_objet' }, schedule: [], ...o,
})
const run = (input: any) => computeB2bAlerts({ lots: [], engagements: [], submissions: [], commissionRows: [], followups: [], requestRefs: {}, ...input }, NOW, CFG)
const types = (r: any) => r.alerts.map((a: any) => `${a.type}:${a.severity}`)

describe('readAlertConfig', () => {
  it('valeurs par défaut', () => {
    expect(readAlertConfig({})).toEqual({ choiceDays: 7, choiceExpiryDays: 30, quoteDays: 14, quoteStaleDays: 60, confirmDays: 7, confirmCriticalDays: 14, orphanDays: 7 })
  })
  it('valeurs invalides → défaut', () => {
    const c = readAlertConfig({ b2bAlertChoiceDays: 0, b2bAlertQuoteDays: 1.5, b2bAlertOrphanDays: 999, b2bAlertConfirmCriticalDays: 'x' })
    expect(c).toMatchObject({ choiceDays: 7, quoteDays: 14, orphanDays: 7, confirmCriticalDays: 14 })
  })
})

describe('choix et expiration', () => {
  const at = (d: number, lotOver: any = {}) => ({ lots: [lot(lotOver)], engagements: [eng({ signed_at: ago(d) })] })
  it('6 j → rien', () => expect(run(at(6)).alerts).toEqual([]))
  it('7 j → choix_en_attente moyenne', () => expect(types(run(at(7)))).toEqual(['choix_en_attente:moyenne']))
  it('30 j → lot_expire haute, une seule alerte', () => expect(types(run(at(30)))).toEqual(['lot_expire:haute']))
  it('lot clos par cap → pas d\'avenant_sans_suite, suit l\'âge', () => {
    expect(types(run(at(8, { status: 'closed', closed_reason: 'cap' })))).toEqual(['choix_en_attente:moyenne'])
  })
  it('lot clos expired sans suite → avenant_sans_suite', () => {
    expect(types(run(at(8, { status: 'closed', closed_reason: 'expired' })))).toEqual(['avenant_sans_suite:moyenne'])
    expect(types(run(at(8, { status: 'closed', closed_reason: 'manual' })))).toEqual(['avenant_sans_suite:moyenne'])
  })
  it('lot clos expired depuis moins de 7 j → rien', () => expect(run(at(3, { status: 'closed', closed_reason: 'expired' })).alerts).toEqual([]))
  it('un artisan déjà retenu → pas d\'alerte de choix', () => {
    const r = run({ lots: [lot()], engagements: [eng({ signed_at: ago(20) }), eng({ id: 'e2', status: 'selected', selected_at: ago(1) })] })
    expect(types(r)).not.toContain('lot_expire:haute')
  })
})

describe('devis non déposé', () => {
  const sel = (d: number) => ({ lots: [lot()], engagements: [eng({ status: 'selected', selected_at: ago(d) })] })
  it('13 j → rien', () => expect(run(sel(13)).alerts).toEqual([]))
  it('14 j → moyenne', () => expect(types(run(sel(14)))).toEqual(['devis_non_depose:moyenne']))
  it('60 j → haute', () => expect(types(run(sel(60)))).toEqual(['devis_non_depose:haute']))
  it('devis déposé → rien', () => {
    expect(run({ ...sel(30), submissions: [{ id: 's', engagement_id: 'e1', status: 'pending', created_at: ago(1) }] }).alerts).toEqual([])
  })
})

describe('confirmation et contestation', () => {
  const sub = (d: number, status = 'pending') => ({
    lots: [lot()], engagements: [eng({ status: status === 'contested' ? 'contested' : 'quote_submitted', selected_at: ago(40) })],
    submissions: [{ id: 's', engagement_id: 'e1', status, created_at: ago(d) }],
  })
  it('6 j → rien', () => expect(run(sub(6)).alerts).toEqual([]))
  it('7 j → moyenne', () => expect(types(run(sub(7)))).toEqual(['confirmation_en_attente:moyenne']))
  it('14 j → haute', () => expect(types(run(sub(14)))).toEqual(['confirmation_en_attente:haute']))
  it('contesté → devis_conteste haute à tout âge', () => expect(types(run(sub(0, 'contested')))).toEqual(['devis_conteste:haute']))
})

describe('suivi des commissions', () => {
  const withRow = (o: any) => run({ lots: [lot()], engagements: [eng({ status: 'quote_confirmed' })], commissionRows: [row(o)] })
  const step = (due_on: string, validated_at: string | null = null, seq = 1) => ({ seq, label: 'Acompte', amount_cents: 1, due_on, validated_at })
  it('écart de suivi → haute', () => expect(types(withRow({ snapshot_mismatch: true }))).toEqual(['ecart_suivi:haute']))
  it('rétro à verser → basse', () => expect(types(withRow({ state: { partner_status: 'a_verser' } }))).toEqual(['retro_a_verser:basse']))
  it('rétro à récupérer → haute', () => expect(types(withRow({ state: { partner_status: 'a_recuperer' } }))).toEqual(['retro_a_verser:haute']))
  it('validation en retard de 1 j → moyenne', () => {
    const r = withRow({ schedule: [step('2026-12-14')] })
    expect(types(r)).toEqual(['validation_en_retard:moyenne'])
    expect(r.alerts[0].age_days).toBe(1)
  })
  it('validation en retard de 14 j → haute', () => expect(types(withRow({ schedule: [step('2026-12-01')] }))).toEqual(['validation_en_retard:haute']))
  it('date du jour ou future → rien', () => {
    expect(withRow({ schedule: [step('2026-12-15')] }).alerts).toEqual([])
    expect(withRow({ schedule: [step('2027-01-01')] }).alerts).toEqual([])
  })
  it('versement validé → rien', () => expect(withRow({ schedule: [step('2026-12-01', '2026-12-02T00:00:00Z')] }).alerts).toEqual([]))
  it('une seule alerte par engagement même avec deux versements en retard', () => {
    const r = withRow({ schedule: [step('2026-11-01'), step('2026-12-01', null, 2)] })
    expect(r.alerts.filter((a: any) => a.type === 'validation_en_retard')).toHaveLength(1)
  })
  it('engagement annulé → pas de retard', () => {
    expect(run({ lots: [lot()], engagements: [eng({ status: 'commission_cancelled' })], commissionRows: [row({ engagement_status: 'commission_cancelled', schedule: [step('2026-11-01')] })] }).alerts).toEqual([])
  })
})

describe('relances planifiées, tri et compteurs', () => {
  const base = { lots: [lot()], engagements: [eng({ status: 'selected', selected_at: ago(70) })] }
  it('prochaine relance future → alertes en attente, non comptées', () => {
    const r = run({ ...base, followups: [{ request_id: REQ, next_followup_on: '2026-12-20', created_at: ago(1) }] })
    expect(r.alerts).toEqual([])
    expect(r.snoozed).toHaveLength(1)
    expect(r.snoozed[0].snoozed_until).toBe('2026-12-20')
    expect(r.counts.total).toBe(0)
  })
  it('relance échue → alerte relance_planifiee haute', () => {
    const r = run({ ...base, followups: [{ request_id: REQ, next_followup_on: '2026-12-10', created_at: ago(5) }] })
    expect(types(r)).toContain('relance_planifiee:haute')
  })
  it('seule la dernière note fait foi', () => {
    const r = run({ ...base, followups: [
      { request_id: REQ, next_followup_on: '2026-12-30', created_at: ago(5) },
      { request_id: REQ, next_followup_on: null, created_at: ago(1) },
    ] })
    expect(r.snoozed).toEqual([])
    expect(r.alerts).toHaveLength(1)
  })
  it('tri par sévérité puis ancienneté, compteurs par dossier et engagement', () => {
    const r = run({
      lots: [lot(), lot({ id: 'lot2' })],
      engagements: [
        eng({ id: 'e1', status: 'selected', selected_at: ago(20) }),
        eng({ id: 'e2', lot_id: 'lot2', status: 'selected', selected_at: ago(70) }),
        eng({ id: 'e3', lot_id: 'lot2', status: 'selected', selected_at: ago(100) }),
      ],
    })
    expect(r.alerts.map((a: any) => a.engagement_id)).toEqual(['e3', 'e2', 'e1'])
    expect(r.counts).toEqual({ total: 3, by_request: { [REQ]: 3 }, by_engagement: { e1: 1, e2: 1, e3: 1 } })
    expect(r.alerts[0]).toMatchObject({ request_ref: 'AAAAAAAA', lot_label: 'Charpente & Toiture', call_order: ['demandeur', 'artisan'] })
  })
})

describe('endpoint', () => {
  it('non connecté → 401', async () => {
    state.user = null
    await expect(endpoint({})).rejects.toMatchObject({ statusCode: 401 })
  })
  it('non admin → 403', async () => {
    state.user = { id: 'u', app_metadata: { role: 'pro' } }
    await expect(endpoint({})).rejects.toMatchObject({ statusCode: 403 })
  })
})
