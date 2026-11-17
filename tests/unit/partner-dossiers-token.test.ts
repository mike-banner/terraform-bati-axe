import { describe, it, expect } from 'vitest'
import { signDossiersToken, verifyDossiersToken, escapeLike, DOSSIERS_TOKEN_TTL_MS } from '../../server/utils/partnerDossiersToken'

const SECRET = 'secret-de-test'
const NOW = 1_800_000_000_000

describe('jeton Mes dossiers', () => {
  it('aller-retour : renvoie l adresse en minuscules', async () => {
    const t = await signDossiersToken(SECRET, '  Marie@Cabinet.FR ', NOW)
    expect(await verifyDossiersToken(SECRET, t, NOW + 1000)).toBe('marie@cabinet.fr')
  })

  it('expire après 24 h', async () => {
    const t = await signDossiersToken(SECRET, 'a@b.fr', NOW)
    expect(await verifyDossiersToken(SECRET, t, NOW + DOSSIERS_TOKEN_TTL_MS - 1)).toBe('a@b.fr')
    expect(await verifyDossiersToken(SECRET, t, NOW + DOSSIERS_TOKEN_TTL_MS + 1)).toBeNull()
  })

  it('refuse un autre secret ou un secret vide', async () => {
    const t = await signDossiersToken(SECRET, 'a@b.fr', NOW)
    expect(await verifyDossiersToken('autre', t, NOW)).toBeNull()
    expect(await verifyDossiersToken('', t, NOW)).toBeNull()
  })

  it('refuse un jeton dont l adresse ou la date a été modifiée', async () => {
    const t = await signDossiersToken(SECRET, 'a@b.fr', NOW)
    const [exp, , sig] = t.split('.')
    const otherMail = btoa('victime@x.fr').replace(/=+$/, '')
    expect(await verifyDossiersToken(SECRET, `${exp}.${otherMail}.${sig}`, NOW)).toBeNull()
    expect(await verifyDossiersToken(SECRET, `${Number(exp) + 999999999}.${t.split('.')[1]}.${sig}`, NOW)).toBeNull()
  })

  it('refuse les formats invalides', async () => {
    for (const bad of ['', 'abc', 'a.b', '1.2.3.4', 'x'.repeat(700)]) expect(await verifyDossiersToken(SECRET, bad, NOW)).toBeNull()
  })

  it('escapeLike neutralise les jokers', () => {
    expect(escapeLike('a_b%c\\d@x.fr')).toBe('a\\_b\\%c\\\\d@x.fr')
  })
})
