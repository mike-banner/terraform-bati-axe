// Audit mobile : débordement horizontal + viewport sur les pages publiques clés.
import { chromium } from '@playwright/test'
const VIEWPORTS = [
  { name: 'mobile-xs', width: 320, height: 640 },   // iPhone SE 1re gen / petits
  { name: 'mobile-md', width: 390, height: 844 },   // iPhone 12-14
]
const PAGES = ['/', '/simulateur', '/partenaires', '/b2b/partenaires']

const browser = await chromium.launch({ channel: 'chrome' })
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: true })
  const page = await ctx.newPage()
  for (const path of PAGES) {
    try {
      await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 30000 })
    } catch { await page.goto(`http://localhost:3000${path}`, { waitUntil: 'load', timeout: 30000 }) }
    const r = await page.evaluate(() => {
      const doc = document.documentElement
      const offenders = [...document.querySelectorAll('body *')]
        .filter(el => {
          const rect = el.getBoundingClientRect()
          return rect.right > doc.clientWidth + 1 || rect.left < -1
        })
        .map(el => ({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 80), right: Math.round(el.getBoundingClientRect().right), left: Math.round(el.getBoundingClientRect().left) }))
        .slice(0, 6)
      return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, overflow: doc.scrollWidth > doc.clientWidth + 1, offenders }
    })
    console.log(`[${vp.name}] ${path} → scrollW=${r.scrollW} clientW=${r.clientW} overflow=${r.overflow ? '❌ OUI' : '✅ non'}`)
    if (r.overflow) r.offenders.forEach(o => console.log(`    ↳ <${o.tag}> ${o.cls} left=${o.left} right=${o.right}`))
  }
  await ctx.close()
}
await browser.close()
