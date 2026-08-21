// ─────────────────────────────────────────────────────────────────────────────
// Reset admin — remplace l'admin par un compte générique.
//
// Crée (ou met à jour) le compte admin@batiaxe.com avec un mot de passe fixe
// + rôle admin. Peut aussi rétrograder/supprimer un ancien compte (optionnel).
//
// Usage (depuis la racine du projet) :
//   SUPABASE_URL="https://xxxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
//   ADMIN_PASSWORD="TonMotDePasse" \
//   node supabase/scripts/reset-admin.mjs
//
// Variables optionnelles :
//   ADMIN_EMAIL       (défaut : admin@batiaxe.com)
//   OLD_ADMIN_EMAIL   (ancien email à rétrograder — seulement si fourni)
//   DELETE_OLD=true   → supprime totalement l'ancien compte au lieu de le rétrograder.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.ADMIN_PASSWORD
const adminEmail = process.env.ADMIN_EMAIL || 'admin@batiaxe.com'
const oldEmail = process.env.OLD_ADMIN_EMAIL || ''
const deleteOld = process.env.DELETE_OLD === 'true'

function fail(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

if (!url) fail('SUPABASE_URL manquant (ex: https://xxxx.supabase.co).')
if (!key) fail('SUPABASE_SERVICE_ROLE_KEY manquant (Dashboard > Settings > API > service_role).')
if (!password || password.length < 8) fail('ADMIN_PASSWORD manquant ou trop court (8 caractères min).')

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1. Lister les utilisateurs pour retrouver les UUIDs
const { data: listing, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
if (listErr) fail(`Impossible de lister les utilisateurs : ${listErr.message}`)

const users = listing.users
const existingAdmin = users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase())

// 2. Créer ou mettre à jour le compte admin générique
if (existingAdmin) {
  const { error: updErr } = await supabase.auth.admin.updateUserById(existingAdmin.id, {
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  })
  if (updErr) fail(`Mise à jour de ${adminEmail} impossible : ${updErr.message}`)
  console.log(`✅ ${adminEmail} existe déjà → mot de passe + rôle admin mis à jour.`)
} else {
  const { error: createErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  })
  if (createErr) fail(`Création de ${adminEmail} impossible : ${createErr.message}`)
  console.log(`✅ ${adminEmail} créé avec le rôle admin (email confirmé).`)
}

// 3. Rétrograder (ou supprimer) l'ancien compte — seulement si fourni
if (oldEmail) {
  const oldUser = users.find((u) => u.email?.toLowerCase() === oldEmail.toLowerCase())
  if (oldUser) {
    if (deleteOld) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(oldUser.id)
      if (delErr) fail(`Suppression de ${oldEmail} impossible : ${delErr.message}`)
      console.log(`🗑️  ${oldEmail} supprimé définitivement.`)
    } else {
      const { error: demErr } = await supabase.rpc('revoke_admin', { target_email: oldEmail })
      if (demErr) fail(`Rétrogradation de ${oldEmail} impossible : ${demErr.message}`)
      console.log(`🔒 ${oldEmail} rétrogradé (rôle admin retiré).`)
    }
  } else {
    console.log(`ℹ️  ${oldEmail} introuvable — rien à rétrograder.`)
  }
}

console.log(`
──────────────────────────────────────────────
Connexion admin :
  email    : ${adminEmail}
  mot de passe : (celui passé en ADMIN_PASSWORD)
  url      : ${url.replace(/\/$/, '')}/admin
──────────────────────────────────────────────
`)
