import { describe, it, expect, vi } from 'vitest'

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ public: { siteUrl: 'https://bati-axe.com' } }) }))
vi.mock('../../server/utils/email', () => ({ sendEmail: vi.fn().mockResolvedValue({ success: true }) }))

import { candidateCategories, filterMatchedPros, projectLabel } from '../../server/utils/notifyProLead'

describe('candidateCategories', () => {
  it('salle_de_bain recoupe carrelage et plomberie', () => {
    const c = candidateCategories({ selected_items: ['salle_de_bain'] })
    expect(c).toContain('carrelage')
    expect(c).toContain('plomberie')
  })
  it('pac inclut renovation_energetique et plomberie', () => {
    const c = candidateCategories({ selected_items: ['pac'] })
    expect(c).toContain('renovation_energetique')
    expect(c).toContain('plomberie')
  })
  it('repli sur la catégorie legacy', () => {
    expect(candidateCategories({ selected_items: [], category: 'toiture' })).toEqual(['toiture'])
    expect(candidateCategories({ selected_items: null, category: null })).toEqual([])
  })
})

describe('filterMatchedPros', () => {
  const Q = { rge_status: 'valid', decennal_status: 'valid' }
  const spec = (c: string) => ({ id: c, professional_type: 'specialiste', categories: [c], ...Q })
  const egb = (status: string) => ({
    id: 'egb-' + status, professional_type: 'entreprise_generale', egb_status: status,
    categories: ['renovation_energetique'], ...Q,
  })
  const ids = (l: any[]) => l.map(p => p.id)

  it('pac : spécialiste plomberie exclu, EGB approuvé inclus, EGB pending exclu', () => {
    const r = filterMatchedPros([spec('plomberie'), egb('approved'), egb('pending')], { selected_items: ['pac'] })
    expect(ids(r)).toEqual(['egb-approved'])
  })
  it('pac (RGE) : EGB approuvé RGE inclus, non RGE exclu, pending RGE exclu', () => {
    const nonRge = { ...egb('approved'), id: 'egb-non-rge', rge_status: 'none' }
    const r = filterMatchedPros([egb('approved'), nonRge, egb('pending')], { selected_items: ['pac'] })
    expect(ids(r)).toEqual(['egb-approved'])
  })
  it('revetement_sol : carrelage inclus, peinture exclu', () => {
    const r = filterMatchedPros([spec('carrelage'), spec('peinture')], { selected_items: ['revetement_sol'] })
    expect(ids(r)).toEqual(['carrelage'])
  })
})

describe('projectLabel', () => {
  it('libellés des postes, 3 max', () => {
    expect(projectLabel({ selected_items: ['pac', 'salle_de_bain'] })).toBe('Pompe à chaleur, Rénovation de salle de bain')
    expect(projectLabel({ category: 'carrelage' })).toBe('Carrelage')
  })
  it('suffixe au-delà de 3 postes', () => {
    const l = projectLabel({ selected_items: ['pac', 'salle_de_bain', 'revetement_sol', 'cuisine'] })
    expect(l.endsWith(' …')).toBe(true)
  })
})
