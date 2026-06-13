import { test, expect } from '@playwright/test'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PROJECT = {
  id: 'test-project-id',
  category: 'Maçonnerie & Gros Œuvre',
  description: 'Rénovation complète de la façade, environ 80 m².',
  budget_range: '15k-30k',
  timeline_range: '3_mois',
  postal_code: '78955',
  status: 'qualified',
  created_at: new Date().toISOString(),
}

function mockMagicLink(page: any, token: string, messages: any[] = []) {
  return page.route(`**/api/v1/magic-link/${token}`, (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: BASE_PROJECT,
        messages,
      }),
    })
  )
}

// ─── Tests page /mon-projet/[token] ──────────────────────────────────────────

test.describe('Page projet — token invalide', () => {
  test('affiche "Lien invalide ou expiré" si le token est inconnu', async ({ page }) => {
    await page.route('**/api/v1/magic-link/bad-token', route =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 404, message: 'Not found' }),
      })
    )

    await page.goto('/mon-projet/bad-token')

    await expect(page.getByText(/Lien invalide ou expiré/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /Retour à l'accueil/ })).toBeVisible()
  })
})

test.describe('Page projet — état vide (pas de messages)', () => {
  const TOKEN = 'test-token-empty'

  test.beforeEach(async ({ page }) => {
    await mockMagicLink(page, TOKEN, []) // aucun message
  })

  test('affiche les infos du projet dans le bandeau noir', async ({ page }) => {
    await page.goto(`/mon-projet/${TOKEN}`)

    await expect(page.getByRole('heading', { name: /Maçonnerie/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Rénovation complète de la façade/)).toBeVisible()
  })

  test('affiche les métadonnées du projet dans la grille', async ({ page }) => {
    await page.goto(`/mon-projet/${TOKEN}`)

    await expect(page.getByText('15k-30k')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Actif', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('RGPD conforme')).toBeVisible()
  })

  test('affiche l\'état "en cours de validation" avec les 3 garanties', async ({ page }) => {
    await page.goto(`/mon-projet/${TOKEN}`)

    // Message principal d'attente
    await expect(page.getByText(/en cours de validation/i)).toBeVisible({ timeout: 10_000 })

    // Les 3 garanties listées dans l'état vide
    await expect(page.getByText('Décennale vérifiée')).toBeVisible()
    await expect(page.getByText('Vos coordonnées masquées')).toBeVisible()
  })
})

test.describe('Page projet — état avec messages', () => {
  const TOKEN = 'test-token-messages'

  const MESSAGES = [
    {
      id: 'msg-1',
      lead_id: 'lead-abc',
      content: 'Bonjour, je suis disponible pour votre projet de maçonnerie.',
      sender_type: 'pro',
      created_at: new Date(Date.now() - 3600_000).toISOString(),
      leads: {
        professionals: {
          company_name: 'Maçonnerie Dupont & Fils',
        },
      },
    },
    {
      id: 'msg-2',
      lead_id: 'lead-abc',
      content: 'Merci pour votre réponse rapide.',
      sender_type: 'customer',
      created_at: new Date(Date.now() - 1800_000).toISOString(),
      leads: {
        professionals: {
          company_name: 'Maçonnerie Dupont & Fils',
        },
      },
    },
  ]

  test.beforeEach(async ({ page }) => {
    await mockMagicLink(page, TOKEN, MESSAGES)
  })

  test('affiche le nombre d\'artisans ayant pris contact', async ({ page }) => {
    await page.goto(`/mon-projet/${TOKEN}`)

    // 1 groupe = 1 artisan
    await expect(page.getByText(/1 artisan .* pris contact/i)).toBeVisible({ timeout: 10_000 })
  })

  test('affiche le nom de l\'entreprise et les messages', async ({ page }) => {
    await page.goto(`/mon-projet/${TOKEN}`)

    await expect(page.getByText('Maçonnerie Dupont & Fils')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/disponible pour votre projet/)).toBeVisible()
    await expect(page.getByText(/réponse rapide/)).toBeVisible()
  })

  test('l\'état vide "en cours de validation" n\'est PAS affiché quand il y a des messages', async ({ page }) => {
    await page.goto(`/mon-projet/${TOKEN}`)

    await expect(page.getByText(/en cours de validation/i)).not.toBeVisible({ timeout: 10_000 })
  })

  test('affiche le champ de réponse pour chaque thread', async ({ page }) => {
    await page.goto(`/mon-projet/${TOKEN}`)

    // Le champ de réponse est un input (placeholder "Votre réponse...")
    await expect(page.getByPlaceholder('Votre réponse...')).toBeVisible({ timeout: 10_000 })
  })
})
