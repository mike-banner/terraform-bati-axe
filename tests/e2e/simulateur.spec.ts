import { test, expect, type Page } from '@playwright/test'

// ─── Helpers (flux actuel 6 étapes, cf. simulateur.vue) ───────────────────────
// Étape 1 : type de rénovation (auto-advance)
// Étape 2 : pièces concernées (sautée pour « Rénovation totale »)
// Étape 3 : surface (bouton « Suivant »)
// Étape 4 : niveau de prestation / gamme (auto-advance)
// Étape 5 : localisation (bouton « Continuer ») → fork aides
// Étape 6 : coordonnées + CGU → submit

const DESC = 'Refaire entièrement la toiture de la maison, tuiles à remplacer.'

async function gotoSimulateur(page: Page) {
  // networkidle garantit que Vue est hydraté et les event handlers attachés
  await page.goto('/simulateur', { waitUntil: 'networkidle' })
}

async function fillRenovationTotale(page: Page) {
  // Étape 1 → auto-advance directe vers l'étape 3 (pièces sautées pour « totale »)
  await page.getByRole('button', { name: /Rénovation totale/i }).click()
  await page.getByRole('heading', { name: 'Quelle surface au total ?' }).waitFor({ state: 'visible' })
}

async function fillSurface(page: Page, m2 = '50') {
  // Étape 3
  await page.getByPlaceholder('50').fill(m2)
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('heading', { name: 'Quel niveau de prestation ?' }).waitFor({ state: 'visible' })
}

async function fillGamme(page: Page) {
  // Étape 4 → auto-advance vers l'étape 5
  await page.getByRole('button', { name: /Standard/ }).click()
  await page.getByRole('heading', { name: 'Où se situe le chantier ?' }).waitFor({ state: 'visible' })
}

async function skipAidesFork(page: Page) {
  // Après l'étape 5, fork aides → on choisit « Non, voir mon estimation »
  await page.getByRole('button', { name: /Non, voir mon estimation/ }).click()
  await page.getByRole('heading', { name: /Votre estimation est prête/ }).waitFor({ state: 'visible' })
}

async function goToStep5(page: Page) {
  await gotoSimulateur(page)
  await fillRenovationTotale(page)
  await fillSurface(page)
  await fillGamme(page)
  // Étape 5 : localisation
}

// ─── Tests simulateur ─────────────────────────────────────────────────────────

test.describe('Simulateur — étape 5 localisation', () => {
  test.beforeEach(async ({ page }) => {
    await goToStep5(page)
  })

  test('zone valide 78955 — affiche "Zone éligible" et active Continuer', async ({ page }) => {
    const input = page.getByPlaceholder('78955')
    await input.fill('78955')

    await expect(page.getByText('Zone éligible')).toBeVisible()

    const continuerBtn = page.getByRole('button', { name: 'Continuer' })
    await expect(continuerBtn).toBeEnabled()
  })

  test('zone invalide 75001 — affiche "zone non couverte" et désactive Continuer', async ({ page }) => {
    const input = page.getByPlaceholder('78955')
    await input.fill('75001')

    await expect(page.getByText(/n'est pas encore couverte/)).toBeVisible()
    await expect(page.getByText(/nous vous recontactons dès l'ouverture/)).toBeVisible()

    const continuerBtn = page.getByRole('button', { name: 'Continuer' })
    await expect(continuerBtn).toBeDisabled()
  })

  test('zone invalide — le bouton Continuer ne permet pas d\'avancer', async ({ page }) => {
    await page.getByPlaceholder('78955').fill('13001')

    const continuerBtn = page.getByRole('button', { name: 'Continuer' })
    await continuerBtn.click({ force: true }) // clic forcé sur bouton désactivé

    // On doit rester à l'étape 5
    await expect(page.getByText(/Où se situe le chantier/)).toBeVisible()
  })
})

test.describe('Simulateur — flux complet zone valide jusqu\'à confirmation', () => {
  test('soumission réussie → révèle l\'estimation', async ({ page }) => {
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
    await fillRenovationTotale(page)
    await fillSurface(page)
    await fillGamme(page)

    // Étape 5 — code postal valide → fork aides → étape 6
    await page.getByPlaceholder('78955').fill('78955')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await skipAidesFork(page)

    // Étape 6 — coordonnées (normalizePhone produit +33 6 12 34 56 78 qui passe la regex fixée)
    await page.getByPlaceholder('Jean Dupont').fill('Marie Dupont')
    await page.locator('#c-email').fill('marie.dupont@test.com')
    await page.locator('#c-phone').fill('0612345678')
    await page.locator('input[type="checkbox"]').first().check()

    // Le bouton submit ne s'active qu'une fois le formulaire valide
    const submitBtn = page.getByRole('button', { name: /Recevoir mon estimation gratuite/ })
    await submitBtn.waitFor({ state: 'visible' })
    await submitBtn.click()

    // Écran de révélation — "Votre estimation"
    await expect(page.getByText('Votre estimation')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('test-project-id')).toBeVisible()
  })
})

test.describe('Simulateur — navigation progressive', () => {
  test('étapes 1 et 4 auto-advance, étapes 3/5 via bouton', async ({ page }) => {
    await gotoSimulateur(page)

    // Étape 1 : pas de bouton Suivant/Continuer, juste "Sélectionnez une option"
    await expect(page.getByText(/Étape 1/)).toBeVisible()
    await expect(page.getByText('Sélectionnez une option')).toBeVisible()

    // Clic → auto-advance (pièces sautées pour « totale ») → étape 3
    await page.getByRole('button', { name: /Rénovation totale/i }).click()
    await expect(page.getByText(/Étape 3/)).toBeVisible()
    await page.getByPlaceholder('50').fill('50')
    await page.getByRole('button', { name: 'Suivant' }).click()

    // Étape 4 : pas de bouton Suivant, auto-advance au clic → étape 5
    await expect(page.getByText(/Étape 4/)).toBeVisible()
    await page.getByRole('button', { name: /Standard/ }).click()
    await expect(page.getByText(/Étape 5/)).toBeVisible()
    await expect(page.getByPlaceholder('78955')).toBeVisible()
  })

  test('parcours "Pièce par pièce" — l\'étape 2 pièces s\'affiche et valide', async ({ page }) => {
    await gotoSimulateur(page)

    await page.getByRole('button', { name: /Pièce par pièce/i }).click()
    await expect(page.getByText(/Étape 2/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quelles pièces sont concernées ?' })).toBeVisible()

    // Le bouton Suivant est désactivé tant qu'aucune pièce n'est choisie
    const suivant = page.getByRole('button', { name: 'Suivant' })
    await expect(suivant).toBeDisabled()

    await page.getByRole('button', { name: /Cuisine/ }).click()
    await expect(suivant).toBeEnabled()
    await suivant.click()

    await expect(page.getByText(/Étape 3/)).toBeVisible()
  })
})
