import { describe, it, expect, vi } from 'vitest'

// notifyB2bPros.ts importe server/utils/email.ts, lui-même dépendant de
// `#imports` (auto-import Nuxt, non résolvable hors runtime Nitro).
vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ public: { siteUrl: 'https://bati-axe.com' } }) }))
vi.mock('../../server/utils/email', () => ({ sendEmail: vi.fn().mockResolvedValue({ success: true }) }))

import { selectB2bTargets, renderTenderEmail } from '../../server/utils/notifyB2bPros'

describe('selectB2bTargets', () => {
  const pros = [
    { id: 'A', email: 'a@example.com' },
    { id: 'B', email: 'b@example.com' },
  ]

  it('exclut les pros déjà notifiés sur ce lot (idempotence)', () => {
    const result = selectB2bTargets({
      pros,
      alreadyNotifiedProIds: ['A'],
      dailyCounts: {},
      maxPerDay: 5,
    })
    expect(result).toEqual([pros[1]])
  })

  it('exclut un pro ayant atteint le plafond quotidien', () => {
    const result = selectB2bTargets({
      pros: [pros[0]],
      alreadyNotifiedProIds: [],
      dailyCounts: { A: 5 },
      maxPerDay: 5,
    })
    expect(result).toEqual([])
  })

  it('conserve un pro sous le plafond quotidien', () => {
    const result = selectB2bTargets({
      pros: [pros[0]],
      alreadyNotifiedProIds: [],
      dailyCounts: { A: 4 },
      maxPerDay: 5,
    })
    expect(result).toEqual([pros[0]])
  })

  it('conserve un pro sans aucune notification aujourd\'hui', () => {
    const result = selectB2bTargets({
      pros: [pros[0]],
      alreadyNotifiedProIds: [],
      dailyCounts: {},
      maxPerDay: 5,
    })
    expect(result).toEqual([pros[0]])
  })

  it('ne lève pas d\'exception sur une liste de pros vide', () => {
    const result = selectB2bTargets({
      pros: [],
      alreadyNotifiedProIds: [],
      dailyCounts: {},
      maxPerDay: 5,
    })
    expect(result).toEqual([])
  })
})

describe('renderTenderEmail', () => {
  const base = {
    lotCategory: 'toiture',
    lotId: 'lot-1',
    requestRef: 'ABCD1234',
    projectLocation: '78 — Yvelines',
    postalCode: '78500',
    budgetRange: '10 000 - 20 000 €',
    siteUrl: 'https://bati-axe.com',
  }

  it('contient le badge de confiance TEND-14', () => {
    const { html } = renderTenderEmail(base)
    expect(html).toContain('AO qualifié BÂTI-AXE')
  })

  it('contient le libellé français de la catégorie', () => {
    const { html } = renderTenderEmail(base)
    expect(html).toContain('Charpente & Toiture')
  })

  it('ne contient aucune coordonnée du partenaire', () => {
    const opts = {
      ...base,
      // valeurs volontairement injectées pour vérifier qu'elles ne fuitent pas
      contact_email: 'syndic@example.com',
      contact_phone: '0601020304',
    } as any
    const { html } = renderTenderEmail(opts)
    expect(html).not.toContain('syndic@example.com')
    expect(html).not.toContain('0601020304')
  })

  it('le sujet contient BÂTI-AXE et le libellé de catégorie', () => {
    const { subject } = renderTenderEmail(base)
    expect(subject).toContain('BÂTI-AXE')
    expect(subject).toContain('Charpente & Toiture')
  })
})
