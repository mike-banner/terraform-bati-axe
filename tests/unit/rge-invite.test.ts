import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { shouldInviteToRge, buildRgeInviteEmail } from '../../server/utils/rgeInvite'

const R = 'renovation_energetique'

describe('shouldInviteToRge', () => {
  it('ajout du métier → true', () => {
    expect(shouldInviteToRge({ previousCategories: ['plomberie'], nextCategories: ['plomberie', R], rgeStatus: 'none' })).toBe(true)
  })
  it('métier déjà présent → false', () => {
    expect(shouldInviteToRge({ previousCategories: [R], nextCategories: [R, 'plomberie'], rgeStatus: 'none' })).toBe(false)
  })
  it('retrait → false', () => {
    expect(shouldInviteToRge({ previousCategories: [R], nextCategories: [], rgeStatus: 'none' })).toBe(false)
  })
  it('ajout mais RGE valide → false', () => {
    expect(shouldInviteToRge({ previousCategories: [], nextCategories: [R], rgeStatus: 'valid' })).toBe(false)
  })
  it('categories non fournies → false', () => {
    expect(shouldInviteToRge({ previousCategories: [], nextCategories: undefined, rgeStatus: 'none' })).toBe(false)
  })
  it.each(['none', 'expired'])('rge %s → true', (rgeStatus) => {
    expect(shouldInviteToRge({ previousCategories: null, nextCategories: [R], rgeStatus })).toBe(true)
  })
})

describe('buildRgeInviteEmail', () => {
  it('contient le lien dashboard et RGE', () => {
    const m = buildRgeInviteEmail('https://exemple.test')
    for (const c of [m.subject, m.html, m.text]) expect(c).toContain('RGE')
    expect(m.html).toContain('https://exemple.test/espace/dashboard')
    expect(m.text).toContain('https://exemple.test/espace/dashboard')
  })
})

describe('câblage me.patch.ts', () => {
  const src = readFileSync('server/api/v1/pro/profile/me.patch.ts', 'utf8')
  it('appelle shouldInviteToRge dans un try/catch qui n\'échoue pas la requête', () => {
    expect(src).toContain('shouldInviteToRge(')
    expect(src).toMatch(/try \{[\s\S]*sendEmail[\s\S]*\} catch \(err\) \{\s*console\.error\('\[rgeInvite\]/s)
  })
})
