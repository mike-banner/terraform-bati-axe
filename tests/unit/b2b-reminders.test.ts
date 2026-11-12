import { describe, it, expect, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: Function) => fn)
vi.stubGlobal('createError', (opts: any) => Object.assign(new Error(opts.statusMessage), opts))
vi.stubGlobal('getHeader', () => undefined)
vi.mock('#supabase/server', () => ({ serverSupabaseServiceRole: vi.fn() }))
vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ cronSecret: 's3cret', public: {} }) }))
vi.mock('../../server/utils/email', () => ({ sendEmail: vi.fn(async () => ({})) }))
vi.mock('../../server/utils/notifyAdmin', () => ({ notifyAdmin: vi.fn(), adminDetailsTable: () => '' }))

const mod = await import('../../server/api/v1/cron/b2b-reminders.get')
const { selectB2bReminders } = mod
const handler = mod.default as any

const NOW = new Date('2026-12-15T08:00:00Z')
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000 - 1000).toISOString()
const DELAYS = { choiceExpiryDays: 30, quoteStaleDays: 60, confirmReminderDays: 7 }

const lot = { id: 'lot1', request_id: 'req1' }
const eng = (over: Partial<any> = {}) => ({ id: 'e1', lot_id: 'lot1', request_id: 'req1', status: 'signed', signed_at: ago(0), selected_at: null, ...over })
const run = (input: Partial<any>, sent: string[] = []) =>
  selectB2bReminders({ lots: [], engagements: [], submissions: [], installments: [], ...input }, new Set(sent), NOW, DELAYS)
const kinds = (r: any[]) => r.map(a => a.kind)

describe('choix de l\'artisan', () => {
  const at = (d: number, extra: any[] = []) => ({ lots: [lot], engagements: [eng({ signed_at: ago(d) }), ...extra] })
  it('6 j → rien', () => expect(run(at(6))).toEqual([]))
  it('7 j → choice_1', () => expect(kinds(run(at(7)))).toEqual(['choice_1']))
  it('14 j → choice_2', () => expect(kinds(run(at(14)))).toEqual(['choice_2']))
  it('14 j sans choice_1 envoyé → choice_2 seul', () => expect(kinds(run(at(14)))).toEqual(['choice_2']))
  it('30 j → choice_expired uniquement', () => expect(kinds(run(at(30)))).toEqual(['choice_expired']))
  it('âge pris sur l\'avenant signé le plus ancien', () => {
    expect(kinds(run({ lots: [lot], engagements: [eng({ id: 'a', signed_at: ago(3) }), eng({ id: 'b', signed_at: ago(8) })] }))).toEqual(['choice_1'])
  })
  it('un artisan déjà retenu → aucune relance de choix', () => {
    expect(kinds(run({ lots: [lot], engagements: [eng({ signed_at: ago(20) }), eng({ id: 'e2', status: 'selected', selected_at: ago(1) })] }))).not.toContain('choice_2')
  })
  it('palier déjà envoyé → ignoré', () => {
    expect(run(at(8), ['lot1:choice_1'])).toEqual([])
    expect(run(at(15), ['lot1:choice_2'])).toEqual([])
    expect(run(at(31), ['lot1:choice_expired'])).toEqual([])
  })
  it('choice_1 déjà couvert par choice_2 envoyé', () => expect(run(at(8), ['lot1:choice_2'])).toEqual([]))
})

describe('dépôt du devis', () => {
  const sel = (d: number, subs: any[] = []) => ({ engagements: [eng({ status: 'selected', selected_at: ago(d) })], submissions: subs })
  it('6 j → rien', () => expect(run(sel(6))).toEqual([]))
  it('7 j → quote_1', () => expect(kinds(run(sel(7)))).toEqual(['quote_1']))
  it('14 j → quote_2', () => expect(kinds(run(sel(14)))).toEqual(['quote_2']))
  it('60 j → quote_stale', () => expect(kinds(run(sel(60)))).toEqual(['quote_stale']))
  it('devis déjà déposé → rien', () => {
    expect(run(sel(20, [{ id: 's1', engagement_id: 'e1', status: 'pending', created_at: ago(1) }]))).toEqual([])
  })
  it('quote_stale déjà envoyé → ignoré', () => expect(run(sel(61), ['e1:quote_stale'])).toEqual([]))
})

describe('confirmation par l\'artisan', () => {
  const sub = (d: number, status = 'pending') => ({
    engagements: [eng({ status: status === 'contested' ? 'contested' : 'quote_submitted', selected_at: ago(30) })],
    submissions: [{ id: 's1', engagement_id: 'e1', status, created_at: ago(d) }],
  })
  it('6 j → rien', () => expect(run(sub(6))).toEqual([]))
  it('7 j → confirm_1', () => expect(kinds(run(sub(7)))).toEqual(['confirm_1']))
  it('14 j → confirm_admin', () => expect(kinds(run(sub(14)))).toEqual(['confirm_admin']))
  it('contesté → aucune relance (arbitrage admin)', () => expect(run(sub(30, 'contested'))).toEqual([]))
  it('confirm_admin déjà envoyé → ignoré', () => expect(run(sub(20), ['s1:confirm_admin'])).toEqual([]))
  it('jamais de confirmation automatique : aucune action de confirmation', () => {
    expect(kinds(run(sub(90))).every(k => k.startsWith('confirm_'))).toBe(true)
  })
})

describe('avancement (D-06 bis)', () => {
  const conf = (inst: any[], status = 'quote_confirmed') => ({ engagements: [eng({ status })], installments: inst })
  const inst = (seq: number, due_on: string | null, validated = false) => ({ engagement_id: 'e1', seq, due_on, validated })
  it('date dépassée, non validé → installment_1', () => {
    expect(kinds(run(conf([inst(1, '2026-12-14'), inst(2, '2027-02-01')])))).toEqual(['installment_1'])
  })
  it('date du jour → pas encore dépassée', () => expect(run(conf([inst(1, '2026-12-15')]))).toEqual([]))
  it('date future → rien', () => expect(run(conf([inst(1, '2026-12-20')]))).toEqual([]))
  it('versement 1 validé, 2 dépassé → installment_2', () => {
    expect(kinds(run(conf([inst(1, '2026-11-01', true), inst(2, '2026-12-01')])))).toEqual(['installment_2'])
  })
  it('versement 2 en retard tant que le 1 n\'est pas validé → on relance le 1 seulement', () => {
    expect(kinds(run(conf([inst(1, '2026-12-14'), inst(2, '2026-12-01')])))).toEqual(['installment_1'])
  })
  it('tout validé → rien', () => expect(run(conf([inst(1, '2026-11-01', true), inst(2, '2026-12-01', true)]))).toEqual([]))
  it('déjà envoyé pour ce versement → ignoré', () => {
    expect(run(conf([inst(1, '2026-12-01')]), ['e1:installment_1'])).toEqual([])
  })
  it('engagement annulé ou contesté → rien', () => {
    expect(run(conf([inst(1, '2026-12-01')], 'commission_cancelled'))).toEqual([])
    expect(run(conf([inst(1, '2026-12-01')], 'contested'))).toEqual([])
  })
})

describe('handler', () => {
  it('sans Bearer valide → 401', async () => {
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
  })
})
