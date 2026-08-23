// Vérification du contenu réel de chaque onglet admin sur la prod
import { chromium } from 'playwright'

const BASE = 'https://bati-axe-production-ayo.pages.dev'
const PASSWORD = process.env.ADMIN_PASSWORD
if (!PASSWORD) { console.error('ADMIN_PASSWORD manquant'); process.exit(1) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)) })
page.on('pageerror', (e) => errors.push(`PAGE: ${e.message.slice(0, 150)}`))

const log = (ok, msg) => console.log(`${ok ? '✅' : '❌'} ${msg}`)

// Login
await page.goto(`${BASE}/pro/claim`, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForSelector('input[type="email"]', { timeout: 20000 })
await page.fill('input[type="email"]', 'admin@batiaxe.com')
await page.fill('input[type="password"]', PASSWORD)
await page.click('button[type="submit"]')
await page.waitForTimeout(4000)
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(4000)

// Mapping : onglet → indicateurs de contenu attendus
const checks = [
  { name: 'overview', label: /Vue d.ensemble/, indicators: ['professionnels', 'projets', 'leads'] },
  { name: 'pending', label: /En attente/, indicators: ['en attente', 'kbis', 'décennale'] },
  { name: 'all', label: /Tous les pros/, indicators: ['artisan', 'entreprise'] },
  { name: 'projects', label: /Projets/, indicators: ['projet'] },
  { name: 'realisations', label: /R.alisation/, indicators: ['réalisation', 'vitrine'] },
  { name: 'b2b', label: /Dossiers B2B/, indicators: ['b2b', 'dossier'] },
  { name: 'kpi', label: /KPIs/, indicators: ['kpi', 'lead', 'conversion', 'revenu'] },
  { name: 'documents', label: /Documents l.gaux/, indicators: ['mentions', 'cgv', 'politique'] },
  { name: 'journal', label: /Journal/, indicators: ['journal', 'action', 'audit'] },
]

for (const c of checks) {
  const link = page.locator('a, button').filter({ hasText: c.label }).first()
  if (!(await link.count())) { log(false, `${c.name} : lien introuvable`); continue }
  await link.click().catch(() => {})
  await page.waitForTimeout(3500)
  const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase()
  const errs = errors.splice(0)
  const found = c.indicators.filter((i) => body.includes(i))
  const empty = /aucun|vide|pas de /.test(body) && !/pas de problème/.test(body)
  log(found.length >= 1, `${c.name} : contenu détecté (${found.join(', ') || 'rien'})${empty ? ' — ⚠️ possible état vide' : ''}`)
  errs.forEach((e) => log(false, `  ⚠️ ${c.name} : ${e}`))
  // Dump court pour les onglets vides
  if (found.length === 0) {
    console.log(`    → extrait : ${body.slice(0, 250).replace(/\n/g, ' | ')}`)
  }
}

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
log(!overflow, overflow ? 'Débordement horizontal' : 'Pas de débordement horizontal')
await browser.close()
