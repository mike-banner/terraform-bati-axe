---
gsd_state_version: 1.0
milestone: v0.9.0-experience-pro
milestone_name: Experience & Growth Pro
status: ready_to_plan_v0.9.1
stopped_at: Phase 5.9 exécutée (4/4 plans) — prochaine étape Phase 8
last_updated: "2026-08-18T00:00:00.000Z"
last_activity: 2026-08-18
progress:
  total_phases: 13
  completed_phases: 11
  total_plans: 49
  completed_plans: 48
  percent: 98
---

# Project State

## 🔒 Lock & Sync Status

- **Lock Type:** None
- **Git-Pulse:** Enabled (run `scripts/git-pulse.sh` to check for Claude's activity)
- **Vault Sync:** Enabled (run `scripts/sync-vault-to-ki.py` after Vault updates)

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02)

**Core value**: Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment.
**Current focus**: Phase 8 — PWA Mobile-First (scope réduit). Phase 05.9 livrée (aides rénovation), Phase 06 différée (décision utilisateur 2026-08-18).

## Current Position

Phase: 5.9 (extension-simulateur-mes-aides-reno) — exécutée (4/4 plans livrés : 01 proxy, 02 composant, 03 fork simulateur, 04 standalone/home/espace client)
Ensuite: Phase 8 (pwa-mobile-first, scope réduit sans Capacitor)
Status: Complete (4/4 plans livrés) — Phase 06 mise en pause (06-01 seul livré)
Last activity: 2026-08-18

### Plans Phase 06 (Messagerie & Espace Client) — acquisition retirée, SMS différé

- [x] 06-01 — Magic Link & Messagerie In-App (codé et mergé dans `dev` le 2026-06-15, hors flux GSD ; vérifié via `06-UAT.md` status complete 4/5 PASS + 1 fixed ; `06-01-SUMMARY.md` rédigé rétroactivement le 2026-08-06). Bug majeur trouvé et corrigé : verrou de déblocage manquant côté messagerie pro (ADR-004), fix sur `fix/messaging-unlock-guard`.
- [ ] 06-02 — Acquisition Pros (cold email) — ⏸ RETIRÉ de la Phase 6 (décision 2026-08-18) : pas prioritaire tant que le site se construit. Reporté post-lancement, source (CSV/seed/scrape) à trancher le moment venu.
- [~] 06-03 — Feedback loop lead (REQ-06) + profil public espace particulier (REQ-09) livrés hors-plan (commit `b4970a9`) ; Email onboarding (REQ-07, flag off par défaut) reste à faire.
- [ ] 06-04 — SMS différencié — ⏸ DIFFÉRÉ volontairement en tout dernier (décision utilisateur 2026-06-16 : aucune dépense fournisseur SMS sans feu vert explicite)

Dette connue héritée du plan 06-01 : passe visuelle Playwright jamais faite (MCP bloqué sur Chrome système, fix identifié mais non appliqué), 10 erreurs typecheck préexistantes dans `server/api/v1/leads/index.get.ts`, angle mort d'observabilité sur la notification mock-email client→pro.

### Plans Phase 5.5 (Portfolio, Refonte Profil & Social) — COMPLETE (8/8 plans)

- Voir `.planning/phases/05.5-Portfolio-Refonte/` (01 à 08, toutes SUMMARY livrées).

### Plans Phase 5.6 (Calculateur de Prix) — COMPLETE (3/3 plans)

- Voir `.planning/phases/05.6-Calculateur-Simulateur/`.

## Performance Metrics

**Velocity:**

- Total phases completed: 2
- Average duration: N/A
- Total execution time: N/A

## Accumulated Context

### Roadmap Evolution

- Phase 05.8 inserted after Phase 5: Enrichissement SIRET (forme juridique, NAF, suggestion catégories) au claim — étend server/utils/siretLookup.ts, ajoute siret_legal_form/siret_naf_code sur professionals, mapping statique NAF→catégories BTP, pré-cochage au claim (pro confirme). Scope claim uniquement pour l'instant.
- Phase 05.8 edited: Ajout scope 05.8 : auto-approuver le Kbis à l'upload si professionals.siret_status === 'active' (déjà vérifié au claim), même pattern que l'auto-approbation décennale dans upload.post.ts. Évite la revue admin manuelle quand l'API gouv confirme déjà l'existence/activité de l'entreprise.
- [2026-08-06] Phase 8 ajoutée à ROADMAP.md : Architecture PWA Mobile-First & Packaging Stores (Capacitor 6) — @vite-pwa/nuxt offline-resilient, Bottom Bar Shell mobile, wrapper Capacitor 6 pour App Store/Play Store. Dépend de Phase 4.7 et Phase 6.
- [2026-08-06] Resynchronisation STATE.md via /gsd:progress : le plan 06-01 (Magic Link & Messagerie) était déjà codé, vérifié et mergé dans `dev` depuis le 2026-06-15 mais hors flux GSD (pas de SUMMARY.md) — STATE.md affichait encore Phase 06 "Not started" avant cette mise à jour. SUMMARY rédigé rétroactivement à partir de `06-UAT.md`.
- [2026-08-18] Décision utilisateur : l'acquisition pros (cold outreach, REQ-05 / plan 06-02) est retirée de la Phase 6 et reportée post-lancement — le site se construit d'abord, l'acquisition n'est pas une priorité. La Phase 6 ne conserve que messagerie/espace client (livré) + email onboarding (flag off) ; SMS déjà différé. ROADMAP.md resynchronisé en conséquence (ajout Phase 05.9 + réduction Phase 8 sans Capacitor).
- [2026-08-18] Décision Phase 05.9 : le mini-tunnel aides devient un **embranchement optionnel avant le lead wall** (fork Oui/Non après l'étape localisation) — un seul `POST /projects`, révélation « bilan complet » unique (estimation + aides + reste à charge). Route standalone `/calculateur-aides` conservée. Le revenu n'est demandé qu'en opt-in.

### Decisions

- [Pre-Phase]: Pivot Nuxt 3 unique (ADR-008).
- [Pre-Phase]: URL hybride slug + nanoid(8) pour les profils pro (ADR-009).
- [Phase 2]: Intégration de Zod et client Service Role pour contourner le RLS client sur l'API publique `/api/v1/projects`.
- [Phase 3]: Accès admin contrôlé par `ADMIN_EMAILS` env var (pas de table rôles en DB pour l'instant). Ajouter l'email dans `.env` local ET dans Cloudflare Pages > Settings > Environment variables en prod.
- [Phase 4.6]: Architecture "Marché Dynamique" : abandon du modèle "Push" dans la table `leads`. Les chantiers sont lus en direct depuis `projects` selon le tableau `categories TEXT[]` du profil Pro. La ligne `leads` n'est créée qu'au moment du déblocage ou claim. Les UI utilisent des checkboxes multi-sélection.
- [2026-06-13 AM]: Garde d'auth centralisée dans le composable `useRequireAuth()` (remplace le `watchEffect` fragile sur les 7 pages protégées) — corrige une race d'hydratation qui éjectait un pro connecté au rechargement de `/espace/*`. Voir Known Patterns ci-dessous.
- [2026-06-13 AM]: Indicateur de fraîcheur des leads (`app/components/LeadAge.vue`) : badge d'âge dont le ton chauffe (vert <24h → ambre 3-7j → rouge ≥7j) pour pousser le pro à contacter vite. `created_at` était déjà exposé par l'API leads.
- [2026-06-13 PM]: **Bug fix `useRequireAuth()`** : `getSession()` retournait `null` transitoirement à l'hydratation SSR. Refactorisé en `watch(immediate)` pour attendre la première valeur non-undefined de `user`. Cela permettait aux users non-connectés d'être redirigés vers login même après une création de compte réussie.
- [2026-06-13 PM]: **Structure V1 professionnel** : séparation claire entre Dashboard (statut + upload docs) et Profil (édition infos publiques + nouveau champ Téléphone). Validation stricte : accès leads bloqué si `is_verified = false`.
- [2026-06-13 PM]: **Timeout auto-logout** : inactivité 30 min → déconnexion automatique (composable `useIdleLogout.ts`). Appliqué au layout `dynamic.vue` pour les pages protégées.
- [2026-06-13 PM]: **RLS Security Verified & Documented** : All 11 tables have RLS enabled. Security policies enforce: public SELECT on verified professionals only; authenticated users full access to own records; service-role-only for sensitive tables (projects, prospects, paywall_events, audit_logs). Migration `20260613000000_test_data_seeding.sql` creates 18 test leads (3 per category) with full verification documents. Architecture is reproducible for production deployment. See `.planning/RLS-SECURITY.md`.
- [2026-06-23 PM]: **Phase 4.7 Design System Adoption** : Transition from self-hosted Clash Display + Geist Variable (Brique & Béton OKLCH palette) to Google Fonts (Figtree + Noto Sans) with MASTER.md hex color system (cyan #0891B2, green #22C55E, cream #ECFEFF, charcoal #164E63). CSS tokens for spacing, shadows, and radius defined in `app/assets/css/tailwind.css` as the foundation for all subsequent page refactors (04.7-02 through 04.7-07).
- [Phase 04.7]: Composants PremiumBadge et IdentityBreadcrumbs bâtis sur la nouvelle charte Sketch 001 (gris industriel + orange sécurité), en attendant la refonte globale des tokens tailwind.css.
- [Phase 05.5-07]: Profil public pro refondu en pleine page immersive (layout: false) avec bouton flottant retour, galerie de réalisations mobile-first (RealisationCard) et likes ; test de garde source anti-régression navbar/galerie.
- [Phase 05.5-08]: Section landing preuve sociale 'Chantiers Réalisés' en carousel CSS scroll-snap pur (pas d'Embla), SSR via useFetch, réutilise RealisationCard sans dupliquer le markup ; section omise entièrement si aucun projet is_showcased.
- [Phase 05.6]: Tasks 1-3 du plan 05.6-03 livrées en un seul commit atomique (réécriture cohésive d'un fichier unique)
- [Phase 05.6]: Transition inter-étapes simulateur : fade CSS simple plutôt que reveal-item/reveal-up (conçu pour montage, pas cycle enter/leave répété)
- [2026-08-18] Terminologie pro-centrique : « client » = professionnel abonné (payeur), « particulier » = porteur de projet (demande). « Client Final » écarté (ambigu). Rémunération prescripteurs = commission dégressive 8→2,5% + Stripe Connect (spec 18/08).

### Known Patterns (à appliquer dans les prochaines phases)

**Ajouter un admin** : mettre l'email dans `ADMIN_EMAILS` dans `.env` (local) et dans les env vars Cloudflare Pages (prod). Le check est dans `server/api/v1/admin/verify.post.ts` et `app/pages/admin/index.vue`.

**Nouvelle route protégée** : appeler `useRequireAuth()` en haut du `<script setup>` (composable `app/composables/useRequireAuth.ts`). NE PAS utiliser `watchEffect(() => { if (!user.value) navigateTo('/pro/claim') })` : ce pattern redirige sur le `null` transitoire de `useSupabaseUser()` pendant l'hydratation et éjecte un pro pourtant connecté au rechargement (bug corrigé le 2026-06-13). Le composable valide la session de façon autoritaire via `getSession()` puis ne réagit qu'à une déconnexion explicite. Toujours pas de middleware global car `supabase.redirect` est à `false` (ADR).

**Profil non encore vérifié** : ne jamais retourner 404 pour un profil existant — retourner les données avec `is_verified: false` et laisser la page afficher l'état pending. Réserver 404 aux profils introuvables en DB.

**Variable d'env manquante** : documenter dans `.env.example` immédiatement après ajout dans le code. C'est le seul endroit committé qui liste toutes les vars requises.

### Deferred Ideas (hors scope, à reconsidérer plus tard)

**Acquisition pros (cold outreach / source prospects)** — Retiré de la Phase 6 le 2026-08-18. Import prospects + invitation email + funnel admin (REQ-05, plan 06-02) reportés à la toute fin : le site se construit d'abord, l'acquisition sortante n'est pas une priorité. Source (CSV/seed/scrape) à trancher le moment venu.

**Upload photos/plans sur les projets** — Idée écartée à Phase 4.

- Problème bloquant : une photo de façade ou de chantier contient des informations géolocalisables qui court-circuitent ADR-004 (masquage serveur). Un pro BASIC verrait la maison du prospect avant déverrouillage.
- Décision : pertinent **uniquement** si on construit un suivi de relation client/pro directement sur le site (messagerie, fil de chantier, avancement). Dans ce contexte, les images seraient derrière le même accès conditionné que les coordonnées.
- À reconsidérer en Phase 6+ si on ajoute une fonctionnalité de suivi de chantier (messagerie pro↔client, jalons de projet, photos d'avancement).

### Pending Todos

- [x] PIVOT B2B (2026-08-18) : rémunération des prescripteurs = commission au succès dégressive (8% ≤25k → 6% → 4% → 2,5% >200k) + split Stripe Connect (spec client 18/08 §4.3-4.4).
- [x] PIVOT B2B (2026-08-18) : **ne pas** remplacer "Particulier" par "Client Final" — modèle pro-centrique : le client payeur est le pro abonné, le particulier est la demande (porteur de projet).

### Blockers/Concerns

- **Browser tests block** : L'environnement de navigation Chromium local a des soucis d'initialisation dans le sandbox, mais les tests d'API et compilations sont OK.
- **ADMIN_EMAILS en prod** : à ajouter manuellement dans Cloudflare Pages > Settings > Environment variables avant de tester la console admin en production.

## Session Continuity

Last session: 2026-08-17T23:21:33.239Z
Stopped at: Phase 5.9 context gathered
Resume file: .planning/phases/05.9-extension-simulateur-mes-aides-reno/05.9-CONTEXT.md
