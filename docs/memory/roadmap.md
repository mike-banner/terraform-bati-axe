# 🗺️ FEUILLE DE ROUTE — BÂTI-AXE (Prototype-First)

> **Mode d'emploi** : Chaque tâche atomique se coche lors de sa fusion sur `main`. Toute phase terminée bascule dans `docs/memory/history/`.
> **Stratégie** : valider le prototype mono-ville (Carrières-sous-Poissy / 78) avant tout scale.

---

## Phase 0 — Foundations & Compliance
- **Statut** : Complété le 2026-06-03
- **Archive** : [20260603_PHASE_0_FOUNDATIONS.md](file:///home/mike/projects/bati-axe/docs/memory/history/20260603_PHASE_0_FOUNDATIONS.md)

---

## Phase 1 — Data Foundation & Capture publique mono-ville (1 sem)
*Objectif : tunnel de capture opérationnel sur la ville pilote.*

### 1.1 Schéma DB
- [ ] Création tables : `zones`, `prospects`, `professionals`, `consents`, `projects`, `leads`, `verifications`, `sms_logs`, `audit_logs`.
- [ ] RLS activé partout (voir DATABASE_MODEL.md).
- [ ] Seed `zones` : Carrières-sous-Poissy uniquement (`is_active = true`).

### 1.2 Vitrine publique mono-ville (Nuxt prerender)
- [ ] Layout `(public)` + landing minimal.
- [ ] Route `/simulateur` (tunnel 6 étapes, Pinia store + validation Zod).
- [ ] API `/api/projects` (Nitro) : validation serveur Zod + insertion Service Role.
- [ ] Mesure : event Sentry/Axiom à chaque étape du tunnel.

### 1.3 Pas encore d'annuaire public
- L'annuaire SEO `/[metier]/[ville]` est préparé en route mais désactivé tant que < 5 pros opt-in dans la zone.

---

## Phase 2 — Onboarding Pro & Vérification manuelle (1 sem)
*Objectif : 5 à 20 pros pilotes opérationnels, validés à la main.*

- [ ] Layout `(pro)` + middleware auth Supabase SSR.
- [ ] Flux signup pro + email confirmation.
- [ ] Flux Claim : recherche prospect → "C'est moi" → création compte → liaison.
- [ ] Upload Kbis + Décennale vers R2 via Presigned URLs (ADR-003).
- [ ] Console admin minimale : liste docs `Pending` + viewer PDF + bouton Approve/Reject.
- [ ] Journalisation `consents` (CGU acceptée, opt-in email, opt-in SMS séparé).

---

## Phase 3 — Le Verrou & Stripe Billing (1.5 sem)
*Objectif : monétisation opérationnelle.*

- [ ] API `/api/leads/[id]` avec floutage serveur (ADR-004) : retourne `***` si non-PREMIUM et < 24h.
- [ ] Page `/app/leads` (Nuxt SSR) listant les leads de la zone du pro.
- [ ] Stripe : produits + prix (PRO Mensuel), Checkout via API Nitro.
- [ ] Webhook Stripe `/api/stripe/webhook` (signature vérifiée) → maj `professionals.subscription_status`.
- [ ] Cron Supabase `pg_cron` : flag `leads.unlocked_at` à T+24h.
- [ ] Tests E2E parcours abonnement.

---

## Phase 4 — SMS Teasing avec opt-in vérifié (1 sem)
*Objectif : boucle de rétention conforme LCEN.*

- [ ] Matching géo simple : nouveau projet → pros de la même `zone_id` + métier compatible.
- [ ] Edge Function Supabase déclenchée à l'insertion projet.
- [ ] Filtre : envoi uniquement aux pros avec `consents.channel='sms' AND status='granted'`.
- [ ] Twilio : envoi immédiat PREMIUM, différé 30 min BASIC.
- [ ] Webhook Twilio STOP → bascule consent à `revoked`.
- [ ] `sms_logs` rempli systématiquement.

---

## Phase 5 — Validation business mono-ville (2-4 sem, pas de code nouveau)
*Objectif : mesurer avant de scaler.*

- [ ] Recrutement manuel des 20 pros pilotes (commercial, pas dev).
- [ ] Campagne Google Ads ciblée 78.
- [ ] Suivi KPIs : taux de conversion simulateur, claim rate, taux d'abonnement PRO, ouverture SMS.
- [ ] Critères de Go/No-Go pour Phase 6 : à définir avant Phase 5 (ex : >15% conversion simulateur, >3 pros payants).
- [ ] Retours utilisateurs : interviews pros + clients.

---

## Phase 6 — Scalabilité géographique (1.5 sem)
*Objectif : passer de 1 ville à N départements de manière outillée.*

- [ ] Activation des routes `/[metier]/[ville]` via génération depuis `zones` actives (prerender ISR/SWR Nuxt).
- [ ] Pipeline d'enrichissement `prospects` par lots (import CSV/JSON → table interne).
- [ ] Workflow d'opt-in email automatisé (Resend templates) avant publication.
- [ ] Console admin pour activer une zone (`zones.is_active = true`) + déclencher la campagne opt-in.
- [ ] Optimisation Core Web Vitals (cible Lighthouse > 95).
- [ ] Audit sécurité, audit RGPD, audit accessibilité.
- [ ] Go-live progressif : Yvelines (78) → Île-de-France → autres régions.

---

## Hors phases — Backlog
- API publique partenaires.
- App mobile (PWA d'abord).
- Vérification Kbis/Décennale auto (Sirene/Orias).
- Chat in-app.
- IA scoring leads.
