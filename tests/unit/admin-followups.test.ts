import { describe, it, expect, vi, beforeEach } from 'vitest'

const REQ = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const LOT = '11111111-1111-4111-8111-111111111111'
const PRO = '22222222-2222-4222-8222-222222222222'
const ADMIN = { id: 'adm-1', app_metadata: { role: 'admin' } }
const state: any = { user: ADMIN, cfg: {}, inserts: [] as any[], touched: [] as string[] }

function builder(table: string) {
  let inserted = false
  const b: any = {}
  for (const m of ['eq', 'in', 'order', 'limit']) b[m] = () => b
  b.select = () => b
  b.insert = (row: any) => { inserted = true; state.inserts.push({ table, row }); return b }
  b.update = () => { state.touched.push(`${table}:update`); return b }
  b.delete = () => { state.touched.push(`${table}:delete`); return b }
  b.single = async () => ({ data: state.cfg.insertFails ? null : { id: 'f1', called_at: 't' }, error: state.cfg.insertFails ? { message: 'x' } : null })
  b.maybeSingle = async () => {
    const c = state.cfg
    if (table === 'b2b_requests') return { data: c.noReq ? null : { id: REQ }, error: null }
    if (table === 'b2b_tender_lots') return { data: c.noLot ? null : { id: LOT }, error: null }
    if (table === 'b2b_engagements') return { data: c.noEng ? null : { id: 'e1' }, error: null }
    return { data: null, error: null }
  }
  b.then = (res: any, rej: any) => {
    const c = state.cfg
    let r: any = { data: [], error: null }
    if (inserted) r = { data: null, error: null }
    else if (table === 'b2b_engagements') r = { data: c.engs ?? [], error: null }
    else if (table === 'b2b_admin_followups') r = { data: c.fups ?? [], error: null }
    return Promise.resolve(r).then(res, rej)
  }
  return b
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('readBody', async (e: any) => e.__body)
vi.stubGlobal('getRouterParam', (e: any) => e.__id)
vi.stubGlobal('setResponseHeaders', () => {})
vi.stubGlobal('useRuntimeConfig', () => ({ adminOperators: 'Mike,Paul' }))
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async () => state.user,
  serverSupabaseServiceRole: () => ({
    from: (t: string) => builder(t),
    auth: { admin: { listUsers: async () => ({ data: { users: [{ id: 'adm-1', email: 'admin@x.test' }] } }) } },
  }),
}))

const get = (await import('../../server/api/v1/admin/b2b-requests/[id]/followups.get')).default as any
const post = (await import('../../server/api/v1/admin/b2b-requests/[id]/followups.post')).default as any

const future = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10)
const body = (o: any = {}) => ({ party: 'demandeur', outcome: 'joint', operator: 'Mike', ...o })
const call = (o: any = {}, id = REQ) => post({ __id: id, __body: body(o) })

beforeEach(() => {
  state.user = ADMIN; state.cfg = {}; state.inserts = []; state.touched = []
})

describe('accès', () => {
  it.each([['GET', get], ['POST', (e: any) => post({ ...e, __body: body() })]] as const)('%s : non connecté → 401', async (_n, h) => {
    state.user = null
    await expect(h({ __id: REQ })).rejects.toMatchObject({ statusCode: 401 })
  })
  it.each([['GET', get], ['POST', (e: any) => post({ ...e, __body: body() })]] as const)('%s : non admin → 403', async (_n, h) => {
    state.user = { id: 'u', app_metadata: { role: 'pro' } }
    await expect(h({ __id: REQ })).rejects.toMatchObject({ statusCode: 403 })
  })
  it('id non uuid → 400', async () => {
    await expect(get({ __id: 'x' })).rejects.toMatchObject({ statusCode: 400 })
    await expect(call({}, 'x')).rejects.toMatchObject({ statusCode: 400 })
  })
  it('dossier inexistant → 404', async () => {
    state.cfg.noReq = true
    await expect(call()).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('GET fiche d\'appel', () => {
  it('demandeur en premier, artisans retenus d\'abord, journal avec opérateur', async () => {
    state.cfg.engs = [
      { id: 'e1', lot_id: LOT, pro_id: 'p1', status: 'signed', selected_at: null, b2b_tender_lots: { category: 'toiture' }, professionals: { company_name: 'A', full_name: 'a', phone: '1', email: 'a@x' } },
      { id: 'e2', lot_id: LOT, pro_id: 'p2', status: 'selected', selected_at: 't', b2b_tender_lots: { category: 'toiture' }, professionals: { company_name: 'B', full_name: 'b', phone: '2', email: 'b@x' } },
    ]
    state.cfg.fups = [{ id: 'f', actor_id: 'adm-1', operator: 'Mike', party: 'demandeur', outcome: 'joint' }]
    const r = await get({ __id: REQ })
    expect(r.call_order).toEqual(['demandeur', 'artisan'])
    expect(r.parties[0]).toMatchObject({ role: 'demandeur', label: 'Demandeur (partenaire)' })
    expect(r.parties.slice(1).map((p: any) => p.company)).toEqual(['B', 'A'])
    expect(r.parties[1]).toMatchObject({ retained: true, phone: '2', email: 'b@x', lot_label: 'Charpente & Toiture' })
    expect(r.followups[0]).toMatchObject({ operator: 'Mike', actor_email: 'admin@x.test' })
  })
})

describe('POST note d\'appel', () => {
  it('note > 1000 caractères → 400', async () => {
    await expect(call({ note: 'x'.repeat(1001) })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('outcome hors liste → 400', async () => {
    await expect(call({ outcome: 'autre' })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('artisan sans pro_id → 400', async () => {
    await expect(call({ party: 'artisan' })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('pro_id étranger au dossier → 404', async () => {
    state.cfg.noEng = true
    await expect(call({ party: 'artisan', pro_id: PRO })).rejects.toMatchObject({ statusCode: 404 })
  })
  it('lot_id hors dossier → 404', async () => {
    state.cfg.noLot = true
    await expect(call({ lot_id: LOT })).rejects.toMatchObject({ statusCode: 404 })
  })
  it('date passée ou au-delà de 365 j → 422', async () => {
    await expect(call({ next_followup_on: '2020-01-01' })).rejects.toMatchObject({ statusCode: 422 })
    await expect(call({ next_followup_on: future(400) })).rejects.toMatchObject({ statusCode: 422 })
  })
  it('rappel_prevu sans date → 422', async () => {
    await expect(call({ outcome: 'rappel_prevu' })).rejects.toMatchObject({ statusCode: 422, message: 'Indiquez la date de rappel.' })
  })
  it('opérateur absent ou inconnu → 422, aucune écriture', async () => {
    await expect(call({ operator: '' })).rejects.toMatchObject({ statusCode: 422 })
    await expect(call({ operator: 'Intrus' })).rejects.toMatchObject({ statusCode: 422 })
    expect(state.inserts).toEqual([])
  })
  it('OK → insert puis audit', async () => {
    const r = await call({ party: 'artisan', pro_id: PRO, lot_id: LOT, outcome: 'rappel_prevu', note: ' à rappeler ', next_followup_on: future(3) })
    expect(r).toEqual({ status: 'SAVED', followup_id: 'f1' })
    const [fu, audit] = state.inserts
    expect(fu.table).toBe('b2b_admin_followups')
    expect(fu.row).toMatchObject({ request_id: REQ, pro_id: PRO, lot_id: LOT, party: 'artisan', note: 'à rappeler', actor_id: 'adm-1', operator: 'Mike' })
    expect(audit).toMatchObject({ table: 'audit_logs', row: { action: 'b2b_admin_followup', target_table: 'b2b_requests', target_id: REQ } })
  })
  it('échec d\'insertion → 500', async () => {
    state.cfg.insertFails = true
    await expect(call()).rejects.toMatchObject({ statusCode: 500 })
  })
  it('journal en ajout seul : jamais d\'update ni de delete', async () => {
    await call()
    expect(state.touched).toEqual([])
  })
})
