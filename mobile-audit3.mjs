import { chromium } from 'playwright';

const OUT = '/tmp/mobile-audit3';
import fs from 'fs';
fs.mkdirSync(OUT, { recursive: true });

async function login(page, email, password) {
  await page.goto('http://localhost:3000/pro/claim', { waitUntil: 'networkidle', timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.pathname.includes('/pro/claim'), { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  console.log('  logged in, now at', page.url());
}

async function checkOverflow(page) {
  return page.evaluate(() => {
    const d = document.documentElement.scrollWidth;
    const v = window.innerWidth;
    return { d, v, overflow: d > v + 2 };
  });
}

const browser = await chromium.launch({ channel: 'chrome' });

for (const w of [320, 390]) {
  console.log(`=== PRO @ ${w} ===`);
  const page = await browser.newPage({ viewport: { width: w, height: 844 } });
  await login(page, 'newtest@example.com', 'TestPhase9!');
  for (const [name, path] of [
    ['espace-leads', '/espace/leads'],
    ['espace-dashboard', '/espace/dashboard'],
    ['espace-premium', '/espace/premium'],
    ['espace-profil', '/espace/profil'],
    ['espace-messages', '/espace/messages'],
  ]) {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(500);
    const url = page.url();
    const o = await checkOverflow(page);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
    console.log(`${name}@${w}: url=${url} overflow=${o.overflow} (${o.d}/${o.v})`);
  }
  await page.close();
}

for (const w of [320, 390]) {
  console.log(`=== ADMIN @ ${w} ===`);
  const page = await browser.newPage({ viewport: { width: w, height: 844 } });
  await login(page, 'admin@batiaxe.com', 'TestPhase9!');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(800);
  const url = page.url();
  const o = await checkOverflow(page);
  await page.screenshot({ path: `${OUT}/admin-${w}.png`, fullPage: true });
  console.log(`admin@${w}: url=${url} overflow=${o.overflow} (${o.d}/${o.v})`);
  await page.close();
}

await browser.close();
console.log('DONE');
