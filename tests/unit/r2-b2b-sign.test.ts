import { describe, it, expect, vi } from 'vitest'

vi.stubGlobal('useRuntimeConfig', () => ({ r2AccessKeyId: 'AKID', r2SecretAccessKey: 'SECRET', r2AccountId: 'acc', r2BucketB2b: 'bucket-b2b' }))
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))

const { signB2bObjectUrl } = await import('../../server/utils/r2B2b')
const event = { context: {} }
const KEY = 'b2b-quotes/11111111-1111-4111-8111-111111111111/' + 'a'.repeat(32) + '.pdf'

describe('signB2bObjectUrl', () => {
  it('PUT verrouillé : le type et la taille font partie de la signature', async () => {
    const url = new URL(await signB2bObjectUrl(event, KEY, 'PUT', 600, { contentType: 'application/pdf', contentLength: 1234 }))
    const signed = (url.searchParams.get('X-Amz-SignedHeaders') ?? '').split(';')
    expect(signed).toEqual(expect.arrayContaining(['content-type', 'content-length', 'host']))
  })
  it('PUT sans verrouillage : seul host est signé (comportement historique)', async () => {
    const url = new URL(await signB2bObjectUrl(event, KEY, 'PUT', 600))
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host')
  })
  it('GET : le PDF est forcé en pièce jointe', async () => {
    const url = new URL(await signB2bObjectUrl(event, KEY, 'GET', 300))
    expect(url.searchParams.get('response-content-type')).toBe('application/pdf')
    expect(url.searchParams.get('response-content-disposition')).toContain('attachment')
  })
  it('HEAD : aucun paramètre de réponse ajouté', async () => {
    const url = new URL(await signB2bObjectUrl(event, KEY, 'HEAD', 60))
    expect(url.searchParams.get('response-content-type')).toBeNull()
  })
})
