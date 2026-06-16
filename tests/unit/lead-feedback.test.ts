import { describe, it, expect } from 'vitest'
import { shouldRelaunch, canRelaunch, isEngaged, MAX_RELAUNCHES } from '../../server/utils/leadFeedback'

describe('leadFeedback — feedback loop particulier (REQ-06)', () => {
  it('isEngaged : seul un lead claimed est engagé', () => {
    expect(isEngaged({ status: 'claimed', customer_decision: 'pending' })).toBe(true)
    expect(isEngaged({ status: 'new', customer_decision: 'pending' })).toBe(false)
    expect(isEngaged({ status: 'lost', customer_decision: 'refused' })).toBe(false)
  })

  it('aucun pro engagé → pas de remise au marché', () => {
    expect(shouldRelaunch([])).toBe(false)
    expect(shouldRelaunch([{ status: 'new', customer_decision: 'pending' }])).toBe(false)
  })

  it('tous les pros engagés refusés → remise au marché', () => {
    expect(shouldRelaunch([
      { status: 'claimed', customer_decision: 'refused' },
      { status: 'claimed', customer_decision: 'refused' },
      { status: 'claimed', customer_decision: 'refused' },
    ])).toBe(true)
  })

  it('un seul pro engagé encore en attente → pas de remise', () => {
    expect(shouldRelaunch([
      { status: 'claimed', customer_decision: 'refused' },
      { status: 'claimed', customer_decision: 'pending' },
    ])).toBe(false)
  })

  it('un pro retenu (selected) → jamais de remise même si les autres sont refusés', () => {
    expect(shouldRelaunch([
      { status: 'claimed', customer_decision: 'refused' },
      { status: 'claimed', customer_decision: 'selected' },
    ])).toBe(false)
  })

  it('les leads non engagés (lost) ne comptent pas dans la décision', () => {
    // 2 anciens refusés passés en 'lost' + 1 nouveau pro engagé encore pending
    expect(shouldRelaunch([
      { status: 'lost', customer_decision: 'refused' },
      { status: 'lost', customer_decision: 'refused' },
      { status: 'claimed', customer_decision: 'pending' },
    ])).toBe(false)
  })

  it('canRelaunch : borne anti-spam à MAX_RELAUNCHES', () => {
    expect(canRelaunch(0)).toBe(true)
    expect(canRelaunch(MAX_RELAUNCHES - 1)).toBe(true)
    expect(canRelaunch(MAX_RELAUNCHES)).toBe(false)
  })
})
