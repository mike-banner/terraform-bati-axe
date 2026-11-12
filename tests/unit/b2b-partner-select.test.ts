import { describe, it, expect, vi, beforeEach } from 'vitest'

// Phase 05.23-02 — choix du partenaire : handlers réels, supabase mocké (chaque update est tracé avec ses filtres).
const REQ = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', contact_email: 'part@ex.fr', contact_name: 'Part', on_behalf_of: 'self' }
const LOT = '11111111-1111-4000-8000-000000000001'
const ENG = '22222222-2222-4000-8000-000000000002'
const PRO_EMAIL = 'secret.artisan@example.com'

const state: any = { cfg: {}, updates: [] as any[], inserts: [] as any[] }

function builder(table: string) {
  const filters: Array<[string, any[]]> = []
  let patch: any = null
  let inserted = false
  const b: any = {}
  for (const m of ['eq', 'neq', 'in', 'not', 'order', 'limit']) b[m] = (...a: any[]) => { filters.push([m, a]); return b }
  b.select = () => b
  b.update = (p: any) => { patch = p; state.updates.push({ table, patch: p, filters }); return b }
  b.insert = (row: any) => { state.inserts.push({ table, row }); inserted = true; return b }
  const read = () => {
    const c = state.cfg
    if (table === 'b2b_tender_lots') return c.lot ?? null
    if (table === 'b2b_engagements') {
      if (filters.some(([m, a]) => m === 'not' && a[0] === 'selected_at')) return c.already ?? []
      return c.target ?? null
    }
    return null
  }
  const result = () => {
    const c = state.cfg
    if (inserted) return { data: null, error: null }
    if (patch) {
      if (table === 'b2b_engagements' && patch.status === 'selected') return { data: c.selectedRows ?? [{ id: ENG, pro_id: 'pro-1' }], error: c.selectError ?? null }
      if (table === 'b2b_engagements' && patch.status === 'not_awarded') return { data: c.notAwarded ?? [], error: null }
      return { data: null, error: null }
    }
    if (table === 'professionals') return { data: c.pros ?? [], error: null }
    if (table === 'b2b_tender_lots' && !patch && c.lotRows) return { data: c.lotRows, error: null }
    if (table === 'b2b_engagements' && c.engRows && !filters.some(([m]) => m === 'not')) return { data: c.engRows, error: null }
    if (table === 'b2b_quote_submissions') return { data: c.subRows ?? [], error: null }
    return { data: read(), error: null }
  }
  b.maybeSingle = async () => ({ data: read(), error: null })
  b.single = async () => ({ data: { content_html: '<p>c</p>' }, error: null })
  b.then = (res: any, rej: any) => Promise.resolve(result()).then(res, rej)
  return b
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('readBody', async (e: any) => e.__body)
vi.stubGlobal('getRouterParam', (e: any) => e.__token)
vi.stubGlobal('setResponseHeaders', vi.fn())
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'http://test' } }))

const sendEmail = vi.fn(async () => {})
const notifyAdmin = vi.fn(async () => {})

vi.mock('#supabase/server', () => ({ serverSupabaseServiceRole: () => ({ from: (t: string) => builder(t) }) }))
vi.mock('../../server/utils/email', () => ({ sendEmail: (...a: any[]) => (sendEmail as any)(...a) }))
vi.mock('../../server/utils/notifyAdmin', () => ({
  notifyAdmin: (...a: any[]) => (notifyAdmin as any)(...a),
  adminDetailsTable: (rows: any[]) => rows.map(r => r.join(': ')).join('; '),
}))
vi.mock('../../server/utils/signature', async (orig) => {
  const real: any = await orig()
  return {
    ...real,
    getClientMeta: () => ({ ip: '1.2.3.4', userAgent: 'ua' }),
    findRequestByToken: vi.fn(async (_s: any, t: string) => (t === 'good' ? REQ : null)),
    findSignedFramework: vi.fn(async () => state.cfg.framework ?? null),
  }
})

const select = (await import('../../server/api/v1/b2b/engagement/[token]/select.post')).default as any
const getView = (await import('../../server/api/v1/b2b/engagement/[token].get')).default as any

const run = (body: any, token = 'good') => select({ __token: token, __body: body })
const lotUpdate = () => state.updates.find((u: any) => u.table === 'b2b_tender_lots')
const selectedUpdate = () => state.updates.find((u: any) => u.table === 'b2b_engagements' && u.patch.status === 'selected')
const lostUpdate = () => state.updates.find((u: any) => u.table === 'b2b_engagements' && u.patch.status === 'not_awarded')

beforeEach(() => {
  state.updates = []; state.inserts = []
  state.cfg = { framework: { id: 'f1', signed_at: 't' }, lot: { id: LOT, category: 'toiture' }, target: { id: ENG }, pros: [{ id: 'pro-1', email: PRO_EMAIL, company_name: 'Toitures Martin' }] }
  sendEmail.mockClear(); notifyAdmin.mockClear()
})

describe('select — gardes', () => {
  it('jeton invalide → 404', async () => {
    await expect(run({ outcome: 'outside_platform', lot_id: LOT }, 'bad')).rejects.toMatchObject({ statusCode: 404 })
  })
  it('corps invalide → 400', async () => {
    await expect(run({ outcome: 'select', lot_id: 'x' })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('sans convention signée → 409 FRAMEWORK_REQUIRED', async () => {
    state.cfg.framework = null
    await expect(run({ outcome: 'select', lot_id: LOT, engagement_id: ENG })).rejects.toMatchObject({ statusCode: 409, data: { code: 'FRAMEWORK_REQUIRED' } })
  })
  it("lot d'un autre dossier → 404 Lot introuvable.", async () => {
    state.cfg.lot = null
    await expect(run({ outcome: 'select', lot_id: LOT, engagement_id: ENG })).rejects.toMatchObject({ statusCode: 404, message: 'Lot introuvable.' })
  })
  it('artisan déjà retenu → 409', async () => {
    state.cfg.already = [{ id: 'x' }]
    await expect(run({ outcome: 'select', lot_id: LOT, engagement_id: ENG })).rejects.toMatchObject({ statusCode: 409, message: 'Un artisan a déjà été retenu pour ce lot.' })
  })
  it('engagement non signé ou hors lot → 404', async () => {
    state.cfg.target = null
    await expect(run({ outcome: 'select', lot_id: LOT, engagement_id: ENG })).rejects.toMatchObject({ statusCode: 404, message: 'Artisan introuvable pour ce lot.' })
  })
  it('23505 sur le choisi → 409', async () => {
    state.cfg.selectError = { code: '23505' }; state.cfg.selectedRows = null
    await expect(run({ outcome: 'select', lot_id: LOT, engagement_id: ENG })).rejects.toMatchObject({ statusCode: 409, message: 'Un artisan a déjà été retenu pour ce lot.' })
  })
})

describe('select — succès', () => {
  it('retient un artisan, écarte les autres, clôt le lot, envoie les e-mails', async () => {
    state.cfg.notAwarded = [{ id: 'e3', pro_id: 'pro-2' }]
    state.cfg.pros.push({ id: 'pro-2', email: 'autre@ex.fr', company_name: 'Autre' })
    const r = await run({ outcome: 'select', lot_id: LOT, engagement_id: ENG })
    expect(r).toEqual({ status: 'SELECTED', lot_id: LOT, selected_engagement_id: ENG })
    expect(selectedUpdate().patch).toMatchObject({ status: 'selected', partner_share_bps: 300 })
    expect(selectedUpdate().filters).toContainEqual(['eq', ['status', 'signed']])
    expect(lostUpdate().patch).toEqual({ status: 'not_awarded', not_awarded_reason: 'other_selected' })
    expect(lostUpdate().filters).toContainEqual(['neq', ['id', ENG]])
    expect(lotUpdate().patch).toMatchObject({ status: 'closed', closed_reason: 'awarded' })
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
    expect(state.inserts.find((i: any) => i.table === 'audit_logs').row.action).toBe('b2b_partner_selected')
  })
  it('hors plateforme : personne en selected, tous les signed → not_awarded / outside_platform', async () => {
    state.cfg.notAwarded = [{ id: 'e3', pro_id: 'pro-1' }]
    const r = await run({ outcome: 'outside_platform', lot_id: LOT })
    expect(r.status).toBe('OUTSIDE_PLATFORM')
    expect(selectedUpdate()).toBeUndefined()
    expect(lostUpdate().patch).toEqual({ status: 'not_awarded', not_awarded_reason: 'outside_platform' })
    expect(lostUpdate().filters.some(([m]: any) => m === 'neq')).toBe(false)
    expect(lotUpdate().patch.closed_reason).toBe('awarded')
  })
  it('D-22 : la réponse ne contient ni part partenaire ni commission', async () => {
    const r = await run({ outcome: 'select', lot_id: LOT, engagement_id: ENG })
    const s = JSON.stringify(r)
    expect(s).not.toMatch(/partner_share|commission/i)
  })
})

describe('GET à jeton', () => {
  const call = (token = 'good') => getView({ __token: token })
  beforeEach(() => {
    state.cfg.lotRows = [{ id: LOT, category: 'toiture', status: 'closed', closed_reason: 'awarded' }]
    state.cfg.engRows = [{
      id: ENG, lot_id: LOT, pro_id: 'pro-1', status: 'selected', signed_at: 't', selected_at: 't2', not_awarded_reason: null,
      professionals: { company_name: 'Toitures Martin', categories: ['toiture'], professional_type: 'specialiste', rge_status: 'valid', decennal_status: 'valid', is_verified: true, canonical_slug: 'toitures-martin', postal_code: '78100', zone: 'Versailles', phone: '06 11 22 33 44', email: PRO_EMAIL },
    }]
  })
  it('expose le téléphone mais jamais l\'e-mail du pro', async () => {
    const r = await call()
    const c = r.lots[0].candidates[0]
    expect(c.pro.phone).toBe('06 11 22 33 44')
    expect(c.pro.profile_url).toBe('/pro/78/toitures-martin')
    expect(JSON.stringify(r)).not.toContain(PRO_EMAIL)
    expect('email' in c.pro).toBe(false)
  })
  it('outcome selected + selected_engagement_id', async () => {
    const r = await call()
    expect(r.lots[0]).toMatchObject({ outcome: 'selected', selected_engagement_id: ENG, can_submit_quote: true })
  })
  it('outside_platform quand tous les intéressés sont écartés hors plateforme', async () => {
    state.cfg.engRows[0] = { ...state.cfg.engRows[0], status: 'not_awarded', selected_at: null, not_awarded_reason: 'outside_platform' }
    const r = await call()
    expect(r.lots[0].outcome).toBe('outside_platform')
    expect(r.lots[0].can_submit_quote).toBe(false)
  })
  it('D-22 : aucune part partenaire ni commission dans la vue', async () => {
    expect(JSON.stringify(await call())).not.toMatch(/partner_share|commission|rétro/i)
  })
  it('jeton invalide → 404', async () => {
    await expect(call('bad')).rejects.toMatchObject({ statusCode: 404 })
  })
})
