import { describe, it, expect } from 'vitest'
import { isEgbNaf } from '../../server/utils/siretLookup'

describe('isEgbNaf', () => {
  it('accepte les codes bâtiment tous corps d\'état, avec ou sans point', () => {
    for (const c of ['41.20A', '4120A', '41.20b', '43.99C', ' 4399c ']) expect(isEgbNaf(c)).toBe(true)
  })
  it('refuse les autres codes et les valeurs vides', () => {
    for (const c of ['43.21A', '47.11F', '', undefined, null]) expect(isEgbNaf(c)).toBe(false)
  })
})
