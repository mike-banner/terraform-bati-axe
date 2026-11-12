import { describe, it, expect, vi, beforeEach } from 'vitest'

// Phase 05.23-04 — l'artisan confirme ou conteste le devis déposé par le partenaire.
const ENG = '22222222-2222-4000-8000-000000000002'
const SUB = '33333333-3333-4000-8000-000000000003'
const USER = { id: 'pro-1' }

const state: any = { cfg: {}, updates: [] as any[], inserts: [] as any[], user: USER as any }

function builder(table: string) {
  const filters: Array<[string, any[]]> = []
  const b: any = {}
  for (const m of ['eq', 'in']) b[m] = (...a: any[]) => { filters.push([m, a]); return b }
  b.select = () => b
  b.update = (p: any) => { state.updates.push({ table, patch: p, filters }); b.__patched = true; return b }
  b.insert = (row: any) => { state.inserts.push({ table, row }); return b }
  b.maybeSingle = async () => {
    const c = state.cfg
    if (table === 'b2b_engagements') {
      const owner = filters.find(([m, a]) => m === 'eq' && a[0] === 'pro_id')
      return { data: owner && owner[1][1] !== USER.id ? null : (c.eng ?? null), error: null }
    }
    if (table === 'b2b_quote_submissions') return { data: c.sub ?? null, error: null }
    return { data: null, error: null }
  }
  b.then = (res: any, rej: any) => Promise.resolve({ data: b.__patched ? (state.cfg.moved ?? [{ id: 'x' }]) : [], error: null }).then(res, rej)
  return b
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('readBody', async (e: any) => e.__body)
vi.stubGlobal('getRouterParam', (e: any) => e.__id)
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'http://test' } }))

const notifyAdmin = vi.fn(async () => {})
const confirmQuote = vi.fn(async () => ({ base_cents: 10_000_000, commission_cents: 800_000 }))
vi.mock('#supabase/server', () => ({
  serverSupabaseClient: async () => ({ auth: { getUser: async () => (state.user ? { data: { user: state.user }, error: null } : { data: { user: null }, error: { message: 'x' } }) } }),
  serverSupabaseServiceRole: () => ({ from: (t: string) => builder(t) }),
}))
vi.mock('../../server/utils/b2bQuoteConfirm', () => ({ confirmQuoteSubmission: (...a: any[]) => (confirmQuote as any)(...a) }))
vi.mock('../../server/utils/notifyAdmin', () => ({
  notifyAdmin: (...a: any[]) => (notifyAdmin as any)(...a),
  adminDetailsTable: (rows: any[]) => rows.map(r => r.join(': ')).join('; '),
}))
const computeSpy = vi.fn()
vi.mock('../../server/utils/commission', async (orig) => ({ ...(await orig() as any), computeCommission: (...a: any[]) => computeSpy(...a) }))

const handler = (await import('../../server/api/v1/engagements/[id]/confirm-quote.post')).default as any
const run = (body: any, id = ENG) => handler({ __id: id, __body: body })

beforeEach(() => {
  state.updates = []; state.inserts = []; state.user = USER
  state.cfg = { eng: { id: ENG, status: 'quote_submitted', request_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', lot_id: 'l' }, sub: { id: SUB, amount_ht_cents: 10_000_000, status: 'pending' } }
  notifyAdmin.mockClear(); confirmQuote.mockClear(); computeSpy.mockClear()
})

describe('confirm-quote (artisan)', () => {
  it('401 sans session, 400 id invalide', async () => {
    state.user = null
    await expect(run({ decision: 'confirm', submission_id: SUB })).rejects.toMatchObject({ statusCode: 401 })
    state.user = USER
    await expect(run({ decision: 'confirm', submission_id: SUB }, 'pas-un-uuid')).rejects.toMatchObject({ statusCode: 400 })
  })
  it('engagement d\'un autre pro → 404', async () => {
    state.user = { id: 'pro-autre' }
    await expect(run({ decision: 'confirm', submission_id: SUB })).rejects.toMatchObject({ statusCode: 404, message: 'Avenant introuvable.' })
  })
  it('confirm → confirmQuoteSubmission(pending, pro) et réponse sans calcul local', async () => {
    const r = await run({ decision: 'confirm', submission_id: SUB })
    expect(confirmQuote).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ submissionId: SUB, engagementId: ENG, from: 'pending', decidedBy: 'pro' }))
    expect(r).toEqual({ status: 'quote_confirmed', confirmed_amount_cents: 10_000_000, commission_cents: 800_000 })
    expect(computeSpy).not.toHaveBeenCalled()
    expect(state.inserts.find((i: any) => i.table === 'audit_logs').row.action).toBe('b2b_quote_confirmed')
  })
  it('contest sans motif ou motif hors bornes → 400', async () => {
    await expect(run({ decision: 'contest', submission_id: SUB })).rejects.toMatchObject({ statusCode: 400 })
    await expect(run({ decision: 'contest', submission_id: SUB, reason: 'court' })).rejects.toMatchObject({ statusCode: 400 })
    await expect(run({ decision: 'contest', submission_id: SUB, reason: 'x'.repeat(501) })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('contest OK → dépôt contesté, engagement contesté, admin notifié, aucun calcul', async () => {
    const r = await run({ decision: 'contest', submission_id: SUB, reason: 'Le montant ne correspond pas au devis signé' })
    expect(r).toEqual({ status: 'contested' })
    const subUpdate = state.updates.find((u: any) => u.table === 'b2b_quote_submissions')
    expect(subUpdate.patch).toMatchObject({ status: 'contested', contest_reason: 'Le montant ne correspond pas au devis signé' })
    expect(subUpdate.filters).toContainEqual(['eq', ['status', 'pending']])
    expect(state.updates.find((u: any) => u.table === 'b2b_engagements').patch).toEqual({ status: 'contested' })
    expect((notifyAdmin.mock.calls[0] as any)[0].subject).toContain('contesté')
    expect(state.inserts.find((i: any) => i.table === 'audit_logs').row.action).toBe('b2b_quote_contested')
    expect(confirmQuote).not.toHaveBeenCalled()
    expect(computeSpy).not.toHaveBeenCalled()
  })
  it('contestation d\'une révision : le statut de l\'engagement ne bouge pas', async () => {
    state.cfg.eng.status = 'quote_confirmed'
    await run({ decision: 'contest', submission_id: SUB, reason: 'Le montant ne correspond pas au devis signé' })
    expect(state.updates.find((u: any) => u.table === 'b2b_engagements')).toBeUndefined()
  })
  it('dépôt déjà traité → 409 (statut ou 0 ligne)', async () => {
    state.cfg.sub.status = 'confirmed'
    await expect(run({ decision: 'confirm', submission_id: SUB })).rejects.toMatchObject({ statusCode: 409 })
    state.cfg.sub.status = 'pending'
    state.cfg.moved = []
    await expect(run({ decision: 'contest', submission_id: SUB, reason: 'Le montant ne correspond pas au devis signé' })).rejects.toMatchObject({ statusCode: 409 })
  })
  it('dépôt inconnu → 404', async () => {
    state.cfg.sub = null
    await expect(run({ decision: 'confirm', submission_id: SUB })).rejects.toMatchObject({ statusCode: 404 })
  })
})
