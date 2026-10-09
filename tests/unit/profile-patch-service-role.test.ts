import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Régression 2026-10-09 : depuis la migration 20260918, la RLS de `professionals` est en lecture seule pour
// le jeton du pro. Un UPDATE fait avec le client « utilisateur » ne modifie plus aucune ligne, sans erreur
// (réponse 200, rien en base). me.patch doit donc écrire avec le service role, borné à user.id.
const src = readFileSync('server/api/v1/pro/profile/me.patch.ts', 'utf8')

describe('PATCH /api/v1/pro/profile/me — écriture via service role', () => {
  it('utilise le service role pour lire et écrire professionals', () => {
    expect(src).toContain('serverSupabaseServiceRole')
    expect(src).toMatch(/const db = await serverSupabaseServiceRole\(event\)/)
    expect(src).not.toMatch(/supabase\s*\n?\s*\.from\('professionals'\)\s*\n?\s*\.update/)
    expect(src).toMatch(/db\s*\n?\s*\.from\('professionals'\)\s*\n?\s*\.update\(update\)/)
  })

  it('borne toujours l\'écriture à l\'utilisateur authentifié', () => {
    expect(src).toMatch(/\.update\(update\)\s*\n?\s*\.eq\('id', user\.id\)/)
  })

  it('ne répond jamais « ok » sans avoir modifié de ligne', () => {
    expect(src).toMatch(/\.eq\('id', user\.id\)\s*\n?\s*\.select\('id'\)/)
    expect(src).toContain('statusCode: 404')
  })
})
