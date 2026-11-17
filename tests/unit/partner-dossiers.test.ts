import { describe, it, expect } from 'vitest'
import { lotState, nextAction } from '../../server/utils/partnerDossierState'

describe('état d un lot vu du partenaire', () => {
  it('retenu dès qu un artisan est sélectionné, même si le lot est clos', () => {
    expect(lotState({ status: 'closed' }, [{ status: 'selected', selected_at: '2026-01-01' }])).toBe('retained')
  })
  it('à choisir quand des artisans ont signé leur avenant', () => {
    expect(lotState({ status: 'open' }, [{ status: 'signed', selected_at: null }])).toBe('to_choose')
  })
  it('clos sans artisan retenu', () => {
    expect(lotState({ status: 'closed' }, [])).toBe('closed')
  })
  it('en attente sinon', () => {
    expect(lotState({ status: 'open' }, [])).toBe('waiting')
  })
})

describe('prochaine action du partenaire', () => {
  it('convention d abord, puis choix, puis devis', () => {
    expect(nextAction({ frameworkSigned: false, lots: ['to_choose'], quotePending: true })).toBe('sign_framework')
    expect(nextAction({ frameworkSigned: true, lots: ['to_choose'], quotePending: true })).toBe('choose_pro')
    expect(nextAction({ frameworkSigned: true, lots: ['retained'], quotePending: true })).toBe('submit_quote')
    expect(nextAction({ frameworkSigned: true, lots: ['waiting'], quotePending: false })).toBeNull()
  })
})
