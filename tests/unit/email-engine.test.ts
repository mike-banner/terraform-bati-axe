import { describe, it, expect, vi, beforeEach } from 'vitest'

// server/utils/email.ts et notifyAdmin.ts importent `#imports` (auto-import Nuxt),
// non résolvable hors runtime Nuxt : on le mocke pour le test unitaire.
const mockConfig: Record<string, any> = {}
vi.mock('#imports', () => ({ useRuntimeConfig: () => mockConfig }))

const { sendEmailMock } = vi.hoisted(() => ({ sendEmailMock: vi.fn() }))
vi.mock('../../server/utils/email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/utils/email')>()
  return { ...actual, sendEmail: sendEmailMock }
})

import { renderEmail } from '../../server/utils/emailLayout'
import { resolveSender } from '../../server/utils/email'
import { notifyAdmin, adminDetailsTable } from '../../server/utils/notifyAdmin'

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

describe('resolveSender', () => {
  const cfg = {
    emailFromNoReply: 'BÂTI-AXE <no-reply@bati-axe.com>',
    emailFromNotifications: 'BÂTI-AXE <notifications@bati-axe.com>',
    emailFromContact: 'BÂTI-AXE <contact@bati-axe.com>',
  }

  it("no-reply → cfg.emailFromNoReply", () => {
    expect(resolveSender('no-reply', cfg)).toBe(cfg.emailFromNoReply)
  })

  it("notifications → cfg.emailFromNotifications", () => {
    expect(resolveSender('notifications', cfg)).toBe(cfg.emailFromNotifications)
  })

  it("contact → cfg.emailFromContact", () => {
    expect(resolveSender('contact', cfg)).toBe(cfg.emailFromContact)
  })

  it("undefined → cfg.emailFromContact (rétrocompat)", () => {
    expect(resolveSender(undefined, cfg)).toBe(cfg.emailFromContact)
  })

  it("notifications sans config → fallback en dur", () => {
    expect(resolveSender('notifications', {})).toBe('BÂTI-AXE <notifications@bati-axe.com>')
  })
})

describe('notifyAdmin', () => {
  beforeEach(() => {
    sendEmailMock.mockReset()
    delete mockConfig.adminEmail
  })

  it("sans adminEmail configuré → ne lève pas, aucun envoi", async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(notifyAdmin({ subject: 'Test', title: 'Test' })).resolves.toBeUndefined()
    expect(sendEmailMock).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("avec adminEmail → un seul sendEmail, sender notifications, subject préfixé", async () => {
    mockConfig.adminEmail = 'admin@bati-axe.com'
    sendEmailMock.mockResolvedValue({ success: true })
    await notifyAdmin({ subject: 'Alerte SIRET', title: 'Alerte' })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const call = sendEmailMock.mock.calls[0][0]
    expect(call.to).toBe('admin@bati-axe.com')
    expect(call.sender).toBe('notifications')
    expect(call.subject).toBe('[BÂTI-AXE ADMIN] Alerte SIRET')
  })

  it("sendEmail qui rejette → notifyAdmin résout quand même", async () => {
    mockConfig.adminEmail = 'admin@bati-axe.com'
    sendEmailMock.mockRejectedValue(new Error('Resend down'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(notifyAdmin({ subject: 'Test', title: 'Test' })).resolves.toBeUndefined()
    errSpy.mockRestore()
  })
})

describe('adminDetailsTable', () => {
  it('contient les clés/valeurs passées', () => {
    const html = adminDetailsTable([['SIRET', '123']])
    expect(html).toContain('SIRET')
    expect(html).toContain('123')
  })
})
