import { describe, it, expect } from 'vitest'
import { buildLogoPublicUrl } from '../../server/utils/logoUrl'

const base = { fileKey: 'abc__slug/logo/logo_1.png', origin: 'https://bati-axe-dev-dev.pages.dev', slug: 'mon-entreprise-poissy-ab12cd34', now: 1234 }

describe('buildLogoPublicUrl', () => {
  it('utilise l\'URL publique du bucket quand elle est configurée', () => {
    expect(buildLogoPublicUrl({ ...base, r2PublicBaseUrl: 'https://cdn.exemple.fr' })).toBe('https://cdn.exemple.fr/abc__slug/logo/logo_1.png')
  })
  it('retombe sur le proxy serveur (URL absolue, cache invalidé) sinon', () => {
    const u = buildLogoPublicUrl({ ...base, r2PublicBaseUrl: '' })
    expect(u).toBe('https://bati-axe-dev-dev.pages.dev/api/v1/pro/logo/mon-entreprise-poissy-ab12cd34?v=1234')
    expect(() => new URL(u)).not.toThrow()
  })
  it('renvoie une chaîne vide sans slug ni URL publique (ne jamais enregistrer une URL invalide)', () => {
    expect(buildLogoPublicUrl({ ...base, r2PublicBaseUrl: undefined, slug: null })).toBe('')
  })
  it('encode le slug', () => {
    expect(buildLogoPublicUrl({ ...base, slug: 'a b/c' })).toContain('/logo/a%20b%2Fc?')
  })
})
