import { describe, it, expect } from 'vitest'
import { renderEmail } from '../../server/utils/emailLayout'

describe('renderEmail', () => {
  it('contient le titre dans un <h1', () => {
    const html = renderEmail({ title: 'Titre' })
    expect(html).toContain('<h1')
    expect(html).toContain('Titre')
  })

  it('avec cta retourne un bouton copper', () => {
    const html = renderEmail({ title: 'Titre', cta: { label: 'Voir', href: 'https://bati-axe.com' } })
    expect(html).toContain('<a href="https://bati-axe.com"')
    expect(html).toContain('background:#EA580C')
    expect(html).toContain('Voir')
  })

  it('sans cta ne contient aucun bouton', () => {
    const html = renderEmail({ title: 'Titre' })
    expect(html).not.toContain('<a href')
  })

  it('contient toujours la mention légale LCEN', () => {
    const html = renderEmail({ title: 'Titre' })
    expect(html).toContain('L34-5')
    expect(html).toContain('contact@bati-axe.com')
  })

  it('contient toujours max-width:600px', () => {
    const html = renderEmail({ title: 'Titre' })
    expect(html).toContain('max-width:600px')
  })

  it('preheader présent dans un div masqué', () => {
    const html = renderEmail({ title: 'Titre', preheader: 'Aperçu du message' })
    expect(html).toContain('display:none;max-height:0;overflow:hidden;opacity:0;')
    expect(html).toContain('Aperçu du message')
  })
})
