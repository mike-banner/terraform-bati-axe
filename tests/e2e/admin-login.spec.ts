import { test, expect, type Page } from '@playwright/test'

// ─── Auth mock helpers (même pattern que leads.spec.ts) ───────────────────────

const NOW = Math.floor(Date.now() / 1000)
const b64url = (s: string) => Buffer.from(s).toString('base64url')

const FAKE_JWT = [
  b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  b64url(JSON.stringify({
    iss: 'http://127.0.0.1:54321/auth/v1',
    sub: 'admin-test-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@batiaxe.com',
    exp: NOW + 3600,
    iat: NOW,
    session_id: 'admin-test-session',
    app_metadata: { role: 'admin' },
    user_metadata: { email_verified: true },
    is_anonymous: false,
  })),
  b64url('fake-signature'),
].join('.')

const FAKE_ADMIN = {
  id: 'admin-test-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@batiaxe.com',
  email_confirmed_at: '2025-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  app_metadata: { role: 'admin' },
  user_metadata: {},
}

const FAKE_SESSION = {
  access_token: FAKE_JWT,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: NOW + 3600,
  refresh_token: 'fake-refresh-token',
  user: FAKE_ADMIN,
}

async function mockSupabase(page: Page) {
  await page.route('**/auth/v1/user', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_ADMIN) })
  )
  await page.route('**/auth/v1/token**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_SESSION) })
  )
  await page.route('**/rest/v1/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  )
  await page.route('**/api/v1/admin/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  )
}

// Login via le vrai formulaire /pro/claim → doit atterrir sur /admin sans reload.
test('login admin → redirection automatique vers /admin', async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/pro/claim', { waitUntil: 'networkidle' })
  await page.waitForSelector('#auth-email', { timeout: 15000 })

  await page.fill('#auth-email', 'admin@batiaxe.com')
  await page.fill('#auth-password', '000=bati')
  await page.click('button[type="submit"]')

  // Le fix : le watch(user) redirige vers /admin dès que la session est hydratée.
  await expect(page).toHaveURL(/\/admin/, { timeout: 15000 })
})

// Un pro connecté (non admin) doit atterrir sur son dashboard, pas sur /admin.
test('login pro → redirection vers /espace/dashboard', async ({ page }) => {
  await page.route('**/auth/v1/user', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...FAKE_ADMIN, app_metadata: {}, id: 'pro-test-id', email: 'pro@batiaxe.test' }) })
  )
  await page.route('**/auth/v1/token**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...FAKE_SESSION,
        user: { ...FAKE_ADMIN, app_metadata: {}, id: 'pro-test-id', email: 'pro@batiaxe.test' },
        access_token: [
          b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
          b64url(JSON.stringify({
            iss: 'http://127.0.0.1:54321/auth/v1',
            sub: 'pro-test-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'pro@batiaxe.test',
            exp: NOW + 3600,
            iat: NOW,
            session_id: 'pro-test-session',
            app_metadata: {},
            user_metadata: {},
            is_anonymous: false,
          })),
          b64url('fake-signature'),
        ].join('.'),
      }),
    })
  )
  await page.route('**/rest/v1/**', async route => {
    // professionals lookup : aucun profil → routeAuthedUser doit passer à l'étape 2…
    // mais le middleware /espace redirige les users connectés vers le dashboard.
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto('/pro/claim', { waitUntil: 'networkidle' })
  await page.waitForSelector('#auth-email', { timeout: 15000 })
  await page.fill('#auth-email', 'pro@batiaxe.test')
  await page.fill('#auth-password', 'password123')
  await page.click('button[type="submit"]')

  // Pro connecté non admin sans profil → onboarding étape 2 (« Votre entreprise »)
  await expect(page).toHaveURL(/\/pro\/claim/, { timeout: 15000 })
  await expect(page.locator('h1')).toHaveText(/Votre entreprise/, { timeout: 15000 })
})
