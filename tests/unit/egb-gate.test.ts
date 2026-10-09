import { describe, it, expect } from 'vitest'
import { effectiveProType, proMatchesProject } from '../../app/utils/workTypeMatrix'
import { maskLead } from '../../server/utils/maskLead'

const projet = { selected_items: ['pac'], category: 'plomberie' }
const matches = (pro: any) => proMatchesProject(effectiveProType({ rge_status: 'valid', decennal_status: 'valid', ...pro }), projet)

describe('gate EGB', () => {
  it('EGB approved sans catégorie : rien', () => {
    expect(matches({ professional_type: 'entreprise_generale', egb_status: 'approved', categories: [] })).toBe(false)
  })
  it('EGB approved avec recouvrement : reçoit', () => {
    expect(matches({ professional_type: 'entreprise_generale', egb_status: 'approved', categories: ['plomberie'] })).toBe(true)
  })
  it('EGB pending / rejected / none : rien, même avec des métiers cochés', () => {
    for (const egb_status of ['pending', 'rejected', 'none']) {
      expect(matches({ professional_type: 'entreprise_generale', egb_status, categories: ['plomberie', 'renovation_energetique'] })).toBe(false)
    }
  })
  it('spécialiste inchangé', () => {
    expect(matches({ professional_type: 'specialiste', egb_status: 'none', categories: ['plomberie'] })).toBe(
      proMatchesProject({ professional_type: 'specialiste', categories: ['plomberie'] }, projet))
  })
  it('masquage ADR-004 : EGB BASIC non débloqué ne reçoit aucune coordonnée', () => {
    const lead = {
      id: 'p1', status: 'new', unlocked_at: null, created_at: new Date().toISOString(),
      projects: { id: 'p1', category: 'plomberie', customer_name: 'Jean Dupont', customer_email: 'j@x.fr', customer_phone: '0600000000', postal_code: '78300', description: 'x' }
    }
    const json = JSON.stringify(maskLead(lead as any, false, new Date(), false))
    expect(json).not.toContain('Jean Dupont')
    expect(json).not.toContain('0600000000')
    expect(json).not.toContain('j@x.fr')
  })
})
