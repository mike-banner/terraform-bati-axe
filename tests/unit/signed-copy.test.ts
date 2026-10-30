import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#imports', () => ({ useRuntimeConfig: () => ({}) }))
const sendEmail = vi.fn(async (_o: any) => ({}))
vi.mock('../../server/utils/email', () => ({ sendEmail: (o: any) => sendEmail(o) }))
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.statusMessage), o))

import { renderSignedCopyEmail, sendSignedCopy } from '../../server/utils/signature'

const base = {
  type: 'lot_amendment' as const, template_version: 'AV-LOT-2026-10-v1', content_html: '<article><p>Texte signé</p></article>',
  content_sha256: 'a'.repeat(64), signed_at: '2026-10-30T10:00:00Z', signer_email: 'p@e.fr',
}

beforeEach(() => sendEmail.mockClear())

describe('exemplaire signé', () => {
  it('contient texte, version, date, empreinte et mention', () => {
    const h = renderSignedCopyEmail(base)
    expect(h).toContain('<p>Texte signé</p>')
    expect(h).toContain('AV-LOT-2026-10-v1')
    expect(h).toContain('a'.repeat(64))
    expect(h).toContain('30 octobre 2026')
    expect(h).toContain('Conservez ce message : il constitue votre exemplaire du contrat signé')
  })
  it('échappe les champs de preuve', () => {
    const h = renderSignedCopyEmail({ ...base, template_version: '<script>x</script>' })
    expect(h).not.toContain('<script>x</script>')
    expect(h).toContain('&lt;script&gt;')
  })
  it('envoie si created, pas si rejeu', async () => {
    await sendSignedCopy({ ...base, created: true })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    await sendSignedCopy({ ...base, created: false })
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
  it('un échec d\'envoi ne lève pas', async () => {
    sendEmail.mockRejectedValueOnce(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sendSignedCopy({ ...base, created: true })).resolves.toBeUndefined()
  })
})
