import { describe, it, expect } from 'vitest'
import { proMatchesProject } from '../../app/utils/workTypeMatrix'

const spec = (categories: string[]) => ({ professional_type: 'specialiste', categories })
const eg = { professional_type: 'entreprise_generale', categories: [] }

describe('proMatchesProject', () => {
  it('entreprise générale reçoit tout, y compris les postes EG-only', () => {
    expect(proMatchesProject(eg, { selected_items: ['pac'] })).toBe(true)
  })
  it('spécialiste : recouvrement sur au moins un poste', () => {
    expect(proMatchesProject(spec(['peinture']), { selected_items: ['maconnerie', 'peinture_finitions'] })).toBe(true)
    expect(proMatchesProject(spec(['carrelage']), { selected_items: ['salle_de_bain'] })).toBe(true)
  })
  it('spécialiste : aucun recouvrement ou poste EG-only => false', () => {
    expect(proMatchesProject(spec(['peinture']), { selected_items: ['maconnerie'] })).toBe(false)
    expect(proMatchesProject(spec(['electricite', 'plomberie']), { selected_items: ['pac', 'demolition'] })).toBe(false)
  })
  it('poste inconnu ignoré', () => {
    expect(proMatchesProject(spec(['peinture']), { selected_items: ['zzz'] })).toBe(false)
  })
  it('repli legacy sur la catégorie quand aucun poste', () => {
    expect(proMatchesProject(spec(['toiture']), { selected_items: [], category: 'toiture' })).toBe(true)
    expect(proMatchesProject(spec(['toiture']), { category: 'peinture' })).toBe(false)
  })
})
