---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 05.5-07-PLAN.md
last_updated: "2026-07-19T02:09:50.447Z"
last_activity: 2026-07-19
progress:
  total_phases: 13
  completed_phases: 5
  total_plans: 41
  completed_plans: 37
  percent: 38
---

# Project State

## 🔒 Lock & Sync Status

- **Lock Type:** None
- **Git-Pulse:** Enabled (run `scripts/git-pulse.sh` to check for Claude's activity)
- **Vault Sync:** Enabled (run `scripts/sync-vault-to-ki.py` after Vault updates)

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02)

**Core value**: Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment.
**Current focus**: Phase 5.6 — Calculateur de Prix & Refonte Simulateur

## Current Position

Phase: 05.5 (Portfolio-Refonte) — COMPLETE (8/8 plans)
Next phase: 05.6 (Calculateur de Prix & Refonte Simulateur) — PLANNED (0 plans, en attente de découpage technique)
Status: Ready to plan next phase
Last activity: 2026-07-19
Progress: [█████████░] 90%

### Plans Phase 5.5 (Portfolio, Refonte Profil & Social) — COMPLETE (8/8 plans)

- Voir `.planning/phases/05.5-Portfolio-Refonte/` (01 à 08, toutes SUMMARY livrées).

### Plans Phase 5.6 (Calculateur de Prix) — PLANNED (0 plans)

- En attente de découpage technique (`gsd-plan-phase`).

### Plans Phase 5 (blocked/deferred)

- [x] 05-01 — Magic Link & Messagerie in-app (livré, validé prod)
- [x] 05-03 — Feedback loop (refus→remise auto) + profil public espace particulier (livré, validé prod 2026-06-16, merge b4970a9). Partie B onboarding emails (REQ-07) NON faite.
- [ ] 05-02 — Acquisition Pros (cold email) — 🔴 bloqué : pas de liste de pros (CSV à fournir)
- [ ] 05-04 — SMS différencié — ⏸ DIFFÉRÉ (aucune dépense sans feu vert)

## Performance Metrics

**Velocity:**

- Total phases completed: 2
- Average duration: N/A
- Total execution time: N/A

## Accumulated Context

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

### Known Patterns (à appliquer dans les prochaines phases)

**Ajouter un admin** : mettre l'email dans `ADMIN_EMAILS` dans `.env` (local) et dans les env vars Cloudflare Pages (prod). Le check est dans `server/api/v1/admin/verify.post.ts` et `app/pages/admin/index.vue`.

**Nouvelle route protégée** : appeler `useRequireAuth()` en haut du `<script setup>` (composable `app/composables/useRequireAuth.ts`). NE PAS utiliser `watchEffect(() => { if (!user.value) navigateTo('/pro/claim') })` : ce pattern redirige sur le `null` transitoire de `useSupabaseUser()` pendant l'hydratation et éjecte un pro pourtant connecté au rechargement (bug corrigé le 2026-06-13). Le composable valide la session de façon autoritaire via `getSession()` puis ne réagit qu'à une déconnexion explicite. Toujours pas de middleware global car `supabase.redirect` est à `false` (ADR).

**Profil non encore vérifié** : ne jamais retourner 404 pour un profil existant — retourner les données avec `is_verified: false` et laisser la page afficher l'état pending. Réserver 404 aux profils introuvables en DB.

**Variable d'env manquante** : documenter dans `.env.example` immédiatement après ajout dans le code. C'est le seul endroit committé qui liste toutes les vars requises.

### Deferred Ideas (hors scope, à reconsidérer plus tard)

**Upload photos/plans sur les projets** — Idée écartée à Phase 4.

- Problème bloquant : une photo de façade ou de chantier contient des informations géolocalisables qui court-circuitent ADR-004 (masquage serveur). Un pro BASIC verrait la maison du prospect avant déverrouillage.
- Décision : pertinent **uniquement** si on construit un suivi de relation client/pro directement sur le site (messagerie, fil de chantier, avancement). Dans ce contexte, les images seraient derrière le même accès conditionné que les coordonnées.
- À reconsidérer en Phase 6+ si on ajoute une fonctionnalité de suivi de chantier (messagerie pro↔client, jalons de projet, photos d'avancement).

### Pending Todos

- [ ] PIVOT B2B : Re-poser la question à l'utilisateur sur le modèle de rémunération des prescripteurs (gratuit vs commission).
- [ ] PIVOT B2B : Re-poser la question sur le remplacement du mot "Particulier" par "Client Final".

### Blockers/Concerns

- **Browser tests block** : L'environnement de navigation Chromium local a des soucis d'initialisation dans le sandbox, mais les tests d'API et compilations sont OK.
- **ADMIN_EMAILS en prod** : à ajouter manuellement dans Cloudflare Pages > Settings > Environment variables avant de tester la console admin en production.

## Session Continuity

Last session: 2026-07-19T02:09:50.433Z
Stopped at: Completed 05.5-07-PLAN.md
Resume file: None
