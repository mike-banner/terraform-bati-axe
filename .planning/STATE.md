---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
stopped_at: null
last_updated: "2026-06-13T20:41:00.000Z"
last_activity: 2026-06-13
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 16
  completed_plans: 15
  percent: 31
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02)

**Core value**: Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment.
**Current focus**: Phase 4: Le Verrou & Stripe Billing

## Current Position

Phase: 05 (SMS + Acquisition + Messagerie) — NOT STARTED
Plan: 0 of TBD
Status: Ready to plan
Last activity: 2026-06-11
Progress: [████████░░] 80%

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

None.

### Blockers/Concerns

- **Browser tests block** : L'environnement de navigation Chromium local a des soucis d'initialisation dans le sandbox, mais les tests d'API et compilations sont OK.
- **ADMIN_EMAILS en prod** : à ajouter manuellement dans Cloudflare Pages > Settings > Environment variables avant de tester la console admin en production.

## Session Continuity

Last session: 2026-06-13T01:44:32.217Z
Stopped at: context exhaustion at 75% (2026-06-13)
Resume file: None
