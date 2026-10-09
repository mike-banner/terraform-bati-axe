import { test, expect, type Page } from '@playwright/test'

// Tunnel 05.19 : Étape 1 catégorie → Étape 2 postes → ... → POST /api/v1/projects
// avec selected_category / selected_items.

async function gotoSimulateur(page: Page) {
  await page.goto('/simulateur', { waitUntil: 'networkidle' })
}

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

    await page.getByPlaceholder('50').fill('50')
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: /Standard/ }).click()
    await page.getByPlaceholder('78955').fill('78955')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await page.getByRole('button', { name: /Non, voir mon estimation/ }).click()

    await page.getByPlaceholder('Jean Dupont').fill('Marie Dupont')
    await page.locator('#c-email').fill('marie.dupont@test.com')
    await page.locator('#c-phone').fill('0612345678')
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: /Recevoir mon estimation gratuite/ }).click()

    await expect(page.getByText('test-project-id')).toBeVisible({ timeout: 10_000 })
    expect(payload.selected_category).toBe('prestations_ciblees')
    expect(payload.selected_items).toEqual(expect.arrayContaining(['salle_de_bain', 'cuisine']))
  })
})
