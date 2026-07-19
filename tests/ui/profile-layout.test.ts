import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// ponytail: le rendu pleine page réel (useFetch + definePageMeta) n'est pas
// montable proprement en vitest ; cette assertion source garde exactement la
// régression visée (retour de la navbar / disparition de la galerie), le
// rendu visuel est vérifié au checkpoint humain.
const source = readFileSync(
  fileURLToPath(new URL('../../app/pages/pro/[dept]/[slug].vue', import.meta.url)),
  'utf-8'
)

describe('profil public — garde de layout immersif', () => {
  it('supprime la navbar générique via layout: false', () => {
    expect(source).toContain('layout: false')
  })

  it('affiche la galerie de réalisations via RealisationCard', () => {
    expect(source).toContain('RealisationCard')
  })
})
