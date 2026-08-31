import { describe, it, expect } from 'vitest'
import { selectAlerts, type DecennaleDoc } from '../../server/api/v1/cron/decennale-alerts.get'

const NOW = new Date('2026-09-01T00:00:00Z')

function makeDoc(overrides: Partial<DecennaleDoc>): DecennaleDoc {
  return {
    id: 'doc-1',
    professional_id: 'pro-1',
    expires_at: NOW.toISOString(),
    alert_j30_sent_at: null,
    alert_j7_sent_at: null,
    ...overrides,
  }
}

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * 86_400_000).toISOString()
}

describe('selectAlerts', () => {
  it('liste vide → aucune alerte', () => {
    expect(selectAlerts([], NOW)).toEqual({ j30: [], j7: [] })
  })

  it('expire dans 20 jours, alert_j30_sent_at null → classé j30', () => {
    const doc = makeDoc({ expires_at: daysFromNow(20) })
    const { j30, j7 } = selectAlerts([doc], NOW)
    expect(j30).toEqual([doc])
    expect(j7).toEqual([])
  })

  it('expire dans 20 jours, alert_j30_sent_at renseigné → ignoré', () => {
    const doc = makeDoc({ expires_at: daysFromNow(20), alert_j30_sent_at: NOW.toISOString() })
    expect(selectAlerts([doc], NOW)).toEqual({ j30: [], j7: [] })
  })

  it('expire dans 5 jours, alert_j7_sent_at null → classé j7 (même si j30 déjà envoyé)', () => {
    const doc = makeDoc({ expires_at: daysFromNow(5), alert_j30_sent_at: NOW.toISOString() })
    const { j30, j7 } = selectAlerts([doc], NOW)
    expect(j7).toEqual([doc])
    expect(j30).toEqual([])
  })

  it('expire dans 5 jours, alert_j7_sent_at renseigné → ignoré', () => {
    const doc = makeDoc({ expires_at: daysFromNow(5), alert_j7_sent_at: NOW.toISOString() })
    expect(selectAlerts([doc], NOW)).toEqual({ j30: [], j7: [] })
  })

  it('déjà expiré → ignoré', () => {
    const doc = makeDoc({ expires_at: daysFromNow(-1) })
    expect(selectAlerts([doc], NOW)).toEqual({ j30: [], j7: [] })
  })

  it('expire dans 45 jours → ignoré', () => {
    const doc = makeDoc({ expires_at: daysFromNow(45) })
    expect(selectAlerts([doc], NOW)).toEqual({ j30: [], j7: [] })
  })
})
