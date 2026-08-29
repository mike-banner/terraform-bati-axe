// ─────────────────────────────────────────────────────────────────────────────
// Script d'export automatique des Secrets (DEV Perso & PROD Client) vers GitHub Actions
//
// Usage : node scripts/push-github-secrets.mjs
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs'
import { execSync } from 'node:child_process'

const envPath = '.env'
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env introuvable.')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const lines = envContent.split('\n')

const envVars = {}

for (const line of lines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const equalIdx = trimmed.indexOf('=')
  if (equalIdx > 0) {
    const key = trimmed.slice(0, equalIdx).trim()
    let value = trimmed.slice(equalIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key] = value
  }
}

const secretsToPush = []

function addSecret(targetName, value) {
  if (!value || value.startsWith('remplir_ici_')) {
    return
  }
  secretsToPush.push({ name: targetName, value })
}

// 1. PROD_ variables pour le compte Cloudflare du Client
for (const [key, value] of Object.entries(envVars)) {
  if (key.startsWith('PROD_')) {
    // Ex: PROD_TF_VAR_CLOUDFLARE_ACCOUNT_ID -> PROD_CLOUDFLARE_ACCOUNT_ID et TF_VAR_CLOUDFLARE_ACCOUNT_ID
    const targetName = key.replace(/^PROD_/, '')
    addSecret(key, value)
    addSecret(targetName, value)
  }
}

// 2. DEV_ variables pour ton compte Cloudflare Perso
for (const [key, value] of Object.entries(envVars)) {
  if (key.startsWith('DEV_')) {
    addSecret(key, value)
  }
}

// 3. Stripe Smart Resolution
const isLiveFilled = envVars['CLIENT_STRIPE_LIVE_SECRET_KEY'] && !envVars['CLIENT_STRIPE_LIVE_SECRET_KEY'].startsWith('remplir_ici_')

if (isLiveFilled) {
  console.log('💳 Mode Stripe Détecté : PROD LIVE')
  addSecret('TF_VAR_STRIPE_SECRET_KEY', envVars['CLIENT_STRIPE_LIVE_SECRET_KEY'])
  addSecret('TF_VAR_STRIPE_PRICE_ID', envVars['CLIENT_STRIPE_LIVE_PRICE_ID'])
  addSecret('TF_VAR_STRIPE_WEBHOOK_SECRET', envVars['CLIENT_STRIPE_LIVE_WEBHOOK_SECRET'])
} else if (envVars['CLIENT_STRIPE_TEST_SECRET_KEY']) {
  console.log('💳 Mode Stripe Détecté : TEST')
  addSecret('TF_VAR_STRIPE_SECRET_KEY', envVars['CLIENT_STRIPE_TEST_SECRET_KEY'])
  addSecret('TF_VAR_STRIPE_PRICE_ID', envVars['CLIENT_STRIPE_TEST_PRICE_ID'])
  addSecret('TF_VAR_STRIPE_WEBHOOK_SECRET', envVars['CLIENT_STRIPE_TEST_WEBHOOK_SECRET'])
}

if (secretsToPush.length === 0) {
  console.log('\nℹ️  Aucun secret client rempli à envoyer. Remplis la SECTION 2 de ton .env et relance le script.\n')
  process.exit(0)
}

console.log(`\n🚀 Envoi de ${secretsToPush.length} secrets vers GitHub Actions...\n`)

let successCount = 0
for (const secret of secretsToPush) {
  try {
    execSync(`gh secret set "${secret.name}" --body "${secret.value.replace(/"/g, '\\"')}"`, { stdio: 'inherit' })
    console.log(`✅ Secret ${secret.name} poussé sur GitHub !`)
    successCount++
  } catch (err) {
    console.error(`❌ Échec d'envoi pour ${secret.name} : ${err.message}`)
  }
}

console.log(`\n🎉 Bilan : ${successCount}/${secretsToPush.length} secrets configurés sur GitHub avec succès !\n`)
