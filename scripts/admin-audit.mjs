// Audit e2e de la console admin sur la prod — login puis navigation manuelle vers /admin
// Usage : ADMIN_EMAIL=admin@batiaxe.com ADMIN_PASSWORD=*** node scripts/admin-audit.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'https://bati-axe-production-ayo.pages.dev'
const EMAIL = process.env.ADMIN_EMAIL || 'admin@batiaxe.com'
const PASSWORD = process.env.ADMIN_PASSWORD
if (!PASSWORD) {
  console.error('❌ ADMIN_PASSWORD manquant')
  process.exit(1)
}

const results = []
const consoleErrors = []

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`[console] ${msg.text().slice(0, 200)}`)
})
page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message.slice(0, 200)}`))

const log = (ok, msg) => {
  results.push({ ok, msg })
  console.log(`${ok ? '✅' : '❌'} ${msg}`)
}

try {
  // ─── Login ─────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/pro/claim`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('input[type="email"]', { timeout: 20000 })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(4000)

  // Le navigateTo('/admin') post-login ne se déclenche pas (bug connu) → navigation manuelle
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(4000)

  const onAdmin = page.url().includes('/admin')
  log(onAdmin, `Login → navigation /admin OK (${page.url()})`)
  if (!onAdmin) throw new Error('Navigation /admin impossible après login')

  const denied = await page.getByText('Accès réservé').isVisible().catch(() => false)
  log(!denied, denied ? '⚠️ Page affiche « Accès réservé » (compte non admin)' : 'Accès admin confirmé')

  // ─── Les 9 onglets : la nav est dans la sidebar (liens) ────────────────────
  const tabSpecs = [
    { name: 'overview',     label: 'Vue d' },
    { name: 'pending',      label: 'En attente' },
    { name: 'all',          label: 'Tous les pros' },
    { name: 'projects',     label: 'Projets' },
    { name: 'realisations', label: 'Réalisations' },
    { name: 'b2b',          label: 'Dossiers B2B' },
    { name: 'kpi',          label: 'KPIs' },
    { name: 'documents',    label: 'Documents' },
    { name: 'audit',        label: 'Audit' },
  ]

  for (const tab of tabSpecs) {
    const link = page.locator('a, button, [role="tab"]').filter({ hasText: new RegExp(tab.label, 'i') }).first()
    const count = await link.count().catch(() => 0)
    if (count === 0) {
      log(false, `Onglet ${tab.name} (${tab.label}) introuvable`)
      continue
    }
    await link.click().catch(() => {})
    await page.waitForTimeout(3000)
    const errs = consoleErrors.splice(0)
    const banner = await page.locator('[role="alert"]').first().isVisible().catch(() => false)
    if (banner) {
      const txt = await page.locator('[role="alert"]').first().innerText().catch(() => '')
      log(false, `Onglet ${tab.name} : bannière d'erreur → ${txt.slice(0, 120)}`)
    } else {
      log(true, `Onglet ${tab.name} chargé sans erreur`)
    }
    errs.forEach((e) => log(false, `  ⚠️ ${tab.name} : ${e}`))
  }

  // ─── Vérifs transverses ────────────────────────────────────────────────────
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  log(!overflow, overflow ? '⚠️ Débordement horizontal détecté' : 'Pas de débordement horizontal')

  // ─── API admin (avec session cookie) ───────────────────────────────────────
  const apiChecks = [
    ['/api/v1/admin/overview', 'Overview'],
    ['/api/v1/admin/queue', 'Queue'],
    ['/api/v1/admin/projects', 'Projects'],
    ['/api/v1/admin/realisations', 'Réalisations'],
    ['/api/v1/admin/kpi-engine', 'KPI'],
    ['/api/v1/admin/audit-logs', 'Audit logs'],
    ['/api/v1/admin/b2b-requests', 'B2B'],
    ['/api/v1/admin/paywall-analytics', 'Paywall'],
  ]
  for (const [path, label] of apiChecks) {
    const res = await page.evaluate(async (p) => {
      const r = await fetch(p).catch(() => null)
      if (!r) return null
      let body = null
      try { body = await r.clone().json() } catch { /* ignore */ }
      return { status: r.status, isError: body?.error === true, message: body?.statusMessage || body?.message }
    }, path)
    if (!res) log(false, `API ${label} : requête impossible`)
    else if (res.status === 401 || res.status === 403) log(false, `API ${label} (${path}) : ${res.status} — session non reconnue`)
    else if (res.isError) log(false, `API ${label} (${path}) : HTTP ${res.status} mais error=true → ${res.message}`)
    else log(true, `API ${label} (${path}) : ${res.status}`)
  }

  const remaining = consoleErrors.splice(0)
  remaining.forEach((e) => log(false, `⚠️ Erreurs console résiduelles : ${e}`))
} catch (err) {
  log(false, `Exception : ${err.message.slice(0, 300)}`)
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n━━━ BILAN : ${results.length - failed}/${results.length} OK — ${failed} point(s) d'attention ━━━`)
