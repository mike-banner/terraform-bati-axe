import { describe, it, expect } from 'vitest'
import { departmentCodeFromPostalCode, departmentLabel } from '../../app/utils/departments'
import { maskTender } from '../../server/utils/maskTender'

describe('departmentCodeFromPostalCode', () => {
  it('métropole : deux premiers chiffres', () => {
    expect(departmentCodeFromPostalCode('78000')).toBe('78')
    expect(departmentCodeFromPostalCode('75008')).toBe('75')
    expect(departmentCodeFromPostalCode('01000')).toBe('01')
  })
  it('Corse : 2A jusqu\'à 20199, 2B ensuite', () => {
    expect(departmentCodeFromPostalCode('20000')).toBe('2A')
    expect(departmentCodeFromPostalCode('20199')).toBe('2A')
    expect(departmentCodeFromPostalCode('20200')).toBe('2B')
  })
  it('DOM : trois premiers chiffres', () => {
    expect(departmentCodeFromPostalCode('97400')).toBe('974')
    expect(departmentCodeFromPostalCode('97200')).toBe('972')
  })
  it('codes invalides ou inexistants : null', () => {
    expect(departmentCodeFromPostalCode('00000')).toBeNull()
    expect(departmentCodeFromPostalCode('96000')).toBeNull()
    expect(departmentCodeFromPostalCode('7800')).toBeNull()
    expect(departmentCodeFromPostalCode('78 00')).toBeNull()
    expect(departmentCodeFromPostalCode(null)).toBeNull()
  })
})

describe('departmentLabel', () => {
  it('« 78 — Yvelines »', () => {
    expect(departmentLabel('78100')).toBe('78 — Yvelines')
    expect(departmentLabel('97400')).toBe('974 — La Réunion')
  })
})

describe('maskTender : département avant engagement', () => {
  const lot: any = {
    id: 'l1', category: 'toiture', status: 'open', created_at: null,
    b2b_requests: { id: 'r1', project_postal_code: '78100', project_location: '12 rue de la Paix, Saint-Germain', contact_phone: '0600000000', contact_email: 'a@b.fr' },
  }
  it('lot verrouillé : département visible, ni code postal ni adresse', () => {
    const out = maskTender(lot, false)
    expect(out.department).toBe('78 — Yvelines')
    expect(JSON.stringify(out)).not.toContain('78100')
    expect(JSON.stringify(out)).not.toContain('rue de la Paix')
  })
  it('lot révélé : adresse et code postal présents', () => {
    const out = maskTender(lot, true)
    expect(out.department).toBe('78 — Yvelines')
    expect(out.postal_code).toBe('78100')
    expect(out.project_location).toContain('rue de la Paix')
  })
})
