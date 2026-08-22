# Roadmap: BÂTI-AXE

> 🧭 **Plan de vol consolidé (fait / V1-V2-V3 / milestones)** : voir `.planning/PLAN_DE_VOL.md` (synthèse 2026-08-21).

## Milestones

### ✅ Milestone v0.9.0 « Experience & Growth Pro » — CLÔTURÉ le 2026-08-19

**Verdict : v1 livrable pour le pilote mono-ville (Carrières-sous-Poissy / 78).** Toutes les phases du périmètre livrées : capture (2), onboarding/vérification (3), verrou & billing (4), conversion (4.5), marché (4.6), design system (4.7), SIRET/badges (5, 5.8), portfolio (5.5), calculateur (5.6), durcissement (5.7), messagerie/espace client + onboarding email (6), aides rénovation (05.9).

**Conditions de livraison v1 (à valider avant mise en prod réelle avec vrais utilisateurs) :**
- [ ] Déploiement Cloudflare Pages vérifié au vert (Node 22 via `.nvmrc` — sinon poser `NODE_VERSION=22` en var de build)
- [ ] Paiement Stripe re-testé de bout en bout (checkout + webhook, Phase 4) et cron pg_cron 72h vérifié (Phase 4) — non re-testés le 2026-08-19
- [ ] Admin minimal validé opérationnel pour le pilote (revue documents OK ; analytics/audit hors UI → Phase 06.1)
- [ ] Dette test connue : passe Playwright jamais câblée (blocage navigateur sandbox) — à traiter dans le prochain milestone

**Reporté au prochain milestone** : Phase 06.1 (Console Admin), Phase 7 (Réputation & Scale), Phase 8 (PWA Mobile-First) + tout le bloc Deferred ci-dessous.

## Overview
Roadmap alignée sur la stratégie prototype-first mono-ville (Carrières-sous-Poissy / 78). Chaque phase livre une capacité vérifiable et autonome. La Phase 5 est une validation business sans code nouveau — elle conditionne le scale géographique.

## Phases

- [x] **Phase 1: Foundations & Compliance** - Nuxt 3, Supabase CLI local, Cloudflare Pages, pages légales, middleware sécurité.
- [x] **Phase 2: Data Foundation & Capture mono-ville** - Schéma DB, seed zone pilote, vitrine landing SEO, simulateur de capture 6 étapes.
- [x] **Phase 3: Onboarding Pro & Vérification manuelle** - Auth Supabase, flux Claim, upload R2, console admin validation docs, consents RGPD/LCEN.
- [x] **Phase 4: Le Verrou & Stripe Billing** - API floutage serveur, abonnement Stripe, webhook, déblocage auto 72h.
- [x] **Phase 4.5: Conversion & Qualification** - Verrou 3 leads gratuits, free trial 14j, plan annuel, auto-qualification, profil public éditable, ROI dashboard, copy Premium refondu, CRM Minimaliste.
- [x] **Phase 4.6: Marché Dynamique & Multi-Catégories** - Refonte DB (categories TEXT[]), fin du push leads, pull temps réel via projects, UI sélection multiple (profil/claim).
- [x] **Phase 4.7: Refonte UI Globale & Application du Design System** - Application du MASTER.md, harmonisation de la typographie (Figtree/Noto) et du thème B2B/Marketplace. (completed 2026-07-03)
- [x] **Phase 5: Intégration API État (SIRET) & Badges de Confiance** - Récupération auto des infos légales (API Gouv/Pappers), vérification asynchrone décennale, et nouveaux copywriting labels. (completed 2026-06-24)
- [x] **Phase 5.5: Portfolio Pro, Refonte Profil & Social** - Upload R2 (galerie projets), BDD completed_projects/likes, carousel landing, profil immersif pleine page (zéro menu, mobile-first). (completed 2026-07-19)
- [x] **Phase 5.6: Calculateur de Prix & Refonte Simulateur** - Estimateur interactif (tuiles, type de travaux, m²), algorithme de chiffrage, et capture de leads qualifiés (résultat contre coordonnées). (completed 2026-07-19)
- [x] **Phase 5.7: Durcissement Validation des Inputs** - Bornes maxlength/pattern alignées serveur (Zod) ↔ client (HTML) sur tous les formulaires + CHECK constraints DB. (completed 2026-07-20)
- [x] **Phase 05.10: Espace Partenaires & Apporteurs d'Affaires (Tunnel B2B)** — Landing `/b2b/partenaires` (hero + 4 promesses + badge conformité), tunnel 4 étapes (profil → besoin → dropzone R2 → coordonnées GDPR), endpoint POST + presign R2 (Turnstile), notif Resend équipe + confirmation pro, back-office admin (queue + pipeline + assignation + notes), workflow DirCo (qualification, sélection 2-3 sous-traitants, restitution email). **Phase complète 7/7** (livré 2026-08-22)
- [x] **Phase 05.11: Coffre-Fort Juridique & Capacité Sous-traitance** - Table documents_artisan (KBIS/URSSAF/décennale + statuts API), switch alerte capacité + effectif, suspension auto à expiration, devoir de vigilance 6 mois. **Phase complète 4/4** (livré 2026-08-23)
- [x] **Phase 05.12: Front Polish & Branding (Landing Partenaires + Logo)** - Landing `/partenaires` dédiée (hero, confiance, problème/solution, services, 4 étapes, profils, conformité, FAQ, CTA) avec CTAs vers le tunnel ; tunnel `/b2b/partenaires` allégé (formulaire seul + lien retour) ; scroll fluide global + copy CTA ; déclinaisons web du logo (détourage flood-fill, transparent/monochrome, favicon.ico multi-tailles, favicon 16/32/48, apple-touch-icon 180, icônes PWA 192/512, og-image 1200×630) branchées header/footer/nuxt.config. **Phase complète 2/2** (livré 2026-08-23)
- [x] **Phase 6: Messagerie & Espace Client (acquisition + SMS reportés)** - Messagerie in-app pro↔particulier, dashboard particulier magic-link, feedback loop lead, email onboarding (désactivé par défaut). Acquisition cold outreach et SMS différencié sortis de cette phase → reportés post-lancement. (complétée 2026-08-19 : 06-01 + 06-03 livrés, 06-02/06-04 différés)
- [x] **Phase 06.1: Console Admin Opérationnelle** — Composants modulaires (8 fichiers), sidebar fixe, dark mode, 7 onglets (Vue d'ensemble, En attente, Tous les pros, Projets, Réalisations, KPIs, Journal), search + pagination, projets cliquables. Reste: fusion `b2b_requests` (05.10-06). (livré 2026-08-22)
- [x] **Phase 06.2: KPIs de Pilotage & Dashboard de Scalabilité** — Tables `marketing_spend_logs` + `kpi_snapshots` + vue `view_kpi_matching_48h`, endpoint calcul 6 KPIs, dashboard UI (cartes + matrice lignes rouges + filtre période). Reste: brancher Matomo côté client. (livré 2026-08-22)
- [x] **Phase 05.9: Extension Simulateur — API Mes Aides Réno** - Proxy Nitro `/api/v1/aides-reno`, fork aides optionnel avant le lead wall + route standalone `/calculateur-aides`, affichage aides + reste à charge, dégradation propre. Recherche + contexte terminés 2026-08-18.
- [ ] **Phase 7: Réputation & Scale** - Avis clients, referral program, multi-ville, sous-traitance B2B (benchmark Arti-Box).
- [ ] **Phase 8: Architecture PWA Mobile-First** - Service Worker Offline-Resilient (@vite-pwa/nuxt), Web App Manifest Standalone, Bottom Bar Shell mobile, Safe Area Insets. (Capacitor/stores écartés — hors scope, cf. spec client 2026-08-06.)

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
**Plans**: 8 plans
Plans:
- [x] 04.5-01-PLAN.md — Schema migration: free_leads_used, qualify_score + 4 booleans, profile fields, paywall_events, free_lead_grants
- [x] 04.5-02-PLAN.md — [BLOCKING] supabase db push + verify columns
- [x] 04.5-03-PLAN.md — Extend maskLead + leads API for free-grant counter + compute qualify_score on projects POST
- [x] 04.5-04-PLAN.md — Stripe trial_period_days=14 + trial_will_end webhook + paywall analytics endpoints
- [x] 04.5-05-PLAN.md — Profile API: GET/PATCH /me + logo presigned URL + extend public profile select
- [x] 04.5-06-PLAN.md — Market-local API + /espace/leads UI extension (banners, qualif badges, widget, analytics)
- [x] 04.5-07-PLAN.md — Refactor /espace/premium (hero/trial/ROI/FAQ) + new /espace/profil page + dashboard nav link
- [x] 04.5-08-PLAN.md — CRM Minimaliste: lead description preview + fast copy + manual status tracking
**UI hint**: yes

### Phase 4.6: Marché Dynamique & Multi-Catégories
**Goal**: Transition d'un système "push" rigide vers un marché "pull" dynamique supportant les artisans multi-métiers.
**Depends on**: Phase 4.5
**Success Criteria** (what must be TRUE):
  1. Base de données : Colonne `categories TEXT[]` dans `professionals` (migration des anciennes catégories uniques).
  2. Back-End : Fin de l'insertion aveugle dans `leads`. API `/api/v1/leads` scanne `projects` en temps réel par rapport aux `categories` du pro. Attribution de la ligne `leads` uniquement au déblocage.
  3. Front-End : Sélection multiple de catégories via cases à cocher sur `/espace/profil` et `/pro/claim` (mise à jour immédiate des leads affichés).
**Plans**: Completed (Refonte intégrée au codebase via migration `20260611000000_phase6_multi_category.sql` et modification API).
**UI hint**: yes


### Phase 4.7: Refonte UI Globale & Application du Design System (REPLAN v2)
**Goal**: Refonte visuelle drastique gris industriel (#64748B) + orange sécurité (#F97316), typographie massive DM Sans et Bento Grids, selon le contrat `04.7-UI-SPEC.md`. Élimination totale du vert/cyan de la v1. Restyle uniquement, invariants métier intouchables.
**Depends on**: Phase 4.6
**Requirements**: UI-MASTER-01, UI-LANDING-01, UI-FORMS-01, UI-DASHBOARD-01, UI-PREMIUM-01, UI-PROFILE-PUBLIC-01, UI-ADMIN-01, UI-LEGAL-01, UI-AUDIT-01
**Success Criteria** (what must be TRUE):
  1. `app/assets/css/tailwind.css` porte la palette gris industriel + orange sécurité et DM Sans ; zéro token cyan/vert.
  2. Toutes les pages adoptent le style Bento (cartes rounded-3xl, typo massive, micro-interactions) sans perte de données ni de logique.
  3. `grep -rE "cyan-|green-|emerald-|#22C55E|#0891B2|#22D3EE|#ECFEFF|#164E63" app/` ne retourne aucun usage décoratif (critère transversal).
  4. Accessibilité WCAG AA : contraste 4.5:1 texte, focus visibles, prefers-reduced-motion respecté.
  5. Responsive à tous les breakpoints (375px, 768px, 1024px, 1440px) sans scroll horizontal.
  6. Le hero landing est le Bento Grid Variant C (sketch 001) et les doublons de composants morts sont supprimés.
**Note**: v1 (cyan/vert, Figtree/Noto) supersédée — plans archivés dans `.planning/legacy/04.7-v1-cyan-vert/`.
**Plans**: 8 plans
Plans:
- [x] 04.7-01-PLAN.md — Fondation CSS : tokens gris+orange, DM Sans, utilitaires .bento-card + reveal (levier token cascade)
- [x] 04.7-02-PLAN.md — Landing : hero Bento Grid Variant C + sections + BeforeAfterSlider
- [x] 04.7-03-PLAN.md — Dashboard pro & badges : repoint Ui*, suppression doublons morts, restyle badges SIRET/décennale
- [x] 04.7-04-PLAN.md — Leads & messagerie espace : grille bento, fiche détail (masquage intact), LeadAge sans vert
- [x] 04.7-05-PLAN.md — Formulaires : claim, profil, simulateur, UploadProgress
- [x] 04.7-06-PLAN.md — Premium & public : pricing bento, profil public (badge sans emerald), espace particulier
- [x] 04.7-07-PLAN.md — Admin & légal : console (actions orange), pages légales (typo/spacing)
- [x] 04.7-08-PLAN.md — Audit transversal zéro vert/cyan + a11y/responsive + checkpoint validation humaine
**UI hint**: yes

### Phase 5: Intégration API État (SIRET) & Badges de Confiance
**Goal**: Automatiser la vérification de l'existence légale de l'entreprise via une API d'État (recherche-entreprises.api.gouv.fr) pour renforcer la crédibilité B2B avec des badges de confiance.
**Depends on**: Phase 4.7
**Requirements**: API-01, API-02, TRST-01
**Success Criteria** (what must be TRUE):
  1. Lors de l'inscription (Claim), l'artisan saisit son SIRET et l'API récupère automatiquement Raison Sociale, Adresse, Statut (Actif/Fermé).
  2. Le badge de profil affiche dynamiquement `Entreprise Vérifiée (API Gouv)` si le SIRET est actif.
  3. L'upload de la Décennale oblige le pro à saisir son Numéro de Police et sa Date d'Expiration. L'approbation est automatique (le pro engage sa responsabilité via CGU). Le badge `Décennale Certifiée BÂTI-AXE` s'active. Le système bloque le pro/badge si la date d'expiration est dépassée.
**Plans**: 6 plans
Plans:
- [x] 05-01-PLAN.md — [BLOCKING] Migration SQL colonnes siret_* sur professionals + supabase db push
- [x] 05-02-PLAN.md — Lookup SIRET inline dans claim.post.ts + helper siretLookup.ts + tests Vitest (4 cas)
- [x] 05-03-PLAN.md — Composants BadgeEntrepriseVerifiee.vue + BadgeDecennaleCertifiee.vue + tests
- [x] 05-04-PLAN.md — Wiring badges dashboard.vue + profil public [slug].vue
- [x] 05-05-PLAN.md — Suppression de la route admin approve-pro + Nettoyage admin dashboard (inutile)
- [x] 05-06-PLAN.md — Upload Décennale pro : saisie Numéro + Date d'expiration + Auto-approbation + Mécanisme blocage expiration
**UI hint**: yes

### Phase 05.8: Enrichissement SIRET (forme juridique, NAF, suggestion catégories) au claim (INSERTED)

**Goal:** Étendre `server/utils/siretLookup.ts` pour extraire `nature_juridique` et `activite_principale` (NAF) de l'API `recherche-entreprises.api.gouv.fr`, stocker sur `professionals` (nouvelles colonnes `siret_legal_form`, `siret_naf_code`), mapper statiquement NAF→catégories BTP pour pré-cocher les catégories au claim (le pro confirme/modifie, pas d'auto-catégorisation forcée). Auto-approuver le Kbis à l'upload si `professionals.siret_status === 'active'` (même pattern que l'auto-approbation décennale dans `upload.post.ts`), pour éviter la revue admin manuelle quand l'API gouv confirme déjà l'existence/activité de l'entreprise. Scope limité au moment du `claim` uniquement — pas de resynchronisation ultérieure pour l'instant.
**Requirements**: 05.8-R1 (enrichissement + stockage legal_form/naf_code), 05.8-R2 (mapping NAF + pré-cochage catégories), 05.8-R3 (auto-approbation Kbis)
**Depends on:** Phase 5
**Plans:** 3/3 plans complete

Plans:
- [x] 05.8-01-PLAN.md — Fondations : parsing siretLookup enrichi (legal_form/naf_code) + mapping NAF→catégories + migration colonnes
- [x] 05.8-02-PLAN.md — Claim : persistance des nouveaux champs + endpoint siret-preview + pré-cochage catégories dans claim.vue
- [x] 05.8-03-PLAN.md — Auto-approbation du Kbis à l'upload si siret_status === 'active'

### Phase 5.5: Portfolio Pro, Refonte Profil & Social
**Goal**: Permettre aux pros de valoriser leur travail via une galerie photo, refondre l'UI du profil public (immersif) et intégrer de la preuve sociale sur la landing page.
**Depends on**: Phase 5, Phase 4.7
**Success Criteria** (what must be TRUE):
  1. L'échec de soumission du logo pro est corrigé (audit R2, CSP, RLS).
  2. BDD : Tables `completed_projects` (photos, description, ville, is_showcased) et `likes` (compteur, prévention doublons) opérationnelles.
  3. Backoffice Pro : Formulaire d'ajout de projet avec upload multiple vers R2. Admin : possibilité de cocher `is_showcased`.
  4. Profil Public : Refonte Mobile First pleine page (zéro barre de menu, boutons/breadcrumb). Affichage de la galerie des réalisations avec likes.
  5. Landing Page : Carousel/Grille SEO-friendly en Nuxt (pas d'Astro) exposant les chantiers "sélectionnés" avec likes.
**Plans**: 8 plans
Plans:
- [x] 05.5-01-PLAN.md — Modèle de données : migration completed_projects + likes + policies RLS
- [x] 05.5-02-PLAN.md — Fix bug presign logo R2 (Content-Length) + endpoint presign multi-fichiers + test anti-régression
- [x] 05.5-03-PLAN.md — API CRUD réalisations espace pro (liste/création/suppression, scoping RLS)
- [x] 05.5-04-PLAN.md — Endpoints publics : liste showcased + profil enrichi, like anti-spam IP-hash, toggle admin is_showcased
- [x] 05.5-05-PLAN.md — Backoffice : modale RealisationForm + upload R2 parallèle + intégration /espace/profil
- [x] 05.5-06-PLAN.md — RealisationCard partagée (like optimiste + localStorage) + toggle showcase console admin
- [x] 05.5-07-PLAN.md — Refonte profil public immersif (layout:false, bouton flottant, galerie mobile-first)
- [x] 05.5-08-PLAN.md — Section landing "Chantiers Réalisés" (carousel CSS scroll-snap SSR + likes)
**UI hint**: yes

### Phase 5.6: Calculateur de Prix & Refonte Simulateur
**Goal**: Transformer le simulateur basique en un calculateur visuel et interactif générant une estimation chiffrée, pour maximiser le taux de conversion des particuliers (Leads).
**Depends on**: Phase 4.7
**Success Criteria** (what must be TRUE):
  1. L'UI du `/simulateur.vue` utilise une navigation par tuiles visuelles (choix des pièces, surface, type de rénovation).
  2. Un moteur de calcul interne détermine une fourchette de prix (budget) selon des variables pré-définies (lourd, rafraîchissement, etc.).
  3. L'estimation financière n'est dévoilée au prospect qu'après validation complète de ses coordonnées (Aimant à Leads).
  4. La ligne insérée dans `projects` contient les détails avancés du calculateur pour que les pros aient un lead ultra-qualifié.
**Plans**: 3 plans
Plans:
- [x] 05.6-01-PLAN.md — Persistance backend : migration calculator_data JSONB, dérivation category (marché dynamique), API /projects
- [x] 05.6-02-PLAN.md — Moteur de calcul client-side computeEstimate (fourchette budgétaire, TDD)
- [x] 05.6-03-PLAN.md — Réécriture simulateur.vue : 6 étapes tuilées Bento + Lead Wall fluide + révélation estimation
**UI hint**: yes

### Phase 5.7: Durcissement Validation des Inputs (INSERTED 2026-07-19)
**Goal**: Fermer l'écart entre validation serveur (Zod, déjà ~90% couvert) et validation client (HTML natif) sur tous les formulaires du site, pour empêcher la saisie de valeurs hors format avant l'envoi et éviter la dérive entre les deux couches.
**Depends on**: Phase 5.6 (pour ne pas auditer un simulateur qui va être refondu entre-temps)
**Contexte** : audit exhaustif du 2026-07-19 (grep sur `app/pages` + `app/components`) — voir `.planning/phases/05.7-Input-Validation-Hardening/05.7-AUDIT.md` pour le détail fichier par fichier. Le site n'étant pas terminé, cette phase doit aussi poser une règle durable (documentée dans CLAUDE.md) pour que les inputs créés après cet audit héritent des mêmes contraintes dès l'écriture, sans attendre un futur audit correctif.
**Success Criteria** (what must be TRUE):
  1. Chaque champ texte/textarea des formulaires audités a un `maxlength` cohérent avec la contrainte `.max()` du schéma Zod serveur correspondant (les deux couches reflètent la même règle).
  2. Les schémas Zod serveur identifiés sans borne haute (`claim.post.ts`: company_name, full_name ; `projects.post.ts`: description, customer_name, customer_email) ont un `.max()` ajouté.
  3. Les champs à format contraint (téléphone, email, mot de passe) ont le `type`/`pattern` HTML adapté en plus du `maxlength`.
  4. Une règle est ajoutée à `CLAUDE.md` (section Patterns de code) : tout nouvel input doit porter `maxlength`/`pattern`/`type` reflétant sa contrainte serveur, dès sa création.
**Plans**: TBD
**UI hint**: no (durcissement de formulaires existants, pas de nouvelle UI)

### Phase 05.10: Espace Partenaires & Apporteurs d'Affaires (Tunnel B2B) (RENOMMÉE — ex « Phase 5.8 »)

**Goal:** Construire la landing `/partenaires` et le tunnel de conversion apporteurs d'affaires BTP (Architectes, BET, Agences immo, Syndics) : rassurer (positionnement « bras armé technique / tiers de confiance »), collecter les dossiers lourds (plans, CCTP, notes de calcul) via R2, alimenter le CRM interne et notifier l'équipe commerciale (engagement de rappel < 4h).

**Contexte:** l'ancienne « Phase 5.8 Tunnel B2B » était marquée « Complete » au ROADMAP mais n'a **jamais été implémentée** (docs-only, commits `4883ad5` / `4b46d0e`). La « 05.8 » réellement livrée est l'**Enrichissement SIRET** (autre sujet). Renommage en `05.10` pour lever la collision. Spec complète : `.planning/clients/20260821-ESPACE_PARTENAIRES_APPORTEURS_AFFAIRES-SPEC_CLIENT.md`.

**Depends on:** Phase 4.7 (design system), P2 Turnstile (upload public), Phase 06.1 (vue admin `b2b_requests`)

**Requirements:** B2B-01 (landing), B2B-02 (tunnel 4 étapes), B2B-03 (upload R2 public), B2B-04 (CRM interne + notifs), B2B-05 (consentement RGPD), B2B-06 (human-in-the-loop DirCo)

**Success Criteria** (what must be TRUE):
  1. `/partenaires` accessible : hero, 4 promesses (cartes), badge « Conformité Automatisée », CTA ancré + lien header/footer.
  2. Tunnel 4 étapes (profil → besoin → dépôt → coordonnées) ; « partenariat régulier » saute l'étape 3.
  3. Pièces (PDF/DWG/DXF/PNG/JPG/ZIP/DOCX, ≤ 50 Mo) uploadées en R2 via presign public protégé (Turnstile), liens stockés dans `b2b_requests`.
  4. Soumission → ligne `b2b_requests` + consentement journalisé (`consents`, source `b2b-prescripteur`) + email confirmation pro (Resend) + notif équipe (Resend, Slack webhook optionnel) → déclenche le rappel < 4h.
  5. Vue admin liste/détail des demandes B2B avec statut pipeline (fusionnée avec la Phase 06.1).
  6. Validation Zod ↔ HTML alignées (règle Phase 5.7) ; aucun fichier hors allow-list MIME accepté.
  7. Workflow DirCo (human-in-the-loop) : un chargé d'affaires analyse le CCTP/dossier, qualifie le besoin et présente 2-3 sous-traitants validés au donneur d'ordres (statut pipeline + `assigned_to` dans `b2b_requests`).

**Plans**: 7 plans (découpage proposé — à générer via `gsd-plan-phase`)
Plans:
- [x] 05.10-01 ✅ — Schéma BDD : table `b2b_requests` + migration + types + RLS (2026-08-22)
- [x] 05.10-02 ✅ — Endpoint public `POST /api/v1/b2b/requests` (Zod + consent + notif Resend) (2026-08-22)
- [x] 05.10-03 ✅ — Presign public R2 (Turnstile guard, allow-list MIME, 50 Mo) (2026-08-22)
- [x] 05.10-04 ✅ — Landing `/b2b/partenaires` (hero + 4 promesses + badge) + liens header/footer (2026-08-22)
- [x] 05.10-05 ✅ — Tunnel 4 étapes (profil → besoin → dropzone → coordonnées GDPR) (2026-08-22)
- [x] 05.10-06 ✅ — Back-office `b2b_requests` (onglet admin queue) + notif équipe (2026-08-22)
- [x] 05.10-07 ✅ — Thank-you page + référence dossier (2026-08-22)
- [x] 05.10-08 ✅ — Workflow DirCo (qualification CCTP, sélection 2-3 sous-traitants, restitution au donneur d'ordres) (2026-08-22)

**Hors phase (V1.1+):** Google Places autocomplete, simulateur macro agences immo (widget), CRM HubSpot/Pipedrive, notif WhatsApp, Compte Prescripteur (P8).
**UI hint**: yes

### Phase 05.11: Coffre-Fort Juridique & Capacité Sous-traitance (documents_artisan) (INSERTED 2026-08-21)

**Goal:** Centraliser et vérifier les documents légaux des artisans (KBIS < 3 mois, Attestation vigilance URSSAF, Décennale avec activités souscrites) dans une table `documents_artisan`, et exposer la capacité de sous-traitance (`is_available_subcontracting`, `workforce_size`) pour préparer la bascule B2B Majors (pré-qualification administrative avant Phase 7).

**Contexte:** directive « immédiate » du client (spec 2026-08-18 §2.4/§9.2) — ne pas attendre la Phase 7. Objectif : au basculement B2B, la base d'artisans est déjà pré-qualifiée → envoi de dossiers conformes en un clic. **Point à trancher en planification** : relation avec la table `verifications` existante (Kbis/décennale) — `documents_artisan` l'étend (URSSAF + statuts API) ou la remplace.

**Depends on:** Phase 5 (badges SIRET/décennale), Phase 06.1 (vue admin documents)

**Requirements:** B2B-SC-01 (table documents_artisan + statuts API), B2B-SC-02 (switch alerte capacité + effectif), B2B-SC-03 (suspension auto à expiration), B2B-SC-04 (devoir de vigilance 6 mois)

**Success Criteria** (what must be TRUE):
  1. Table `documents_artisan` (KBIS/URSSAF/décennale + `status` validation API + `expires_at`) + colonnes `is_available_subcontracting` (bool) et `workforce_size` (int) sur `professionals` (migration + types + RLS).
  2. Un pro bascule « Alerte Capacité » et saisit son effectif mobilisable depuis `/espace/dashboard`.
  3. Suspension automatique du profil (ou badge) dès qu'un document légal expire (check à la lecture ou cron pg_cron).
  4. Re-contrôle tous les 6 mois (devoir de vigilance donneur d'ordres) tracé dans `documents_artisan` / `audit_logs`.
  5. V1 = statuts manuels + dates d'expiration (pattern décennale Phase 5) ; API Infolégale/Paperless = V2.

**Plans**: 4/4 complete
Plans:
- [x] 05.11-01 ✅ — Migration `documents_artisan` + colonnes sous-traitance + types + RLS (2026-08-23)
- [x] 05.11-02 ✅ — Switch « Alerte Capacité » + effectif dans `/espace/dashboard` + endpoint PATCH (2026-08-23)
- [x] 05.11-03 ✅ — Suspension auto à expiration + re-contrôle 6 mois (devoir de vigilance) (2026-08-23)
- [x] 05.11-04 ✅ — Vue admin documents (statuts, expirations) — fusionnée Phase 06.1 (2026-08-23)

**UI hint**: yes

### Phase 05.12: Front Polish & Branding (Landing Partenaires + Logo) (INSERTED 2026-08-23)

**Goal:** Documenter en phase GSD les retouches front livrées « à la volée » sur la branche dédiée `fix/tweaks-front` (PR #49) : transformer l'entrée « Partenaires » en une vraie landing page de conversion pour les apporteurs d'affaires, et produire les déclinaisons web standard du logo.

**Contexte:** le bouton « Partenaires » du header menait à la page mixte `b2b/partenaires.vue` (landing + tunnel dans un même fichier). L'utilisateur voulait une page d'accueil dédiée expliquant l'offre en détail, avec CTAs lançant le tunnel. En parallèle, le logo (PNG 1536×1024 RGB, fond blanc) n'avait aucune déclinaison web (favicon.ico daté d'août, 32×32 seul).

**Depends on:** Phase 4.7 (design system), Phase 05.10 (tunnel `/b2b/partenaires` existant). Aucune migration DB ni endpoint — 100% frontend/statique.

**Success Criteria** (what must be TRUE):
  1. Landing `/partenaires` dédiée (9 sections : hero, barre de confiance, problème/solution, services, 4 étapes, profils, conformité, FAQ, CTA) avec CTAs qui lancent le tunnel.
  2. Tunnel `/b2b/partenaires` allégé (formulaire seul) + lien retour ; header/footer pointent sur `/partenaires`, lien masqué sur les 2 pages.
  3. Scroll fluide vers l'ancre (`scroll-behavior: smooth`), désactivé si `prefers-reduced-motion`.
  4. Logo détouré (flood-fill, blanc interne préservé, halos adoucis) + déclinaisons : transparent, monochrome blanc/slate, favicon.ico multi-tailles, favicon PNG 16/32/48, apple-touch-icon 180, icon-192/512, og-image 1200×630.
  5. Script réutilisable `scripts/generate-logo-variants.mjs` ; branchements header (transparent), footer (blanc), nuxt.config (favicons).

**Plans**: 2/2 complete
Plans:
- [x] 05.12-01 ✅ — Landing page `/partenaires` dédiée + tunnel allégé + navigation + scroll fluide + copy CTA (2026-08-23)
- [x] 05.12-02 ✅ — Déclinaisons web du logo (détourage + favicons + OG) + branchements (2026-08-23)

**UI hint**: yes

### Phase 05.9: Extension Simulateur — API Mes Aides Réno
**Goal**: Brancher l'API officielle d'État `mesaides.france-renov.gouv.fr/api/v1/` (moteur Publicodes) pour afficher les aides (MaPrimeRénov'/CEE/Éco-PTZ) et un reste à charge réel, afin de qualifier financièrement le lead. Les 6 étapes du tunnel principal (Phase 5.6) restent inchangées — le calcul des aides est proposé via un embranchement optionnel avant le lead wall.
**Depends on**: Phase 5.6
**Success Criteria** (what must be TRUE):
  1. Le simulateur interroge l'API via un proxy Nitro `/api/v1/aides-reno` et affiche aides + reste à charge dans un mini-tunnel dédié (un composant, deux points d'entrée : fork optionnel avant le lead wall dans `/simulateur.vue` + route standalone `/calculateur-aides`), avec révélation « bilan complet » unique pour le parcours « Oui ».
  2. `projects.calculator_data` capture les champs aides (`aides_estimees`, `reste_a_charge_min`, `reste_a_charge_max`) — pas de nouvelle migration.
  3. Dégradation propre : API indisponible → bloc aides masqué + message court, `computeEstimate()` continue de s'afficher, aucun blocage.
**Plans**: 4 plans
Plans:
- [x] 05.9-01-PLAN.md — Proxy Nitro `/api/v1/aides-reno` + resolver CP→INSEE + persistance calculator_data
- [x] 05.9-02-PLAN.md — Composant réutilisable AidesMiniTunnel (logement + foyer/revenu)
- [x] 05.9-03-PLAN.md — Fork Oui/Non avant le lead wall dans simulateur.vue + révélation bilan complet
- [x] 05.9-04-PLAN.md — Route standalone `/calculateur-aides` + teaser home + restitution espace client
**UI hint**: yes

### Phase 6: Messagerie & Espace Client (acquisition + SMS reportés post-lancement)
**Goal**: Boucle d'activation et de rétention — le particulier a un espace de suivi (magic link), et le pro↔particulier communiquent sur la plateforme. L'acquisition sortante (cold outreach) est **retirée** de cette phase et le SMS est **différé** : tous deux reportés post-lancement (décision 2026-08-18).
**Depends on**: Phase 4.7 (design system) + Phase 4.5 (messaging/feedback)
**Requirements**: MSG-01, MSG-02, MSG-03, EML-01, FDB-01 (SMS-01/02/04 et ACQ-01 retirés → post-lancement)
**Success Criteria** (what must be TRUE):
  1. [DONE] Un particulier ayant déposé un projet reçoit un magic link et accède à `/mon-projet/[token]` (statut, pros consultants, messages).
  2. [DONE] Un pro peut envoyer un message à un particulier depuis `/espace/leads/[id]` ; le particulier reçoit une notification email avec lien de réponse.
  3. [DONE] Le particulier peut répondre et poser des questions depuis son espace ; le pro reçoit une notification.
  4. [DONE] Feedback loop : le particulier peut écarter/retenir un artisan ; si tous les pros engagés sont refusés, le projet repart automatiquement sur le marché.
  5. [DONE] Les emails d'onboarding pro sont implémentés mais inactifs par défaut (`NUXT_ONBOARDING_EMAILS=false`) — REQ-07 livré le 2026-08-19 (flag, migration `onboarding_email_sent_at`, envoi au claim, idempotence, livraison Resend vérifiée).
  6. Un pro peut marquer un lead "Chantier décroché" depuis la fiche lead ; le taux de conversion s'affiche dans le bloc ROI.
**Plans**: 4 plans — 06-01 (messagerie) ✅ livré en prod ; 06-02 (acquisition) retiré → post-lancement ; 06-03 (feedback loop REQ-06/09 + email onboarding REQ-07) ✅ livrés ; 06-04 (SMS) différé → post-lancement. **Phase complète** (2 livrés / 2 différés).
**UI hint**: yes

### Phase 06.1: Console Admin Opérationnelle (INSERTED 2026-08-19)

**Goal:** Consolider et compléter la console admin existante (`app/pages/admin/index.vue`, 624 lignes monolithiques + 9 endpoints Nitro) pour la rendre opérationnelle au quotidien : revue des documents de vérification (Kbis/décennale), gestion des pros (vérifier/promouvoir/statut), pilotage projets & leads, analytics paywall, audit log consultable.
**Contexte**: l'admin fonctionne (4 onglets : queue documents, pros, projets, réalisations) mais reste un monolithe sans composants dédiés et sans vue d'ensemble (KPIs). L'UI/UX de l'admin sera traitée **plus tard** dans une passe design dédiée (cf. Deferred « passe design totale ») — cette phase ne fait que la consolidation fonctionnelle.
**Requirements**: ADM-01 (Phase 3), 05.5-04 (showcase), 04.5-04 (paywall analytics)
**Depends on:** Phase 6
**Plans**: TBD
**UI hint**: no (fonctionnel d'abord, design dédié plus tard)

### Phase 06.2: KPIs de Pilotage & Dashboard de Scalabilité (INSERTED 2026-08-21)

**Goal:** Construire le dashboard de pilotage des 5 KPIs de scalabilité (CAC, LTV, LTV/CAC, churn, taux de matching, rétention prescripteurs, activation fournisseurs) avec seuils vert/orange/rouge, pour valider le pilote 78 avant expansion nationale (spec client 2026-08-21).

**Contexte:** seul le funnel `paywall_events` (CNV-07) existe. Pas de tracking CAC/LTV/churn/matching/fournisseur. Le client propose PostHog/Mixpanel mais **Matomo a déjà été tranché (P1)** → Matomo pour le funnel + calculs KPI côté serveur (Supabase/Stripe) + affichage dans la console admin (P14).

**Depends on:** Phase 06.1 (Console Admin), P1 (Matomo), P2 (Turnstile — données propres)

**Requirements:** KPI-01 (CAC), KPI-02 (LTV + LTV/CAC), KPI-03 (churn), KPI-04 (matching + rétention prescripteurs), KPI-05 (activation fournisseurs)

**Success Criteria** (what must be TRUE):
  1. Churn calculé depuis Stripe (`customer.subscription.deleted`) + snapshot mensuel des payants — dashboard admin.
  2. CAC calculé via table `acquisition_costs` (commissions freelance + frais marketing, saisie admin).
  3. LTV (part abonnement) + LTV/CAC calculés ; commission B2B ajoutée à la formule quand P10 existera.
  4. Taux de matching calculé sur la définition retenue (réponses pros ≥ 3 en 48h ou leads débloqués) — définition à trancher.
  5. Rétention prescripteurs V1 = particuliers actifs (≥ 1 projet/mois) ; bascule vers `b2b_requests` (05.10) quand construit.
  6. Activation fournisseurs = stub (dépend US-ART-03 / P11) — non bloquant.
  7. Dashboard admin : 5 lignes rouges (vert/orange/rouge + action si rouge) + funnel Matomo (P1).

**Plans**: 4 plans (découpage proposé — à générer via `gsd-plan-phase`)
Plans:
- [ ] 06.2-01-PLAN.md — Schéma BDD : `acquisition_costs` + `kpi_snapshots` + migration + types + RLS
- [ ] 06.2-02-PLAN.md — Ingestion : coûts (saisie admin), churn (Stripe webhook), matching (projets → réponses pros)
- [ ] 06.2-03-PLAN.md — Calculs KPI serveur (CAC/LTV/churn/matching/rétention/activation) + endpoint admin
- [ ] 06.2-04-PLAN.md — Dashboard admin (5 lignes rouges) + intégration Matomo (P1)

**UI hint**: yes

### Phase 7: Réputation & Scale
**Goal**: Pérenniser la croissance par la preuve sociale et l'expansion géographique conditionnée aux métriques pilote.
**Depends on**: Phase 6
**Requirements**: REP-01, REP-02, SCL-01, SCL-02 (ouverture TP), ECO-01 (modèle hybride)
**Success Criteria** (what must be TRUE):
  1. Un particulier peut laisser un avis sur un pro après attribution d'un chantier ; l'avis est affiché sur le profil public.
  2. Un pro peut inviter un collègue via un lien de parrainage ; les deux reçoivent 1 mois offert à l'activation.
  3. L'ouverture d'une nouvelle ville est conditionnée à : ≥3 pros Premium actifs + ≥10 projets qualifiés/mois sur Carrières-sous-Poissy.

> **Sous-traitance B2B** (documents_artisan, alerte capacité) : voir **Phase 05.11**. **Ouverture TP** (VRD/terrassement/géomètres) + **modèle hybride** (forfait B2C + commission au succès B2B) : cf. spec 2026-08-18 §2.3/§2.4 — à intégrer au périmètre de la phase.

**Plans**: TBD
**UI hint**: yes

### Phase 8: Architecture PWA Mobile-First
**Goal**: Rendre Bâti-Axe installable et résilient au réseau (offline-resilient) — shell UI en cache, chargement perçu plus rapide, sans réécriture native.
**Depends on**: Phase 4.7, Phase 6
**Success Criteria** (what must be TRUE):
  1. `@vite-pwa/nuxt` est intégré avec stratégie *StaleWhileRevalidate* (shell UI + assets statiques uniquement) et Web App Manifest standalone.
  2. L'UI propose un Shell Mobile-First (Bottom Navigation Bar sur `< 768px`, Safe Area Insets iOS, touch targets ≥ 44px).
  3. Aucun cache de données métier (leads/messages) : hors-ligne → état "hors-ligne" explicite, jamais de coordonnées périmées servies (ADR-004 intact).
**Plans**: TBD
**UI hint**: yes

> Capacitor 6 / packaging App Store & Play Store : **hors scope** (maintenance native non justifiée, cf. spec client 2026-08-06) — à reconsidérer seulement si un besoin terrain documenté émerge, via un ADR dédié.

## Progress

| Phase | Plans Complete | Status | Completed |
|---|---|---|---|
| 1. Foundations & Compliance | 1/1 | Completed | 2026-06-03 |
| 2. Data Foundation & Capture mono-ville | 1/1 | Completed | 2026-06-03 |
| 3. Onboarding Pro & Vérification manuelle | 1/1 | Completed | 2026-06-03 |
| 4. Le Verrou & Stripe Billing | 7/7 | Completed | 2026-06-09 |
| 4.5. Conversion & Qualification | 8/8 | Completed | 2026-06-09 |
| 4.6. Marché Dynamique & Multi-Catégories | 1/1 | Completed | 2026-06-11 |
| 4.7. Refonte UI Globale & Design System | 8/8 | Complete   | 2026-07-04 |
| 5. Intégration API État (SIRET) & Badges de Confiance | 6/6 | Complete   | 2026-06-24 |
| 5.5. Portfolio Pro, Refonte Profil & Social | 8/8 | Complete   | 2026-07-19 |
| 5.6. Calculateur de Prix & Refonte Simulateur | 3/3 | Complete   | 2026-07-19 |
| 5.7. Durcissement Validation des Inputs | 2/2 | Complete   | 2026-07-20 |
| 05.8 Enrichissement SIRET (forme juridique/NAF) | 3/3 | Complete | 2026-07-20 |
| 05.10 Espace Partenaires & Apporteurs d'Affaires (Tunnel B2B) | 7/7 | Complete | 2026-08-22 |
| 05.11 Coffre-Fort Juridique & Capacité Sous-traitance | 4/4 | Complete | 2026-08-23 |
| 6. Messagerie & Espace Client | 2/2 livrés (2 différés) | Complete | 2026-08-19 |
| 05.9 Extension Simulateur Mes Aides Réno | 4/4 | Complete | 2026-08-18 |
| 06.1 Console Admin Opérationnelle | 1/1 | Complete | 2026-08-22 |
| 06.2 KPIs de Pilotage & Dashboard de Scalabilité | 1/1 | Complete | 2026-08-22 |
| 05.12 Front Polish & Branding (Landing Partenaires + Logo) | 2/2 | Complete | 2026-08-23 |
| 7. Réputation & Scale | 0/TBD | Not started | - |
| 8. Architecture PWA Mobile-First | 0/TBD | Not started | - |

## Priorités pilote v1 — Backlog (items manquants identifiés le 2026-08-19)

Items hors roadmap détectés en relisant les specs client (18/08 Arti-Box, 06/08 PWA) + PIVOT-B2B + avis mentor. Ordre recommandé pour valider le pilote — à trancher :

| # | Item | Source | Pourquoi | Statut |
|---|---|---|---|---|
| P1 | **Analytics de conversion** (simulateur → lead → contact → chantier signé). **Décidé le 2026-08-19 : Matomo** (open-source, GDPR, données souveraines — fit marché FR). Déploiement : cloud Matomo au départ ; si Matomo doit couvrir plusieurs projets, **self-host sur le VPS du porteur de projet** (partie prenante). Axiom écarté (gestion de logs, pas analytics) | Avis mentor + décision utilisateur | Sans mesure, impossible de savoir si le pilote fonctionne — plus critique que l'admin | ✅ décidé — à implémenter (funnel → Phase 06.2) |
| P2 | **Anti-spam capture** — Turnstile (Cloudflare) sur `POST /projects` public | Checklist sécurité (optionnel → obligatoire) | Un bot flood tue la qualité du marché + la délivrabilité email | ✅ code livré — **standby** (clés client, à créer sur son Cloudflare au transfert) |
| P3 | **Stripe (checkout + webhook) + cron pg_cron 72h re-testés en prod** | Condition de livraison v0.9 | Jamais re-testés depuis Phase 4/4.5 ; vérifier que le job pg_cron existe bien en prod | ❌ à faire en premier |
| P4 | **Notif pro nouveaux leads** — 2 temps : (1) email dès maintenant (léger, zéro install), (2) **Web Push API natif via la PWA** (Phase 8, `@vite-pwa/nuxt` + `web-push`/VAPID depuis Nitro — pas de service tiers) quand le pro opt-in + installe la PWA. Email = filet universel, push = expérience | Avis mentor | Active les pros du pilote sans les obliger à surveiller la liste | ❌ à faire (email) + Phase 8 (push) |
| P5 | **Feedback loop refus → remise au marché** : testé ? | Avis mentor | Messagerie testée, ce chemin-là non | ❌ à tester |
| P6 | **US-PAR-02 : étude de financement courtier partenaire** (1 CTA + envoi) | Spec 18/08 | Levier de monétisation simple | ❌ absent |
| P7 | **Packs zonés & exclusivité métier** — zone principale incluse + add-on par sous-zone + dégressif > 3 zones ; exclusivité **Département + Métier** ; tarifs : **Basic 150-200 € (5-10 leads) / Premium 300 € (flux total)** ; **charte d'exclusivité B2C** (contrat) (cahier v1.1 §4.1 révisé 08/08 + spec courtier 21/08) | Spec 06/08 + 18/08 + 21/08 | Pricing actuel plat (mensuel/annuel) | ❌ absent |
| P8 | **Compte Prescripteur** (rôle BDD, « Mes dossiers clients », pipeline translucide, landing splitée, jauge anti-piège « Illimité » 40 leads/mois) | PIVOT-B2B v2 | Le pivot B2B n'est pas implémenté | ❌ absent |
| P15 | **Messagerie temps réel (Supabase Realtime) — noté, PAS prioritaire** — le chat 1:1 pro↔demandeur reste en **polling actuel** (fonctionne). Si le temps réel devient requis un jour : **Supabase Realtime** (WebSocket natif Postgres, zéro infra à ajouter — PAS de Durable Objects : Workers-only + état en double avec la base, cf. analyse 2026-08-19). **Décision produit 2026-08-19** : on ne voit pas pro et demandeur discuter en ligne — 1-2 échanges de messages suffisent à convenir d'un appel, **le vrai objectif est le téléphone direct, d'où le déblocage premium** (coordonnées révélées au déblocage du lead). La messagerie reste un facilitateur, pas le cœur du produit | Décision utilisateur 2026-08-19 | Ne pas sur-investir dans le chat : le funnel réel est message → appel téléphonique (lead débloqué) | 📝 noté — polling OK |
| P14 | **Monitoring & alerting — Axiom** — observabilité (logs, erreurs, alertes) des Workers/webhooks/API externes : si Mes Aides Réno tombe, le webhook Stripe échoue ou un endpoint 500, on doit le savoir. **Axiom ≠ Matomo** : Matomo (P1) = analytics produit (funnels), Axiom = logs/observabilité — complémentaires, pas concurrents. Cloud en premier ; self-host possible sur le VPS du porteur si besoin. **Vue monitoring intégrée à la console admin** (onglet observabilité : erreurs 4xx/5xx, latence, défaillances webhooks/API externes, uptime) + **alertes par email** (via Resend existant) quand un seuil est dépassé (ex : rate 500 > 0, webhook Stripe échoué, API aides injoignable) — décision utilisateur 2026-08-19 | Avis mentor (2026-08-19) | Le paywall Stripe mort a été découvert par hasard (404 silencieux) — un monitoring l'aurait détecté | ❌ à faire |
| P13 | **Multi-déploiement white-label (Terraform)** — une instance par client (Cloudflare du client + domaine perso + Supabase dédié), **tous encaissant sur le MÊME Stripe du porteur** (pas de multi-tenant de paiement — cf. PIVOT-B2B §6). Fondation Terraform existante (`terraform/` : modules cloudflare_pages + supabase_project + platform, workspaces dev/staging/prod) ; à étendre avec un workspace par client + backend d'état isolé. L'instance actuelle reste la **démo du porteur** | Décision utilisateur 2026-08-19 | Modèle économique validé : un compte Stripe central (abonnements + commission + factures aux coordonnées BÂTI-AXE) | 📝 fondation existe — à étendre |
| P9 | **Mobile QA landing + simulateur + états vides** (dashboard sans leads, espace client sans messages, erreurs/offline) | Spec 06/08 + avis mentor | 80% de la première impression d'un nouveau user | ❌ à faire |
| P12 | **Page pro public « digne de ce nom »** — vitrine commerciale du pro (héro, preuve sociale, avis une fois Phase 7, CTA contact). Base Phase 5.5 existe (immersif, galerie, likes) mais à élever | Décision utilisateur 2026-08-19 | C'est ce que voient les particuliers avant de contacter un pro | ❌ à faire |
| P10 | **Commission B2B + Stripe Connect** — ⚠️ **% à réconciler** (grille 8→2,5 % vs 5-10 % vs ex. 3 %) ; **contrat d'apport anti-contournement (12-24 mois)** ; recadrage PM : **facturation manuelle pour les 10 premiers chantiers** avant d'automatiser | Spec 18/08 + 21/08 | Documenté mais pas implémenté — ne pas sur-automatiser en phase 1 | 📝 doc only |
| P11 | **Signature eIDAS** (Yousign/DocuSign, verrou commission) + **codes privilèges fournisseurs** (US-ART-03/04) + **workspace architecte** (§7) | Spec 18/08 | Différenciateurs Phase 7+ | ❌ Phase 7+ |
| P16 | **Ouverture TP (Phase 2)** — apporteurs : géomètres-experts, promoteurs/aménageurs, économistes VRD, CMistes ; tunnel TP séparé (Bâtiment vs Infrastructures) + catégories (terrassement/enrochement, VRD/assainissement, démolition/désamiantage, voirie) + blindage technique (plan de masse, étude G2, bornage) ; barrières : parc machine + assurances dommages réseaux | Spec 17-18/08 + 21/08 | Différenciateur vs Arti-Box, paniers 10-100 k€+ | ❌ Phase 2 (après 78) |
| P17 | **Modèle 2 piliers** — B2C = abonnement MRR (Stripe) + B2B = commission au succès 5-10 % | Spec 17-18/08 §2.3 + 21/08 | Affine le pricing plat actuel — à trancher avec P7/P10 | ❌ à trancher |
| P18 | **Devoir de vigilance 6 mois** (re-contrôle des documents légaux) | Spec 17-18/08 §6.7 (légal) | Obligation donneur d'ordres ; aligné sur la suspension auto (Phase 05.11) | ❌ à faire (ops/05.11) |
| P19 | **Diagnostiqueurs = apporteurs d'affaires** (type de compte + bouton « déposer un rapport » + commission fixe 15-20 €/lead) — ⚠️ **réversal** du « rejeté niche » (outil dictaphone, lui, reste différé) | Spec 21/08 | Source de leads DPE ultra-qualifiés, sature les départements | ❌ à faire |
| P20 | **Passerelle B2B payante** — Ticket à l'acte (79 €) + Pack Elite/Corporate (450 €/mois : flux B2C illimité + postulation B2B) | Spec 21/08 | Étanchéité des flux B2C/B2B + filtre des pros sérieux | ❌ à faire (avec P7/P8) |
| P21 | **Tunnel Sinistres / Assurances (REN)** — bouton « Déclarer un sinistre », tunnel 4 étapes (urgence, infos assurance, photos, SLA 48h), devis aux normes assurance (Sedgwick/Sia), positionnement Contractant Général | Spec 21/08 | Marché captif financé (assureurs), forte marge | ❌ à faire |
| P22 | **Majors / Grands Comptes (Phase 3)** — tunnel « Je suis une Entreprise Générale / Major » (lot à sous-traiter, date démarrage, budget, dépôt CCTP/bordereau) ; promesse dispo 48h + zéro risque admin ; commission paliers (5 % → 2-3 % au-delà 100 k€) ; chasse directions régionales 78 (Nearby Leads Extractor) | Spec 21/08 | Sous-traitance second rang Vinci/Eiffage/Spie/Legendre/Léon Grosse | ❌ Phase 3 (après TP) |

## Deferred (post-lancement)

Reportés en toute fin — exécuter seulement après que le produit soit construit et validé :

- **Acquisition pros (cold outreach)** — retiré de la Phase 6 le 2026-08-18 (REQ-05, plan 06-02). Import prospects + invitation email + funnel admin. Source (CSV/seed/scrape) à trancher le moment venu.
- **SMS différencié** (REQ-08, plan 06-04) — aucune dépense fournisseur sans feu vert explicite. Reco Brevo, alt OVH/Twilio.
- **Packaging stores (Capacitor)** — hors scope Phase 8, à reconsidérer via ADR dédié si besoin terrain documenté.
- **Design final email + passe design totale** (ux-pro-max → impeccable → taste-skill).
- **Compléter le calcul aides 05.9 (précision max)** — `DPE.actuel` / `projet.DPE visé` (classes A→G, valeurs validées le 2026-08-18 par appel réel) + `parcours d'aide` (enum à identifier dans `betagouv/reno`). Non bloquant : dégradation propre déjà en place (D-04).
- **SEO complet (post-lancement)** — au moment du lancement réel : retirer le `robots.txt` noindex (posé le 2026-08-19, `app/public/robots.txt`), mettre en place les meta/schema.org, sitemap.xml, Open Graph/Twitter cards, canonical, hreflang si multilingue. La landing a déjà une base SEO (SSR + carousel) mais pas de structure complète.
- **Bandeau cookies + consentement (RGPD)** — pas de bandeau cookie actuellement (le site utilise uniquement des cookies de session Supabase, pas de traceurs tiers, mais le consentement doit être documenté et le bandeau implémenté avant tout traceur type Matomo P1). À faire avant d'activer Matomo (P1) — sinon pas de consentement préalable.
- **Conservation & purge des données (CNIL — trou n°1)** — définir des durées de rétention (projets particuliers, leads, **Kbis/décennale ultra-sensibles**, messages) + purge automatique. Rien de prévu aujourd'hui. Obligation de moyens CNIL → prioritaire.
- **Export & suppression des données (portabilité RGPD)** — aucun moyen actuel pour un pro/particulier de récupérer ou supprimer ses données. Implémentation = endpoint d'export + suppression (cf. RLS existante).
- **Registre des traitements RGPD** — document interne obligatoire, à rédiger (recenser : pros, particuliers, documents Kbis/décennale, messages, paiements Stripe, logs).
- **Sous-traitants listés dans la politique de confidentialité** — déclarer Supabase, Cloudflare, Resend, Stripe (art. 28 RGPD + contrat de sous-traitance).
- **Médiation de la consommation (obligatoire dès le 1er particulier)** — dès que des consommateurs utilisent le site, la médiation est obligatoire en France (à référencer dans CGV/CGU).
- **CGV pro séparées des CGU** — Conditions Générales de Vente pour l'abonnement pro (prix, facturation, résiliation, rétractation 14j).
- **Droit de rétractation des abonnements** — prévoir le délai de rétractation (L221-18 Code conso si consommateur) dans les CGV.
- **Facturation électronique (réforme FR 2026-2027)** — obligatoire pour les assujettis TVA émetteurs de factures ; anticiper le format (Factur-X/UBL) si BÂTI-AXE facture les abonnements.
- **Protection des bases de données (droit sui generis)** — le marché de leads est une base de données protégeable/protégée à documenter.
- **Monitoring & alerting (Axiom — voir P14)** — si l'API Mes Aides Réno tombe ou le webhook Stripe échoue, on ne le sait pas (le paywall mort a été découvert par hasard). Axiom = observabilité (logs/erreurs/alertes), complémentaire de Matomo (analytics produit) — cf. P14 ci-dessous.
- **Backups vérifiés + restauration testée** — ne pas se contenter de backups existants : tester une restauration.
- **Modération des contenus** — avis clients (Phase 7), réalisations, messages : qui vérifie, comment, délais.
- **Statut éditeur vs hébergeur (LCEN)** — place de marché ≠ simple éditeur : responsabilité sur les contenus des pros à documenter (CGU + procédure de retrait).
- **Responsabilité du badge « vérifié »** — encadrer dans les CGU la portée du badge décennale/SIRET + vérifier la RC de BÂTI-AXE elle-même.
- **Notifications navigateur (Web Push)** — voir P4 : email maintenant, Web Push natif via PWA en Phase 8.
- **Pages légales à finaliser (CGU, confidentialité, mentions légales)** — les 3 pages existent (`app/pages/legal/`) mais avec du contenu placeholder (SAS fictive, RCS fictif, adresse fictive). À compléter avec les vraies coordonnées + faire relire par un juriste. Skills communautaires identifiés (le 2026-08-19) : `kostja94/marketing-skills@legal-page-generator`, `anthropics/claude-for-legal@legal-writing`, `anthropics/knowledge-work-plugins@legal-risk-assessment` — à confirmer avant installation (skills non vérifiés).
- **Variante design « accueil sombre » (2026-08-18, appliquée puis revertée — en attente validation client)** — full-dark de la landing, à réappliquer si le client valide. Référence : base page `bg-slate-800` (#1E293B) + texte blanc ; cartes `bg-slate-700/40` + `border-white/10` ; corps `slate-300`, atténué `slate-400`, chiffres `slate-400` ; header sombre route-aware sur `/` (`border-white/10 bg-slate-800/95`, CTA « Déposer un projet » inversé `bg-white text-slate-900`). ⚠️ Logo PNG en RGB (fond non transparent) : prévoir une variante blanche/transparente pour header sombre. `RealisationCard` (composant partagé avec le profil pro clair) restée blanche dans la variante — ajouter une prop `dark` si retenue. Fichiers concernés : `app/pages/index.vue`, `app/layouts/default.vue`, `app/components/BeforeAfterSlider.vue` (bordure `white/15`).
