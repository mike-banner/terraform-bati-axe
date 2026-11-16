import { describe, it, expect } from 'vitest'
import { needsValidation, isAwaitingDocuments, missingDocuments } from '../../app/types/admin'
import type { Professional, Verification } from '../../app/types/admin'

const doc = (document_type: Verification['document_type'], status: Verification['status']): Verification =>
  ({ id: document_type + status, pro_id: 'p', document_type, file_key: 'k', status, expiry_date: null, created_at: '2026-11-16T10:00:00Z' })
const pro = (is_verified: boolean, verifications: Verification[]): Professional =>
  ({ id: 'p', company_name: 'X', siret: '1', full_name: 'X', email: 'x@y.fr', phone: '', category: null, is_verified, decennal_status: 'none', verifications })

describe('admin — à valider / documents manquants', () => {
  it('sans aucun document : documents manquants, rien à valider', () => {
    const p = pro(false, [])
    expect(needsValidation(p)).toBe(false)
    expect(isAwaitingDocuments(p)).toBe(true)
    expect(missingDocuments(p).map(m => m.type)).toEqual(['kbis', 'decennale'])
  })
  it('un document en attente : à valider', () => {
    const p = pro(false, [doc('kbis', 'pending')])
    expect(needsValidation(p)).toBe(true)
    expect(isAwaitingDocuments(p)).toBe(false)
    expect(missingDocuments(p).map(m => m.type)).toEqual(['decennale'])
  })
  it('KBIS + décennale approuvés mais pro non approuvé : à valider', () => {
    expect(needsValidation(pro(false, [doc('kbis', 'approved'), doc('decennale', 'approved')]))).toBe(true)
  })
  it('document refusé : reste dans les manquants, signalé « refusé »', () => {
    const p = pro(false, [doc('kbis', 'rejected')])
    expect(isAwaitingDocuments(p)).toBe(true)
    expect(missingDocuments(p)[0]).toEqual({ type: 'kbis', rejected: true })
  })
  it('pro vérifié : jamais dans les manquants ; un RGE en attente reste à valider', () => {
    const p = pro(true, [doc('kbis', 'approved'), doc('decennale', 'approved'), doc('rge', 'pending')])
    expect(isAwaitingDocuments(p)).toBe(false)
    expect(needsValidation(p)).toBe(true)
  })
})
