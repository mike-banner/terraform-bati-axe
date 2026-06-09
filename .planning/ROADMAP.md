# Roadmap: BÂTI-AXE

## Overview
Roadmap alignée sur la stratégie prototype-first mono-ville (Carrières-sous-Poissy / 78). Chaque phase livre une capacité vérifiable et autonome. La Phase 5 est une validation business sans code nouveau — elle conditionne le scale géographique.

## Phases

- [x] **Phase 1: Foundations & Compliance** - Nuxt 3, Supabase CLI local, Cloudflare Pages, pages légales, middleware sécurité.
- [x] **Phase 2: Data Foundation & Capture mono-ville** - Schéma DB, seed zone pilote, vitrine landing SEO, simulateur de capture 6 étapes.
- [x] **Phase 3: Onboarding Pro & Vérification manuelle** - Auth Supabase, flux Claim, upload R2, console admin validation docs, consents RGPD/LCEN.
- [x] **Phase 4: Le Verrou & Stripe Billing** - API floutage serveur, abonnement Stripe, webhook, déblocage auto 72h.
- [ ] **Phase 4.5: Conversion & Qualification** - Verrou 3 leads gratuits, free trial 14j, plan annuel, auto-qualification, profil public éditable, ROI dashboard, copy Premium refondu.
- [ ] **Phase 5: SMS + Acquisition + Messagerie** - SMS différencié (Basic→upgrade / Premium→lead direct), cold outreach pros DB, dashboard particulier magic-link, messagerie in-app pro↔particulier, email onboarding (désactivé par défaut), feedback loop lead.
- [ ] **Phase 6: Réputation & Scale** - Avis clients, referral program, multi-ville.

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
**Plans**: Completed
**UI hint**: yes

### Phase 4: Le Verrou & Stripe Billing
**Goal**: Monétisation opérationnelle — les coordonnées du prospect sont floutées par défaut et débloquées par abonnement ou après 72h.
**Depends on**: Phase 3
**Requirements**: LCK-01, LCK-02, LCK-03
**Success Criteria** (what must be TRUE):
  1. L'API `/api/v1/leads` retourne les coordonnées client masquées (`***`) si le pro n'est pas Premium ET le lead a moins de 72h.
  2. Un pro peut s'abonner via Stripe Checkout et accéder immédiatement aux coordonnées non floutées.
  3. Le webhook Stripe met à jour `professionals.subscription_status` de manière fiable.
  4. Un cron `pg_cron` bascule `leads.unlocked_at` à T+72h pour le déblocage gratuit automatique.
**Plans**: 7 plans
Plans:
- [x] 04-01-PLAN.md — Migrations SQL (schema gaps + pg_cron) + nuxt.config runtimeConfig + .env.example
- [x] 04-02-PLAN.md — [BLOCKING] supabase db push + vitest setup + RED test stubs
- [x] 04-03-PLAN.md — maskLead helper + qualify endpoint + leads index/detail API
- [x] 04-04-PLAN.md — PATCH /api/v1/leads/[id]/claim (Premium-only)
- [x] 04-05-PLAN.md — Stripe checkout + webhook (constructEventAsync + SubtleCryptoProvider)
- [x] 04-06-PLAN.md — /espace/leads dashboard + /espace/leads/[id] detail + LeadCountdown component
- [x] 04-07-PLAN.md — /espace/premium page + admin Projets tab with Qualify button

### Phase 4.5: Conversion & Qualification
**Goal**: Maximiser la conversion pro Basic → Premium en rendant la valeur de la plateforme immédiatement visible et en levant les frictions à l'abonnement.
**Depends on**: Phase 4
**Requirements**: CNV-01, CNV-02, CNV-03, CNV-04, CNV-05, CNV-06, CNV-07, CNV-08
**Success Criteria** (what must be TRUE):
  1. Un pro Basic peut accéder librement à ses 3 premiers leads (coordonnées complètes) sans abonnement. Au 4ème lead, le paywall s'affiche.
  2. La page `/espace/premium` propose un toggle mensuel/annuel et un free trial 14 jours activé via Stripe (`trial_period_days: 14`).
  3. Le score de qualification est calculé automatiquement à la soumission d'un projet et affiché comme badge sur chaque lead card (budget ✓ / téléphone ✓ / description ✓).
  4. Le dashboard `/espace/leads` affiche un bloc "Marché local" : nombre de projets dans la zone ce mois, catégories dominantes.
  5. Le pro peut éditer son profil public depuis `/espace/profil` (bio, spécialités, zone) et les changements se reflètent sur `/pro/{dept}/{slug}-{id}`.
  6. La page `/espace/premium` présente un hero axé exclusivité ("Premier contact exclusif") et une section ROI chiffrée ("1 chantier signé rembourse 6 mois d'abonnement").
  7. Un pro qualifié qui atteint le paywall voit sa conversion mesurable via les analytics admin.
**Plans**: 7 plans
Plans:
- [ ] 04.5-01-PLAN.md — Schema migration: free_leads_used, qualify_score + 4 booleans, profile fields, paywall_events, free_lead_grants
- [ ] 04.5-02-PLAN.md — [BLOCKING] supabase db push + verify columns
- [ ] 04.5-03-PLAN.md — Extend maskLead + leads API for free-grant counter + compute qualify_score on projects POST
- [ ] 04.5-04-PLAN.md — Stripe trial_period_days=14 + trial_will_end webhook + paywall analytics endpoints
- [ ] 04.5-05-PLAN.md — Profile API: GET/PATCH /me + logo presigned URL + extend public profile select
- [ ] 04.5-06-PLAN.md — Market-local API + /espace/leads UI extension (banners, qualif badges, widget, analytics)
- [ ] 04.5-07-PLAN.md — Refactor /espace/premium (hero/trial/ROI/FAQ) + new /espace/profil page + dashboard nav link
**UI hint**: yes

### Phase 5: SMS + Acquisition + Messagerie
**Goal**: Boucle complète d'acquisition, d'activation et de rétention — les pros sont notifiés, les particuliers ont un espace de suivi, et les deux communiquent sur la plateforme.
**Depends on**: Phase 4.5
**Requirements**: SMS-01, SMS-02, SMS-04, ACQ-01, MSG-01, MSG-02, MSG-03, EML-01, FDB-01
**Success Criteria** (what must be TRUE):
  1. Un nouveau projet qualifié déclenche un SMS immédiat aux pros Premium de la zone (opt-in) avec lien direct vers le lead.
  2. Les pros Basic reçoivent un SMS avec CTA direct vers `/espace/premium` ("Coordonnées disponibles pour les abonnés Premium").
  3. Le webhook STOP Twilio bascule le consent en `revoked` et stoppe les envois.
  4. Une campagne SMS sortante peut être déclenchée depuis l'admin vers les pros DB non inscrits (cold outreach acquisition).
  5. Un particulier ayant déposé un projet reçoit un magic link et peut accéder à `/mon-projet/[token]` pour voir le statut, les pros consultants, et ses messages.
  6. Un pro peut envoyer un message à un particulier depuis `/espace/leads/[id]` ; le particulier reçoit une notification email avec lien de réponse.
  7. Le particulier peut répondre et poser des questions depuis son espace ; le pro reçoit une notification.
  8. Les emails d'onboarding pro (J+0 / J+1 / J+3) sont implémentés mais inactifs par défaut (`EMAIL_NOTIFICATIONS_ENABLED=false`).
  9. Un pro peut marquer un lead "Chantier décroché" depuis la fiche lead ; le taux de conversion s'affiche dans le bloc ROI.
  10. L'administrateur dispose d'un tableau de modération des leads et d'un rapport de performance SMS.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Réputation & Scale
**Goal**: Pérenniser la croissance par la preuve sociale et l'expansion géographique conditionnée aux métriques pilote.
**Depends on**: Phase 5
**Requirements**: REP-01, REP-02, SCL-01
**Success Criteria** (what must be TRUE):
  1. Un particulier peut laisser un avis sur un pro après attribution d'un chantier ; l'avis est affiché sur le profil public.
  2. Un pro peut inviter un collègue via un lien de parrainage ; les deux reçoivent 1 mois offert à l'activation.
  3. L'ouverture d'une nouvelle ville est conditionnée à : ≥3 pros Premium actifs + ≥10 projets qualifiés/mois sur Carrières-sous-Poissy.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|---|---|---|---|
| 1. Foundations & Compliance | 1/1 | Completed | 2026-06-03 |
| 2. Data Foundation & Capture mono-ville | 1/1 | Completed | 2026-06-03 |
| 3. Onboarding Pro & Vérification manuelle | 1/1 | Completed | 2026-06-03 |
| 4. Le Verrou & Stripe Billing | 7/7 | Completed | 2026-06-09 |
| 4.5. Conversion & Qualification | 0/TBD | Not started | - |
| 5. SMS + Acquisition + Messagerie | 0/TBD | Not started | - |
| 6. Réputation & Scale | 0/TBD | Not started | - |
