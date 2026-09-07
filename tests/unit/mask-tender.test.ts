import { describe, it, expect } from 'vitest'
import { maskTender, type TenderLotRow } from '../../server/utils/maskTender'

const baseLot: TenderLotRow = {
  id: 'lot-001',
  category: 'maconnerie',
  status: 'open',
  created_at: '2026-09-01T10:00:00.000Z',
  zone_name: 'Carrières-sous-Poissy',
  claimed_at: null,
  b2b_requests: {
    id: 'req-00000001',
    description: 'Rénovation complète de la toiture avec isolation renforcée, remplacement des tuiles anciennes, reprise de la charpente et pose de nouvelles gouttières en zinc sur l\'ensemble du bâtiment principal et de la dépendance attenante côté jardin.',
    project_location: 'Carrières-sous-Poissy',
    project_postal_code: '78955',
    budget_range: '10000-20000',
    decision_status: 'confirme',
    contact_name: 'Marc Petit',
    contact_company: 'Toiture Petit SARL',
    contact_phone: '06 98 76 54 32',
    contact_email: 'marc.petit@example.com',
  },
}

describe('maskTender', () => {
  it('non claimed → status locked, aucune coordonnée en clair', () => {
    const result = maskTender(baseLot, false)
    expect(result.status).toBe('locked')
    expect(result.contact_name).toBe('*** *** ***')
    expect(result.contact_phone).toBe('*** *** ***')
    expect(result.contact_email).toBe('contact@***.fr')
    expect(result.contact_company).toBe('*** *** ***')
  })

  it('non claimed → expose les champs non sensibles + description tronquée à 200 + "…"', () => {
    const result = maskTender(baseLot, false)
    expect(result.lot_id).toBe('lot-001')
    expect(result.category).toBe('maconnerie')
    expect(result.zone_name).toBe('Carrières-sous-Poissy')
    expect(result.budget_range).toBe('10000-20000')
    expect(result.decision_status).toBe('confirme')
    expect(result.created_at).toBe('2026-09-01T10:00:00.000Z')
    expect(result.project_location).toBe('Carrières-sous-Poissy')
    expect(result.description.endsWith('…')).toBe(true)
    expect(result.description.length).toBe(201)
  })

  it('claimed → status claimed, coordonnées + description complètes + claimed_at', () => {
    const claimedLot: TenderLotRow = { ...baseLot, claimed_at: '2026-09-05T12:00:00.000Z' }
    const result = maskTender(claimedLot, true)
    expect(result.status).toBe('claimed')
    expect(result.claimed_at).toBe('2026-09-05T12:00:00.000Z')
    expect(result.contact_name).toBe('Marc Petit')
    expect(result.contact_company).toBe('Toiture Petit SARL')
    expect(result.contact_phone).toBe('06 98 76 54 32')
    expect(result.contact_email).toBe('marc.petit@example.com')
    expect(result.description).toBe(baseLot.b2b_requests!.description)
  })

  it('ne retourne jamais postal_code quand claimed=false (ADR-004, géolocalisant)', () => {
    const result = maskTender(baseLot, false)
    expect(result.postal_code).toBeUndefined()
  })

  it('claimed=true expose postal_code', () => {
    const result = maskTender(baseLot, true)
    expect(result.postal_code).toBe('78955')
  })

  it('description courte (<200 caractères) non suffixée par "…"', () => {
    const shortLot: TenderLotRow = {
      ...baseLot,
      b2b_requests: { ...baseLot.b2b_requests!, description: 'Courte description.' },
    }
    const result = maskTender(shortLot, false)
    expect(result.description).toBe('Courte description.')
    expect(result.description.endsWith('…')).toBe(false)
  })
})
