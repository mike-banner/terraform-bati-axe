import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
const page = await ctx.newPage()
const PAGES = ['/', '/simulateur', '/partenaires', '/b2b/partenaires']
for (const path of PAGES) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 30000 })
  const small = await page.evaluate(() => {
    const MIN = 44
    return [...document.querySelectorAll('button, a, input, select, [role="button"]')]
      .filter(el => {
        const r = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        const vis = r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        return vis && (r.height < MIN || r.width < MIN) && el.closest('header, nav, main, footer')
      })
      .map(el => ({ tag: el.tagName.toLowerCase(), txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width) }))
      .slice(0, 10)
  })
  console.log(`[${path}] cibles < 44px: ${small.length ? '' : 'aucune ✅'}`)
  small.forEach(s => console.log(`    ↳ <${s.tag}> "${s.txt}" h=${s.h} w=${s.w}`))
}
await browser.close()
