import { test, expect, type Page } from '@playwright/test'

// Phase 05.23-07 — onglet admin « Commissions en cours » et fiche dossier B2B (API mockées).
// Auth admin : cookie de session posé côté client (cf. pro-egb-rge.spec.ts), navigation SPA uniquement.
const NOW = Math.floor(Date.now() / 1000)
const b64url = (s: string) => Buffer.from(s).toString('base64url')
const makeSession = () => {
  const appMetadata = { role: 'admin' }
  const user = {
    id: 'test-admin-id', aud: 'authenticated', role: 'authenticated', email: 'admin@batiaxe.test',
    email_confirmed_at: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
    app_metadata: appMetadata, user_metadata: {},
  }
  const jwt = [
    b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    b64url(JSON.stringify({ iss: 'http://127.0.0.1:54321/auth/v1', sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, exp: NOW + 3600, iat: NOW, session_id: 's', app_metadata: appMetadata, user_metadata: {}, is_anonymous: false })),
    b64url('fake-signature'),
  ].join('.')
  return { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: NOW + 3600, refresh_token: 'r', user }
}

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const today = new Date().toISOString().slice(0, 10)

const baseState = {
  status: 'a_facturer', partner_status: 'en_attente', invoiced_cents: 0, paid_cents: 0, refunded_cents: 0, refund_due_cents: 0,
  exigible_cents: 400000, partner_due_now_cents: 0, partner_paid_cents: 0, balance_cents: 800000,
  next_due: { seq: 1, label: 'Acompte', amount_cents: 400000, due_on: '2026-12-01', validated: true },
}
const row = (over: Record<string, unknown> = {}) => ({
  engagement_id: 'eng-1', request_ref: 'ABCD1234', lot_label: 'Maçonnerie & Gros Œuvre', partner_label: 'Syndic SA', pro_company: 'Maçonnerie Durand',
  engagement_status: 'quote_confirmed', base_cents: 10000000, commission_cents: 800000, partner_share_cents: 300000,
  schedule: [
    { seq: 1, label: 'Acompte', amount_cents: 400000, due_on: '2026-12-01', validated_at: '2026-12-02T00:00:00Z' },
    { seq: 2, label: 'Fin du chantier', amount_cents: 400000, due_on: '2027-03-01', validated_at: null },
  ],
  schedule_changed: false, snapshot_mismatch: false, state: baseState, open_contest: null,
  quote_files: [{ submission_id: 'sub-1', amount_ht_cents: 10000000, status: 'confirmed', url: '/api/v1/b2b/quotes/sub-1/file' }],
  amendment_url: '/api/v1/engagements/eng-1/document', cancel: null, movements: [],
  ...over,
})
const contestedRow = () => row({
  engagement_id: 'eng-2', request_ref: 'WXYZ9876', engagement_status: 'contested',
  state: { ...baseState, status: 'contestee', exigible_cents: 0, next_due: null },
  open_contest: { submission_id: 'sub-2', amount_ht_cents: 12000000, reason: 'Montant erroné' },
})

async function setupAdmin(page: Page) {
  const session = makeSession()
  await page.addInitScript(([name, value]) => { document.cookie = `${name}=${value}; path=/` }, ['sb-127-auth-token', 'base64-' + b64url(JSON.stringify(session))])
  await page.route('**/auth/v1/user', r => r.fulfill(json(session.user)))
  await page.route('**/auth/v1/token**', r => r.fulfill(json(session)))
  await page.route('**/rest/v1/**', r => r.fulfill(json([])))
}

async function openTab(page: Page, name: RegExp) {
  await page.goto('/')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  // La liste d'opérateurs vient de la config publique : posée ici pour ne pas dépendre de l'environnement du serveur de test.
  await page.evaluate(() => {
    const app = (document.querySelector('#__nuxt') as any).__vue_app__
    app.config.globalProperties.$config.public.adminOperators = 'Herman,Mike'
    return app.config.globalProperties.$router.push('/admin')
  })
  if ((page.viewportSize()?.width ?? 1280) < 1024) await page.locator('header button').first().click()
  await page.getByRole('button', { name }).first().click()
}

async function mockCommissions(page: Page, rows: unknown[]) {
  await page.route('**/api/v1/admin/commissions', r => r.fulfill(json({
    rows,
    summary: { total_to_collect_cents: 800000, total_collected_cents: 0, partner_shares_due_cents: 0, contested_count: 1, stale_without_quote_count: 2 },
    quote_stale_days: 60,
  })))
  await page.route('**/api/v1/admin/**', r => r.fallback())
}

test.describe('Admin — Commissions en cours', () => {
  test('l\'onglet affiche la synthèse, l\'échéancier et les exports', async ({ page }) => {
    await setupAdmin(page)
    await mockCommissions(page, [row(), contestedRow()])
    await openTab(page, /Commissions en cours/)

    await expect(page.locator('[data-testid="commissions-summary"]')).toBeVisible({ timeout: 10_000 })
    const table = page.locator('[data-testid="commissions-table"]')
    await expect(table.getByText(/8\s000,00\s€/).first()).toBeVisible()
    await expect(table.getByText(/3\s000,00\s€/).first()).toBeVisible()
    const schedule = page.locator('[data-testid="commission-schedule"]').first()
    await expect(schedule).toContainText('Acompte')
    await expect(schedule).toContainText('Fin du chantier')
    await expect(schedule.getByText(/4\s000,00\s€/)).toHaveCount(2)
    await expect(schedule.getByText(/Validé le/)).toHaveCount(1)
    await expect(table.getByText('Versée en fin de chantier (après encaissement complet)').first()).toBeVisible()
    await expect(page.getByText(/prorata/i)).toHaveCount(0)

    // Les exports apparaissent seulement une fois « Qui agit ? » choisi.
    await expect(page.getByRole('link', { name: 'Exporter les commissions (CSV)' })).toHaveCount(0)
    await page.locator('#commissions-export-operator').selectOption('Herman')
    await expect(page.getByRole('link', { name: 'Exporter les commissions (CSV)' })).toHaveAttribute('href', '/api/v1/admin/commissions/export?operator=Herman')
    await expect(page.getByRole('link', { name: 'Exporter le journal (CSV)' })).toHaveAttribute('href', '/api/v1/admin/commissions/export?operator=Herman&scope=movements')
  })

  test('l\'admin enregistre une facture émise avec son opérateur', async ({ page }) => {
    await setupAdmin(page)
    await mockCommissions(page, [row()])
    let posted: unknown = null
    await page.route('**/api/v1/admin/commissions/eng-1/movements', (route) => {
      posted = route.request().postDataJSON()
      return route.fulfill(json({ state: baseState }))
    })
    await openTab(page, /Commissions en cours/)
    await page.getByRole('button', { name: 'Enregistrer un mouvement' }).first().click()

    const amount = page.getByLabel('Montant (€)')
    await expect(amount).toHaveAttribute('maxlength', '16')
    await amount.fill('4000')
    const save = page.getByRole('button', { name: 'Enregistrer', exact: true })
    await expect(save).toBeDisabled()
    await page.locator('#commission-movement-operator').selectOption('Herman')
    await expect(save).toBeEnabled()
    await save.click()
    await expect.poll(() => posted).toEqual({ type: 'commission_facturee', amount: '4000', occurred_on: today, operator: 'Herman' })
  })

  test('l\'annulation exige un motif', async ({ page }) => {
    await setupAdmin(page)
    await mockCommissions(page, [row()])
    let posted: any = null
    await page.route('**/api/v1/admin/commissions/eng-1/cancel', (route) => {
      posted = route.request().postDataJSON()
      return route.fulfill(json({ status: 'commission_cancelled', refund_due_cents: 0, partner_to_recover_cents: 0, warning_partner_already_paid: false }))
    })
    await openTab(page, /Commissions en cours/)
    await page.getByRole('button', { name: 'Annuler la commission' }).first().click()

    await page.getByLabel('Cas d\'annulation').selectOption('legal_withdrawal')
    await page.locator('#commission-cancel-operator').selectOption('Herman')
    const confirm = page.getByRole('button', { name: 'Confirmer l\'annulation' })
    await page.getByLabel('Motif de l\'annulation').fill('court')
    await expect(confirm).toBeDisabled()
    await page.getByLabel('Motif de l\'annulation').fill('Le client final s\'est rétracté dans le délai légal')
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect.poll(() => posted).toMatchObject({ case: 'legal_withdrawal', reason: 'Le client final s\'est rétracté dans le délai légal', operator: 'Herman' })
  })

  test('l\'admin arbitre une contestation', async ({ page }) => {
    await setupAdmin(page)
    await mockCommissions(page, [contestedRow()])
    let posted: unknown = null
    await page.route('**/api/v1/admin/commissions/eng-2/arbitrate', (route) => {
      posted = route.request().postDataJSON()
      return route.fulfill(json({ decision: 'reject', state: null }))
    })
    await openTab(page, /Commissions en cours/)
    await page.getByRole('button', { name: 'Arbitrer' }).first().click()
    await expect(page.getByText('Motif de l\'artisan : Montant erroné')).toBeVisible()

    await page.getByLabel('Note d\'arbitrage').fill('Le devis signé confirme un autre montant')
    await page.locator('#commission-arbitrate-operator').selectOption('Herman')
    await page.getByRole('button', { name: 'Refuser (le partenaire redépose)' }).click()
    await expect.poll(() => posted).toEqual({ submission_id: 'sub-2', decision: 'reject', note: 'Le devis signé confirme un autre montant', operator: 'Herman' })
  })

  test('l\'export exige un opérateur', async ({ page }) => {
    await setupAdmin(page)
    await mockCommissions(page, [row()])
    await openTab(page, /Commissions en cours/)
    await expect(page.getByText('Exporter les commissions (CSV)')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /Exporter/ })).toHaveCount(0)
    await page.locator('#commissions-export-operator').selectOption('Mike')
    await expect(page.getByRole('link', { name: 'Exporter les commissions (CSV)' })).toHaveAttribute('href', /operator=Mike/)
  })
})

test.describe('Admin — Dossiers B2B (nouveau suivi)', () => {
  const request = {
    id: 'req-1', apporteur_type: 'syndic', need_type: 'projet_immediat', project_location: '78', budget_range: null, files: [],
    certification_number: null, travaux_suggeres: null, description: 'Ravalement de façade complet', decision_status: 'en_attente',
    project_postal_code: '78000', partner_framework: { engagement_id: 'fw-1', signed_at: '2026-10-30T10:00:00Z' },
    engagements: [{
      id: 'eng-1', lot_id: 'lot-1', lot_category: 'maconnerie', pro_company: 'Maçonnerie Durand', status: 'quote_confirmed',
      selected_at: '2026-11-02T10:00:00Z', not_awarded_reason: null, confirmed_amount_cents: 10000000, commission_cents: 800000, signed_at: '2026-11-01T10:00:00Z',
    }],
    commission_movements: [{ occurred_on: '2026-12-10', created_at: '2026-12-10T10:00:00Z', type: 'encaissement', amount_cents: 400000, operator: 'Herman', lot_category: 'maconnerie', pro_company: 'Maçonnerie Durand' }],
    contact_name: 'Paul Partenaire', contact_company: 'Syndic SA', contact_phone: '0612345678', contact_email: 'paul@syndic.test',
    consent_accepted: true, consent_at: '2026-10-29T10:00:00Z', status: 'qualifie', assigned_to: null, notes: null,
    created_at: '2026-10-29T10:00:00Z', updated_at: '2026-10-29T10:00:00Z',
  }

  test('la fiche dossier montre le journal des versements avec l\'opérateur', async ({ page }) => {
    await setupAdmin(page)
    await page.route('**/api/v1/admin/b2b-requests', r => r.fulfill(json({ requests: [request], admins: [], total: 1 })))
    await page.route('**/api/v1/admin/**', r => r.fallback())
    await openTab(page, /Dossiers B2B/)

    const journal = page.locator('[data-testid="b2b-commission-journal"]')
    await expect(journal).toBeVisible({ timeout: 10_000 })
    await expect(journal.getByText('Encaissement')).toBeVisible()
    await expect(journal.getByText(/4\s000,00\s€/)).toBeVisible()
    await expect(journal.getByText('Herman')).toBeVisible()
  })

  test('plus d\'actions « Acompte versé » ni « Facturé » sur les avenants', async ({ page }) => {
    await setupAdmin(page)
    await page.route('**/api/v1/admin/b2b-requests', r => r.fulfill(json({ requests: [request], admins: [], total: 1 })))
    await page.route('**/api/v1/admin/**', r => r.fallback())
    await openTab(page, /Dossiers B2B/)

    const block = page.locator('[data-testid="admin-engagements"]')
    await expect(block.getByText('Devis confirmé')).toBeVisible({ timeout: 10_000 })
    await expect(block.getByRole('button', { name: /Acompte versé|Forcer l'acompte|Facturé/ })).toHaveCount(0)
    await expect(block.getByText(/Commissions en cours/)).toBeVisible()
  })
})
