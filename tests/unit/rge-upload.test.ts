import { describe, it, expect } from 'vitest'
import { validateFutureExpiry, validateRgeUpload } from '../../server/utils/rgeUpload'

const today = '2026-10-09'

describe('validateRgeUpload', () => {
  it('ignore les types non RGE', () => {
    expect(validateRgeUpload('kbis', undefined, today)).toBeNull()
    expect(validateRgeUpload('decennale', '2020-01-01', today)).toBeNull()
  })
  it('refuse une date absente', () => {
    expect(validateRgeUpload('rge', undefined, today)).toEqual({ ok: false, error: "Date d'expiration requise." })
    expect(validateRgeUpload('rge', '', today)).toEqual({ ok: false, error: "Date d'expiration requise." })
  })
  it.each(['31/12/2027', '2027-1-5', '2027-13-01', '2027-02-30'])('refuse la date mal formée %s', (d) => {
    expect(validateRgeUpload('rge', d, today)).toEqual({ ok: false, error: 'Date invalide.' })
  })
  it('refuse une date passée ou égale à aujourd\'hui', () => {
    const err = { ok: false, error: "La date d'expiration doit être future." }
    expect(validateRgeUpload('rge', '2026-10-08', today)).toEqual(err)
    expect(validateRgeUpload('rge', '2026-10-09', today)).toEqual(err)
  })
  it('accepte une date future et force pending', () => {
    expect(validateRgeUpload('rge', '2026-10-10', today)).toEqual({ ok: true, status: 'pending', expiry_date: '2026-10-10' })
  })
})

describe('validateFutureExpiry', () => {
  it('refuse absente, mal formée, passée, aujourd\'hui, 2027-02-30', () => {
    expect(validateFutureExpiry(undefined, today)).toEqual({ ok: false, error: "Date d'expiration requise." })
    expect(validateFutureExpiry('31/12/2027', today)).toEqual({ ok: false, error: 'Date invalide.' })
    expect(validateFutureExpiry('2027-02-30', today)).toEqual({ ok: false, error: 'Date invalide.' })
    const err = { ok: false, error: "La date d'expiration doit être future." }
    expect(validateFutureExpiry('2026-10-08', today)).toEqual(err)
    expect(validateFutureExpiry('2026-10-09', today)).toEqual(err)
  })
  it('accepte demain', () => {
    expect(validateFutureExpiry('2026-10-10', today)).toEqual({ ok: true, expiry_date: '2026-10-10' })
  })
})
