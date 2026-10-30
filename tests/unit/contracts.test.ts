import { describe, it, expect } from 'vitest'
import { CONTRACT_VERSIONS, renderContract, renderContractDocument, type EngagementType } from '../../server/utils/contracts'

const pro = { companyName: 'Dupont SARL', fullName: 'Jean Dupont', siret: '12345678900011', email: 'j@d.fr' }
const partner = { contactName: 'Marie Archi', contactCompany: 'Atelier M', email: 'm@a.fr', requestRef: 'REQ-1' }
const amend = { requestRef: 'REQ-1', lotRef: 'LOT-1', lotCategory: 'plomberie', proCompanyName: 'Dupont SARL', proSiret: '12345678900011', proFullName: 'Jean Dupont' }

const renders: [EngagementType, string][] = [
  ['framework_pro', renderContract('framework_pro', pro)],
  ['framework_partner', renderContract('framework_partner', partner)],
  ['lot_amendment', renderContract('lot_amendment', amend)],
]

describe('gabarits de contrat', () => {
  it.each(renders)('%s contient les clauses obligatoires', (type, html) => {
    for (const s of [
      'Gabarit — à faire relire par un avocat avant mise en prod', CONTRACT_VERSIONS[type],
      '24 mois', '5 000 € HT', '8 %', '6 %', '200 000 € HT', 'loi Hoguet', 'Article 27', 'droit français',
    ]) expect(html).toContain(s)
  })

  it('déterministe', () => {
    expect(renderContract('lot_amendment', amend)).toBe(renderContract('lot_amendment', amend))
  })

  it('échappe le HTML', () => {
    const html = renderContract('framework_pro', { ...pro, companyName: '<script>x</script>' })
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('avenant : stipulation pour autrui + ensemble contractuel, sans identité partenaire', () => {
    const html = renderContract('lot_amendment', amend)
    expect(html).toContain('art. 1205')
    expect(html).toContain('stipulation pour autrui')
    expect(html).toContain('ensemble contractuel')
    expect(html).toContain('réf. REQ-1')
    expect(html).not.toContain('Marie Archi')
    expect(html).toContain('Plomberie')
  })

  it('document imprimable avec preuve', () => {
    const doc = renderContractDocument({
      type: 'lot_amendment', template_version: 'AV-LOT-2026-10-v1', content_html: '<article>X</article>',
      content_sha256: 'a'.repeat(64), signed_at: '2026-10-30T10:00:00Z', signed_ip: '1.2.3.4', signer_email: 'j@d.fr',
    })
    expect(doc.startsWith('<!doctype html>')).toBe(true)
    expect(doc).toContain('a'.repeat(64))
    expect(doc).toContain('1.2.3.4')
    expect(doc).toContain('<article>X</article>')
  })
})
