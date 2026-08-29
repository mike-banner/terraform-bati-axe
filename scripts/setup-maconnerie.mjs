import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'https://bati-axe-production-ayo.pages.dev'
const EMAIL = 'maconnerie@test.fr'
const PASSWORD = 'password123'

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()

  console.log(`Navigation vers ${BASE}/pro/claim...`)
  await page.goto(`${BASE}/pro/claim`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('#auth-email', { timeout: 20000 })

  // Essayer de se connecter d'abord
  await page.fill('#auth-email', EMAIL)
  await page.fill('#auth-password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)

  const hasError = await page.getByText(/E-mail ou mot de passe incorrect/i).isVisible().catch(() => false)
  if (hasError) {
    console.log(`Connexion échouée pour ${EMAIL}. Bascule vers la création de compte...`)
    
    // Cliquer sur l'onglet "Créer mon compte" / "S'inscrire"
    const registerTab = page.locator('button, a').filter({ hasText: /Créer/i }).first()
    if (await registerTab.isVisible().catch(() => false)) {
      await registerTab.click()
      await page.waitForTimeout(1000)
    }

    const nameInput = page.locator('#auth-name, input[name="full_name"]')
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Pierre Dupont')
    }

    await page.fill('#auth-email', EMAIL)
    await page.fill('#auth-password', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(5000)

    console.log('Page URL après création :', page.url())
    console.log(`✅ Compte ${EMAIL} configuré avec le mot de passe ${PASSWORD}!`)
  } else {
    console.log(`✅ Connexion réussie pour ${EMAIL} sur ${BASE}! URL: ${page.url()}`)
  }

  await browser.close()
}

run().catch(console.error)
