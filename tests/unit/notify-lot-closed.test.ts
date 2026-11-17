import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendEmail = vi.fn(async () => ({ success: true }))
vi.mock('../../server/utils/email', () => ({ sendEmail: (...a: any[]) => (sendEmail as any)(...a) }))

import { selectClosedLotRecipients, notifyLotClosedPros } from '../../server/utils/notifyLotClosed'

function fakeSupabase(tables: Record<string, any[]>) {
  const from = (t: string) => {
    const b: any = {}
    for (const m of ['select', 'eq', 'in']) b[m] = () => b
    b.then = (res: any, rej: any) => Promise.resolve({ data: tables[t] ?? [], error: null }).then(res, rej)
    return b
  }
  return { from }
}

describe('selectClosedLotRecipients', () => {
  it('garde les artisans avertis sans engagement, sans doublon', () => {
    expect(selectClosedLotRecipients(['a', 'b', 'c', 'a'], ['b'])).toEqual(['a', 'c'])
  })
  it('personne à prévenir si tous se sont engagés', () => {
    expect(selectClosedLotRecipients(['a'], ['a'])).toEqual([])
  })
})

describe('notifyLotClosedPros', () => {
  beforeEach(() => sendEmail.mockClear())
  const opts = { lotId: 'lot', label: 'Électricité', ref: 'AAAA1111', reason: 'awarded' as const, siteUrl: 'http://test' }

  it('envoie un e-mail de clôture aux artisans sans avenant, pas aux engagés', async () => {
    const sb = fakeSupabase({
      b2b_tender_notifications: [{ pro_id: 'a' }, { pro_id: 'b' }],
      b2b_engagements: [{ pro_id: 'b' }],
      professionals: [{ id: 'a', email: 'a@ex.fr' }],
    })
    expect((await notifyLotClosedPros(sb, opts)).sent).toBe(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect((sendEmail.mock.calls[0] as any[])[0].to).toBe('a@ex.fr')
  })

  it('ne lève jamais, même si l\'envoi échoue', async () => {
    sendEmail.mockRejectedValueOnce(new Error('smtp'))
    const sb = fakeSupabase({ b2b_tender_notifications: [{ pro_id: 'a' }], b2b_engagements: [], professionals: [{ id: 'a', email: 'a@ex.fr' }] })
    expect((await notifyLotClosedPros(sb, opts)).sent).toBe(0)
  })
})
