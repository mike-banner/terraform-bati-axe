# 🔍 Runbook P3 — Re-test Stripe + cron 72h en prod

> Objectif : prouver que le paywall fonctionne de bout en bout (checkout → webhook → activation → déblocage 72h), car il a déjà été découvert mort (404 silencieux). À faire **avant** tout lancement réel.

---

## 1. Prérequis (config prod)
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` posées en prod.
- [ ] `STRIPE_WEBHOOK_SECRET` posée **et** le webhook Stripe configuré sur l'URL de prod (`https://…/api/v1/stripe/webhook`).
- [ ] IDs des prix/plans alignés avec ceux référencés dans le code (checkout).

## 2. Test Checkout (côté pro)
- [ ] Se connecter en pro (ou créer un pro test) sur la prod.
- [ ] Depuis `/espace/premium`, lancer le checkout → la session Stripe s'ouvre.
- [ ] Payer avec une **carte test Stripe** (`4242 4242 4242 4242`).

## 3. Vérification Webhook → DB
- [ ] Dans Stripe Dashboard → Events : le `checkout.session.completed` est **livré avec succès** (pas d'erreur de signature/404).
- [ ] En DB : `professionals.subscription_status` = `active` ; `subscription_id` rempli.
- [ ] Le pro voit l'accès Premium immédiatement (coordonnées non floutées sur un lead < 72h).

## 4. Vérification cron 72h (déblocage gratuit)
- [ ] Vérifier que le job `pg_cron` existe en prod : `SELECT jobname, schedule FROM cron.job;` (attendu : bascule `leads.unlocked_at` à T+72h).
- [ ] Si absent : exécuter la migration qui le crée (Phase 4).
- [ ] Test : sur un lead **non débloqué**, forcer le test à T+72h (ou attendre) → `unlocked_at` se remplit → coordonnées visibles sans abonnement.

## 5. Cas d'échec connus (à vérifier)
- Webhook qui reçoit un 500/404 silencieux (le bug historique).
- `subscription_status` jamais mis à jour (mapping d'event manquant : `invoice.paid`, `customer.subscription.deleted`).
- Migration cron jamais poussée en prod (`cron` extension absente).

## 6. Sortie = SUCCESS si
Un abonnement test complet : facturé → `active` en DB → lead débloqué à T+72h, **sans intervention manuelle**.
