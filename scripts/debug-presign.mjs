import { chromium } from 'playwright'

const BASE = 'https://bati-axe-production-ayo.pages.dev'

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()

  page.on('console', msg => console.log('[BROWSER]', msg.text()))
  page.on('requestfailed', req => console.log('❌ FAILED REQ:', req.url(), req.failure()?.errorText))

  console.log(`Connexion sur ${BASE}/pro/claim...`)
  await page.goto(`${BASE}/pro/claim`, { waitUntil: 'networkidle' })

  await page.fill('#auth-email', 'maconnerie@test.fr')
  await page.fill('#auth-password', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)

  console.log('URL après login:', page.url())

  // Appeler l'API presign directement depuis le navigateur authentifié
  const presignResult = await page.evaluate(async () => {
    const res = await fetch('/api/v1/pro/documents/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_type: 'kbis',
        content_type: 'application/pdf',
        filename: 'kbis.pdf'
      })
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  })

  console.log('=== RESULTAT PRESIGN API ===')
  console.log(JSON.stringify(presignResult, null, 2))

  await browser.close()
}

run().catch(console.error)
