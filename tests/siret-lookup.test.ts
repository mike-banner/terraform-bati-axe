import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lookupSiret } from '../server/utils/siretLookup'

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('lookupSiret', () => {
  it('cas actif : retourne status=active avec company_name et address', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ nom_complet: 'DUPONT SARL', adresse: '12 RUE TEST 78000 POISSY', etat_administratif: 'A' }],
        total_results: 1
      })
    }))

    const result = await lookupSiret('44306184100047')

    expect(result.status).toBe('active')
    expect(result.company_name).toBe('DUPONT SARL')
    expect(result.address).toBe('12 RUE TEST 78000 POISSY')
  })

  it('cas fermé : retourne status=closed avec company_name peuplé', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ nom_complet: 'ANCIENNE ENTREPRISE SAS', adresse: '5 AV FERME 75001 PARIS', etat_administratif: 'F' }],
        total_results: 1
      })
    }))

    const result = await lookupSiret('12345678901234')

    expect(result.status).toBe('closed')
    expect(result.company_name).toBe('ANCIENNE ENTREPRISE SAS')
  })

  it('cas non diffusible : retourne status=not_found sans company_name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], total_results: 0 })
    }))

    const result = await lookupSiret('00000000000000')

    expect(result.status).toBe('not_found')
    expect(result.company_name).toBeUndefined()
  })

  it('cas erreur réseau : retourne status=error sans company_name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('AbortError')))

    const result = await lookupSiret('44306184100047')

    expect(result.status).toBe('error')
    expect(result.company_name).toBeUndefined()
  })
})
