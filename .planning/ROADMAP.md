# Roadmap: BÂTI-AXE

## Overview
Roadmap alignée sur la stratégie prototype-first mono-ville (Carrières-sous-Poissy / 78). Chaque phase livre une capacité vérifiable et autonome. La Phase 5 est une validation business sans code nouveau — elle conditionne le scale géographique.

## Phases

- [x] **Phase 1: Foundations & Compliance** - Nuxt 3, Supabase CLI local, Cloudflare Pages, pages légales, middleware sécurité.
- [x] **Phase 2: Data Foundation & Capture mono-ville** - Schéma DB, seed zone pilote, vitrine landing SEO, simulateur de capture 6 étapes.
- [ ] **Phase 3: Onboarding Pro & Vérification manuelle** - Auth Supabase, flux Claim, upload R2, console admin validation docs, consents RGPD/LCEN.
- [ ] **Phase 4: Le Verrou & Stripe Billing** - API floutage serveur, abonnement Stripe, webhook, déblocage auto 24h.
- [ ] **Phase 5: SMS Teasing avec opt-in vérifié** - Matching géo, envoi SMS Twilio (instantané Premium / différé Basic), webhook STOP.

## Phase Details

### Phase 1: Foundations & Compliance
**Goal**: Socle technique et juridique fonctionnel avant toute ligne de code produit.
**Depends on**: Nothing
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, LEGAL-01, LEGAL-02
**Success Criteria** (what must be TRUE):
  1. `npm run dev` démarre un projet Nuxt 3 vide connecté à Supabase local (Docker).
  2. Un push sur `development` déclenche un déploiement Cloudflare Pages Preview fonctionnel.
  3. Les pages mentions légales, politique de confidentialité et CGU sont accessibles sur `/legal/*`.
  4. Le middleware Nitro injecte les security headers et le healthcheck `/api/v1/health` répond 200.
**Plans**: Completed
**UI hint**: yes

### Phase 2: Data Foundation & Capture mono-ville
**Goal**: Tunnel de capture opérationnel permettant à un particulier de Carrières-sous-Poissy de déposer un projet.
**Depends on**: Phase 1
**Requirements**: CPTR-01, CPTR-02, CPTR-03, CPTR-04, CPTR-05
**Success Criteria** (what must be TRUE):
  1. Les tables `zones`, `prospects`, `professionals`, `consents`, `projects`, `leads`, `verifications` existent avec RLS actif.
  2. La zone Carrières-sous-Poissy is seedée et active.
  3. Le simulateur Nuxt en 6 étapes permet à un particulier de déposer un projet sans créer de compte.
  4. Le projet est enregistré en DB via l'API Nitro `/api/v1/projects` avec validation Zod.
**Plans**: Completed
**UI hint**: yes

### Phase 3: Onboarding Pro & Vérification manuelle
**Goal**: 5 à 20 pros pilotes opérationnels, vérifiés manuellement, avec profils publics accessibles via URL hybride.
**Depends on**: Phase 2
**Requirements**: CLM-01, CLM-02, CLM-03, CLM-04, SMS-03, ADM-01
**Success Criteria** (what must be TRUE):
  1. Un professionnel peut créer un compte via Supabase Auth et revendiquer un profil prospect existant.
  2. Le pro peut charger son Kbis et sa décennale sur R2 via presigned URLs depuis `/pro/claim`.
  3. Le profil public est accessible via `/pro/{dept}/{slug}-{short_id}` avec redirect 301 si slug obsolète (ADR-009).
  4. L'administrateur peut valider ou rejeter les documents depuis la console admin et basculer `decennal_status`.
  5. Le consentement SMS est collecté via case à cocher distincte et journalisé dans `consents`.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Le Verrou & Stripe Billing
**Goal**: Monétisation opérationnelle — les coordonnées du prospect sont floutées par défaut et débloquées par abonnement ou après 24h.
**Depends on**: Phase 3
**Requirements**: LCK-01, LCK-02, LCK-03
**Success Criteria** (what must be TRUE):
  1. L'API `/api/v1/leads` retourne les coordonnées client masquées (`***`) si le pro n'est pas Premium ET le lead a moins de 24h.
  2. Un pro peut s'abonner via Stripe Checkout et accéder immédiatement aux coordonnées non floutées.
  3. Le webhook Stripe met à jour `professionals.subscription_status` de manière fiable.
  4. Un cron `pg_cron` bascule `leads.unlocked_at` à T+24h pour le déblocage gratuit automatique.
**Plans**: TBD

### Phase 5: SMS Teasing avec opt-in vérifié
**Goal**: Boucle de rétention conforme LCEN — les pros avec opt-in SMS sont notifiés lors d'un nouveau projet dans leur zone.
**Depends on**: Phase 4
**Requirements**: SMS-01, SMS-02, ADM-02, ADM-03
**Success Criteria** (what must be TRUE):
  1. Un nouveau projet déclenche un SMS instantané aux pros Premium de la zone avec opt-in SMS.
  2. Les pros Basic reçoivent le même SMS avec un délai de 30 minutes.
  3. Le mot-clé STOP via webhook Twilio bascule le consent en `revoked` et stoppe les envois.
  4. L'administrateur dispose d'un tableau de modération des leads et d'un rapport de performance SMS (taux d'ouverture vs clic).
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|---|---|---|---|
| 1. Foundations & Compliance | 1/1 | Completed | 2026-06-03 |
| 2. Data Foundation & Capture mono-ville | 1/1 | Completed | 2026-06-03 |
| 3. Onboarding Pro & Vérification manuelle | 0/1 | Not started | - |
| 4. Le Verrou & Stripe Billing | 0/1 | Not started | - |
| 5. SMS Teasing avec opt-in vérifié | 0/1 | Not started | - |
