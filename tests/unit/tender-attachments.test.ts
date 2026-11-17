import { describe, it, expect } from 'vitest'
import { canReadAttachments, listAttachments, attachmentRead, ATTACHMENT_KEY_REGEX } from '../../server/utils/tenderAttachments'

const KEY = 'b2b-uploads/2026/11/17/abc12345.pdf'
const claim = { claimed_at: '2026-11-17' }

describe('canReadAttachments', () => {
  it('exige le positionnement ET l\'avenant signé', () => {
    expect(canReadAttachments(claim, { id: 'e', status: 'signed' })).toBe(true)
    expect(canReadAttachments(null, { id: 'e', status: 'signed' })).toBe(false)
    expect(canReadAttachments(claim, null)).toBe(false)
  })
  it('retire l\'accès une fois l\'offre perdue, le garde si retenu', () => {
    expect(canReadAttachments(claim, { id: 'e', status: 'selected' })).toBe(true)
    expect(canReadAttachments(claim, { id: 'e', status: 'not_awarded' })).toBe(false)
    expect(canReadAttachments(claim, { id: 'e', status: 'commission_cancelled' })).toBe(false)
  })
})

describe('listAttachments', () => {
  it('n\'expose jamais la clé de stockage, seulement numéro, nom, taille', () => {
    const r = listAttachments([{ file_key: KEY, filename: 'plan.pdf', content_type: 'application/pdf', size: 1234 }])
    expect(r).toEqual([{ index: 0, name: 'plan.pdf', size: 1234, viewable: true }])
    expect(JSON.stringify(r)).not.toContain('b2b-uploads')
  })
  it('rejette une clé forgée (autre objet du bucket, traversée) et garde le numéro d\'origine des valides', () => {
    const r = listAttachments([
      { file_key: 'b2b-quotes/00000000-0000-0000-0000-000000000000/aa.pdf', filename: 'devis.pdf', size: 1 },
      { file_key: 'b2b-uploads/2026/11/17/../../../documents/secret.pdf', filename: 'x.pdf', size: 1 },
      { file_key: 'b2b-uploads/2026/11/17/x.html', filename: 'x.html', size: 1 },
      { file_key: KEY, filename: 'ok.pdf', size: 1 },
    ])
    expect(r.map(a => a.index)).toEqual([3])
  })
  it('tolère l\'absence de pièces', () => {
    expect(listAttachments(null)).toEqual([])
    expect(listAttachments('x')).toEqual([])
  })
  it('format de clé identique à celui produit par le presign', () => {
    expect(ATTACHMENT_KEY_REGEX.test('b2b-uploads/2026/11/17/k3j2h1g0.dwg')).toBe(true)
  })
})

describe('attachmentRead', () => {
  it('ouvre PDF et images, force le téléchargement du reste, type dérivé de l\'extension', () => {
    expect(attachmentRead(KEY, 'plan.pdf')).toEqual({ contentType: 'application/pdf', disposition: 'inline; filename="plan.pdf"' })
    expect(attachmentRead('b2b-uploads/2026/11/17/a.dwg', 'coupe.dwg').disposition).toMatch(/^attachment/)
  })
  it('neutralise guillemets et retours ligne dans le nom', () => {
    expect(attachmentRead(KEY, 'a"b\r\nc.pdf').disposition).toBe('inline; filename="a_b__c.pdf"')
  })
})
