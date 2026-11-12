import { test, expect, type Page } from '@playwright/test'

// Phases 05.21 / 05.23 — page partenaire à lien (API mockées : données chargées côté client).
const TOKEN = 'a'.repeat(64)
const URL_GET = `**/api/v1/b2b/engagement/${TOKEN}`

const candidate = (id: string, company: string, over: Record<string, unknown> = {}) => ({
  engagement_id: id, status: 'signed', signed_at: '2026-11-01T10:00:00Z', not_awarded_reason: null,
  pro: {
    company_name: company, categories: ['Maçonnerie & Gros Œuvre'], professional_type: 'specialiste',
    is_verified: true, decennale_valid: true, rge_valid: false, zone: 'Versailles',
    profile_url: '/pro/78/macon-durand-abc123', phone: '0612345678',
  },
  ...over,
})

const lot = (over: Record<string, unknown> = {}) => ({
  lot_id: 'lot-1', lot_label: 'Maçonnerie & Gros Œuvre', lot_status: 'open', selected_engagement_id: null, outcome: 'pending',
  candidates: [candidate('eng-1', 'Maçonnerie Durand'), candidate('eng-2', 'Bâtisseurs 78', { pro: { company_name: 'Bâtisseurs 78', categories: [], professional_type: 'specialiste', is_verified: false, decennale_valid: false, rge_valid: false, zone: null, profile_url: null, phone: null } })],
  submissions: [], installments: null, confirmed_submissions_count: 0, confirmed_base_cents: 0, can_submit_quote: false,
  ...over,
})

const view = (over: Record<string, unknown> = {}, signed = false, lots: unknown[] = []) => ({
  request_ref: 'ABCD1234',
  contact_name: 'Paul Partenaire',
  on_behalf_of: 'self',
  framework: {
    signed, signed_at: signed ? '2026-10-30T10:00:00Z' : null, version: 'v1',
    html: '<article><p>Gabarit — à faire relire par un avocat avant mise en prod.</p></article>',
  },
  lots,
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

test('le partenaire voit les artisans intéressés et en retient un', async ({ page }) => {
  await mockGet(page, () => view({}, true, [lot()]))
  let posted: unknown = null
  await page.route('**/select', (route) => {
    posted = route.request().postDataJSON()
    return route.fulfill({ json: { status: 'SELECTED', lot_id: 'lot-1', selected_engagement_id: 'eng-1' } })
  })

  await page.goto(`/b2b/engagement/${TOKEN}`)
  const lots = page.locator('[data-testid="partner-lots"]')
  await expect(lots.getByText('Maçonnerie Durand')).toBeVisible()
  await expect(page.getByRole('link', { name: '0612345678' })).toHaveAttribute('href', 'tel:0612345678')
  await expect(page.getByRole('link', { name: 'Voir la fiche publique' })).toHaveAttribute('href', '/pro/78/macon-durand-abc123')
  await expect(lots.getByText(/@/)).toHaveCount(0)

  await page.getByRole('button', { name: 'Retenir cet artisan' }).first().click()
  await expect(page.getByText(/Un seul artisan par lot/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmer mon choix' }).click()
  await expect.poll(() => posted).toEqual({ outcome: 'select', lot_id: 'lot-1', engagement_id: 'eng-1' })
})

test('le partenaire déclare un choix hors plateforme', async ({ page }) => {
  await mockGet(page, () => view({}, true, [lot()]))
  let posted: unknown = null
  await page.route('**/select', (route) => {
    posted = route.request().postDataJSON()
    return route.fulfill({ json: { status: 'OUTSIDE_PLATFORM', lot_id: 'lot-1', selected_engagement_id: null } })
  })

  await page.goto(`/b2b/engagement/${TOKEN}`)
  await page.getByRole('button', { name: /hors plateforme/ }).click()
  await page.getByRole('button', { name: 'Confirmer mon choix' }).click()
  await expect.poll(() => posted).toEqual({ outcome: 'outside_platform', lot_id: 'lot-1' })
})

const selectedLot = () => lot({
  outcome: 'selected', lot_status: 'closed', selected_engagement_id: 'eng-1', can_submit_quote: true,
  candidates: [candidate('eng-1', 'Maçonnerie Durand', { status: 'selected' })],
})

test('le partenaire dépose le devis signé avec l\'attestation', async ({ page }) => {
  await mockGet(page, () => view({}, true, [selectedLot()]))
  let posted: Record<string, unknown> | null = null
  const fileKey = 'b2b-quotes/00000000-0000-4000-8000-000000000001/' + 'a'.repeat(32) + '.pdf'
  await page.route('**/quote-presign', route => route.fulfill({
    json: { status: 'SUCCESS', signedUrl: 'https://acc.r2.cloudflarestorage.com/b2b/x?sig=1', fileKey },
  }))
  await page.route('https://acc.r2.cloudflarestorage.com/**', route => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
    body: '',
  }))
  await page.route('**/quote', (route) => {
    posted = route.request().postDataJSON()
    return route.fulfill({ json: { status: 'SUBMITTED', submission_id: 's1', revision: false } })
  })

  await page.goto(`/b2b/engagement/${TOKEN}`)
  const amount = page.getByLabel('Montant HT total du devis signé')
  await expect(amount).toHaveAttribute('maxlength', '16')
  await page.getByLabel('Devis signé (PDF)').setInputFiles({ name: 'devis.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await amount.fill('250000')

  // Au-dessus de 200 000 € HT : trois versements, libellés neutres.
  await page.getByLabel('Date prévue — Acompte').fill('2026-12-01')
  await page.getByLabel('Date prévue — Avancement des travaux').fill('2027-02-01')
  await page.getByLabel('Date prévue — Étape suivante').fill('2027-05-01')
  await expect(page.getByText(/factur/i)).toHaveCount(0)

  const submit = page.getByRole('button', { name: 'Déposer le devis' })
  await expect(submit).toBeDisabled()
  await page.getByRole('checkbox', { name: /atteste avoir informé/ }).check()
  await expect(submit).toBeEnabled()
  await submit.click()

  await expect.poll(() => posted).toEqual({
    engagement_id: 'eng-1', file_key: fileKey, file_size: 8, amount: '250000',
    planned_due_dates: ['2026-12-01', '2027-02-01', '2027-05-01'], attestation: true,
  })
  await expect(page.getByText(/Devis déposé\./)).toBeVisible()
})

test('le partenaire valide l\'avancement', async ({ page }) => {
  const confirmed = lot({
    outcome: 'selected', lot_status: 'closed', selected_engagement_id: 'eng-1', can_submit_quote: true,
    candidates: [candidate('eng-1', 'Maçonnerie Durand', { status: 'quote_confirmed' })],
    confirmed_submissions_count: 1, confirmed_base_cents: 10000000,
    installments: [
      { seq: 1, label: 'Acompte', due_on: '2026-12-01', validated_at: null, can_validate: true },
      { seq: 2, label: 'Fin du chantier', due_on: '2027-03-01', validated_at: null, can_validate: false },
    ],
  })
  await mockGet(page, () => view({}, true, [confirmed]))
  let posted: unknown = null
  await page.route('**/installments', (route) => {
    posted = route.request().postDataJSON()
    return route.fulfill({ json: { status: 'VALIDATED', seq: 1, validated_at: '2026-12-02T10:00:00Z' } })
  })

  await page.goto(`/b2b/engagement/${TOKEN}`)
  const steps = page.locator('[data-testid="installments"]')
  await expect(page.getByRole('button', { name: 'Valider l\'avancement' })).toHaveCount(1)
  await expect(steps).not.toContainText('€')
  await page.getByRole('button', { name: 'Valider l\'avancement' }).click()
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click()
  await expect.poll(() => posted).toEqual({ engagement_id: 'eng-1', seq: 1 })
  // Avenant de travaux possible : le libellé du montant le précise.
  await expect(page.getByLabel('Montant HT de l\'avenant de travaux (en plus des devis déjà confirmés)')).toBeVisible()
})

test('la page partenaire n\'affiche ni commission ni part partenaire (D-22)', async ({ page }) => {
  await mockGet(page, () => view({}, true, [selectedLot()]))
  await page.goto(`/b2b/engagement/${TOKEN}`)
  await expect(page.getByRole('button', { name: 'Déposer le devis' })).toBeVisible()
  await expect(page.getByText(/commission|rétro|3 %/i)).toHaveCount(0)
})

test('lien invalide', async ({ page }) => {
  await mockGet(page, () => ({ statusMessage: 'Lien invalide ou expiré.' }), 404)
  await page.goto(`/b2b/engagement/${TOKEN}`)
  await expect(page.getByRole('heading', { name: /Lien invalide ou expiré/ })).toBeVisible()
})
