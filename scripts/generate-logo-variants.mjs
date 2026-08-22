/**
 * Génère toutes les déclinaisons web du logo BÂTI-AXE à partir de
 * public/images/logo.png (source : fond blanc).
 *
 * Usage : node scripts/generate-logo-variants.mjs
 *
 * Sorties (dans public/) :
 *   images/logo-transparent.png  — logo détouré (fond transparent), recadré
 *   images/logo-light.png        — monochrome blanc (fonds sombres)
 *   images/logo-dark.png         — monochrome slate-900 (fonds clairs)
 *   favicon.ico                  — multi-tailles (16/32/48, PNG embarqués)
 *   favicon-16x16.png / favicon-32x32.png / favicon-48x48.png
 *   apple-touch-icon.png         — 180×180 fond blanc (iOS)
 *   icon-192.png / icon-512.png  — manifest PWA (fond transparent)
 *   og-image.png                 — 1200×630 carte de partage social
 */
import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const SRC = path.resolve('public/images/logo.png')
const OUT_DIR = path.resolve('public')
const IMG_DIR = path.join(OUT_DIR, 'images')

// Seuils de détection du fond blanc
const BG_MIN = 240        // canal minimal pour être considéré « blanc »
const BG_SPREAD = 12      // écart max entre canaux

const isBg = (r, g, b) => r >= BG_MIN && g >= BG_MIN && b >= BG_MIN && Math.max(r, g, b) - Math.min(r, g, b) <= BG_SPREAD

/** Détoure le fond blanc connecté aux bords (flood-fill) et adoucit les halos. */
async function makeTransparent() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const rgba = Buffer.alloc(width * height * 4)

  // Copie RGB → RGBA (alpha 255 partout)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = data[i * channels]
    rgba[i * 4 + 1] = data[i * channels + 1]
    rgba[i * 4 + 2] = data[i * channels + 2]
    rgba[i * 4 + 3] = 255
  }

  // Flood-fill depuis les bords : marque les pixels « blanc » connectés
  const removed = new Uint8Array(width * height)
  const stack = new Int32Array(width * height)
  let sp = 0
  const push = (x, y) => { if (x >= 0 && x < width && y >= 0 && y < height) stack[sp++] = y * width + x }

  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1) }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y) }

  while (sp > 0) {
    const idx = stack[--sp]
    if (removed[idx]) continue
    const r = data[idx * channels]
    const g = data[idx * channels + 1]
    const b = data[idx * channels + 2]
    if (!isBg(r, g, b)) continue
    removed[idx] = 1
    const x = idx % width
    const y = (idx - x) / width
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1)
  }

  // Applique alpha 0 aux pixels retirés + adoucit les halos blancs (voisins)
  const feathered = new Uint8Array(width * height)
  for (let idx = 0; idx < width * height; idx++) {
    if (removed[idx]) { rgba[idx * 4 + 3] = 0; continue }
    const x = idx % width
    const y = (idx - x) / width
    const around = [removed[idx - 1], removed[idx + 1], removed[idx - width], removed[idx + width]]
    if (around.includes(1)) feathered[idx] = 1
  }
  for (let idx = 0; idx < width * height; idx++) {
    if (!feathered[idx]) continue
    const r = data[idx * channels]
    const g = data[idx * channels + 1]
    const b = data[idx * channels + 2]
    // Plus le pixel est blanc, plus il s'estompe (supprime le liseré clair)
    const whiteness = Math.min(255 - r, 255 - g, 255 - b)
    rgba[idx * 4 + 3] = Math.max(0, Math.min(255, Math.round(255 - whiteness * 6)))
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } })
}

/** Monochrome : part du logo détouré, remplace la couleur des pixels opaques. */
async function recolor(transparent, target) {
  const img = await transparent.raw().toBuffer({ resolveWithObject: true })
  const { data, info } = img
  for (let i = 0; i < info.width * info.height; i++) {
    if (data[i * 4 + 3] > 0) {
      data[i * 4] = target[0]
      data[i * 4 + 1] = target[1]
      data[i * 4 + 2] = target[2]
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
}

async function main() {
  const transparent = await makeTransparent()
  const trimmed = transparent.trim()
  const meta = await trimmed.metadata()
  console.log(`Détourage OK — logo recadré : ${meta.width}×${meta.height}`)

  // ── Versions principales ──
  await trimmed.png().toFile(path.join(IMG_DIR, 'logo-transparent.png'))
  console.log('✓ images/logo-transparent.png')

  await (await recolor(trimmed, [255, 255, 255])).trim().png().toFile(path.join(IMG_DIR, 'logo-light.png'))
  console.log('✓ images/logo-light.png (blanc)')

  await (await recolor(trimmed, [15, 23, 42])).trim().png().toFile(path.join(IMG_DIR, 'logo-dark.png'))
  console.log('✓ images/logo-dark.png (slate-900)')

  // ── Favicons PNG ──
  const t = await trimmed.clone().png().toBuffer()
  const fav16 = (await sharp(t).resize(16, 16).png().toBuffer())
  const fav32 = (await sharp(t).resize(32, 32).png().toBuffer())
  const fav48 = (await sharp(t).resize(48, 48).png().toBuffer())
  await fs.writeFile(path.join(OUT_DIR, 'favicon-16x16.png'), fav16)
  await fs.writeFile(path.join(OUT_DIR, 'favicon-32x32.png'), fav32)
  await fs.writeFile(path.join(OUT_DIR, 'favicon-48x48.png'), fav48)
  console.log('✓ favicon-16x16.png / favicon-32x32.png / favicon-48x48.png')

  // ── favicon.ico (PNG embarqués : 16 / 32 / 48) ──
  const icons = [fav16, fav32, fav48]
  const sizes = [16, 32, 48]
  let offset = 6 + 16 * icons.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type: icon
  header.writeUInt16LE(icons.length, 4)
  const entries = []
  const blobs = []
  icons.forEach((png, i) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 0)
    entry.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 1)
    entry.writeUInt8(0, 2)     // palette
    entry.writeUInt8(0, 3)     // reserved
    entry.writeUInt16LE(1, 4)  // planes
    entry.writeUInt16LE(32, 6) // bpp
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    entries.push(entry)
    blobs.push(png)
  })
  await fs.writeFile(path.join(OUT_DIR, 'favicon.ico'), Buffer.concat([header, ...entries, ...blobs]))
  console.log('✓ favicon.ico (16/32/48)')

  // ── apple-touch-icon 180×180 (fond blanc, iOS) ──
  await sharp({ create: { width: 180, height: 180, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite([{ input: await sharp(t).resize(152, 152, { fit: 'contain' }).png().toBuffer() }])
    .png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png (180×180, fond blanc)')

  // ── Manifest PWA ──
  await sharp(t).resize(192, 192).png().toFile(path.join(OUT_DIR, 'icon-192.png'))
  await sharp(t).resize(512, 512).png().toFile(path.join(OUT_DIR, 'icon-512.png'))
  console.log('✓ icon-192.png / icon-512.png')

  // ── OG image 1200×630 (partage social) ──
  const ogLogo = await sharp(t).resize(560, 560, { fit: 'contain' }).png().toBuffer()
  const og = await sharp({ create: { width: 1200, height: 630, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } } })
    .composite([
      { input: ogLogo, left: (1200 - 560) / 2, top: (630 - 560) / 2 },
    ])
    .png().toFile(path.join(OUT_DIR, 'og-image.png'))
  console.log('✓ og-image.png (1200×630)')

  console.log('\nToutes les déclinaisons sont générées.')
}

main().catch((e) => { console.error(e); process.exit(1) })
