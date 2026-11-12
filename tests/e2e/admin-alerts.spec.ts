import { test, expect, type Page } from '@playwright/test'

// Phase 05.23-11 — onglet admin « Alertes », ordre d'appel, notes de suivi et pastilles (API mockées).
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

async function setupAdmin(page: Page) {
  const session = makeSession()
  await page.addInitScript(([name, value]) => { document.cookie = `${name}=${value}; path=/` }, ['sb-127-auth-token', 'base64-' + b64url(JSON.stringify(session))])
  await page.route('**/auth/v1/user', r => r.fulfill(json(session.user)))
  await page.route('**/auth/v1/token**', r => r.fulfill(json(session)))
  await page.route('**/rest/v1/**', r => r.fulfill(json([])))
}

const commissionRow = {
  engagement_id: 'eng-1', request_ref: 'ABCD1234', lot_label: 'Maçonnerie & Gros Œuvre', partner_label: 'Syndic SA', pro_company: 'Maçonnerie Durand',
  engagement_status: 'quote_confirmed', base_cents: 10000000, commission_cents: 800000, partner_share_cents: 300000,
  schedule: [
    { seq: 1, label: 'Acompte', amount_cents: 400000, due_on: '2026-12-01', validated_at: null },
    { seq: 2, label: 'Fin du chantier', amount_cents: 400000, due_on: '2027-03-01', validated_at: null },
  ],
  schedule_changed: false, snapshot_mismatch: false, open_contest: null, quote_files: [], amendment_url: '/api/v1/engagements/eng-1/document', cancel: null, movements: [],
  state: {
    status: 'echeance_a_venir', partner_status: 'en_attente', invoiced_cents: 0, paid_cents: 0, refunded_cents: 0, refund_due_cents: 0,
    exigible_cents: 0, partner_due_now_cents: 0, partner_paid_cents: 0, balance_cents: 800000,
    next_due: { seq: 1, label: 'Acompte', amount_cents: 400000, due_on: '2026-12-01', validated: false },
  },
}

const request = {
  id: 'req-1', apporteur_type: 'syndic', need_type: 'projet_immediat', project_location: '78', budget_range: null, files: [],
  certification_number: null, travaux_suggeres: null, description: 'Ravalement de façade complet', decision_status: 'en_attente',
  project_postal_code: '78000', partner_framework: null, engagements: [], commission_movements: [],
  contact_name: 'Paul Partenaire', contact_company: 'Syndic SA', contact_phone: '0612345678', contact_email: 'paul@syndic.test',
  consent_accepted: true, consent_at: '2026-10-29T10:00:00Z', status: 'qualifie', assigned_to: null, notes: null,
  created_at: '2026-10-29T10:00:00Z', updated_at: '2026-10-29T10:00:00Z',
}

const alertsPayload = {
  alerts: [
    { id: 'devis_conteste:eng-1', type: 'devis_conteste', severity: 'haute', request_id: 'req-1', request_ref: 'REQ1AAAA', lot_id: 'lot-1', lot_label: 'Maçonnerie & Gros Œuvre', engagement_id: 'eng-1', age_days: 12, suggested_action: 'Arbitrer dans Commissions en cours après avoir appelé le demandeur puis l\'artisan.', call_order: ['demandeur', 'artisan'], snoozed_until: null },
    { id: 'choix_en_attente:lot-2', type: 'choix_en_attente', severity: 'moyenne', request_id: 'req-2', request_ref: 'REQ2BBBB', lot_id: 'lot-2', lot_label: 'Toiture', engagement_id: null, age_days: 8, suggested_action: 'Appeler le demandeur pour l\'aider à choisir un artisan.', call_order: ['demandeur', 'artisan'], snoozed_until: null },
  ],
  snoozed: [],
  counts: { total: 2, by_request: { 'req-1': 1, 'req-2': 1 }, by_engagement: { 'eng-1': 1 } },
}

const followupsPayload = {
  request_ref: 'REQ1AAAA',
  call_order: ['demandeur', 'artisan'],
  parties: [
    { role: 'demandeur', label: 'Demandeur (partenaire)', name: 'Paul Partenaire', company: 'Syndic SA', phone: '0611223344', email: 'paul@syndic.test', pour_le_compte_de: null },
    { role: 'artisan', label: 'Artisan', engagement_id: 'eng-1', lot_id: 'lot-1', pro_id: 'pro-1', lot_label: 'Maçonnerie & Gros Œuvre', status: 'contested', company: 'Maçonnerie Durand', name: 'Jean Durand', phone: '0655443322', email: 'jean@durand.test' },
  ],
  followups: [],
}

let posted: unknown = null

async function mockAll(page: Page, rows: unknown[] = []) {
  await page.route('**/api/v1/admin/b2b-alerts', r => r.fulfill(json(alertsPayload)))
  await page.route('**/api/v1/admin/b2b-requests/req-1/followups', (route) => {
    if (route.request().method() === 'POST') {
      posted = route.request().postDataJSON()
      return route.fulfill(json({ status: 'SAVED', followup_id: 'f1' }))
    }
    return route.fulfill(json(followupsPayload))
  })
  await page.route('**/api/v1/admin/b2b-requests', r => r.fulfill(json({
    requests: [request, { ...request, id: 'req-3', contact_name: 'Sans Alerte' }], admins: [], total: 2,
  })))
  await page.route('**/api/v1/admin/commissions', r => r.fulfill(json({
    rows, summary: { total_to_collect_cents: 0, total_collected_cents: 0, partner_shares_due_cents: 0, contested_count: 0, stale_without_quote_count: 0 }, quote_stale_days: 60,
  })))
  await page.route('**/api/v1/admin/**', r => r.fallback())
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

test.describe('Admin — Alertes et suivi par appel', () => {
  test.beforeEach(() => { posted = null })

  test('l\'onglet Alertes affiche le compteur et les alertes triées', async ({ page }) => {
    await setupAdmin(page)
    await mockAll(page)
    await openTab(page, /Alertes/)

    await expect(page.getByRole('button', { name: /Alertes/ }).first()).toContainText('2')
    const rows = page.locator('[data-testid="alert-row"]')
    await expect(rows).toHaveCount(2, { timeout: 10_000 })
    await expect(rows.nth(0)).toContainText('Devis contesté')
    await expect(rows.nth(0)).toContainText('Haute')
    await expect(rows.nth(1)).toContainText('Choix du partenaire en attente')
  })

  test('l\'ordre d\'appel et les liens tel:', async ({ page }) => {
    await setupAdmin(page)
    await mockAll(page)
    await openTab(page, /Alertes/)
    await page.getByRole('button', { name: 'Appeler / suivre' }).first().click()

    const items = page.locator('[data-testid="followup-panel"] ol > li')
    await expect(items.nth(0)).toContainText('Demandeur')
    await expect(items.nth(0).locator('a[href="tel:0611223344"]')).toBeVisible()
    await expect(items.nth(1)).toContainText('Artisan')
    await expect(items.nth(1).locator('a[href="tel:0655443322"]')).toBeVisible()
  })

  test('l\'admin ajoute une note d\'appel', async ({ page }) => {
    await setupAdmin(page)
    await mockAll(page)
    await openTab(page, /Alertes/)
    await page.getByRole('button', { name: 'Appeler / suivre' }).first().click()

    const panel = page.locator('[data-testid="followup-panel"]')
    await panel.getByLabel('Partie appelée').selectOption('demandeur')
    await panel.getByLabel('Résultat').selectOption('rappel_prevu')
    await expect(panel.getByLabel('Note', { exact: true })).toHaveAttribute('maxlength', '1000')
    await panel.getByLabel('Note', { exact: true }).fill('À rappeler après la visite')
    const day = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
    await panel.getByLabel('Prochaine relance').fill(day)

    const save = panel.getByRole('button', { name: 'Enregistrer la note' })
    await expect(save).toBeDisabled()
    await panel.locator('#followup-operator-req-1').selectOption('Herman')
    await expect(save).toBeEnabled()
    await save.click()
    await expect.poll(() => posted).toEqual({ party: 'demandeur', outcome: 'rappel_prevu', note: 'À rappeler après la visite', next_followup_on: day, operator: 'Herman' })
  })

  test('pastille À traiter sur les lignes de dossier et de commission', async ({ page }) => {
    await setupAdmin(page)
    await mockAll(page, [commissionRow])
    await openTab(page, /Dossiers B2B/)

    const card1 = page.locator('div.border.rounded-sm', { hasText: 'Paul Partenaire' }).first()
    await expect(card1.locator('[data-testid="todo-badge"]').first()).toBeVisible({ timeout: 10_000 })
    const card3 = page.locator('div.border.rounded-sm', { hasText: 'Sans Alerte' }).first()
    await expect(card3.locator('[data-testid="todo-badge"]')).toHaveCount(0)

    await page.getByRole('button', { name: /Commissions en cours/ }).first().click()
    const line = page.locator('[data-testid="commissions-table"] tbody tr', { hasText: 'ABCD1234' }).first()
    await expect(line.locator('[data-testid="todo-badge"]')).toBeVisible({ timeout: 10_000 })
  })
})
