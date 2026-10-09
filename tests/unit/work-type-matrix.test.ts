import { describe, it, expect } from 'vitest'
import {
  CATEGORY_ADDED_AT,
  PROFESSIONAL_CATEGORIES,
  categoriesError,
  effectiveProType,
  isEgbReserved,
  newCategoriesSince,
  proMatchesProject,
} from '../../app/utils/workTypeMatrix'

const spec = (categories: string[]) => ({ professional_type: 'specialiste', categories })
const egb = (categories: string[], egb_status = 'approved') => ({ professional_type: 'entreprise_generale', egb_status, categories })

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
