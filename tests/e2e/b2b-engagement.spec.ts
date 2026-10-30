import { test, expect, type Page } from '@playwright/test'

// Phase 05.21 — page partenaire à lien (API mockées : données chargées côté client).
const TOKEN = 'a'.repeat(64)
const URL_GET = `**/api/v1/b2b/engagement/${TOKEN}`

const view = (over: Record<string, unknown> = {}, signed = false, amendments: unknown[] = []) => ({
  request_ref: 'ABCD1234',
  contact_name: 'Paul Partenaire',
  framework: {
    signed, signed_at: signed ? '2026-10-30T10:00:00Z' : null, version: 'v1',
    html: '<article><p>Gabarit — à faire relire par un avocat avant mise en prod.</p></article>',
  },
  amendments,
  ...over,
})

async function mockGet(page: Page, body: () => unknown, status = 200) {
  await page.route(URL_GET, route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body()) }))
}

test('le partenaire signe la convention avec un code', async ({ page }) => {
  let signed = false
  await mockGet(page, () => view({}, signed))
  await page.route('**/framework', async (route) => {
    const body = route.request().postDataJSON()
    if (body.code) {
      signed = true
      return route.fulfill({ json: { status: 'SIGNED', engagement_id: 'e1', signed_at: '2026-10-30T10:00:00Z' } })
    }
    return route.fulfill({ json: { status: 'OTP_SENT', contract: {}, email_hint: 'p***@e***.fr' } })
  })

  await page.goto(`/b2b/engagement/${TOKEN}`)
  await expect(page.getByText('Gabarit')).toBeVisible()
  await page.getByRole('button', { name: 'Recevoir mon code de signature' }).click()
  await expect(page.locator('#partner-otp')).toHaveAttribute('maxlength', '6')
  await page.getByRole('checkbox').check()
  await page.locator('#partner-otp').fill('123456')
  await page.getByRole('button', { name: 'Signer la convention' }).click()
  await expect(page.getByText('Convention signée le')).toBeVisible()
  const print = page.getByRole('link', { name: /Imprimer/ })
  await expect(print).toBeVisible()
  await expect(print).toHaveAttribute('href', `/api/v1/b2b/engagement/${TOKEN}/document`)
})

test('le partenaire confirme le montant du devis', async ({ page }) => {
  const amendment = {
    id: 'am1', lot_label: 'Maçonnerie & Gros Œuvre', pro_company: 'Maçonnerie Durand',
    status: 'quote_declared', declared_amount_cents: 25000000, declared_at: '2026-10-29T10:00:00Z',
    confirmed_amount_cents: null, confirmed_at: null,
  }
  await mockGet(page, () => view({}, true, [amendment]))
  let posted: unknown = null
  await page.route('**/confirm-quote', (route) => {
    posted = route.request().postDataJSON()
    return route.fulfill({ json: { status: 'quote_confirmed', confirmed_amount_cents: 25000000, matches_declared: true } })
  })

  await page.goto(`/b2b/engagement/${TOKEN}`)
  const input = page.getByLabel('Montant HT du devis signé')
  await expect(input).toHaveAttribute('maxlength', '16')
  await expect(input).toHaveValue('250000,00')
  await page.getByRole('button', { name: 'Confirmer le montant' }).click()
  await expect(page.getByText('Montant confirmé.')).toBeVisible()
  expect(posted).toEqual({ engagement_id: 'am1', amount: '250000,00' })
})

test('lien invalide', async ({ page }) => {
  await mockGet(page, () => ({ statusMessage: 'Lien invalide ou expiré.' }), 404)
  await page.goto(`/b2b/engagement/${TOKEN}`)
  await expect(page.getByRole('heading', { name: /Lien invalide ou expiré/ })).toBeVisible()
})
