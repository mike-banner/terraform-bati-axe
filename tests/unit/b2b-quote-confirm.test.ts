import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: any = { cfg: {}, updates: [] as any[] }

function builder(table: string) {
  const filters: Array<[string, any[]]> = []
  let patch: any = null
  const b: any = {}
  for (const m of ['eq', 'in']) b[m] = (...a: any[]) => { filters.push([m, a]); return b }
  b.select = () => b
  b.update = (p: any) => { patch = p; state.updates.push({ table, patch: p, filters }); return b }
  b.maybeSingle = async () => ({ data: state.cfg.eng ?? null, error: null })
  b.then = (res: any, rej: any) => {
    const c = state.cfg
    let r: any
    if (patch && table === 'b2b_quote_submissions') r = { data: c.subMoved ?? [{ id: 's' }], error: null }
    else if (patch && table === 'b2b_engagements') r = { data: c.engMoved ?? [{ id: 'e' }], error: c.engError ?? null }
    else r = { data: c.confirmed ?? [], error: null }
    return Promise.resolve(r).then(res, rej)
  }
  return b
}

vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
const notifyAdmin = vi.fn(async () => {})
vi.mock('../../server/utils/notifyAdmin', () => ({
  notifyAdmin: (...a: any[]) => (notifyAdmin as any)(...a),
  adminDetailsTable: (rows: any[]) => rows.map(r => r.join(': ')).join('; '),
}))

const { confirmQuoteSubmission } = await import('../../server/utils/b2bQuoteConfirm')
const sb = { from: (t: string) => builder(t) }
const call = (o: any = {}) => confirmQuoteSubmission(sb, { submissionId: 's', engagementId: 'e', from: 'pending', decidedBy: 'pro', capCents: null, ...o })

beforeEach(() => { state.updates = []; state.cfg = { confirmed: [{ amount_ht_cents: 10_000_000 }, { amount_ht_cents: 2_000_000 }], eng: { confirmed_at: null } }; notifyAdmin.mockClear() })

describe('confirmQuoteSubmission', () => {
  it('dépôt déjà traité (0 ligne) → 409', async () => {
    state.cfg.subMoved = []
    await expect(call()).rejects.toMatchObject({ statusCode: 409, message: 'Ce dépôt a déjà été traité.' })
  })
  it('deux dépôts confirmés 100 000 € + 20 000 € → assiette 120 000 €, commission 9 600 €', async () => {
    const r = await call()
    expect(r).toEqual({ base_cents: 12_000_000, commission_cents: 960_000 })
    const eng = state.updates.find((u: any) => u.table === 'b2b_engagements').patch
    expect(eng).toMatchObject({ status: 'quote_confirmed', confirmed_amount_cents: 12_000_000, commission_cents: 960_000 })
    expect(eng.confirmed_at).toBeTruthy()
  })
  it("confirmed_at existant conservé", async () => {
    state.cfg.eng = { confirmed_at: '2026-01-01T00:00:00Z' }
    await call()
    expect(state.updates.find((u: any) => u.table === 'b2b_engagements').patch.confirmed_at).toBe('2026-01-01T00:00:00Z')
  })
  it('plafond d’assiette appliqué', async () => {
    const r = await call({ capCents: 5_000_000 })
    expect(r.base_cents).toBe(5_000_000)
  })
  it('décision admin : note d’arbitrage et decided_by', async () => {
    await call({ decidedBy: 'admin', from: 'contested', note: 'Montant vérifié avec les deux parties' })
    const sub = state.updates.find((u: any) => u.table === 'b2b_quote_submissions').patch
    expect(sub).toMatchObject({ status: 'confirmed', decided_by: 'admin', arbitration_note: 'Montant vérifié avec les deux parties' })
  })
  it('décision artisan : pas de note', async () => {
    await call({ note: 'ignorée' })
    expect(state.updates.find((u: any) => u.table === 'b2b_quote_submissions').patch).not.toHaveProperty('arbitration_note')
  })
  it('échec de mise à jour de l’engagement → alerte admin « Incohérence » et 500', async () => {
    state.cfg.engMoved = []
    await expect(call()).rejects.toMatchObject({ statusCode: 500 })
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
    expect((notifyAdmin.mock.calls[0] as any)[0].subject).toContain('Incohérence')
  })
})
