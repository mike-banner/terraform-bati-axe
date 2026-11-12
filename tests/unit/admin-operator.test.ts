import { describe, it, expect, vi } from 'vitest'

vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))
const { parseAdminOperators, requireAdminOperator } = await import('../../server/utils/adminOperator')

describe('adminOperator', () => {
  it('parseAdminOperators : trim, vides retirés, dédoublonnage', () => {
    expect(parseAdminOperators('Mike, Paul ,,Léa')).toEqual(['Mike', 'Paul', 'Léa'])
    expect(parseAdminOperators('Mike,Mike')).toEqual(['Mike'])
    expect(parseAdminOperators(undefined)).toEqual([])
  })
  it('requireAdminOperator : valeur de la liste (rognée) acceptée', () => {
    expect(requireAdminOperator({ adminOperators: 'Mike,Paul' }, 'Paul')).toBe('Paul')
    expect(requireAdminOperator({ adminOperators: 'Mike,Paul' }, ' Paul ')).toBe('Paul')
  })
  it('inconnu, vide ou absent → 422', () => {
    for (const v of ['Inconnu', '', undefined, 42]) {
      expect(() => requireAdminOperator({ adminOperators: 'Mike,Paul' }, v)).toThrow('Indiquez qui agit (liste des opérateurs).')
    }
  })
  it('liste vide → 422 dédié', () => {
    expect(() => requireAdminOperator({ adminOperators: '' }, 'Mike')).toThrow('Aucun opérateur configuré (NUXT_ADMIN_OPERATORS).')
  })
})
