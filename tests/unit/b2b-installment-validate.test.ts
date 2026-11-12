import { describe, it, expect, vi, beforeEach } from 'vitest'

// Phase 05.23-05 — étapes d'avancement côté partenaire : GET sans montant + POST « Valider l'avancement ».
const REQ = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', contact_email: 'part@ex.fr', contact_name: 'Part', on_behalf_of: 'self' }
const LOT = '11111111-1111-4000-8000-000000000001'
const ENG = '22222222-2222-4000-8000-000000000002'

const state: any = { cfg: {}, inserts: [] as any[] }

function builder(table: string) {
  const filters: Array<[string, any[]]> = []
  let inserted = false
  const b: any = {}
  for (const m of ['eq', 'in', 'order', 'limit']) b[m] = (...a: any[]) => { filters.push([m, a]); return b }
  b.select = () => b
  b.insert = (row: any) => { state.inserts.push({ table, row }); inserted = true; return b }
  const one = async () => {
    const c = state.cfg
    if (inserted && table === 'b2b_installment_validations') return { data: c.insertError ? null : { validated_at: '2026-12-02T10:00:00Z' }, error: c.insertError ?? null }
    if (table === 'b2b_engagements') return { data: c.eng ?? null, error: null }
    if (table === 'b2b_installment_validations') return { data: c.prev ?? null, error: null }
    return { data: null, error: null }
  }
  b.single = one
  b.maybeSingle = one
  b.then = (res: any, rej: any) => {
    const c = state.cfg
    let data: any = []
    if (table === 'b2b_tender_lots') data = c.lotRows ?? []
    else if (table === 'b2b_engagements') data = c.engRows ?? []
    else if (table === 'b2b_quote_submissions') data = c.subRows ?? []
    else if (table === 'b2b_installment_validations') data = c.valRows ?? []
    return Promise.resolve({ data, error: null }).then(res, rej)
  }
  return b
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('readBody', async (e: any) => e.__body)
vi.stubGlobal('getRouterParam', (e: any) => e.__token)
vi.stubGlobal('setResponseHeaders', vi.fn())
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'http://test' } }))

const notifyAdmin = vi.fn(async () => {})
vi.mock('../../server/utils/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('#supabase/server', () => ({ serverSupabaseServiceRole: () => ({ from: (t: string) => builder(t) }) }))
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

const post = (await import('../../server/api/v1/b2b/engagement/[token]/installments.post')).default as any
const getView = (await import('../../server/api/v1/b2b/engagement/[token].get')).default as any
const run = (body: any, token = 'good') => post({ __token: token, __body: body })

beforeEach(() => {
  state.inserts = []
  state.cfg = { framework: { id: 'f1', signed_at: 't' }, eng: { id: ENG, status: 'quote_confirmed', confirmed_amount_cents: 10_000_000 } }
  notifyAdmin.mockClear()
})

describe('installments.post', () => {
  it('jeton invalide → 404, corps invalide → 400', async () => {
    await expect(run({ engagement_id: ENG, seq: 1 }, 'bad')).rejects.toMatchObject({ statusCode: 404 })
    await expect(run({ engagement_id: 'x', seq: 1 })).rejects.toMatchObject({ statusCode: 400 })
    await expect(run({ engagement_id: ENG, seq: 0 })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('engagement hors dossier → 404', async () => {
    state.cfg.eng = null
    await expect(run({ engagement_id: ENG, seq: 1 })).rejects.toMatchObject({ statusCode: 404, message: 'Avenant introuvable.' })
  })
  it('devis non confirmé → 409', async () => {
    state.cfg.eng = { id: ENG, status: 'quote_submitted', confirmed_amount_cents: null }
    await expect(run({ engagement_id: ENG, seq: 1 })).rejects.toMatchObject({ statusCode: 409, message: 'Le devis n\'est pas encore confirmé.' })
  })
  it('étape au-delà du nombre de versements → 400', async () => {
    await expect(run({ engagement_id: ENG, seq: 3 })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('étape précédente non validée → 409', async () => {
    await expect(run({ engagement_id: ENG, seq: 2 })).rejects.toMatchObject({ statusCode: 409, message: 'Validez d\'abord l\'étape précédente.' })
  })
  it('déjà validée (23505) → 409', async () => {
    state.cfg.insertError = { code: '23505' }
    await expect(run({ engagement_id: ENG, seq: 1 })).rejects.toMatchObject({ statusCode: 409, message: 'Étape déjà validée.' })
  })
  it('OK : insert horodaté, admin notifié, aucun montant dans la réponse', async () => {
    const r = await run({ engagement_id: ENG, seq: 1 })
    expect(r).toEqual({ status: 'VALIDATED', seq: 1, validated_at: '2026-12-02T10:00:00Z' })
    expect(state.inserts.find((i: any) => i.table === 'b2b_installment_validations').row).toMatchObject({ engagement_id: ENG, seq: 1, validated_ip: '1.2.3.4' })
    expect(notifyAdmin).toHaveBeenCalledTimes(1)
    expect(state.inserts.find((i: any) => i.table === 'audit_logs').row.action).toBe('b2b_installment_validated')
    expect(JSON.stringify(r)).not.toMatch(/amount|commission/i)
  })
  it('étape 2 acceptée quand l\'étape 1 est validée', async () => {
    state.cfg.prev = { seq: 1 }
    expect((await run({ engagement_id: ENG, seq: 2 })).seq).toBe(2)
  })
})

describe('GET : étapes d\'avancement', () => {
  const view = (confirmed: number, vals: any[] = []) => {
    state.cfg.lotRows = [{ id: LOT, category: 'toiture', status: 'closed', closed_reason: 'awarded' }]
    state.cfg.engRows = [{
      id: ENG, lot_id: LOT, pro_id: 'p', status: 'quote_confirmed', confirmed_amount_cents: confirmed, signed_at: 't', selected_at: 't2', not_awarded_reason: null,
      professionals: { company_name: 'Martin', categories: ['toiture'], phone: '06', rge_status: 'none', decennal_status: 'valid', is_verified: true },
    }]
    state.cfg.subRows = [{ id: 's1', engagement_id: ENG, amount_ht_cents: confirmed, deposit_due_on: '2026-12-01', planned_due_dates: confirmed > 20_000_000 ? ['2026-12-01', '2027-02-01', '2027-04-01'] : ['2026-12-01', '2027-03-01'], status: 'confirmed', created_at: 't' }]
    state.cfg.valRows = vals
    return getView({ __token: 'good' })
  }
  it('2 étapes jusqu’à 200 000 € HT, seule la première est validable', async () => {
    const r = await view(10_000_000)
    expect(r.lots[0].installments).toEqual([
      { seq: 1, label: 'Acompte', due_on: '2026-12-01', validated_at: null, can_validate: true },
      { seq: 2, label: 'Fin du chantier', due_on: '2027-03-01', validated_at: null, can_validate: false },
    ])
    expect(r.lots[0].submissions[0].planned_due_dates).toHaveLength(2)
  })
  it('3 étapes au-delà ; la validée avance le curseur ; libellé public « Étape suivante »', async () => {
    const r = await view(25_000_000, [{ engagement_id: ENG, seq: 1, validated_at: '2026-12-02T00:00:00Z' }])
    const inst = r.lots[0].installments
    expect(inst.map((i: any) => i.label)).toEqual(['Acompte', 'Avancement des travaux', 'Étape suivante'])
    expect(inst.map((i: any) => i.can_validate)).toEqual([false, true, false])
    expect(inst[0].validated_at).toBe('2026-12-02T00:00:00Z')
  })
  it('D-27 / D-22 : ni « factur » ni commission ni montant dans les étapes', async () => {
    for (const amount of [10_000_000, 25_000_000]) {
      const r = await view(amount)
      expect(JSON.stringify(r)).not.toMatch(/factur/i)
      expect(JSON.stringify(r)).not.toMatch(/commission|partner_share/i)
      expect(JSON.stringify(r.lots[0].installments)).not.toMatch(/amount/i)
    }
  })
  it('installments null tant que le devis n’est pas confirmé', async () => {
    const r = await view(10_000_000)
    state.cfg.engRows[0].status = 'quote_submitted'
    const r2 = await getView({ __token: 'good' })
    expect(r.lots[0].installments).not.toBeNull()
    expect(r2.lots[0].installments).toBeNull()
  })
})
