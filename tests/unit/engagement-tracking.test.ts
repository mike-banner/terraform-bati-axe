import { describe, it, expect, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: Function) => fn)
vi.stubGlobal('createError', (opts: any) => Object.assign(new Error(opts.statusMessage), opts))
vi.stubGlobal('getHeader', () => undefined)
vi.mock('#supabase/server', () => ({ serverSupabaseServiceRole: vi.fn(), serverSupabaseUser: vi.fn(), serverSupabaseClient: vi.fn() }))
vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ public: {} }) }))

const { selectEngagementReminders } = await import('../../server/api/v1/cron/engagement-reminders.get')
const { canAdminTransition } = await import('../../server/api/v1/admin/engagements/[id].patch')
const { canNotifyPartner, MAX_DECLARATIONS } = await import('../../server/api/v1/engagements/[id]/declare-quote.post')

const NOW = new Date('2026-11-30T08:00:00Z')
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString()
const row = (days: number, r30: boolean, r60: boolean, status = 'signed') => ({
  id: 'x', status, signed_at: ago(days),
  reminder_30_sent_at: r30 ? ago(1) : null, reminder_60_sent_at: r60 ? ago(1) : null,
})

describe('selectEngagementReminders', () => {
  it('29 j → rien', () => expect(selectEngagementReminders([row(29, false, false)], NOW)).toEqual({ j30: [], j60: [] }))
  it('30 j → j30', () => expect(selectEngagementReminders([row(30, false, false)], NOW)).toEqual({ j30: ['x'], j60: [] }))
  it('45 j, j30 posé → rien', () => expect(selectEngagementReminders([row(45, true, false)], NOW)).toEqual({ j30: [], j60: [] }))
  it('60 j, j30 posé → j60', () => expect(selectEngagementReminders([row(60, true, false)], NOW)).toEqual({ j30: [], j60: ['x'] }))
  it('75 j, rien posé → j60 uniquement', () => expect(selectEngagementReminders([row(75, false, false)], NOW)).toEqual({ j30: [], j60: ['x'] }))
  it('90 j, j60 posé → rien', () => expect(selectEngagementReminders([row(90, false, true)], NOW)).toEqual({ j30: [], j60: [] }))
  it('statut ≠ signed → rien', () => {
    expect(selectEngagementReminders([row(40, false, false, 'quote_declared'), row(70, false, false, 'not_awarded')], NOW)).toEqual({ j30: [], j60: [] })
  })
})

describe('canAdminTransition', () => {
  it.each([['quote_confirmed', 'deposit_paid'], ['quote_declared', 'deposit_paid'], ['deposit_paid', 'invoiced']] as const)('%s → %s autorisé', (f, t) => expect(canAdminTransition(f, t)).toBe(true))
  it.each([['signed', 'deposit_paid'], ['quote_confirmed', 'invoiced'], ['invoiced', 'deposit_paid'], ['not_awarded', 'deposit_paid']] as const)('%s → %s refusé', (f, t) => expect(canAdminTransition(f, t)).toBe(false))
})

describe('canNotifyPartner', () => {
  const h = (n: number) => new Date(NOW.getTime() - n * 3_600_000).toISOString()
  it('null → true', () => expect(canNotifyPartner(null, NOW)).toBe(true))
  it('23 h → false', () => expect(canNotifyPartner(h(23), NOW)).toBe(false))
  it('25 h → true', () => expect(canNotifyPartner(h(25), NOW)).toBe(true))
  it('plafond de déclarations = 3', () => expect(MAX_DECLARATIONS).toBe(3))
})
