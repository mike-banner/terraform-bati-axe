import { test, expect, type Page } from '@playwright/test'

// Tunnel 05.19 : Étape 1 catégorie → Étape 2 postes → ... → POST /api/v1/projects
// avec selected_category / selected_items.

async function gotoSimulateur(page: Page) {
  await page.goto('/simulateur', { waitUntil: 'networkidle' })
}

async function etapes3a5(page: Page) {
  await page.getByPlaceholder('50').fill('50')
  await page.getByRole('button', { name: 'Suivant' }).click()
  await page.getByRole('button', { name: /Standard/ }).click()
  await page.getByPlaceholder('78955').fill('78955')
  await page.getByRole('button', { name: 'Continuer' }).click()
}
const fork = (page: Page) => page.getByText('Connaissez-vous vos aides au financement ?')
const caseEnergie = (page: Page) => page.getByRole('checkbox', { name: /envisage aussi de la rénovation énergétique/ })
const poste = (page: Page, nom: string) => page.locator('label', { hasText: nom })

test.describe('Simulateur — tunnel catégorie puis postes', () => {
  test('étape 1 : 3 catégories proposées', async ({ page }) => {
    await gotoSimulateur(page)
    for (const nom of ['Rénovation Globale', 'Rénovation Énergétique', 'Prestations / Rénovation Ciblée']) {
      await expect(page.getByRole('radio', { name: nom })).toBeVisible()
    }
  })

  test('étape 2 : les postes sont filtrés par catégorie', async ({ page }) => {
    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Rénovation Énergétique' }).click()
    await expect(page.getByText('Pompe à chaleur')).toBeVisible()
    await expect(page.getByText('Panneaux solaires / photovoltaïque')).toBeVisible()
    await expect(page.getByText('Peinture et finitions')).toHaveCount(0)
  })

  test('étape 2 : alerte de coordination dès qu\'un poste réservé EGB est coché', async ({ page }) => {
    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Rénovation Énergétique' }).click()
    const alerte = page.getByText(/nécessitent une coordination/)
    const poste = (nom: string) => page.locator('label', { hasText: nom })
    await poste('Pompe à chaleur').click()
    await expect(alerte).toBeVisible()
    // un poste couvert par un spécialiste ne lève plus l'alerte
    await poste('Rénovation d’une chaudière').click()
    await expect(alerte).toBeVisible()
    await poste('Pompe à chaleur').click()
    await expect(alerte).toHaveCount(0)
    // démolition (Prestations ciblées) est aussi réservée EGB
    await page.getByRole('button', { name: 'Retour' }).click()
    await page.getByRole('radio', { name: 'Prestations / Rénovation Ciblée' }).click()
    await poste('Démolition').click()
    await expect(alerte).toBeVisible()
  })

  test('changer de catégorie réinitialise les postes', async ({ page }) => {
    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Prestations / Rénovation Ciblée' }).click()
    await page.getByText('Rénovation de cuisine').click()
    await page.getByRole('button', { name: 'Retour' }).click()
    await page.getByRole('radio', { name: 'Rénovation Globale' }).click()
    await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0)
  })

  test('soumission : le payload contient selected_category et selected_items', async ({ page }) => {
    let payload: any = null
    await page.route('**/api/v1/projects', route => {
      payload = route.request().postDataJSON()
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS', projectId: 'test-project-id', zoneName: 'Carrières-sous-Poissy', accessToken: 'tok' }),
      })
    })

    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Prestations / Rénovation Ciblée' }).click()
    await page.getByText('Rénovation de salle de bain').click()
    await page.getByText('Rénovation de cuisine').click()
    await page.getByRole('button', { name: 'Suivant' }).click()

    await etapes3a5(page)
    await expect(fork(page)).toHaveCount(0)

    await page.getByPlaceholder('Jean Dupont').fill('Marie Dupont')
    await page.locator('#c-email').fill('marie.dupont@test.com')
    await page.locator('#c-phone').fill('0612345678')
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: /Recevoir mon estimation gratuite/ }).click()

    await expect(page.getByText('test-project-id')).toBeVisible({ timeout: 10_000 })
    expect(payload.selected_category).toBe('prestations_ciblees')
    expect(payload.selected_items).toEqual(expect.arrayContaining(['salle_de_bain', 'cuisine']))
  })

  test('la carte Rénovation Énergétique n\'affiche pas la case', async ({ page }) => {
    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Rénovation Énergétique' }).click()
    await expect(caseEnergie(page)).toHaveCount(0)
  })

  test('la case révèle les postes énergétiques et les retire au décochage', async ({ page }) => {
    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Rénovation Globale' }).click()
    await expect(poste(page, 'Pompe à chaleur')).toHaveCount(0)
    await caseEnergie(page).check()
    await expect(poste(page, 'Pompe à chaleur')).toBeVisible()
    await poste(page, 'Pompe à chaleur').click()
    await poste(page, 'Peinture et finitions').click()
    await caseEnergie(page).uncheck()
    await expect(poste(page, 'Pompe à chaleur')).toHaveCount(0)
    await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(1)
  })

  test('fork présent avec la carte énergétique', async ({ page }) => {
    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Rénovation Énergétique' }).click()
    await poste(page, 'Rénovation d’une chaudière').click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await etapes3a5(page)
    await expect(fork(page)).toBeVisible()
  })

  test('fork absent avec la case cochée sans poste', async ({ page }) => {
    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Rénovation Globale' }).click()
    await poste(page, 'Peinture et finitions').click()
    await caseEnergie(page).check()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await etapes3a5(page)
    await page.getByRole('heading', { name: /Votre estimation est prête/ }).waitFor({ state: 'visible' })
    await expect(fork(page)).toHaveCount(0)
  })

  test('case + 1 poste : fork présent et payload', async ({ page }) => {
    let payload: any = null
    await page.route('**/api/v1/projects', route => {
      payload = route.request().postDataJSON()
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS', projectId: 'test-project-id', zoneName: 'Carrières-sous-Poissy', accessToken: 'tok' }),
      })
    })
    await gotoSimulateur(page)
    await page.getByRole('radio', { name: 'Prestations / Rénovation Ciblée' }).click()
    await poste(page, 'Rénovation de cuisine').click()
    await caseEnergie(page).check()
    await poste(page, 'Pompe à chaleur').click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await etapes3a5(page)
    await expect(fork(page)).toBeVisible()
    await page.getByRole('button', { name: /Non, voir mon estimation/ }).click()

    await page.getByPlaceholder('Jean Dupont').fill('Marie Dupont')
    await page.locator('#c-email').fill('marie.dupont@test.com')
    await page.locator('#c-phone').fill('0612345678')
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: /Recevoir mon estimation gratuite/ }).click()

    await expect(page.getByText('test-project-id')).toBeVisible({ timeout: 10_000 })
    expect(payload.selected_category).toBe('prestations_ciblees')
    expect(payload.selected_items).toEqual(expect.arrayContaining(['cuisine', 'pac']))
  })
})
