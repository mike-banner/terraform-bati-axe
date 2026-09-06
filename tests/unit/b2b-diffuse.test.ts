import { describe, it, expect, vi } from 'vitest'

// server/utils/b2bDiffusion.ts utilise createError (auto-import Nitro/h3),
// non résolu hors runtime Nitro — stub global comme dans decennale-alerts.test.ts.
vi.stubGlobal('createError', (opts: any) => Object.assign(new Error(opts.statusMessage), opts))

import { ACTIVE_TENDER_STATUSES, assertDiffusable, assertTenderQuota } from '../../server/utils/b2bDiffusion'

describe('ACTIVE_TENDER_STATUSES', () => {
  it('vaut exactement les 4 statuts actifs', () => {
    expect(ACTIVE_TENDER_STATUSES).toEqual(['nouveau', 'en_cours', 'rappele', 'qualifie'])
  })

  it('ne contient ni clos, ni converti, ni perdu', () => {
    expect(ACTIVE_TENDER_STATUSES).not.toContain('clos')
    expect(ACTIVE_TENDER_STATUSES).not.toContain('converti')
    expect(ACTIVE_TENDER_STATUSES).not.toContain('perdu')
  })
})

describe('assertDiffusable', () => {
  it('decision_status confirmé + code postal valide → ne lève rien', () => {
    expect(() => assertDiffusable({ decision_status: 'confirme', project_postal_code: '78000' })).not.toThrow()
  })

  it('decision_status absent → lève 422', () => {
    try {
      assertDiffusable({ decision_status: null, project_postal_code: '78000' })
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(422)
    }
  })

  it('project_postal_code absent → lève 422', () => {
    try {
      assertDiffusable({ decision_status: 'confirme', project_postal_code: null })
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(422)
    }
  })

  it('code postal invalide (pas 5 chiffres) → lève 422', () => {
    try {
      assertDiffusable({ decision_status: 'confirme', project_postal_code: '780' })
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(422)
    }
  })
})

describe('assertTenderQuota', () => {
  it('au plafond exact → ne lève rien', () => {
    expect(() => assertTenderQuota(3, 3)).not.toThrow()
  })

  it('au-delà du plafond → lève 409 avec le plafond dans le message', () => {
    try {
      assertTenderQuota(4, 3)
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(409)
      expect(e.statusMessage).toContain('3')
    }
  })

  it('bien en-dessous du plafond → ne lève rien', () => {
    expect(() => assertTenderQuota(0, 3)).not.toThrow()
  })
})
