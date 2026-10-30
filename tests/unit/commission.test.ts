import { describe, it, expect } from 'vitest'
import { computeCommission, parseAmountToCents, formatEurCents, COMMISSION_THRESHOLD_CENTS } from '../../server/utils/commission'
import { AMOUNT_INPUT_PATTERN, AMOUNT_INPUT_MAXLENGTH, COMMISSION_THRESHOLD_LABEL } from '../../app/utils/commissionTiers'

describe('computeCommission (par tranche)', () => {
  it.each([
    [0, 0],
    [20_000_000, 1_600_000],
    [25_000_000, 1_900_000],
    [19_999_999, 1_600_000],
    [20_000_001, 1_600_000],
    [100_000_000, 6_400_000],
  ])('%i → %i', (a, c) => expect(computeCommission(a)).toBe(c))

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('%s lève RangeError', (v) => {
    expect(() => computeCommission(v)).toThrow(RangeError)
  })
})

describe('parseAmountToCents', () => {
  it.each([
    ['250000', 25_000_000],
    ['250 000,50', 25_000_050],
    ['250000.5', 25_000_050],
    ['1 000', 100_000],
  ])('%s → %i', (i, o) => expect(parseAmountToCents(i)).toBe(o))
  it.each(['0', '', '-5', '12,345', 'abc', '1e6', '1234567890'])('%s → null', (i) => {
    expect(parseAmountToCents(i)).toBeNull()
  })
})

describe('paliers partagés', () => {
  it('formatEurCents', () => {
    const s = formatEurCents(1_900_000)
    expect(s).toContain('19')
    expect(s).toContain('000')
    expect(s).toContain('€')
  })
  it('libellé du seuil cohérent avec les centimes', () => {
    const digits = (x: string) => x.replace(/[^\d]/g, '')
    expect(digits(COMMISSION_THRESHOLD_LABEL)).toBe(String(COMMISSION_THRESHOLD_CENTS / 100))
    expect(digits(formatEurCents(COMMISSION_THRESHOLD_CENTS))).toContain('200000')
  })
  it('pattern HTML cohérent avec le parseur serveur', () => {
    const re = new RegExp('^(?:' + AMOUNT_INPUT_PATTERN + ')$', 'v')
    const fx = ['250000', '250 000,50', '1 000', '999 999 999,99', '0,5', '1234567890', '12,345', 'abc', '1e6', '-5']
    for (const x of fx) {
      expect(re.test(x), x).toBe(parseAmountToCents(x) !== null || x === '0')
      if (parseAmountToCents(x) !== null) expect(x.length).toBeLessThanOrEqual(AMOUNT_INPUT_MAXLENGTH)
    }
  })
})
