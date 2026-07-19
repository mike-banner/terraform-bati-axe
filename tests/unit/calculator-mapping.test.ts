import { describe, it, expect } from 'vitest'
import { deriveTrades, derivePrimaryCategory } from '../../server/utils/calculatorMapping'

const ALL_TRADES = ['maconnerie', 'plomberie', 'electricite', 'peinture', 'isolation', 'toiture']

describe('deriveTrades', () => {
  it("renovation_type 'totale' → les 6 métiers", () => {
    expect(deriveTrades('totale', [])).toEqual(ALL_TRADES)
  })

  it("'pieces' avec cuisine → union dédupliquée", () => {
    expect(deriveTrades('pieces', ['cuisine'])).toEqual(['plomberie', 'electricite', 'peinture'])
  })

  it('union dédupliquée sur plusieurs pièces qui partagent des métiers', () => {
    const trades = deriveTrades('pieces', ['cuisine', 'salon'])
    expect(trades.filter(t => t === 'electricite')).toHaveLength(1)
    expect(trades.sort()).toEqual(['electricite', 'isolation', 'peinture', 'plomberie'].sort())
  })
})

describe('derivePrimaryCategory', () => {
  it('retourne toujours un des 6 ids métiers valides', () => {
    for (const pieces of [[], ['cuisine'], ['salle_de_bain'], ['exterieur'], ['autre']]) {
      expect(ALL_TRADES).toContain(derivePrimaryCategory('pieces', pieces))
    }
  })

  it("'totale' → maconnerie", () => {
    expect(derivePrimaryCategory('totale', [])).toBe('maconnerie')
  })

  it('tiebreak déterministe : cuisine + salon → electricite (priorité avant peinture)', () => {
    // cuisine: plomberie, electricite, peinture (1 chacun)
    // salon: peinture, electricite, isolation (1 chacun)
    // combiné: electricite=2, peinture=2, plomberie=1, isolation=1 → égalité electricite/peinture
    // priorité fixe: maconnerie, plomberie, electricite, peinture, isolation, toiture → electricite gagne
    expect(derivePrimaryCategory('pieces', ['cuisine', 'salon'])).toBe('electricite')
  })
})
