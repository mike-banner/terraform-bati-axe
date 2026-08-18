# Roadmap: BÂTI-AXE

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
- [x] **Phase 5.8: Tunnel B2B & Apporteurs d'Affaires** - Landing page partenaire ("Bras armé technique"), dépôt de plans/rapports expert, SLA de 4h, attestation décennale 1-clic pour syndics, archis et assureurs. (completed 2026-07-20)
- [ ] **Phase 6: Messagerie & Espace Client (acquisition + SMS reportés)** - Messagerie in-app pro↔particulier, dashboard particulier magic-link, feedback loop lead, email onboarding (désactivé par défaut). Acquisition cold outreach et SMS différencié sortis de cette phase → reportés post-lancement.
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

### Phase 5.8: Tunnel B2B & Apporteurs d'Affaires
**Goal**: Déployer un Fast-Track dédié aux VIPs (Architectes, Syndics, Assureurs, Experts) avec un positionnement "Tiers de confiance / Courtier".
**Depends on**: Phase 4.7
**Success Criteria** (what must be TRUE):
  1. Une Landing Page dédiée "Espace Partenaires" positionne BÂTI-AXE comme un Hub d'artisans certifiés sans risque opérationnel.
  2. Un tunnel en 3 étapes : Qualification Pro → Niveau de Risque/Lot → Dépôt express (Plans, CCTP, Rapports d'expertise).
  3. L'acceptation des CGU dans le tunnel force le consentement explicite : BÂTI-AXE est courtier, l'artisan porte la décennale.
  4. L'attestation décennale BÂTI-AXE est téléchargeable en un clic depuis cette page pour rassurer immédiatement le prescripteur.
**Plans**: TBD
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
  5. Les emails d'onboarding pro (J+0 / J+1 / J+3) sont implémentés mais inactifs par défaut (`ONBOARDING_EMAILS=false`).
  6. Un pro peut marquer un lead "Chantier décroché" depuis la fiche lead ; le taux de conversion s'affiche dans le bloc ROI.
**Plans**: 4 plans (06-01 livré en prod ; 06-02 acquisition retiré → post-lancement ; 06-03 feedback/onboarding — REQ-06/09 livrés, REQ-07 reste ; 06-04 SMS différé)
**UI hint**: yes

### Phase 7: Réputation & Scale
**Goal**: Pérenniser la croissance par la preuve sociale et l'expansion géographique conditionnée aux métriques pilote.
**Depends on**: Phase 6
**Requirements**: REP-01, REP-02, SCL-01
**Success Criteria** (what must be TRUE):
  1. Un particulier peut laisser un avis sur un pro après attribution d'un chantier ; l'avis est affiché sur le profil public.
  2. Un pro peut inviter un collègue via un lien de parrainage ; les deux reçoivent 1 mois offert à l'activation.
  3. L'ouverture d'une nouvelle ville est conditionnée à : ≥3 pros Premium actifs + ≥10 projets qualifiés/mois sur Carrières-sous-Poissy.
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
| 5.8. Tunnel B2B & Apporteurs d'Affaires | 3/3 | Complete   | 2026-07-20 |
| 6. Messagerie & Espace Client | 1/4 | In progress (06-01 livré ; acquisition retirée, SMS différé) | - |
| 05.9 Extension Simulateur Mes Aides Réno | 4/4 | Complete | 2026-08-18 |
| 7. Réputation & Scale | 0/TBD | Not started | - |
| 8. Architecture PWA Mobile-First | 0/TBD | Not started | - |

## Deferred (post-lancement)

Reportés en toute fin — exécuter seulement après que le produit soit construit et validé :

- **Acquisition pros (cold outreach)** — retiré de la Phase 6 le 2026-08-18 (REQ-05, plan 06-02). Import prospects + invitation email + funnel admin. Source (CSV/seed/scrape) à trancher le moment venu.
- **SMS différencié** (REQ-08, plan 06-04) — aucune dépense fournisseur sans feu vert explicite. Reco Brevo, alt OVH/Twilio.
- **Packaging stores (Capacitor)** — hors scope Phase 8, à reconsidérer via ADR dédié si besoin terrain documenté.
- **Design final email + passe design totale** (ux-pro-max → impeccable → taste-skill).
- **Compléter le calcul aides 05.9 (précision max)** — `DPE.actuel` / `projet.DPE visé` (classes A→G, valeurs validées le 2026-08-18 par appel réel) + `parcours d'aide` (enum à identifier dans `betagouv/reno`). Non bloquant : dégradation propre déjà en place (D-04).
