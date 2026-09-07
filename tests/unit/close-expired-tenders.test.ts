import { describe, it, expect, vi } from 'vitest'

// Même approche que decennale-alerts.test.ts : on ne teste que la fonction pure
// selectExpiredLots, donc un mock minimal suffit pour charger le module.
vi.stubGlobal('defineEventHandler', (fn: Function) => fn)
vi.stubGlobal('createError', (opts: any) => Object.assign(new Error(opts.statusMessage), opts))
vi.stubGlobal('getHeader', () => undefined)
vi.mock('#supabase/server', () => ({ serverSupabaseServiceRole: vi.fn() }))
vi.mock('#imports', () => ({ useRuntimeConfig: () => ({}) }))

const { selectExpiredLots } = await import('../../server/api/v1/cron/close-expired-tenders.get')

const NOW = new Date('2026-09-07T00:00:00Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString()
}

describe('selectExpiredLots', () => {
  it('lot ouvert diffusé il y a 15 jours → retourné', () => {
    const lots = [{ id: 'a', status: 'open', reference_at: daysAgo(15) }]
    expect(selectExpiredLots(lots, NOW)).toEqual(['a'])
  })

  it('lot ouvert diffusé il y a 13 jours → NON retourné', () => {
    const lots = [{ id: 'a', status: 'open', reference_at: daysAgo(13) }]
    expect(selectExpiredLots(lots, NOW)).toEqual([])
  })

  it('lot de statut closed ou claimed → jamais retourné même si ancien', () => {
    const lots = [
      { id: 'a', status: 'closed', reference_at: daysAgo(30) },
      { id: 'b', status: 'claimed', reference_at: daysAgo(30) },
    ]
    expect(selectExpiredLots(lots, NOW)).toEqual([])
  })

  it('lot exactement à 14.0 jours → retourné (comparaison >=)', () => {
    const lots = [{ id: 'a', status: 'open', reference_at: daysAgo(14) }]
    expect(selectExpiredLots(lots, NOW)).toEqual(['a'])
  })

  it('lot sans reference_at (jamais diffusé) → non retourné', () => {
    const lots = [{ id: 'a', status: 'open', reference_at: null }]
    expect(selectExpiredLots(lots, NOW)).toEqual([])
  })
})
