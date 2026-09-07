import { describe, it, expect } from 'vitest'
import { tenderCap, shouldCloseLot, renderTenderClaimEmail } from '../../server/utils/tenderClaim'

describe('tenderCap', () => {
  it('confirme → 1', () => {
    expect(tenderCap('confirme')).toBe(1)
  })
  it('en_attente → 3', () => {
    expect(tenderCap('en_attente')).toBe(3)
  })
  it('undefined → 3 (défaut prudent)', () => {
    expect(tenderCap(undefined)).toBe(3)
  })
})

describe('shouldCloseLot', () => {
  it('confirme, 1 claim → clôture', () => {
    expect(shouldCloseLot({ decisionStatus: 'confirme', claimsAfter: 1 })).toBe(true)
  })
  it('en_attente, 1 claim → reste ouvert', () => {
    expect(shouldCloseLot({ decisionStatus: 'en_attente', claimsAfter: 1 })).toBe(false)
  })
  it('en_attente, 3 claims → clôture', () => {
    expect(shouldCloseLot({ decisionStatus: 'en_attente', claimsAfter: 3 })).toBe(true)
  })
})

describe('renderTenderClaimEmail', () => {
  const opts = {
    requestRef: 'ABCD1234',
    lotCategory: 'toiture',
    contactName: 'Marie Curie',
    proCompany: 'Toiture Pro SARL',
    proContactName: 'Jean Artisan',
    proEmail: 'jean@toiture-pro.fr',
    proPhone: '06 11 22 33 44',
    remainingSlots: 2,
    siteUrl: 'https://bati-axe.com',
  }

  it('sujet contient "Un artisan est intéressé" et la référence AO', () => {
    const { subject } = renderTenderClaimEmail(opts)
    expect(subject).toContain('Un artisan est intéressé')
    expect(subject).toContain('ABCD1234')
  })

  it('html contient le nom d\'entreprise, l\'email et le téléphone de l\'artisan', () => {
    const { html } = renderTenderClaimEmail(opts)
    expect(html).toContain('Toiture Pro SARL')
    expect(html).toContain('jean@toiture-pro.fr')
    expect(html).toContain('06 11 22 33 44')
  })
})
