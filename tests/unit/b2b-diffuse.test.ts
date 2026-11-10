import { describe, it, expect, vi } from 'vitest'

// server/utils/b2bDiffusion.ts utilise createError (auto-import Nitro/h3),
// non résolu hors runtime Nitro — stub global comme dans decennale-alerts.test.ts.
vi.stubGlobal('createError', (opts: any) => Object.assign(new Error(opts.statusMessage), opts))

import { ACTIVE_TENDER_STATUSES, assertDiffusable, assertPartnerFrameworkSigned, assertTenderQuota } from '../../server/utils/b2bDiffusion'

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
    expect(() => assertDiffusable({ status: 'qualifie', assigned_to: 'admin-1', decision_status: 'confirme', project_postal_code: '78000' })).not.toThrow()
  })

  it('decision_status absent → lève 422', () => {
    try {
      assertDiffusable({ status: 'qualifie', assigned_to: 'admin-1', decision_status: null, project_postal_code: '78000' })
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(422)
    }
  })

  it('project_postal_code absent → lève 422', () => {
    try {
      assertDiffusable({ status: 'qualifie', assigned_to: 'admin-1', decision_status: 'confirme', project_postal_code: null })
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(422)
    }
  })

  it('code postal invalide (pas 5 chiffres) → lève 422', () => {
    try {
      assertDiffusable({ status: 'qualifie', assigned_to: 'admin-1', decision_status: 'confirme', project_postal_code: '780' })
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(422)
    }
  })

  it('dossier non qualifié (nouveau ou perdu) → lève 422', () => {
    for (const status of ['nouveau', 'perdu', 'en_cours']) {
      try {
        assertDiffusable({ status, assigned_to: 'admin-1', decision_status: 'confirme', project_postal_code: '78000' })
        expect.unreachable()
      } catch (e: any) {
        expect(e.statusCode).toBe(422)
        expect(e.statusMessage).toContain('Qualifiez')
      }
    }
  })

  it('qualifié sans chargé d\'affaires → lève 422', () => {
    try {
      assertDiffusable({ status: 'qualifie', assigned_to: null, decision_status: 'confirme', project_postal_code: '78000' })
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(422)
      expect(e.statusMessage).toContain('chargé d\'affaires')
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

describe('assertPartnerFrameworkSigned', () => {
  it('convention non signée → lève 409 mentionnant la convention', () => {
    try {
      assertPartnerFrameworkSigned(false)
      expect.unreachable()
    } catch (e: any) {
      expect(e.statusCode).toBe(409)
      expect(e.message).toContain('convention')
    }
  })

  it('convention signée → ne lève rien', () => {
    expect(() => assertPartnerFrameworkSigned(true)).not.toThrow()
  })
})
