import { test, expect, type Page } from '@playwright/test'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DESC = 'Refaire entièrement la toiture de la maison, tuiles à remplacer.'

async function gotoSimulateur(page: Page) {
  // networkidle garantit que Vue est hydraté et les event handlers attachés
  await page.goto('/simulateur', { waitUntil: 'networkidle' })
}

async function fillStep1(page: Page) {
  const btn = page.getByRole('button', { name: /Maçonnerie/i }).first()
  await btn.waitFor({ state: 'visible' })
  await btn.click()
  await page.locator('textarea').waitFor({ state: 'visible' })
}

async function fillStep2(page: Page) {
  await page.locator('textarea').fill(DESC)
  // Attendre que le bouton Continuer soit activé (description >= 20 chars)
  const continuer = page.getByRole('button', { name: 'Continuer' })
  await continuer.waitFor({ state: 'visible' })
  await continuer.click()
  // Attendre l'affichage de l'étape 3 (heading Budget estimé)
  await page.getByRole('heading', { name: 'Budget estimé' }).waitFor({ state: 'visible' })
}

async function fillStep3(page: Page) {
  await page.getByRole('button', { name: '5 000 € à 15 000 €' }).click()
  // Attendre l'étape 4 (heading Délai souhaité)
  await page.getByRole('heading', { name: 'Délai souhaité' }).waitFor({ state: 'visible' })
}

async function fillStep4(page: Page) {
  await page.getByRole('button', { name: /3 mois/ }).click()
  // Attendre l'étape 5 (code postal)
  await page.getByPlaceholder('78955').waitFor({ state: 'visible' })
}

// ─── Tests simulateur ─────────────────────────────────────────────────────────

test.describe('Simulateur — étape 5 localisation', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSimulateur(page)
    await fillStep1(page)
    await fillStep2(page)
    await fillStep3(page)
    await fillStep4(page)
    // On est maintenant à l'étape 5
  })

  test('zone valide 78955 — affiche "Zone éligible" et active Continuer', async ({ page }) => {
    const input = page.getByPlaceholder('78955')
    await input.fill('78955')

    await expect(page.getByText('Zone éligible')).toBeVisible()

    const continuerBtn = page.getByRole('button', { name: 'Continuer' })
    await expect(continuerBtn).toBeEnabled()
  })

  test('zone invalide 75001 — affiche "Zone non couverte" et désactive Continuer', async ({ page }) => {
    const input = page.getByPlaceholder('78955')
    await input.fill('75001')

    await expect(page.getByText('Zone non couverte')).toBeVisible()
    await expect(page.getByText(/limité à Carrières-sous-Poissy/)).toBeVisible()

    const continuerBtn = page.getByRole('button', { name: 'Continuer' })
    await expect(continuerBtn).toBeDisabled()
  })

  test('zone invalide — le bouton Continuer ne permet pas d\'avancer à l\'étape 6', async ({ page }) => {
    await page.getByPlaceholder('78955').fill('13001')

    const continuerBtn = page.getByRole('button', { name: 'Continuer' })
    await continuerBtn.click({ force: true }) // clic forcé sur bouton désactivé

    // On doit rester à l'étape 5
    await expect(page.getByText(/Où se situent les travaux/)).toBeVisible()
  })
})

test.describe('Simulateur — flux complet zone valide jusqu\'à confirmation', () => {
  test('soumission réussie → affiche l\'écran de confirmation', async ({ page }) => {
    // Intercepter le POST /api/v1/projects avant navigation
    await page.route('**/api/v1/projects', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'SUCCESS',
          projectId: 'test-project-id',
          zoneName: 'Carrières-sous-Poissy',
          accessToken: 'test-access-token',
        }),
      })
    })

    await gotoSimulateur(page)

    // Étape 1-4 via les helpers (incluent les waitFor nécessaires)
    await fillStep1(page)
    await fillStep2(page)
    await fillStep3(page)
    await fillStep4(page)

    // Étape 5 — code postal valide
    await page.getByPlaceholder('78955').fill('78955')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.getByPlaceholder('Jean Dupont').waitFor({ state: 'visible' })

    // Étape 6 — coordonnées (normalizePhone produit +33 6 12 34 56 78 qui passe la regex fixée)
    await page.getByPlaceholder('Jean Dupont').fill('Marie Dupont')
    await page.locator('#c-email').fill('marie.dupont@test.com')
    await page.locator('#c-phone').fill('0612345678')
    // Attendre que le bouton soit activé (validation phone passe avec regex fixée)
    await page.getByRole('button', { name: 'Continuer' }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.locator('input[type="checkbox"]').first().waitFor({ state: 'visible' })

    // Étape 7 — validation + CGU
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: /Envoyer mon projet/ }).click()

    // Écran de confirmation (étape 8) — "Projet enregistré."
    await expect(page.getByText('Projet enregistré.')).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Simulateur — navigation progressive', () => {
  test('étapes 1 à 4 progressent sans bouton Continuer', async ({ page }) => {
    await gotoSimulateur(page)

    // Étape 1
    await expect(page.getByText(/Étape 1/)).toBeVisible()
    await page.getByRole('button', { name: /Maçonnerie/i }).first().click()

    // Étape 2 apparaît
    await expect(page.getByText(/Étape 2/)).toBeVisible()
    await expect(page.getByPlaceholder(/Exemple : refaire/)).toBeVisible()

    await page.getByPlaceholder(/Exemple : refaire/).fill('Description de travaux suffisamment longue pour être valide.')
    await page.getByRole('button', { name: 'Continuer' }).click()

    // Étape 3
    await expect(page.getByText(/Étape 3/)).toBeVisible()
    await page.getByRole('button', { name: /5 000 € à 15 000 €/ }).click()

    // Étape 4
    await expect(page.getByText(/Étape 4/)).toBeVisible()
    await page.getByRole('button', { name: /3 mois/ }).click()

    // Étape 5
    await expect(page.getByText(/Étape 5/)).toBeVisible()
    await expect(page.getByPlaceholder('78955')).toBeVisible()
  })
})
