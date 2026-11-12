import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({}) }))
vi.mock('../../server/utils/email', () => ({ sendEmail: vi.fn(async () => ({})) }))
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))

import {
  sha256Hex, generateOtpCode, hashOtp, timingSafeEqualHex, evaluateChallenge, maskEmail, generateToken,
  issueOtpChallenge, verifyOtpChallenge, issuePartnerToken, renderPartnerLinkEmail,
} from '../../server/utils/signature'

const subject = { type: 'framework_pro' as const, email: 'a@b.fr', proId: 'p1' }
const SHA = 'a'.repeat(64)

// Mock chaînable : toute méthode de filtre renvoie la chaîne, `await` résout `result`.
function chain(result: any, spy?: (m: string, a: any[]) => void): any {
  const p: any = new Proxy({}, {
    get: (_t, m: string) => {
      if (m === 'then') return (res: any) => res(result)
      return (...a: any[]) => { spy?.(m, a); return p }
    },
  })
  return p
}

describe('primitives', () => {
  it('sha256', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
  it('otp 6 chiffres', () => {
    for (let i = 0; i < 1000; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/)
  })
  it('hashOtp salé par id', async () => {
    const a = await hashOtp('id-a', '123456')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).toBe(await hashOtp('id-a', '123456'))
    expect(a).not.toBe(await hashOtp('id-b', '123456'))
  })
  it('timingSafeEqualHex', () => {
    expect(timingSafeEqualHex('ab', 'ab')).toBe(true)
    expect(timingSafeEqualHex('ab', 'ac')).toBe(false)
    expect(timingSafeEqualHex('ab', 'abc')).toBe(false)
  })
  it('evaluateChallenge', () => {
    const now = new Date('2026-10-30T10:00:00Z')
    const ok = { expires_at: '2026-10-30T10:05:00Z', attempts: 0, consumed_at: null }
    expect(evaluateChallenge(null, now)).toBe('missing')
    expect(evaluateChallenge({ ...ok, consumed_at: 'x' }, now)).toBe('consumed')
    expect(evaluateChallenge({ ...ok, expires_at: '2026-10-30T09:00:00Z' }, now)).toBe('expired')
    expect(evaluateChallenge({ ...ok, attempts: 5 }, now)).toBe('locked')
    expect(evaluateChallenge(ok, now)).toBe('ok')
  })
  it('maskEmail / generateToken', () => {
    expect(maskEmail('jean.dupont@exemple.fr')).toBe('j***@e***.fr')
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/)
    expect(generateToken()).not.toBe(generateToken())
  })
})

describe('issueOtpChallenge', () => {
  it('429 si 5 défis sur 1 h', async () => {
    const sb = { from: () => chain({ count: 5 }) }
    await expect(issueOtpChallenge(sb, subject, SHA, 'x')).rejects.toMatchObject({ statusCode: 429 })
  })
  it('429 si dernier défi < 60 s', async () => {
    let n = 0
    const sb = { from: () => chain(n++ === 0 ? { count: 0 } : { data: { created_at: new Date().toISOString() } }) }
    await expect(issueOtpChallenge(sb, subject, SHA, 'x')).rejects.toMatchObject({ statusCode: 429 })
  })
})

describe('verifyOtpChallenge', () => {
  const now = Date.now()
  async function setup(over: any = {}) {
    const id = 'ch-1'
    const ch = {
      id, attempts: 0, consumed_at: null, expires_at: new Date(now + 60_000).toISOString(),
      code_hash: await hashOtp(id, '123456'), content_sha256: SHA, ...over.ch,
    }
    const calls: string[] = []
    let sel = 0
    const sb = {
      from: () => ({
        select: (cols: string) => chain(cols === 'attempts' ? { data: over.recent ?? [{ attempts: 0 }] } : { data: ch }),
        update: (patch: any) => chain(
          { data: 'consumed_at' in patch ? (over.consumeRows ?? [{ id }]) : [{ id }] },
          (m) => { if (m === 'is') calls.push('is-consumed') },
        ),
      }),
    }
    void sel
    return { sb, calls }
  }

  it('429 si somme des tentatives >= 15', async () => {
    const { sb } = await setup({ recent: [{ attempts: 5 }, { attempts: 5 }, { attempts: 5 }] })
    await expect(verifyOtpChallenge(sb, subject, '123456', SHA)).rejects.toMatchObject({ statusCode: 429 })
  })
  it('422 si code faux', async () => {
    const { sb } = await setup()
    await expect(verifyOtpChallenge(sb, subject, '000000', SHA)).rejects.toMatchObject({ statusCode: 422, data: { remainingAttempts: 4 } })
  })
  it('409 si contenu modifié', async () => {
    const { sb } = await setup()
    await expect(verifyOtpChallenge(sb, subject, '123456', 'b'.repeat(64))).rejects.toMatchObject({ statusCode: 409 })
  })
  it('409 si rejeu (0 ligne consommée)', async () => {
    const { sb } = await setup({ consumeRows: [] })
    await expect(verifyOtpChallenge(sb, subject, '123456', SHA)).rejects.toMatchObject({ statusCode: 409 })
  })
  it('ok : consommation conditionnelle', async () => {
    const { sb, calls } = await setup()
    expect(await verifyOtpChallenge(sb, subject, '123456', SHA)).toEqual({ challengeId: 'ch-1' })
    expect(calls).toContain('is-consumed')
  })
})

describe('issuePartnerToken', () => {
  let ops: string[]
  const sb = () => ({
    from: () => ({
      update: (p: any) => { ops.push('update:' + Object.keys(p)[0]); return chain({}) },
      insert: (r: any) => { ops.push('insert'); return chain({ error: null }) },
    }),
  })
  beforeEach(() => { ops = [] })
  it('revokePrevious=false : aucun revoked_at', async () => {
    const t = await issuePartnerToken(sb(), 'r1', { revokePrevious: false })
    expect(t).toMatch(/^[0-9a-f]{64}$/)
    expect(ops).toEqual(['insert'])
  })
  it('revokePrevious=true : révoque avant insertion', async () => {
    await issuePartnerToken(sb(), 'r1', { revokePrevious: true })
    expect(ops).toEqual(['update:revoked_at', 'insert'])
  })
})

describe('renderPartnerLinkEmail (D-22, D-27)', () => {
  const base = { contactName: 'Alice', requestRef: 'ABCD1234', link: 'https://x.test/b2b/engagement/t' }
  it.each(['framework', 'choose_pro', 'submit_quote', 'validate_progress'] as const)('%s : aucun terme de facturation ni de commission', (reason) => {
    const { subject, html } = renderPartnerLinkEmail({ ...base, reason, stepLabel: 'Étape suivante' })
    expect(subject + html).not.toMatch(/factur/i)
    expect(subject + html).not.toMatch(/commission/i)
  })
  it('validate_progress : cite l\'étape, échappée, sans montant', () => {
    const { html } = renderPartnerLinkEmail({ ...base, reason: 'validate_progress', stepLabel: '<b>Acompte</b>' })
    expect(html).toContain('&lt;b&gt;Acompte&lt;/b&gt;')
    expect(html).not.toMatch(/€|%/)
  })
})
