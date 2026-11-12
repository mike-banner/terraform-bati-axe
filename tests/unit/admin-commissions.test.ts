import { describe, it, expect, vi, beforeEach } from 'vitest'

// Phase 05.23-06 — Commissions en cours : utilitaire testé directement, endpoints réels, supabase mocké.
const ENG = '22222222-2222-4000-8000-000000000002'
const REQ = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const SUB = '33333333-3333-4000-8000-000000000003'
const ADMIN = { id: 'adm-1', app_metadata: { role: 'admin' } }

const state: any = { cfg: {}, inserts: [] as any[], updates: [] as any[], user: ADMIN as any, auditFails: false }

const eng = (o: any = {}) => ({
  id: ENG, request_id: REQ, lot_id: 'l1', status: 'quote_confirmed', confirmed_amount_cents: 10_000_000, partner_share_bps: 300,
  cancelled_at: null, cancel_case: null, cancel_reason: null, partner_share_kept_cents: null,
  b2b_tender_lots: { category: 'toiture' }, professionals: { company_name: 'Toitures Martin' }, b2b_requests: { contact_name: 'Part', contact_company: 'Syndic SA' },
  ...o,
})
const sub = (o: any = {}) => ({ id: SUB, engagement_id: ENG, amount_ht_cents: 10_000_000, planned_due_dates: ['2026-12-01', '2027-03-01'], status: 'confirmed', contest_reason: null, created_at: '2026-11-01T00:00:00Z', ...o })

function builder(table: string) {
  const filters: Array<[string, any[]]> = []
  let patch: any = null
  let inserted = false
  let head = false
  const b: any = {}
  for (const m of ['eq', 'in', 'lt', 'order', 'limit']) b[m] = (...a: any[]) => { filters.push([m, a]); return b }
  b.select = (_s?: string, opts?: any) => { head = Boolean(opts?.head); return b }
  b.update = (p: any) => { patch = p; state.updates.push({ table, patch: p, filters }); return b }
  b.insert = (row: any) => {
    inserted = true
    state.inserts.push({ table, row })
    return b
  }
  b.maybeSingle = async () => {
    const c = state.cfg
    if (table === 'b2b_engagements') return { data: c.existsEng ?? null, error: null }
    if (table === 'b2b_quote_submissions') return { data: c.oneSub ?? null, error: null }
    if (table === 'b2b_requests') return { data: c.req ?? null, error: null }
    return { data: null, error: null }
  }
  b.then = (res: any, rej: any) => {
    const c = state.cfg
    let r: any = { data: [], error: null }
    if (inserted) r = { data: null, error: table === 'audit_logs' && state.auditFails ? { message: 'x' } : null }
    else if (head) r = { count: c.staleCount ?? 0, data: null, error: null }
    else if (patch) r = { data: table === 'b2b_engagements' ? (c.engMoved ?? [{ id: ENG }]) : [{ id: 'x' }], error: null }
    else if (table === 'b2b_engagements') r = { data: c.engs ?? [], error: null }
    else if (table === 'b2b_quote_submissions') r = { data: c.subs ?? [], error: null }
    else if (table === 'b2b_installment_validations') r = { data: c.vals ?? [], error: null }
    else if (table === 'b2b_commission_movements') r = { data: c.movs ?? [], error: null }
    return Promise.resolve(r).then(res, rej)
  }
  return b
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('readBody', async (e: any) => e.__body)
vi.stubGlobal('getRouterParam', (e: any) => e.__id)
vi.stubGlobal('getQuery', (e: any) => e.__query ?? {})
vi.stubGlobal('setResponseHeaders', (e: any, h: any) => { e.__headers = h })
vi.stubGlobal('useRuntimeConfig', () => ({ adminOperators: 'Mike,Paul', public: { siteUrl: 'http://test' } }))

const sendEmail = vi.fn(async () => {})
const confirmQuote = vi.fn(async () => ({ base_cents: 1, commission_cents: 1 }))
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async () => state.user,
  serverSupabaseServiceRole: () => ({ from: (t: string) => builder(t) }),
}))
vi.mock('../../server/utils/email', () => ({ sendEmail: (...a: any[]) => (sendEmail as any)(...a) }))
vi.mock('../../server/utils/b2bQuoteConfirm', () => ({ confirmQuoteSubmission: (...a: any[]) => (confirmQuote as any)(...a) }))
vi.mock('../../server/utils/signature', () => ({ issuePartnerToken: vi.fn(async () => 'tok') }))

const { loadCommissionRows, summarizeCommissions, countStaleWithoutQuote } = await import('../../server/utils/b2bCommissionsQuery')
const list = (await import('../../server/api/v1/admin/commissions.get')).default as any
const exportCsv = (await import('../../server/api/v1/admin/commissions/export.get')).default as any
const movements = (await import('../../server/api/v1/admin/commissions/[id]/movements.post')).default as any
const cancel = (await import('../../server/api/v1/admin/commissions/[id]/cancel.post')).default as any
const arbitrate = (await import('../../server/api/v1/admin/commissions/[id]/arbitrate.post')).default as any

const sb = { from: (t: string) => builder(t) }
const load = () => loadCommissionRows(sb, { quoteBaseCapCents: null })
const mv = (o: any = {}) => movements({ __id: ENG, __body: { type: 'encaissement', amount: '1000', occurred_on: '2026-11-10', operator: 'Mike', ...o } })
const cx = (o: any = {}) => cancel({ __id: ENG, __body: { case: 'never_started', reason: 'Chantier annulé par le client final', operator: 'Mike', ...o } })
const ar = (o: any = {}) => arbitrate({ __id: ENG, __body: { submission_id: SUB, decision: 'confirm', note: 'Montant vérifié avec les deux parties', operator: 'Mike', ...o } })

beforeEach(() => {
  state.inserts = []; state.updates = []; state.user = ADMIN; state.auditFails = false
  state.cfg = { engs: [eng()], subs: [sub()] }
  sendEmail.mockClear(); confirmQuote.mockClear()
})

describe('loadCommissionRows', () => {
  it('10 000 € HT sans mouvement : 2 versements, échéance à venir', async () => {
    const [r] = await load()
    expect(r).toMatchObject({ commission_cents: 800_000, partner_share_cents: 300_000, platform_net_cents: 500_000 })
    expect(r.schedule.map(i => i.amount_cents)).toEqual([400_000, 400_000])
    expect(r.schedule[0]).toMatchObject({ due_on: '2026-12-01', validated_at: null })
    expect(r.state.status).toBe('echeance_a_venir')
    expect(r.state.next_due).toMatchObject({ seq: 1, label: 'Acompte', amount_cents: 400_000, validated: false })
    expect(r.state.balance_cents).toBe(800_000)
  })
  it('validation du versement 1 → à facturer, exigible 400 000', async () => {
    state.cfg.vals = [{ engagement_id: ENG, seq: 1, validated_at: '2026-12-02T00:00:00Z' }]
    const [r] = await load()
    expect(r.state.status).toBe('a_facturer')
    expect(r.state.exigible_cents).toBe(400_000)
  })
  it('250 000 € HT : 3 versements', async () => {
    state.cfg.engs = [eng({ confirmed_amount_cents: 25_000_000 })]
    state.cfg.subs = [sub({ amount_ht_cents: 25_000_000, planned_due_dates: ['2026-12-01', '2027-02-01', '2027-04-01'] })]
    const [r] = await load()
    expect(r.schedule.map(i => i.amount_cents)).toEqual([570_000, 760_000, 570_000])
  })
  it('assiette = somme des dépôts confirmés ; écart de snapshot signalé', async () => {
    state.cfg.subs = [sub(), sub({ id: 's2', amount_ht_cents: 2_000_000, created_at: '2026-11-05T00:00:00Z' })]
    const [r] = await load()
    expect(r.base_cents).toBe(12_000_000)
    expect(r.snapshot_mismatch).toBe(true)
    state.cfg.engs = [eng({ confirmed_amount_cents: 12_000_000 })]
    expect((await load())[0].snapshot_mismatch).toBe(false)
  })
  it('révision contestée sur un devis confirmé → contestée, open_contest renseigné', async () => {
    state.cfg.subs = [sub(), sub({ id: 's2', amount_ht_cents: 2_000_000, status: 'contested', contest_reason: 'Montant erroné', created_at: '2026-11-05T00:00:00Z' })]
    const [r] = await load()
    expect(r.state.status).toBe('contestee')
    expect(r.open_contest).toEqual({ submission_id: 's2', amount_ht_cents: 2_000_000, reason: 'Montant erroné' })
  })
  it('avenant franchissant le seuil → schedule_changed, libellé admin « Facture suivante »', async () => {
    state.cfg.engs = [eng({ confirmed_amount_cents: 25_000_000 })]
    state.cfg.subs = [sub({ amount_ht_cents: 20_000_000 }), sub({ id: 's2', amount_ht_cents: 5_000_000, created_at: '2026-11-05T00:00:00Z', planned_due_dates: ['2026-12-01', '2027-02-01', '2027-04-01'] })]
    const [r] = await load()
    expect(r.schedule_changed).toBe(true)
    expect(r.schedule.map(i => i.label)).toEqual(['Acompte', 'Avancement des travaux', 'Facture suivante'])
  })
  it('aucun engagement → liste vide', async () => {
    state.cfg.engs = []
    expect(await load()).toEqual([])
  })
})

describe('synthèse', () => {
  it('totaux, contestés et dossiers sans devis', async () => {
    state.cfg.movs = [
      { id: 'm1', engagement_id: ENG, type: 'encaissement', amount_cents: 300_000, occurred_on: '2026-12-10', note: null, actor_id: 'a', operator: 'Mike', created_at: '2026-12-10T00:00:00Z' },
    ]
    const rows = await load()
    const s = summarizeCommissions(rows, 2)
    expect(s).toMatchObject({ total_to_collect_cents: 500_000, total_collected_cents: 300_000, partner_shares_due_cents: 0, contested_count: 0, stale_without_quote_count: 2 })
  })
  it('countStaleWithoutQuote lit le compteur', async () => {
    state.cfg.staleCount = 4
    expect(await countStaleWithoutQuote(sb, 60)).toBe(4)
    const lt = state.updates.length
    expect(lt).toBe(0)
  })
})

describe('liste et export', () => {
  it('401 / 403', async () => {
    state.user = null
    await expect(list({})).rejects.toMatchObject({ statusCode: 401 })
    state.user = { id: 'u', app_metadata: {} }
    await expect(list({})).rejects.toMatchObject({ statusCode: 403 })
    await expect(exportCsv({ __query: { operator: 'Mike' } })).rejects.toMatchObject({ statusCode: 403 })
  })
  it('liste : rows + summary', async () => {
    const r = await list({})
    expect(r.rows).toHaveLength(1)
    expect(r.summary).toBeDefined()
    expect(r.quote_stale_days).toBe(60)
  })
  it('export sans opérateur ou hors liste → 422', async () => {
    await expect(exportCsv({ __query: {} })).rejects.toMatchObject({ statusCode: 422 })
    await expect(exportCsv({ __query: { operator: 'Inconnu' } })).rejects.toMatchObject({ statusCode: 422 })
  })
  it('export CSV commissions : en-têtes, BOM, première ligne = libellés', async () => {
    const e: any = { __query: { operator: 'Mike' } }
    const csv = await exportCsv(e)
    expect(e.__headers['Content-Type']).toBe('text/csv; charset=utf-8')
    expect(e.__headers['Content-Disposition']).toMatch(/^attachment; filename="commissions-\d{4}-\d{2}-\d{2}\.csv"$/)
    expect(csv.startsWith('﻿Référence dossier;Lot;')).toBe(true)
    expect(csv).toContain('8000,00')
  })
  it('export journal : colonnes du journal avec opérateur', async () => {
    state.cfg.movs = [{ id: 'm1', engagement_id: ENG, type: 'encaissement', amount_cents: 300_000, occurred_on: '2026-12-10', note: null, actor_id: 'a', operator: 'Paul', created_at: '2026-12-10T00:00:00Z' }]
    const e: any = { __query: { operator: 'Mike', scope: 'movements' } }
    const csv = await exportCsv(e)
    expect(csv).toContain('Date opération;Enregistré le;Référence dossier')
    expect(csv).toContain(';Paul;')
    expect(e.__headers['Content-Disposition']).toContain('mouvements-')
  })
})

describe('movements', () => {
  it('403 non admin, 400 type annulation', async () => {
    state.user = { id: 'u', app_metadata: {} }
    await expect(mv()).rejects.toMatchObject({ statusCode: 403 })
    state.user = ADMIN
    await expect(mv({ type: 'annulation' })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('opérateur absent ou hors liste → 422 sans écriture', async () => {
    await expect(mv({ operator: undefined })).rejects.toMatchObject({ statusCode: 422 })
    await expect(mv({ operator: 'Inconnu' })).rejects.toMatchObject({ statusCode: 422 })
    expect(state.inserts).toHaveLength(0)
  })
  it('date future ou montant invalide → 422', async () => {
    await expect(mv({ occurred_on: '2999-01-01' })).rejects.toMatchObject({ statusCode: 422 })
    await expect(mv({ amount: 'abc' })).rejects.toMatchObject({ statusCode: 422 })
  })
  it('engagement contesté → 409', async () => {
    state.cfg.engs = [eng({ status: 'contested' })]
    await expect(mv()).rejects.toMatchObject({ statusCode: 409, message: 'Commission non confirmée.' })
  })
  it('facture au-delà des versements validés → 422', async () => {
    await expect(mv({ type: 'commission_facturee', amount: '10' })).rejects.toMatchObject({ statusCode: 422, message: 'Montant supérieur au reste à facturer (versements validés).' })
  })
  it('facture dans la limite du versement validé → OK, journal + audit', async () => {
    state.cfg.vals = [{ engagement_id: ENG, seq: 1, validated_at: '2026-12-02T00:00:00Z' }]
    const r = await mv({ type: 'commission_facturee', amount: '4000' })
    expect(r.state).toBeDefined()
    const ins = state.inserts.find((i: any) => i.table === 'b2b_commission_movements').row
    expect(ins).toMatchObject({ engagement_id: ENG, type: 'commission_facturee', amount_cents: 400_000, operator: 'Mike', actor_id: 'adm-1' })
    expect(state.inserts.find((i: any) => i.table === 'audit_logs').row.metadata.operator).toBe('Mike')
  })
  it('encaissement au-delà de la commission → 422', async () => {
    await expect(mv({ type: 'encaissement', amount: '9000' })).rejects.toMatchObject({ statusCode: 422 })
  })
  it('rétro-commission pas encore due → 422', async () => {
    await expect(mv({ type: 'retro_commission_versee', amount: '100' })).rejects.toMatchObject({ statusCode: 422, message: 'Rétro-commission pas encore due.' })
  })
  it('remboursement refusé hors commission annulée', async () => {
    await expect(mv({ type: 'remboursement', amount: '100' })).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('cancel', () => {
  it('motif trop court ou cas inconnu → 400', async () => {
    await expect(cx({ reason: 'court' })).rejects.toMatchObject({ statusCode: 400 })
    await expect(cx({ case: 'autre' })).rejects.toMatchObject({ statusCode: 400 })
  })
  it('opérateur hors liste → 422 avant tout audit', async () => {
    await expect(cx({ operator: 'Inconnu' })).rejects.toMatchObject({ statusCode: 422 })
    expect(state.inserts).toHaveLength(0)
  })
  it('devis seulement déposé ou statut antérieur → 409', async () => {
    state.cfg.engs = []
    state.cfg.existsEng = { id: ENG }
    await expect(cx()).rejects.toMatchObject({ statusCode: 409, message: 'Annulation impossible depuis ce statut.' })
  })
  it('engagement annulé → 409', async () => {
    state.cfg.engs = [eng({ status: 'commission_cancelled', cancelled_at: 't' })]
    await expect(cx()).rejects.toMatchObject({ statusCode: 409 })
  })
  it('audit en échec → 500 et aucune écriture', async () => {
    state.auditFails = true
    await expect(cx()).rejects.toMatchObject({ statusCode: 500, message: 'Traçabilité impossible, annulation abandonnée.' })
    expect(state.updates).toHaveLength(0)
    expect(state.inserts.filter((i: any) => i.table === 'b2b_commission_movements')).toHaveLength(0)
  })
  it('encaissé 4 000 € → mouvement annulation du remboursement à traiter, audit avant update', async () => {
    state.cfg.movs = [{ id: 'm1', engagement_id: ENG, type: 'encaissement', amount_cents: 400_000, occurred_on: '2026-12-10', note: null, actor_id: 'a', operator: 'Mike', created_at: 't' }]
    const r = await cx()
    expect(r).toMatchObject({ status: 'commission_cancelled', refund_due_cents: 400_000, warning_partner_already_paid: false })
    const order = [...state.inserts.map((i: any) => `i:${i.table}`)]
    expect(order[0]).toBe('i:audit_logs')
    expect(state.inserts.find((i: any) => i.table === 'b2b_commission_movements').row).toMatchObject({ type: 'annulation', amount_cents: 400_000 })
    expect(state.updates.find((u: any) => u.table === 'b2b_engagements').patch).toMatchObject({ status: 'commission_cancelled', cancel_case: 'never_started', partner_share_kept_cents: 0 })
  })
  it('rétro-commission déjà versée → avertissement et montant à récupérer', async () => {
    state.cfg.movs = [{ id: 'm2', engagement_id: ENG, type: 'retro_commission_versee', amount_cents: 300_000, occurred_on: '2026-12-10', note: null, actor_id: 'a', operator: 'Mike', created_at: 't' }]
    const r = await cx()
    expect(r).toMatchObject({ warning_partner_already_paid: true, partner_to_recover_cents: 300_000 })
  })
  it('dépôt ouvert → rejeté avec note', async () => {
    await cx()
    const u = state.updates.find((x: any) => x.table === 'b2b_quote_submissions')
    expect(u.patch).toMatchObject({ status: 'rejected', arbitration_note: 'Commission annulée par BÂTI-AXE.' })
  })
})

describe('arbitrate', () => {
  beforeEach(() => {
    state.cfg.engs = [eng({ status: 'contested' })]
    state.cfg.oneSub = { id: SUB, status: 'contested' }
    state.cfg.req = { id: REQ, contact_name: 'Part', contact_email: 'part@ex.fr' }
  })
  it('opérateur hors liste → 422', async () => {
    await expect(ar({ operator: 'Inconnu' })).rejects.toMatchObject({ statusCode: 422 })
  })
  it('dépôt non contesté → 409', async () => {
    state.cfg.oneSub = { id: SUB, status: 'pending' }
    await expect(ar()).rejects.toMatchObject({ statusCode: 409, message: 'Aucune contestation en cours sur ce dépôt.' })
  })
  it('confirm → confirmQuoteSubmission(contested, admin)', async () => {
    const r = await ar()
    expect(r.decision).toBe('confirm')
    expect(confirmQuote).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ submissionId: SUB, engagementId: ENG, from: 'contested', decidedBy: 'admin' }))
    expect(state.inserts.find((i: any) => i.table === 'audit_logs').row).toMatchObject({ action: 'b2b_quote_contested', metadata: { arbitration: 'confirm', operator: 'Mike' } })
  })
  it('reject → dépôt rejeté, engagement remis en retenu, e-mail sans commission', async () => {
    await ar({ decision: 'reject' })
    expect(confirmQuote).not.toHaveBeenCalled()
    expect(state.updates.find((u: any) => u.table === 'b2b_quote_submissions').patch).toMatchObject({ status: 'rejected', decided_by: 'admin' })
    expect(state.updates.find((u: any) => u.table === 'b2b_engagements').patch).toEqual({ status: 'selected' })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const html = JSON.stringify((sendEmail.mock.calls[0] as any)[0])
    expect(html).toContain('Devis à redéposer')
    expect(html).not.toMatch(/commission|rétro|partner_share/i)
  })
})
