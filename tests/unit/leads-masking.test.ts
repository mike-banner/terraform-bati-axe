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
  it('lead flouté : expose le département et les postes (listes fermées), jamais le texte libre ni le code postal', () => {
    const lead = { ...baseLead, projects: { ...baseLead.projects, postal_code: '69003', selected_items: ['maconnerie', 'electricite', 'inconnu'], description: 'Appelez-moi au 06 12 34 56 78, 12 rue des Lilas' } }
    const result = maskLead(lead, false, now)
    expect(result.status).toBe('locked')
    expect(result.department).toBe('69 — Rhône')
    expect(result.works).toEqual(['Terrassement / Maçonnerie', 'Électricité'])
    expect(result.postal_code).toBe('***')
    expect(JSON.stringify(result)).not.toMatch(/Lilas|06 12|Dupont|69003/)
  })

  it('lead flouté sans postes ni code postal valide : champs vides, pas d erreur', () => {
    const result = maskLead({ ...baseLead, projects: { ...baseLead.projects, postal_code: 'xx', selected_items: null } }, false, now)
    expect(result.department).toBeNull()
    expect(result.works).toEqual([])
    expect(result.surface_range).toBeNull()
  })

  it('lead flouté : surface en tranche, jamais la valeur exacte', () => {
    const r = (m2: number) => maskLead({ ...baseLead, projects: { ...baseLead.projects, calculator_data: { surface_m2: m2 } } }, false, now)
    expect(r(25).surface_range).toBe('moins de 30 m²')
    expect(r(63).surface_range).toBe('50 à 80 m²')
    expect(r(250).surface_range).toBe('plus de 200 m²')
    expect(JSON.stringify(r(63))).not.toMatch(/63/)
  })

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
