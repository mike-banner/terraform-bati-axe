import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Garde anti-régression : le bug SignatureDoesNotMatch venait d'un Content-Length
// baké dans la signature aws4fetch (aws.sign) alors que le navigateur envoie le
// Content-Length réel du fichier. Assertion source plutôt que réseau : le bug est
// purement structurel (un header en trop), donc lire le fichier suffit à le détecter.

function assertNoContentLengthHeader(relativePath: string) {
  const filePath = resolve(process.cwd(), relativePath)
  const source = readFileSync(filePath, 'utf-8')
  expect(source).not.toContain('Content-Length')
}

describe('presign endpoints — pas de Content-Length dans aws.sign', () => {
  it('logo-presign.post.ts ne passe pas de Content-Length', () => {
    assertNoContentLengthHeader('server/api/v1/pro/profile/logo-presign.post.ts')
  })

  it('documents/presign.post.ts (référence correcte) ne passe pas de Content-Length', () => {
    assertNoContentLengthHeader('server/api/v1/pro/documents/presign.post.ts')
  })

  it('realisations/presign.post.ts ne passe pas de Content-Length (si créé)', () => {
    const relativePath = 'server/api/v1/pro/realisations/presign.post.ts'
    if (!existsSync(resolve(process.cwd(), relativePath))) return
    assertNoContentLengthHeader(relativePath)
  })
})
