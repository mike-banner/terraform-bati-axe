import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  CATEGORY_ADDED_AT,
  canAccessLead,
  canDoEnergy,
  COMPATIBILITY_MATRIX,
  ENERGY_ITEMS,
  hasEnergyItems,
  PROFESSIONAL_CATEGORIES,
  categoriesError,
  effectiveProType,
  isEgbReserved,
  newCategoriesSince,
  proMatchesProject,
} from '../../app/utils/workTypeMatrix'

const QUALIFIE = { rge_status: 'valid', decennal_status: 'valid' }
const spec = (categories: string[]) => ({ professional_type: 'specialiste', categories, ...QUALIFIE })
const egb = (categories: string[], egb_status = 'approved') => ({ professional_type: 'entreprise_generale', egb_status, categories, ...QUALIFIE })

describe('proMatchesProject', () => {
  it('EGB approuvé : recouvrement egbMatches sur un poste réservé', () => {
    expect(proMatchesProject(egb(['renovation_energetique']), { selected_items: ['pac'] })).toBe(true)
  })
  it('EGB approuvé : plus de « reçoit tout »', () => {
    expect(proMatchesProject(egb(['peinture']), { selected_items: ['pac'] })).toBe(false)
  })
  it('EGB approuvé : specialistMatches s\'appliquent aussi', () => {
    expect(proMatchesProject(egb(['carrelage']), { selected_items: ['salle_de_bain'] })).toBe(true)
  })
  it('EGB non approuvé : rien, avec ou sans effectiveProType', () => {
    for (const s of ['pending', 'rejected', 'none']) {
      const pro = egb(['renovation_energetique', 'plomberie'], s)
      for (const items of [['pac'], ['chaudiere_reno']]) {
        expect(proMatchesProject(pro, { selected_items: items })).toBe(false)
        expect(proMatchesProject(effectiveProType(pro), { selected_items: items })).toBe(false)
      }
    }
  })
  it('spécialiste : recouvrement sur au moins un poste', () => {
    expect(proMatchesProject(spec(['peinture']), { selected_items: ['maconnerie', 'peinture_finitions'] })).toBe(true)
    expect(proMatchesProject(spec(['carrelage']), { selected_items: ['salle_de_bain'] })).toBe(true)
  })
  it('spécialiste : aucun recouvrement ou poste réservé EGB => false', () => {
    expect(proMatchesProject(spec(['peinture']), { selected_items: ['maconnerie'] })).toBe(false)
    expect(proMatchesProject(spec(['electricite', 'plomberie']), { selected_items: ['pac', 'demolition'] })).toBe(false)
  })
  it('poste inconnu ignoré', () => {
    expect(proMatchesProject(spec(['peinture']), { selected_items: ['zzz'] })).toBe(false)
  })
  it('repli legacy sur la catégorie quand aucun poste', () => {
    expect(proMatchesProject(spec(['toiture']), { selected_items: [], category: 'toiture' })).toBe(true)
    expect(proMatchesProject(spec(['toiture']), { category: 'peinture' })).toBe(false)
    expect(proMatchesProject(egb(['toiture']), { category: 'toiture' })).toBe(true)
    expect(proMatchesProject(egb(['toiture']), { category: 'peinture' })).toBe(false)
  })
})

describe('isEgbReserved', () => {
  it('reconnaît les postes réservés EGB', () => {
    expect(isEgbReserved('demolition')).toBe(true)
    expect(isEgbReserved('electricite')).toBe(false)
  })
})

describe('categoriesError', () => {
  it('spécialiste : 1 à 2 métiers', () => {
    expect(categoriesError('specialiste', [])).toBe('Sélectionnez au moins un corps de métier.')
    expect(categoriesError('specialiste', ['toiture', 'peinture', 'isolation'])).toBe('Un spécialiste peut déclarer 2 corps de métier au maximum.')
    expect(categoriesError('specialiste', ['toiture', 'peinture'])).toBeNull()
  })
  it('EGB : 1 à 9 métiers', () => {
    expect(categoriesError('entreprise_generale', [])).toBe('Sélectionnez au moins un corps de métier.')
    expect(categoriesError('entreprise_generale', Object.keys(PROFESSIONAL_CATEGORIES))).toBeNull()
  })
  it('inconnu et doublon', () => {
    expect(categoriesError('specialiste', ['zzz'])).toBe('Corps de métier inconnu.')
    expect(categoriesError('specialiste', ['toiture', 'toiture'])).toBe('Corps de métier en double.')
  })
})

describe('CATEGORY_ADDED_AT / newCategoriesSince', () => {
  it('mêmes clés que PROFESSIONAL_CATEGORIES', () => {
    expect(Object.keys(CATEGORY_ADDED_AT).sort()).toEqual(Object.keys(PROFESSIONAL_CATEGORIES).sort())
  })
  it('liste les métiers ajoutés après la date de revue et absents du profil', () => {
    expect(newCategoriesSince('2026-10-08T00:00:00Z', ['toiture'])).toEqual(['carrelage', 'menuiserie', 'renovation_energetique'])
    expect(newCategoriesSince('2026-10-08T00:00:00Z', ['carrelage'])).toEqual(['menuiserie', 'renovation_energetique'])
    expect(newCategoriesSince('2026-10-10T00:00:00Z', [])).toEqual([])
    expect(newCategoriesSince(null, [])).toEqual([])
  })
})

describe('hasEnergyItems (05.19-13)', () => {
  it('faux sans poste énergétique', () => {
    expect(hasEnergyItems([])).toBe(false)
    expect(hasEnergyItems(['cuisine', 'peinture_finitions'])).toBe(false)
  })
  it('vrai dès un poste énergétique', () => {
    expect(hasEnergyItems(['cuisine', 'pac'])).toBe(true)
    expect(hasEnergyItems(['menuiserie_ext_rge'])).toBe(true)
  })
  it('clé voisine non énergétique ignorée', () => {
    expect(hasEnergyItems(['menuiserie_ext'])).toBe(false)
  })
  it('null et undefined tolérés', () => {
    expect(hasEnergyItems(null)).toBe(false)
    expect(hasEnergyItems(undefined)).toBe(false)
  })
  it('ENERGY_ITEMS : 9 clés, toutes dans la matrice', () => {
    expect(ENERGY_ITEMS).toHaveLength(9)
    for (const k of ENERGY_ITEMS) expect(k in COMPATIBILITY_MATRIX).toBe(true)
  })
  it('borne Zod : prestations (11) + énergétique ≤ 30', () => {
    // cf. .max(30) de server/api/v1/projects.post.ts
    expect(11 + ENERGY_ITEMS.length).toBeLessThanOrEqual(30)
  })
})

describe('qualification RGE (05.19-14)', () => {
  const nonRge = { rge_status: 'none', decennal_status: 'valid' }
  it('canDoEnergy exige RGE valide ET décennale valide', () => {
    expect(canDoEnergy({ rge_status: 'valid', decennal_status: 'valid' })).toBe(true)
    for (const [r, d] of [['valid', 'none'], ['valid', 'expired'], ['expired', 'valid'], ['none', 'valid']]) {
      expect(canDoEnergy({ rge_status: r, decennal_status: d })).toBe(false)
    }
    expect(canDoEnergy({})).toBe(false)
  })
  it('spécialiste isolation non RGE : poste énergétique refusé, RGE accepté', () => {
    expect(proMatchesProject({ ...spec(['isolation']), ...nonRge }, { selected_items: ['isolation_ite_iti'] })).toBe(false)
    expect(proMatchesProject(spec(['isolation']), { selected_items: ['isolation_ite_iti'] })).toBe(true)
  })
  it('poste non énergétique retenu : projet mixte accessible', () => {
    expect(proMatchesProject({ ...spec(['isolation']), ...nonRge }, { selected_items: ['isolation_ite_iti', 'isolation_platrerie'] })).toBe(true)
  })
  it('EGB approuvé non RGE : garde ses autres postes, pas les énergétiques seuls', () => {
    const pro = { ...egb(['renovation_energetique', 'menuiserie']), ...nonRge }
    expect(proMatchesProject(pro, { selected_items: ['pac', 'cuisine'] })).toBe(true)
    expect(proMatchesProject(pro, { selected_items: ['pac'] })).toBe(false)
    expect(proMatchesProject(egb(['renovation_energetique']), { selected_items: ['pac'] })).toBe(true)
  })
  it('RGE valide mais décennale expirée : refusé', () => {
    const exp = { rge_status: 'valid', decennal_status: 'expired' }
    expect(proMatchesProject({ ...egb(['renovation_energetique']), ...exp }, { selected_items: ['pac'] })).toBe(false)
    expect(proMatchesProject({ ...spec(['plomberie']), ...exp }, { selected_items: ['chaudiere_reno'] })).toBe(false)
  })
  it('projet legacy sans postes : repli catégorie inchangé', () => {
    expect(proMatchesProject({ ...spec(['plomberie']), ...nonRge }, { selected_items: [], category: 'plomberie' })).toBe(true)
  })
  it('chaque poste ENERGY_ITEMS est refusé à un pro non RGE ayant toutes les catégories', () => {
    const pro = { ...egb(Object.keys(PROFESSIONAL_CATEGORIES)), ...nonRge }
    for (const item of ENERGY_ITEMS) expect(proMatchesProject(pro, { selected_items: [item] })).toBe(false)
  })
})

describe('garde canAccessLead — GET /api/v1/leads/[id] et PATCH /api/v1/leads/[id]/claim (05.19-14)', () => {
  const nonRge = { rge_status: 'none', decennal_status: 'valid' }
  it('chantier énergétique : refusé non RGE, accepté RGE', () => {
    expect(canAccessLead({ ...spec(['plomberie']), ...nonRge }, { selected_items: ['chaudiere_reno'] })).toBe(false)
    expect(canAccessLead(spec(['plomberie']), { selected_items: ['chaudiere_reno'] })).toBe(true)
  })
  it('chantier non énergétique : accepté sans RGE', () => {
    expect(canAccessLead({ ...spec(['menuiserie']), ...nonRge }, { selected_items: ['cuisine'] })).toBe(true)
    expect(canAccessLead({ ...spec(['isolation']), ...nonRge }, { selected_items: ['isolation_platrerie'] })).toBe(true)
  })
  it('EGB non RGE : non énergétique et mixte acceptés (R-03 bis)', () => {
    const pro = { ...egb(['renovation_energetique', 'menuiserie']), ...nonRge }
    expect(canAccessLead(pro, { selected_items: ['cuisine'] })).toBe(true)
    expect(canAccessLead(pro, { selected_items: ['pac', 'cuisine'] })).toBe(true)
  })
  it('projet ancien sans postes (null et []) : repli catégorie, RGE ou non', () => {
    for (const selected_items of [null, []]) {
      expect(canAccessLead({ ...spec(['plomberie']), ...nonRge }, { selected_items, category: 'plomberie' })).toBe(true)
      expect(canAccessLead(spec(['plomberie']), { selected_items, category: 'toiture' })).toBe(false)
    }
  })
  it('lead déjà débloqué : accès conservé', () => {
    expect(canAccessLead({ ...spec(['plomberie']), ...nonRge }, { selected_items: ['pac'] }, true)).toBe(true)
  })
  it.each(['server/api/v1/leads/[id].get.ts', 'server/api/v1/leads/[id]/claim.patch.ts'])('%s appelle la garde', (f) => {
    const src = readFileSync(new URL('../../' + f, import.meta.url), 'utf8')
    expect(src).toContain('canAccessLead(')
    expect(src).toContain('statusCode: 403')
    expect(src).toContain('selected_items')
  })
})
