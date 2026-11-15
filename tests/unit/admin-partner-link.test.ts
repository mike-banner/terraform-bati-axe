import { describe, it, expect, vi, beforeEach } from 'vitest'

const REQ = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const ADMIN = { sub: 'adm-sub-1', app_metadata: { role: 'admin' } }
const state: any = { user: ADMIN, emailResult: { success: true }, emailThrows: false, inserts: [] as any[], emails: [] as any[] }

function builder(table: string) {
  const b: any = {}
  for (const m of ['eq', 'is', 'in', 'select', 'update']) b[m] = () => b
  b.insert = (row: any) => { state.inserts.push({ table, row }); return b }
  b.maybeSingle = async () => {
    if (table === 'b2b_requests') return { data: { id: REQ, contact_name: 'Linda', contact_email: 'hermann@yopmail.com' }, error: null }
    return { data: null, error: null } // aucune convention signée → raison « framework »
  }
  b.then = (res: any, rej: any) => Promise.resolve({ data: [], error: null }).then(res, rej)
  return b
}

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
vi.stubGlobal('getRouterParam', (e: any) => e.__id)
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://dev.example.test' } }))
vi.mock('#supabase/server', () => ({
  serverSupabaseUser: async () => state.user,
  serverSupabaseServiceRole: () => ({ from: (t: string) => builder(t) }),
}))
vi.mock('../../server/utils/email', () => ({
  sendEmail: async (o: any) => {
    state.emails.push(o)
    if (state.emailThrows) throw new Error('boom')
    return state.emailResult
  },
}))

const post = (await import('../../server/api/v1/admin/b2b-requests/[id]/partner-link.post')).default as any
const call = () => post({ __id: REQ })

beforeEach(() => {
  state.user = ADMIN; state.emailResult = { success: true }; state.emailThrows = false; state.inserts = []; state.emails = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('renvoi du lien partenaire', () => {
  it('e-mail accepté → SENT, audit tracé avec actor_id = sub du JWT', async () => {
    expect(await call()).toEqual({ status: 'SENT' })
    expect(state.emails).toHaveLength(1)
    const audit = state.inserts.find((i: any) => i.table === 'audit_logs')
    expect(audit.row.actor_id).toBe('adm-sub-1')
  })
  it('sendEmail renvoie success:false (clé/domaine Resend) → 502, plus de faux « envoyé »', async () => {
    state.emailResult = { success: false, error: 'Resend 403 — The bati-axe.com domain is not verified' }
    await expect(call()).rejects.toMatchObject({ statusCode: 502, statusMessage: expect.stringContaining('not verified') })
    expect(state.inserts.find((i: any) => i.table === 'audit_logs')).toBeUndefined()
  })
  it('sendEmail lève une exception → 502', async () => {
    state.emailThrows = true
    await expect(call()).rejects.toMatchObject({ statusCode: 502 })
  })
})
