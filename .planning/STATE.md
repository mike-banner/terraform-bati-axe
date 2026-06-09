---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04.5-01-PLAN.md
last_updated: "2026-06-09T18:03:19.646Z"
last_activity: 2026-06-09
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 14
  completed_plans: 8
  percent: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02)

**Core value**: Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment.
**Current focus**: Phase 4: Le Verrou & Stripe Billing

## Current Position

Phase: 04.5 (conversion-qualification) — EXECUTING
Plan: 2 of 7
Status: Ready to execute
Last activity: 2026-06-09
Progress: [██████░░░░] 57%

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

### Known Patterns (à appliquer dans les prochaines phases)

**Ajouter un admin** : mettre l'email dans `ADMIN_EMAILS` dans `.env` (local) et dans les env vars Cloudflare Pages (prod). Le check est dans `server/api/v1/admin/verify.post.ts` et `app/pages/admin/index.vue`.

**Nouvelle route protégée** : utiliser `watchEffect(() => { if (!user.value) navigateTo('/pro/claim') })` en haut du `<script setup>` — ne pas utiliser le middleware global car `supabase.redirect` est à `false` (ADR).

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

Last session: 2026-06-09T18:03:19.629Z
Stopped at: Completed 04.5-01-PLAN.md
Resume file: None
