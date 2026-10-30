import { describe, it, expect, vi, beforeEach } from 'vitest'

// Phase 05.21 — verrou de démasquage : handlers réels, supabase mocké.
const P = { name: 'Marc Petit', phone: '06 98 76 54 32', email: 'marc.petit@example.com' }
const LOT_ID = '11111111-1111-4000-8000-000000000001'
const USER = { id: '22222222-2222-4000-8000-000000000002' }

const state: any = { cfg: {}, calls: [] as Array<[string, any]>, verify: null as any }

function builder(table: string) {
  let inserted = false
  let selectStr = ''
  const cfg = state.cfg
  const b: any = {}
  for (const m of ['eq', 'in', 'order', 'limit', 'gt']) b[m] = () => b
  b.select = (s: string) => { selectStr = s; return b }
  b.insert = (row: any) => { state.calls.push([table, row]); inserted = true; return b }
  b.update = () => b
  const one = async () => {
    if (inserted) return { data: { id: 'new', claimed_at: '2026-10-02T00:00:00Z' }, error: null }
    if (table === 'b2b_tender_lots' && selectStr.startsWith('status')) return { data: { status: cfg.relookStatus ?? 'open' }, error: null }
    const v = cfg[table]
    return { data: Array.isArray(v) ? (v[0] ?? null) : (v ?? null), error: null }
  }
  b.single = one
  b.maybeSingle = one
  b.then = (res: any, rej: any) => Promise.resolve({ data: cfg[table] ?? [], count: cfg.claimCount ?? 0, error: null }).then(res, rej)
  return b
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('readBody', async (e: any) => e.__body)
vi.stubGlobal('getRouterParam', (e: any) => e.__id)
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'http://test' } }))

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: USER }, error: null }) } }),
  serverSupabaseServiceRole: () => ({ from: (t: string) => builder(t) }),
}))
vi.mock('../../server/utils/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('../../server/utils/signature', async (orig) => {
  const real: any = await orig()
  return {
    ...real,
    findSignedFramework: vi.fn(async () => state.cfg.framework ?? null),
    issueOtpChallenge: vi.fn(async () => ({ challengeId: 'c1', emailHint: 'p***@e***.fr' })),
    verifyOtpChallenge: vi.fn(async () => { if (state.verify) throw state.verify; return { challengeId: 'c1' } }),
    insertEngagement: vi.fn(async (_s: any, row: any) => { state.calls.push(['b2b_engagements', row]); return { id: 'eng1', signed_at: 'ts', created: true } }),
  }
})

const claim = (await import('../../server/api/v1/tenders/[id]/claim.post')).default
const list = (await import('../../server/api/v1/tenders/index.get')).default

const lot = {
  id: LOT_ID, category: 'toiture', status: 'open', zone_id: 'z1', request_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', created_at: 't',
  b2b_requests: { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', decision_status: 'en_attente', description: 'd', contact_name: P.name, contact_company: 'Acme', contact_phone: P.phone, contact_email: P.email },
}
const baseCfg = () => ({
  professionals: { id: USER.id, email: 'pro@x.fr', company_name: 'Pro', full_name: 'Pro P', siret: '12345678901234', categories: ['toiture'], is_verified: true, decennal_status: 'valid' },
  b2b_tender_lots: lot,
  pro_zones: { id: 'pz' },
  framework: { id: 'f1', signed_at: 'ts' },
})
const run = (body: any = {}) => (claim as any)({ __id: LOT_ID, __body: body })
const inserts = (t: string) => state.calls.filter(([x]: any) => x === t)

beforeEach(() => { state.cfg = baseCfg(); state.calls = []; state.verify = null })

describe('claim.post.ts — verrou', () => {
  it('(a) sans convention cadre → 403 FRAMEWORK_REQUIRED sans contact', async () => {
    state.cfg.framework = null
    const err: any = await run().catch((e: any) => e)
    expect(err.statusCode).toBe(403)
    expect(err.data.code).toBe('FRAMEWORK_REQUIRED')
    expect(JSON.stringify(err)).not.toContain('contact_')
  })

  it('(b) sans avenant ni code → AMENDMENT_REQUIRED sans coordonnées', async () => {
    const res = await run()
    expect(res.status).toBe('AMENDMENT_REQUIRED')
    const s = JSON.stringify(res)
    for (const x of ['contact_', P.name, P.phone, P.email]) expect(s).not.toContain(x)
  })

  it('(c) mauvais code → erreur, aucun insert', async () => {
    state.verify = Object.assign(new Error('Code invalide'), { statusCode: 422 })
    const err: any = await run({ code: '000000' }).catch((e: any) => e)
    expect(err.statusCode).toBe(422)
    expect(inserts('b2b_engagements')).toHaveLength(0)
    expect(inserts('b2b_tender_claims')).toHaveLength(0)
  })

  it('(d) bon code → avenant PUIS claim, coordonnées révélées', async () => {
    const res = await run({ code: '123456' })
    const order = state.calls.map(([t]: any) => t).filter((t: string) => t === 'b2b_engagements' || t === 'b2b_tender_claims')
    expect(order).toEqual(['b2b_engagements', 'b2b_tender_claims'])
    expect(inserts('b2b_engagements')[0][1].type).toBe('lot_amendment')
    expect(res.status).toBe('SUCCESS')
    expect(res.tender.contact_name).toBe(P.name)
    expect(res.tender.contact_phone).toBe(P.phone)
    expect(res.tender.contact_email).toBe(P.email)
  })

  it('(e) lot clos entre code et saisie → 409 LOT_CLOSED, aucun insert', async () => {
    state.cfg.relookStatus = 'closed'
    const err: any = await run({ code: '123456' }).catch((e: any) => e)
    expect(err.statusCode).toBe(409)
    expect(err.data.code).toBe('LOT_CLOSED')
    expect(inserts('b2b_engagements')).toHaveLength(0)
    expect(inserts('b2b_tender_claims')).toHaveLength(0)
  })
})

describe('index.get.ts — liste verrouillée', () => {
  const listCfg = (amendments: any[]) => ({
    ...baseCfg(),
    pro_zones: [{ zone_id: 'z1' }],
    b2b_tender_lots: [lot],
    b2b_tender_claims: [{ id: 'cl', lot_id: LOT_ID, claimed_at: 't' }],
    b2b_engagements: amendments,
    zones: [{ id: 'z1', name: 'Zone' }],
  })
  const call = () => (list as any)({})

  it('(f) claim sans avenant → locked, aucune coordonnée', async () => {
    state.cfg = listCfg([])
    const res = await call()
    expect(res.tenders[0].status).toBe('locked')
    const s = JSON.stringify(res)
    for (const x of [P.name, P.phone, P.email]) expect(s).not.toContain(x)
  })

  it('(f) claim + avenant → coordonnées présentes', async () => {
    state.cfg = listCfg([{ id: 'am', lot_id: LOT_ID, status: 'signed', signed_at: 'ts' }])
    const res = await call()
    expect(res.tenders[0].status).toBe('claimed')
    expect(res.tenders[0].contact_email).toBe(P.email)
    expect(res.tenders[0].engagement.id).toBe('am')
    expect(res.frameworkSigned).toBe(true)
  })
})
