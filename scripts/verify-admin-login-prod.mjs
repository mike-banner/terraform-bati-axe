// Vérification finale : login admin sur la prod → redirection auto vers /admin
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'https://bati-axe-production-ayo.pages.dev'
const PASSWORD = process.env.ADMIN_PASSWORD
if (!PASSWORD) { console.error('ADMIN_PASSWORD manquant'); process.exit(1) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()

await page.goto(`${BASE}/pro/claim`, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForSelector('#auth-email', { timeout: 20000 })
await page.fill('#auth-email', 'admin@batiaxe.com')
await page.fill('#auth-password', PASSWORD)
await page.click('button[type="submit"]')

// Le fix : redirection auto sans reload
await page.waitForURL('**/admin**', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(3000)
const url = page.url()
console.log('URL après submit →', url)
console.log(url.includes('/admin') ? '✅ FIX EN PROD : redirection auto vers /admin' : '❌ Pas de redirection (déploiement pas encore actif ?)')
await browser.close()
