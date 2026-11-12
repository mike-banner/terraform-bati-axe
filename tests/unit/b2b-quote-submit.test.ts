import { describe, it, expect, vi, beforeEach } from 'vitest'

// Phase 05.23-03 — dépôt du devis par le partenaire : handlers réels, supabase / R2 mockés.
const REQ = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', contact_email: 'part@ex.fr', contact_name: 'Part', on_behalf_of: 'self' }
const ENG = '22222222-2222-4000-8000-000000000002'
const SUB = '33333333-3333-4000-8000-000000000003'
const KEY = `b2b-quotes/${ENG}/${'a'.repeat(32)}.pdf`
const USER = { id: 'pro-1', app_metadata: {} as any }

const state: any = { cfg: {}, inserts: [] as any[], updates: [] as any[], user: USER as any }
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

function builder(table: string) {
  const filters: Array<[string, any[]]> = []
  let inserted = false
  let patch: any = null
  const b: any = {}
  for (const m of ['eq', 'in', 'order', 'limit']) b[m] = (...a: any[]) => { filters.push([m, a]); return b }
  b.select = () => b
  b.insert = (row: any) => { state.inserts.push({ table, row }); inserted = true; return b }
  b.update = (p: any) => { patch = p; state.updates.push({ table, patch: p, filters }); return b }
  const one = async () => {
    const c = state.cfg
    if (inserted && table === 'b2b_quote_submissions') return { data: c.insertError ? null : { id: SUB, attested_at: 'ts' }, error: c.insertError ?? null }
    if (table === 'b2b_engagements') return { data: c.eng ?? null, error: null }
    if (table === 'professionals') return { data: { email: 'pro@ex.fr', company_name: 'Pro' }, error: null }
    if (table === 'b2b_quote_submissions') return { data: c.fileRow ?? null, error: null }
    return { data: null, error: null }
  }
  b.single = one
  b.maybeSingle = one
  b.then = (res: any, rej: any) => {
    const c = state.cfg
    let data: any = []
    if (patch && table === 'b2b_engagements') data = [{ id: ENG }]
    else if (table === 'b2b_quote_submissions') data = filters.some(([m]) => m === 'in') ? (c.open ?? []) : (c.confirmed ?? [])
    return Promise.resolve({ data, error: null }).then(res, rej)
  }
  return b
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('readBody', async (e: any) => e.__body)
vi.stubGlobal('getRouterParam', (e: any, k: string) => (k === 'token' ? e.__token : e.__id))
vi.stubGlobal('setResponseHeaders', vi.fn())
vi.stubGlobal('sendRedirect', (_e: any, url: string, code: number) => ({ redirect: url, code }))
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'http://test' } }))

const sendEmail = vi.fn(async () => {})
const notifyAdmin = vi.fn(async () => {})
const fetchMock = vi.fn(async () => ({ ok: true, headers: { get: () => '1000' } }))
vi.stubGlobal('fetch', fetchMock)

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: () => ({ from: (t: string) => builder(t) }),
  serverSupabaseClient: async () => ({ auth: { getUser: async () => (state.user ? { data: { user: state.user }, error: null } : { data: { user: null }, error: { message: 'x' } }) } }),
}))
vi.mock('../../server/utils/email', () => ({ sendEmail: (...a: any[]) => (sendEmail as any)(...a) }))
vi.mock('../../server/utils/notifyAdmin', () => ({
  notifyAdmin: (...a: any[]) => (notifyAdmin as any)(...a),
  adminDetailsTable: (rows: any[]) => rows.map(r => r.join(': ')).join('; '),
}))
vi.mock('../../server/utils/r2B2b', async (orig) => ({ ...(await orig() as any), signB2bObjectUrl: vi.fn(async () => 'https://r2.test/x') }))
vi.mock('../../server/utils/signature', async (orig) => {
  const real: any = await orig()
  return {
    ...real,
    getClientMeta: () => ({ ip: '1.2.3.4', userAgent: 'ua' }),
    findRequestByToken: vi.fn(async (_s: any, t: string) => (t === 'good' ? REQ : null)),
    findSignedFramework: vi.fn(async () => state.cfg.framework ?? null),
  }
})

const { QUOTE_KEY_REGEX, buildQuoteKey } = await import('../../server/utils/r2B2b')
const presign = (await import('../../server/api/v1/b2b/engagement/[token]/quote-presign.post')).default as any
const quote = (await import('../../server/api/v1/b2b/engagement/[token]/quote.post')).default as any
const partnerFile = (await import('../../server/api/v1/b2b/engagement/[token]/quotes/[id]/file.get')).default as any
const proFile = (await import('../../server/api/v1/b2b/quotes/[id]/file.get')).default as any

const pBody = (o: any = {}) => ({ engagement_id: ENG, filename: 'devis.pdf', content_type: 'application/pdf', size: 1000, ...o })
const qBody = (o: any = {}) => ({ engagement_id: ENG, file_key: KEY, file_size: 1000, amount: '150000', planned_due_dates: [future(10), future(40)], attestation: true, ...o })
const runP = (body: any, token = 'good') => presign({ __token: token, __body: body })
const runQ = (body: any, token = 'good') => quote({ __token: token, __body: body })

beforeEach(() => {
  state.inserts = []; state.updates = []; state.user = USER
  state.cfg = { framework: { id: 'f1', signed_at: 't' }, eng: { id: ENG, status: 'selected', pro_id: 'pro-1' } }
  sendEmail.mockClear(); notifyAdmin.mockClear(); fetchMock.mockClear()
  fetchMock.mockResolvedValue({ ok: true, headers: { get: () => '1000' } })
})

describe('clé R2', () => {
  it('QUOTE_KEY_REGEX accepte la clé générée et refuse le reste', () => {
    expect(QUOTE_KEY_REGEX.test(buildQuoteKey(ENG))).toBe(true)
    expect(buildQuoteKey(ENG).startsWith(`b2b-quotes/${ENG}/`)).toBe(true)
    expect(QUOTE_KEY_REGEX.test(`b2b-quotes/${ENG}/../${'a'.repeat(32)}.pdf`)).toBe(false)
    expect(QUOTE_KEY_REGEX.test(`b2b-quotes/${ENG}/${'a'.repeat(32)}.png`)).toBe(false)
    expect(QUOTE_KEY_REGEX.test(`b2b-uploads/${ENG}/${'a'.repeat(32)}.pdf`)).toBe(false)
  })
})

describe('quote-presign', () => {
  it('engagement hors dossier → 404', async () => {
    state.cfg.eng = null
    await expect(runP(pBody())).rejects.toMatchObject({ statusCode: 404 })
  })
  it('engagement non retenu → 409', async () => {
    state.cfg.eng = { id: ENG, status: 'signed' }
    await expect(runP(pBody())).rejects.toMatchObject({ statusCode: 409, message: 'Aucun artisan retenu sur ce lot.' })
  })
  it('dépôt déjà en attente → 409', async () => {
    state.cfg.open = [{ id: SUB }]
    await expect(runP(pBody())).rejects.toMatchObject({ statusCode: 409, message: 'Un devis est déjà en attente de confirmation.' })
  })
  it('pas un PDF → 415', async () => {
    await expect(runP(pBody({ content_type: 'image/png' }))).rejects.toMatchObject({ statusCode: 415 })
    await expect(runP(pBody({ filename: 'devis.docx' }))).rejects.toMatchObject({ statusCode: 415 })
  })
  it('> 20 Mo → 400', async () => {
    await expect(runP(pBody({ size: 21 * 1024 * 1024 }))).rejects.toMatchObject({ statusCode: 400 })
  })
  it('OK → URL et clé préfixée par l\'engagement', async () => {
    const r = await runP(pBody())
    expect(r.signedUrl).toBe('https://r2.test/x')
    expect(r.fileKey.startsWith(`b2b-quotes/${ENG}/`)).toBe(true)
  })
})

describe('quote', () => {
  it('attestation absente ou fausse → 400', async () => {
    await expect(runQ(qBody({ attestation: false }))).rejects.toMatchObject({ statusCode: 400 })
    await expect(runQ(qBody({ attestation: undefined }))).rejects.toMatchObject({ statusCode: 400 })
  })
  it('montant invalide → 422', async () => {
    await expect(runQ(qBody({ amount: 'abc' }))).rejects.toMatchObject({ statusCode: 422, message: 'Montant HT invalide (ex. 250000 ou 250 000,50).' })
  })
  it("clé d'un autre engagement → 400", async () => {
    const other = `b2b-quotes/${'9'.repeat(8)}-9999-4999-8999-${'9'.repeat(12)}/${'a'.repeat(32)}.pdf`
    await expect(runQ(qBody({ file_key: other }))).rejects.toMatchObject({ statusCode: 400, message: 'Fichier invalide.' })
  })
  it('fichier absent de R2 → 422', async () => {
    fetchMock.mockResolvedValue({ ok: false, headers: { get: () => null } })
    await expect(runQ(qBody())).rejects.toMatchObject({ statusCode: 422, message: 'Fichier du devis introuvable : recommencez le dépôt.' })
  })
  it('nombre de dates ≠ versements attendus → 422', async () => {
    await expect(runQ(qBody({ planned_due_dates: [future(10), future(40), future(80)] }))).rejects.toMatchObject({ statusCode: 422, message: 'Indiquez une date prévue par versement.' })
    await expect(runQ(qBody({ amount: '250000', planned_due_dates: [future(10), future(40)] }))).rejects.toMatchObject({ statusCode: 422 })
  })
  it('3 dates exigées au-dessus du seuil', async () => {
    const r = await runQ(qBody({ amount: '250000', planned_due_dates: [future(10), future(40), future(80)] }))
    expect(r.status).toBe('SUBMITTED')
  })
  it('dates hors fenêtre ou non croissantes → 422', async () => {
    await expect(runQ(qBody({ planned_due_dates: [future(40), future(10)] }))).rejects.toMatchObject({ statusCode: 422, message: 'Dates prévues invalides.' })
    await expect(runQ(qBody({ planned_due_dates: [future(10), future(5000)] }))).rejects.toMatchObject({ statusCode: 422 })
    await expect(runQ(qBody({ planned_due_dates: ['2026-02-31', future(40)] }))).rejects.toMatchObject({ statusCode: 422 })
  })
  it('OK sur retenu : insert pending attesté, engagement → quote_submitted, e-mail, admin, audit', async () => {
    const r = await runQ(qBody())
    expect(r).toEqual({ status: 'SUBMITTED', submission_id: SUB, revision: false })
    const ins = state.inserts.find((i: any) => i.table === 'b2b_quote_submissions').row
    expect(ins).toMatchObject({ status: 'pending', amount_ht_cents: 15_000_000, submitted_ip: '1.2.3.4' })
    expect(ins.attestation_text).toMatch(/informé mon client/)
    expect(ins.deposit_due_on).toBe(ins.planned_due_dates[0])
    expect(state.updates.find((u: any) => u.table === 'b2b_engagements').patch).toEqual({ status: 'quote_submitted' })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
    const audit = state.inserts.find((i: any) => i.table === 'audit_logs').row
    expect(audit).toMatchObject({ action: 'b2b_quote_submitted', metadata: { revision: false } })
  })
  it('avenant de travaux : aucun changement de statut, revision true', async () => {
    state.cfg.eng = { id: ENG, status: 'quote_confirmed', pro_id: 'pro-1' }
    state.cfg.confirmed = [{ amount_ht_cents: 5_000_000 }]
    const r = await runQ(qBody({ amount: '20000' }))
    expect(r.revision).toBe(true)
    expect(state.updates.find((u: any) => u.table === 'b2b_engagements')).toBeUndefined()
    expect(state.inserts.find((i: any) => i.table === 'audit_logs').row.metadata.revision).toBe(true)
  })
  it('dépôt ouvert concurrent (23505) → 409', async () => {
    state.cfg.insertError = { code: '23505' }
    await expect(runQ(qBody())).rejects.toMatchObject({ statusCode: 409, message: 'Un devis est déjà en attente de confirmation.' })
  })
  it('sans convention → 409 FRAMEWORK_REQUIRED', async () => {
    state.cfg.framework = null
    await expect(runQ(qBody())).rejects.toMatchObject({ statusCode: 409, data: { code: 'FRAMEWORK_REQUIRED' } })
  })
})

describe('lectures du PDF', () => {
  it('partenaire : dépôt d\'un autre dossier → 404', async () => {
    state.cfg.fileRow = null
    await expect(partnerFile({ __token: 'good', __id: SUB })).rejects.toMatchObject({ statusCode: 404, message: 'Document introuvable.' })
  })
  it('partenaire : redirection 302', async () => {
    state.cfg.fileRow = { file_key: KEY }
    expect(await partnerFile({ __token: 'good', __id: SUB })).toEqual({ redirect: 'https://r2.test/x', code: 302 })
  })
  it('connecté : 401 sans session', async () => {
    state.user = null
    await expect(proFile({ __id: SUB })).rejects.toMatchObject({ statusCode: 401 })
  })
  it('connecté : autre pro → 404, pro de l\'engagement → 302, admin → 302', async () => {
    state.cfg.fileRow = { file_key: KEY, b2b_engagements: { pro_id: 'pro-1' } }
    state.user = { id: 'pro-2', app_metadata: {} }
    await expect(proFile({ __id: SUB })).rejects.toMatchObject({ statusCode: 404 })
    state.user = USER
    expect(await proFile({ __id: SUB })).toMatchObject({ code: 302 })
    state.user = { id: 'adm', app_metadata: { role: 'admin' } }
    expect(await proFile({ __id: SUB })).toMatchObject({ code: 302 })
  })
})
