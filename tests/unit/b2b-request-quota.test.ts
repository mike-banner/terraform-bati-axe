import { describe, it, expect } from 'vitest'
import {
  checkB2bRequestQuota, B2B_REQUESTS_PER_EMAIL_PER_HOUR, B2B_REQUESTS_PER_IP_PER_HOUR,
} from '../../server/utils/b2bRequestQuota'

// Faux client : renvoie un compteur selon la colonne filtrée (contact_email / consent_ip).
function fakeSupabase(counts: { email?: number, ip?: number }, error?: string) {
  const seen: Array<{ col: string, val: string, since: string }> = []
  return {
    seen,
    from: () => ({
      select: () => {
        const state = { col: '', val: '' }
        const q: any = {
          eq(col: string, val: string) { state.col = col; state.val = val; return q },
          gt(_c: string, since: string) {
            seen.push({ ...state, since })
            if (error) return Promise.resolve({ count: null, error: { message: error } })
            return Promise.resolve({ count: state.col === 'contact_email' ? counts.email ?? 0 : counts.ip ?? 0, error: null })
          },
        }
        return q
      },
    }),
  }
}

describe('checkB2bRequestQuota', () => {
  const who = { email: 'Test@Yopmail.com', ip: '203.0.113.9' }

  it('laisse passer sous les plafonds', async () => {
    expect(await checkB2bRequestQuota(fakeSupabase({ email: 9, ip: 19 }), who)).toBe('ok')
  })

  it('bloque au plafond par e-mail (10/h)', async () => {
    expect(await checkB2bRequestQuota(fakeSupabase({ email: B2B_REQUESTS_PER_EMAIL_PER_HOUR }), who)).toBe('email')
  })

  it('bloque au plafond par IP (20/h)', async () => {
    expect(await checkB2bRequestQuota(fakeSupabase({ email: 0, ip: B2B_REQUESTS_PER_IP_PER_HOUR }), who)).toBe('ip')
  })

  it('compare l\'e-mail en minuscules et sur la dernière heure', async () => {
    const sb = fakeSupabase({})
    const now = Date.parse('2026-11-16T12:00:00Z')
    await checkB2bRequestQuota(sb, who, now)
    expect(sb.seen[0]).toMatchObject({ col: 'contact_email', val: 'test@yopmail.com', since: '2026-11-16T11:00:00.000Z' })
  })

  it('sans IP, ne contrôle que l\'e-mail', async () => {
    const sb = fakeSupabase({ ip: 999 })
    expect(await checkB2bRequestQuota(sb, { email: 'a@b.fr', ip: null })).toBe('ok')
    expect(sb.seen).toHaveLength(1)
  })

  it('ne bloque pas un partenaire si la lecture échoue', async () => {
    expect(await checkB2bRequestQuota(fakeSupabase({ email: 99, ip: 99 }, 'boom'), who)).toBe('ok')
  })
})
