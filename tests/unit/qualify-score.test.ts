import { describe, it, expect } from 'vitest'
import { computeQualifyScore } from '../../server/utils/qualifyScore'

const base = {
  budget_range: '10000-20000',
  customer_phone: '06 12 34 56 78',
  description: 'Rénovation complète de la salle de bain avec remplacement des équipements.',
  returning_count: 0,
}

describe('computeQualifyScore', () => {
  it('tous les critères remplis → score 4 (D-11)', () => {
    const r = computeQualifyScore({ ...base, returning_count: 1 })
    expect(r.qualify_score).toBe(4)
    expect(r.qualify_budget).toBe(true)
    expect(r.qualify_phone).toBe(true)
    expect(r.qualify_description).toBe(true)
    expect(r.qualify_returning).toBe(true)
  })

  it('nouveau client (returning_count=0) → qualify_returning false, score 3', () => {
    const r = computeQualifyScore({ ...base, returning_count: 0 })
    expect(r.qualify_returning).toBe(false)
    expect(r.qualify_score).toBe(3)
  })

  it('description ≤ 50 chars → qualify_description false', () => {
    const r = computeQualifyScore({ ...base, description: 'Petits travaux.' })
    expect(r.qualify_description).toBe(false)
    expect(r.qualify_score).toBe(2)
  })

  it('description exactement 51 chars → qualify_description true', () => {
    const desc = 'A'.repeat(51)
    const r = computeQualifyScore({ ...base, description: desc })
    expect(r.qualify_description).toBe(true)
  })

  it('budget vide → qualify_budget false', () => {
    const r = computeQualifyScore({ ...base, budget_range: '' })
    expect(r.qualify_budget).toBe(false)
    expect(r.qualify_score).toBe(2)
  })

  it('téléphone vide → qualify_phone false', () => {
    const r = computeQualifyScore({ ...base, customer_phone: '' })
    expect(r.qualify_phone).toBe(false)
    expect(r.qualify_score).toBe(2)
  })

  it('aucun critère → score 0 (D-13: jamais rejeté, juste score)', () => {
    const r = computeQualifyScore({ budget_range: '', customer_phone: '', description: 'Court.', returning_count: 0 })
    expect(r.qualify_score).toBe(0)
    expect(r.qualify_budget).toBe(false)
    expect(r.qualify_phone).toBe(false)
    expect(r.qualify_description).toBe(false)
    expect(r.qualify_returning).toBe(false)
  })
})
