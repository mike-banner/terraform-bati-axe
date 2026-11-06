import { describe, it, expect } from 'vitest'
import { missingDocuments, canSubcontract, minKbisIssueDate } from '../../app/utils/subcontractingGate'

const NOW = '2026-11-06'
const v = (document_type: string, o: Record<string, unknown> = {}) =>
  ({ document_type, status: 'approved', created_at: '2026-10-01T00:00:00Z', ...o }) as any
const ok = [
  v('kbis', { issued_on: '2026-10-01' }),
  v('decennale', { expiry_date: '2027-01-01' }),
  v('urssaf', { expiry_date: '2027-01-01' }),
]

describe('verrou sous-traitance (05.11-05)', () => {
  it('éligible avec Kbis récent, décennale et URSSAF valides', () => {
    expect(missingDocuments(ok, {}, NOW)).toEqual([])
    expect(canSubcontract(ok, {}, NOW)).toBe(true)
  })
  it('aucune pièce → tout manque (hors RGE)', () => {
    expect(missingDocuments([], {}, NOW)).toEqual(['kbis', 'decennale', 'urssaf'])
    expect(missingDocuments(null, {}, NOW)).toEqual(['kbis', 'decennale', 'urssaf'])
  })
  it('Kbis de plus de 3 mois ou sans date d\'édition → refusé', () => {
    expect(minKbisIssueDate(NOW)).toBe('2026-08-06')
    expect(missingDocuments([v('kbis', { issued_on: '2026-08-05' }), ...ok.slice(1)], {}, NOW)).toEqual(['kbis'])
    expect(missingDocuments([v('kbis', { issued_on: '2026-08-06' }), ...ok.slice(1)], {}, NOW)).toEqual([])
    expect(missingDocuments([v('kbis'), ...ok.slice(1)], {}, NOW)).toEqual(['kbis'])
  })
  it('décennale échue → refusée', () => {
    expect(missingDocuments([ok[0], v('decennale', { expiry_date: '2026-11-05' }), ok[2]], {}, NOW)).toEqual(['decennale'])
  })
  it('URSSAF en attente ou rejetée → refusée', () => {
    expect(missingDocuments([ok[0], ok[1], v('urssaf', { status: 'pending', expiry_date: '2027-01-01' })], {}, NOW)).toEqual(['urssaf'])
    expect(missingDocuments([ok[0], ok[1], v('urssaf', { status: 'rejected', expiry_date: '2027-01-01' })], {}, NOW)).toEqual(['urssaf'])
  })
  it('un nouveau dépôt en attente ne retire pas l\'ancienne pièce approuvée', () => {
    const renewal = v('decennale', { status: 'pending', expiry_date: '2028-01-01', created_at: '2026-11-01T00:00:00Z' })
    expect(missingDocuments([...ok, renewal], {}, NOW)).toEqual([])
  })
  it('RGE exigée seulement avec la rénovation énergétique', () => {
    expect(missingDocuments(ok, { categories: ['plomberie'], rge_status: 'none' }, NOW)).toEqual([])
    expect(missingDocuments(ok, { categories: ['renovation_energetique'], rge_status: 'none' }, NOW)).toEqual(['rge'])
    expect(missingDocuments(ok, { categories: ['renovation_energetique'], rge_status: 'expired' }, NOW)).toEqual(['rge'])
    expect(missingDocuments(ok, { categories: ['renovation_energetique'], rge_status: 'valid' }, NOW)).toEqual([])
  })
})
