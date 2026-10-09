import { describe, it, expect } from 'vitest'
import {
  COMPATIBILITY_MATRIX,
  PROFESSIONAL_CATEGORIES,
  effectiveProType,
  proMatchesProject,
} from '../../app/utils/workTypeMatrix'
import { maskLead } from '../../server/utils/maskLead'

// Complète work-type-matrix.test.ts et egb-gate.test.ts : intégrité de la matrice,
// combinaison gate EGB x projet legacy, multi-catégories, masquage ADR-004.

const eg = (egb_status: string, categories: string[] = ['electricite', 'toiture']) => ({ professional_type: 'entreprise_generale', egb_status, categories })
const matchesGate = (pro: any, projet: any) => proMatchesProject(effectiveProType(pro), projet)

describe('intégrité de COMPATIBILITY_MATRIX', () => {
  const entries = Object.entries(COMPATIBILITY_MATRIX)

  it('contient les 29 postes', () => {
    expect(entries).toHaveLength(29)
  })

  it('chaque poste a un libellé et un rôle valide', () => {
    for (const [, r] of entries) {
      expect(r.label).toBeTruthy()
      expect(['specialiste', 'entreprise_generale']).toContain(r.defaultRole)
    }
  })

  it('specialistMatches ne référence que des catégories de pro connues', () => {
    for (const [, r] of entries) {
      for (const c of r.specialistMatches) expect(PROFESSIONAL_CATEGORIES[c]).toBeDefined()
    }
  })

  it('un poste EG-only n\'a aucun spécialiste, un poste spécialiste en a au moins un', () => {
    for (const [, r] of entries) {
      if (r.defaultRole === 'entreprise_generale') expect(r.specialistMatches).toEqual([])
      else expect(r.specialistMatches.length).toBeGreaterThan(0)
    }
  })

  it('un poste EG-only a egbMatches non vide, ne référençant que des catégories connues', () => {
    for (const [, r] of entries) {
      if (r.defaultRole !== 'entreprise_generale') continue
      expect(r.egbMatches?.length).toBeGreaterThan(0)
      for (const c of r.egbMatches!) expect(PROFESSIONAL_CATEGORIES[c]).toBeDefined()
    }
  })
})

describe('gate EGB x projets', () => {
  const avecPostes = { selected_items: ['electricite'], category: null }
  const legacy = { category: 'toiture' }

  it('EGB approved reçoit les projets avec postes et legacy', () => {
    expect(matchesGate(eg('approved'), avecPostes)).toBe(true)
    expect(matchesGate(eg('approved'), legacy)).toBe(true)
  })

  it('EGB approved sans recouvrement : false', () => {
    expect(matchesGate(eg('approved', ['peinture']), avecPostes)).toBe(false)
  })

  it('EGB pending / rejected ne reçoit rien, même un projet legacy', () => {
    for (const s of ['pending', 'rejected']) {
      expect(matchesGate(eg(s), avecPostes)).toBe(false)
      expect(matchesGate(eg(s), legacy)).toBe(false)
    }
  })

  it('projet legacy sans selected_items (null) : repli catégorie pour le spécialiste', () => {
    const pro = { professional_type: 'specialiste', categories: ['toiture'] }
    expect(proMatchesProject(pro, { selected_items: null, category: 'toiture' })).toBe(true)
    expect(proMatchesProject(pro, { selected_items: null, category: null })).toBe(false)
  })

  it('spécialiste multi-catégories : un seul recouvrement suffit', () => {
    const pro = { professional_type: 'specialiste', categories: ['plomberie', 'carrelage'] }
    expect(proMatchesProject(pro, { selected_items: ['salle_de_bain'] })).toBe(true)
    expect(proMatchesProject(pro, { selected_items: ['maconnerie', 'chaudiere_reno'] })).toBe(true)
    expect(proMatchesProject(pro, { selected_items: ['maconnerie', 'peinture_finitions'] })).toBe(false)
  })

  it('spécialiste sans catégorie ne reçoit rien', () => {
    expect(proMatchesProject({ professional_type: 'specialiste', categories: [] }, { selected_items: ['salle_de_bain'] })).toBe(false)
  })
})

describe('masquage ADR-004 inchangé par le matching', () => {
  it('un EGB approved non débloqué ne voit aucune coordonnée', () => {
    const lead = {
      id: 'p1', status: 'new', unlocked_at: null, created_at: new Date().toISOString(),
      projects: { id: 'p1', category: 'toiture', customer_name: 'Jean Dupont', customer_email: 'j@x.fr', customer_phone: '0600000000', postal_code: '78300', description: 'x' },
    }
    expect(matchesGate(eg('approved', ['plomberie']), { selected_items: ['pac'] })).toBe(true)
    const json = JSON.stringify(maskLead(lead as any, false, new Date(), false))
    for (const secret of ['Jean Dupont', '0600000000', 'j@x.fr']) expect(json).not.toContain(secret)
  })
})
