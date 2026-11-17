import { describe, it, expect } from 'vitest'
import { proCategories, proMatchesCategory, EGB_FILTER, PRO_CATEGORY_LABELS } from '../../app/types/admin'
import { PROFESSIONAL_CATEGORIES } from '../../app/utils/workTypeMatrix'

const pro = (over: Record<string, unknown>) => ({ id: 'p', company_name: 'X', siret: '', full_name: '', email: '', phone: '', category: null, is_verified: true, decennal_status: 'valid', ...over }) as any

describe('catégories des pros (admin)', () => {
  it('proCategories lit categories[], à défaut l ancienne colonne category', () => {
    expect(proCategories(pro({ categories: ['plomberie', 'electricite'], category: 'peinture' }))).toEqual(['plomberie', 'electricite'])
    expect(proCategories(pro({ categories: [], category: 'peinture' }))).toEqual(['peinture'])
    expect(proCategories(pro({ categories: null, category: null }))).toEqual([])
  })

  it('un pro multi-métiers ressort dans chacun de ses métiers', () => {
    const p = pro({ categories: ['plomberie', 'electricite'] })
    expect(proMatchesCategory(p, 'plomberie')).toBe(true)
    expect(proMatchesCategory(p, 'electricite')).toBe(true)
    expect(proMatchesCategory(p, 'peinture')).toBe(false)
    expect(proMatchesCategory(p, '')).toBe(true)
  })

  it('le filtre Entreprise générale se base sur le type du pro', () => {
    expect(proMatchesCategory(pro({ professional_type: 'entreprise_generale', categories: [] }), EGB_FILTER)).toBe(true)
    expect(proMatchesCategory(pro({ professional_type: 'specialiste', categories: ['plomberie'] }), EGB_FILTER)).toBe(false)
  })

  it('tous les métiers du matching ont un libellé admin', () => {
    for (const k of Object.keys(PROFESSIONAL_CATEGORIES)) expect(PRO_CATEGORY_LABELS[k], k).toBeTruthy()
  })
})
