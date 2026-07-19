import { describe, it, expect } from 'vitest'
import { computeEstimate } from '../../app/utils/calculateur'

describe('computeEstimate', () => {
  it('cas figé : cuisine 10m² standard → paire exacte (verrouille la grille)', () => {
    const r = computeEstimate({ renovation_type: 'pieces', pieces: ['cuisine'], surface_m2: 10, gamme: 'standard' })
    // base = 10*500 + 8000 = 13000 → min = round500(13000*0.85=11050)=11000, max = round500(13000*1.15=14950)=15000
    expect(r).toEqual({ estimate_min: 11000, estimate_max: 15000 })
  })

  it('montée en gamme : premium > standard > leger à surface égale', () => {
    const leger = computeEstimate({ renovation_type: 'totale', pieces: [], surface_m2: 50, gamme: 'leger' })
    const standard = computeEstimate({ renovation_type: 'totale', pieces: [], surface_m2: 50, gamme: 'standard' })
    const premium = computeEstimate({ renovation_type: 'totale', pieces: [], surface_m2: 50, gamme: 'premium' })
    expect(leger.estimate_max).toBeLessThan(standard.estimate_max)
    expect(standard.estimate_max).toBeLessThan(premium.estimate_max)
  })

  it('monotonie surface : plus grande surface → estimation plus élevée', () => {
    const petit = computeEstimate({ renovation_type: 'totale', pieces: [], surface_m2: 30, gamme: 'standard' })
    const grand = computeEstimate({ renovation_type: 'totale', pieces: [], surface_m2: 80, gamme: 'standard' })
    expect(grand.estimate_min).toBeGreaterThan(petit.estimate_min)
    expect(grand.estimate_max).toBeGreaterThan(petit.estimate_max)
  })

  it('estimate_min < estimate_max toujours (fourchette non dégénérée)', () => {
    const r = computeEstimate({ renovation_type: 'pieces', pieces: [], surface_m2: 1, gamme: 'leger' })
    expect(r.estimate_min).toBeLessThan(r.estimate_max)
  })

  it('min et max arrondis au multiple de 500 le plus proche', () => {
    const r = computeEstimate({ renovation_type: 'totale', pieces: [], surface_m2: 37, gamme: 'standard' })
    expect(r.estimate_min % 500).toBe(0)
    expect(r.estimate_max % 500).toBe(0)
  })

  it("renovation_type 'totale' : ignore les forfaits pièces", () => {
    const sansPieces = computeEstimate({ renovation_type: 'totale', pieces: [], surface_m2: 40, gamme: 'standard' })
    const avecPieces = computeEstimate({ renovation_type: 'totale', pieces: ['cuisine', 'salon'], surface_m2: 40, gamme: 'standard' })
    expect(sansPieces).toEqual(avecPieces)
  })

  it("renovation_type 'pieces' : additionne les forfaits par pièce sélectionnée", () => {
    const sansSalon = computeEstimate({ renovation_type: 'pieces', pieces: ['cuisine'], surface_m2: 20, gamme: 'standard' })
    const avecSalon = computeEstimate({ renovation_type: 'pieces', pieces: ['cuisine', 'salon'], surface_m2: 20, gamme: 'standard' })
    expect(avecSalon.estimate_max).toBeGreaterThan(sansSalon.estimate_max)
  })
})
