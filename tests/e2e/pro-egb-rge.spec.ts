import { test, expect, type Page } from '@playwright/test'

// ─── Auth mock helpers ─────────────────────────────────────────────────────────

const NOW = Math.floor(Date.now() / 1000)
const b64url = (s: string) => Buffer.from(s).toString('base64url')

// getClaims() décode le JWT : il doit être structurellement valide (3 parts base64url).
// Avec alg HS256, supabase-js retombe sur getUser() → notre mock /auth/v1/user valide.
const makeJwt = (appMetadata: Record<string, unknown>) => [
  b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  b64url(JSON.stringify({
    iss: 'http://127.0.0.1:54321/auth/v1',
    sub: 'test-pro-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'pro@batiaxe.test',
    exp: NOW + 3600,
    iat: NOW,
    session_id: 'test-session-id',
    app_metadata: appMetadata,
    user_metadata: {},
    is_anonymous: false,
  })),
  b64url('fake-signature'),
].join('.')

const FAKE_USER = {
  id: 'test-pro-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'pro@batiaxe.test',
  email_confirmed_at: '2025-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
}

const makeSession = (appMetadata: Record<string, unknown>) => ({
  access_token: makeJwt(appMetadata),
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: NOW + 3600,
  refresh_token: 'fake-refresh-token',
  user: { ...FAKE_USER, app_metadata: appMetadata },
})

async function setupAuth(page: Page, appMetadata: Record<string, unknown> = {}) {
  const FAKE_SESSION = makeSession(appMetadata)
  const FAKE_USER = FAKE_SESSION.user
  // @nuxtjs/supabase v2 (useSsrCookies) stocke la session dans le cookie
  // `sb-<host>-auth-token` au format `base64-<base64url(JSON)>` (@supabase/ssr).
  // Posé via document.cookie en init script : visible du client Supabase,
  // mais absent de la requête SSR initiale.
  const cookieValue = 'base64-' + b64url(JSON.stringify(FAKE_SESSION))
  await page.addInitScript(([name, value]) => {
    document.cookie = `${name}=${value}; path=/`
  }, ['sb-127-auth-token', cookieValue])

  // Intercepter les appels auth Supabase pour valider le token
  await page.route('**/auth/v1/user', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FAKE_USER),
    })
  )

  await page.route('**/auth/v1/token**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FAKE_SESSION),
    })
  )

  // Requêtes PostgREST directes (ex: company_name dans le layout) — données neutres
  await page.route('**/rest/v1/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  )

  // Tracking paywall déclenché en onMounted sur les leads floutés
  await page.route('**/api/v1/paywall-events', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  )
}

// Pages protégées : charger `/` (public) puis naviguer en SPA, pour que les fetches
// partent du navigateur et passent par les mocks (cf. CLAUDE.md).
async function gotoSpa(page: Page, path: string) {
  await page.goto('/')
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__)
  await page.evaluate((p) => {
    const app = (document.querySelector('#__nuxt') as any).__vue_app__
    return app.config.globalProperties.$router.push(p)
  }, path)
  await page.waitForURL('**' + path)
}

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

// Profil pro lu directement via PostgREST par le dashboard (maybeSingle → objet)
async function mockDashboard(page: Page, pro: Record<string, unknown>) {
  await setupAuth(page)
  await page.route('**/rest/v1/professionals*', route => route.fulfill(json({
    id: 'test-pro-id', company_name: 'Test SARL', full_name: 'Pro Test', is_claimed: true,
    is_verified: true, decennal_status: 'valid', siret_status: 'active', professional_type: 'specialiste',
    categories: ['maconnerie'], rge_status: 'none', created_at: '2026-01-01T00:00:00Z',
    categories_reviewed_at: null, ...pro,
  })))
  await page.route('**/rest/v1/verifications*', route => route.fulfill(json([])))
}

test.describe('Admin — entreprises générales', () => {
  test('liste un EGB pending (NAF, métiers) et l\'approuve', async ({ page }) => {
    await setupAuth(page, { role: 'admin' })
    let patched: any = null
    await page.route('**/api/v1/admin/egb', route => route.fulfill(json({ egb: [{
      id: 'egb-1', company_name: 'Générale du Nord', full_name: 'Marc Durand', email: 'marc@egb.test',
      siret: '12345678900011', siret_status: 'active', siret_naf_code: '4120A', created_at: '2026-10-01T00:00:00Z',
      categories: ['maconnerie', 'toiture'], postal_code: '59000', naf_coherent: true,
    }] })))
    await page.route('**/api/v1/admin/egb/egb-1', async (route) => {
      patched = { method: route.request().method(), body: route.request().postDataJSON() }
      await route.fulfill(json({ ok: true }))
    })
    await page.route('**/api/v1/admin/**', route => route.fallback())

    await page.goto('/')
    await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
    await page.evaluate(() => (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push('/admin'))
    // Mobile : la barre latérale est repliée derrière le bouton de l'en-tête
    const onglet = page.getByRole('button', { name: /Entreprises générales/ }).first()
    if ((page.viewportSize()?.width ?? 1280) < 1024) await page.locator('header button').first().click()
    await onglet.click()

    await expect(page.getByText('Générale du Nord')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('NAF 4120A')).toBeVisible()
    await expect(page.getByText('Maçonnerie', { exact: false }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Approuver' }).click()
    await expect(page.getByText('Générale du Nord')).toBeHidden()
    expect(patched).toEqual({ method: 'PATCH', body: { decision: 'approved' } })
  })
})

test.describe('Dashboard pro — RGE et nouveaux métiers', () => {
  test('module RGE affiché avec renovation_energetique', async ({ page }) => {
    await mockDashboard(page, { categories: ['renovation_energetique'] })
    await gotoSpa(page, '/espace/dashboard')
    await expect(page.getByTestId('rge-block')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('rge-hint')).toHaveCount(0)
  })

  test('indice RGE sinon', async ({ page }) => {
    await mockDashboard(page, { categories: ['maconnerie'] })
    await gotoSpa(page, '/espace/dashboard')
    await expect(page.getByTestId('rge-hint')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('rge-block')).toHaveCount(0)
  })

  test('« Pas concerné » enregistre la revue et masque le bandeau', async ({ page }) => {
    await mockDashboard(page, { categories_reviewed_at: '2026-06-10T00:00:00Z' })
    let body: any = null
    await page.route('**/api/v1/pro/profile/me', async (route) => {
      body = route.request().postDataJSON()
      await route.fulfill(json({ ok: true }))
    })
    await gotoSpa(page, '/espace/dashboard')
    await expect(page.getByText(/Nouveaux? métiers? disponibles?/)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Pas concerné' }).click()
    await expect(page.getByText(/Nouveaux? métiers? disponibles?/)).toBeHidden()
    expect(body).toEqual({ categories_reviewed: true })
  })

  test('« Ajouter à mon profil » demande la confirmation décennale puis envoie les catégories', async ({ page }) => {
    await mockDashboard(page, { categories_reviewed_at: '2026-06-10T00:00:00Z' })
    let body: any = null
    await page.route('**/api/v1/pro/profile/me', async (route) => {
      body = route.request().postDataJSON()
      await route.fulfill(json({ ok: true }))
    })
    const messages: string[] = []
    page.on('dialog', (d) => { messages.push(d.message()); void d.accept() })
    await gotoSpa(page, '/espace/dashboard')
    await expect(page.getByText(/Nouveaux? métiers? disponibles?/)).toBeVisible({ timeout: 10_000 })
    // Un spécialiste à 1 métier (limite 2) peut en ajouter un
    await page.getByRole('button', { name: 'Ajouter à mon profil' }).first().click()
    await expect.poll(() => body).not.toBeNull()
    expect(messages[0]).toContain('assurance décennale')
    expect(body.categories).toHaveLength(2)
    expect(body.categories[0]).toBe('maconnerie')
  })
})

test.describe('Profil — limite de métiers', () => {
  async function mockProfile(page: Page, profile: Record<string, unknown>) {
    await setupAuth(page)
    await page.route('**/api/v1/pro/profile/me', route => route.fulfill(json({ profile: {
      company_name: 'Test SARL', categories: ['maconnerie', 'toiture'], ...profile,
    } })))
  }

  test('spécialiste : la 3e case est désactivée', async ({ page }) => {
    await mockProfile(page, { professional_type: 'specialiste' })
    await gotoSpa(page, '/espace/profil')
    const boxes = page.getByRole('checkbox')
    await expect(boxes.first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type=checkbox]:checked')).toHaveCount(2)
    await expect(page.locator('input[type=checkbox]:not(:checked)').first()).toBeDisabled()
    await expect(page.locator('input[type=checkbox]:disabled')).toHaveCount((await boxes.count()) - 2)
  })

  test('EGB : peut cocher une 3e case', async ({ page }) => {
    await mockProfile(page, { professional_type: 'entreprise_generale' })
    await gotoSpa(page, '/espace/profil')
    const third = page.locator('input[type=checkbox]:not(:checked)').first()
    await expect(third).toBeEnabled({ timeout: 10_000 })
    await third.check()
    await expect(page.locator('input[type=checkbox]:checked')).toHaveCount(3)
  })
})
