import { describe, it, expect } from 'vitest'
import { splitProjects } from '../../app/utils/proProjects'

const t = (lot_id: string, positioned: boolean, avenant_signed: boolean, created_at: string) => ({ lot_id, positioned, avenant_signed, created_at })

describe('splitProjects', () => {
  it('ignore les appels d\'offres où le pro n\'est pas positionné', () => {
    const r = splitProjects([t('a', false, false, '2026-01-01'), t('b', true, true, '2026-01-02')])
    expect(r.signed.map(x => x.lot_id)).toEqual(['b'])
    expect(r.unsigned).toEqual([])
  })
  it('sépare avenant signé et avenant à signer', () => {
    const r = splitProjects([t('a', true, false, '2026-01-01'), t('b', true, true, '2026-01-02')])
    expect(r.signed.map(x => x.lot_id)).toEqual(['b'])
    expect(r.unsigned.map(x => x.lot_id)).toEqual(['a'])
  })
  it('trie du plus récent au plus ancien', () => {
    const r = splitProjects([t('old', true, true, '2026-01-01'), t('new', true, true, '2026-03-01'), t('mid', true, true, '2026-02-01')])
    expect(r.signed.map(x => x.lot_id)).toEqual(['new', 'mid', 'old'])
  })
  it('liste vide', () => {
    expect(splitProjects([])).toEqual({ signed: [], unsigned: [] })
  })
})
