import { describe, it, expect, vi } from 'vitest'

// notifyB2bPros.ts importe email.ts, dépendant de `#imports` (non résolvable hors Nitro).
vi.mock('#imports', () => ({ useRuntimeConfig: () => ({ public: {} }) }))
vi.mock('../../server/utils/email', () => ({ sendEmail: vi.fn() }))

import { classifyAudience } from '../../server/utils/notifyB2bPros'

const ok = { verified: true, alerts: true }

describe('classifyAudience — état d\'un artisan vis-à-vis d\'un lot', () => {
  it('notifié : jamais renotifié, même sans autre condition', () => {
    expect(classifyAudience({ pro: ok, notifiedAt: '2026-11-16T10:00:00Z', dailyCount: 0, maxPerDay: 5 })).toEqual({ state: 'notified' })
  })
  it('non vérifié : exclu', () => {
    expect(classifyAudience({ pro: { verified: false, alerts: true }, notifiedAt: null, dailyCount: 0, maxPerDay: 5 }))
      .toEqual({ state: 'excluded', reason: 'non_verifie' })
  })
  it('alertes B2B désactivées : exclu (le refus d\'alertes est respecté)', () => {
    expect(classifyAudience({ pro: { verified: true, alerts: false }, notifiedAt: null, dailyCount: 0, maxPerDay: 5 }))
      .toEqual({ state: 'excluded', reason: 'alertes_desactivees' })
  })
  it('plafond quotidien atteint : en attente de lendemain', () => {
    expect(classifyAudience({ pro: ok, notifiedAt: null, dailyCount: 5, maxPerDay: 5 }))
      .toEqual({ state: 'capped', reason: 'plafond_quotidien' })
  })
  it('éligible : à notifier', () => {
    expect(classifyAudience({ pro: ok, notifiedAt: null, dailyCount: 4, maxPerDay: 5 })).toEqual({ state: 'pending' })
  })
})
