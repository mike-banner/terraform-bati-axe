import { describe, it, expect } from 'vitest'
import { maskLead } from '../../server/utils/maskLead'

const baseLead = {
  id: 'lead-001',
  status: 'new',
  unlocked_at: null,
  created_at: '2026-06-01T10:00:00.000Z',
  projects: {
    category: 'maçonnerie',
    budget_range: '5000-10000',
    timeline_range: '1_mois',
    description: 'Rénovation facade',
    customer_name: 'Jean Dupont',
    customer_email: 'jean.dupont@example.com',
    customer_phone: '06 12 34 56 78',
    postal_code: '75001',
  },
}

const now = new Date('2026-06-05T10:00:00.000Z')

describe('maskLead', () => {
  it('BASIC + unlocked_at IS NULL + not claimed → locked with masked fields (D-05)', () => {
    const result = maskLead({ ...baseLead, status: 'new', unlocked_at: null }, false, now)
    expect(result.status).toBe('locked')
    expect(result.customer_name).toBe('*** *** ***')
    expect(result.customer_phone).toBe('*** *** ***')
    expect(result.customer_email).toBe('contact@***.fr')
    expect(result.postal_code).toBe('***')
  })

  it('BASIC + unlocked_at in past (72h elapsed) + not claimed → unlocked with real data (D-07)', () => {
    const unlockedAt = new Date('2026-06-02T10:00:00.000Z').toISOString()
    const result = maskLead({ ...baseLead, status: 'new', unlocked_at: unlockedAt }, false, now)
    expect(result.status).toBe('unlocked')
    expect(result.customer_name).toBe('Jean Dupont')
    expect(result.customer_phone).toBe('06 12 34 56 78')
    expect(result.customer_email).toBe('jean.dupont@example.com')
    expect(result.postal_code).toBe('75001')
  })

  it('premium (isPremium=true) + any unlocked_at → unlocked with real data (D-06)', () => {
    const result = maskLead({ ...baseLead, status: 'new', unlocked_at: null }, true, now)
    expect(result.status).toBe('unlocked')
    expect(result.customer_name).toBe('Jean Dupont')
    expect(result.customer_phone).toBe('06 12 34 56 78')
  })

  it('claimed + not premium → claimed status, only id/category/budget_range, no customer fields (D-10)', () => {
    const result = maskLead({ ...baseLead, status: 'claimed', unlocked_at: null }, false, now)
    expect(result.status).toBe('claimed')
    expect(result.id).toBe('lead-001')
    expect(result.projects?.category).toBe('maçonnerie')
    expect(result.projects?.budget_range).toBe('5000-10000')
    expect(result.customer_name).toBeUndefined()
    expect(result.customer_phone).toBeUndefined()
    expect(result.customer_email).toBeUndefined()
  })

  it('isFreeGranted=true + BASIC + no unlocked_at → unlocked avec données réelles (D-03)', () => {
    const result = maskLead({ ...baseLead, status: 'new', unlocked_at: null }, false, now, true)
    expect(result.status).toBe('unlocked')
    expect(result.customer_name).toBe('Jean Dupont')
    expect(result.customer_phone).toBe('06 12 34 56 78')
    expect(result.customer_email).toBe('jean.dupont@example.com')
    expect(result.postal_code).toBe('75001')
  })

  it('isFreeGranted=true + claimed → D-10 prioritaire, données masquées', () => {
    const result = maskLead({ ...baseLead, status: 'claimed', unlocked_at: null }, false, now, true)
    expect(result.status).toBe('claimed')
    expect(result.customer_name).toBeUndefined()
  })

  it('claimed + premium → données complètes visibles (D-06 bypass D-10)', () => {
    const result = maskLead({ ...baseLead, status: 'claimed', unlocked_at: null }, true, now)
    expect(result.status).toBe('unlocked')
    expect(result.customer_name).toBe('Jean Dupont')
    expect(result.customer_email).toBe('jean.dupont@example.com')
  })
})
