import { describe, it, expect } from 'vitest'
import { splitProjects, isOpenTender, projectPhase, leadPhase } from '../../app/utils/proProjects'

const t = (lot_id: string, positioned: boolean, status: string | null, created_at = '2026-01-01') =>
  ({ lot_id, positioned, engagement: status ? { status } : null, created_at })

describe('projectPhase', () => {
  it('demande faite, partenaire pas encore décidé = en attente', () => {
    expect(projectPhase(t('a', true, 'signed'))).toBe('pending')
    expect(projectPhase(t('a', true, null))).toBe('pending')
  })
  it('retenu par le partenaire = validé', () => {
    for (const s of ['selected', 'quote_submitted', 'contested', 'quote_confirmed', 'invoiced']) expect(projectPhase(t('a', true, s))).toBe('won')
  })
  it('non retenu ou commission annulée = perdu', () => {
    expect(projectPhase(t('a', true, 'not_awarded'))).toBe('lost')
    expect(projectPhase(t('a', true, 'commission_cancelled'))).toBe('lost')
  })
})

describe("isOpenTender (vue Appels d'offres)", () => {
  it('ne garde que les AO sans positionnement du pro : le reste passe dans Projets en cours', () => {
    expect(isOpenTender(t('a', false, null))).toBe(true)
    expect(isOpenTender(t('a', true, 'signed'))).toBe(false)
    expect(isOpenTender(t('a', true, 'selected'))).toBe(false)
    expect(isOpenTender(t('a', true, 'not_awarded'))).toBe(false)
  })
})

describe('splitProjects', () => {
  it('ignore les AO non positionnés et classe par phase', () => {
    const r = splitProjects([t('x', false, null), t('p', true, 'signed'), t('w', true, 'selected'), t('l', true, 'not_awarded')])
    expect(r.pending.map(x => x.lot_id)).toEqual(['p'])
    expect(r.won.map(x => x.lot_id)).toEqual(['w'])
    expect(r.lost.map(x => x.lot_id)).toEqual(['l'])
  })
  it('trie du plus récent au plus ancien', () => {
    const r = splitProjects([t('old', true, 'selected', '2026-01-01'), t('new', true, 'selected', '2026-03-01')])
    expect(r.won.map(x => x.lot_id)).toEqual(['new', 'old'])
  })
})

describe('leadPhase (chantiers particuliers)', () => {
  it('nouveau reste dans Leads, contacté et gagné passent en cours, perdu est rangé', () => {
    expect(leadPhase({ status: 'unlocked', db_status: 'new' })).toBe('available')
    expect(leadPhase({ status: 'unlocked', db_status: 'contacted' })).toBe('active')
    expect(leadPhase({ status: 'unlocked', db_status: 'won' })).toBe('active')
    expect(leadPhase({ status: 'unlocked', db_status: 'lost' })).toBe('closed')
  })
  it('un lead masqué ou attribué à un autre pro reste dans Leads', () => {
    expect(leadPhase({ status: 'locked' })).toBe('available')
    expect(leadPhase({ status: 'claimed' })).toBe('available')
  })
})
