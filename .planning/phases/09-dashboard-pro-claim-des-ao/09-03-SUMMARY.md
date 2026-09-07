---
phase: 09-dashboard-pro-claim-des-ao
plan: 03
subsystem: b2b-tenders
tags: [cron, github-actions, zod, vue, moderation]

# Dependency graph
requires:
  - phase: 09-dashboard-pro-claim-des-ao
    plan: "09-01"
    provides: b2b_tender_lots.closed_at/closed_reason, b2b_requests.reported_count/reported_at/report_reasons
provides:
  - Cron de clôture automatique des lots ouverts diffusés depuis >= 14 jours
  - Endpoint de signalement d'un AO suspect par un artisan authentifié
  - Badge « ⚠ Signalé » + détail des raisons dans l'onglet B2B admin
affects: [09-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cron HTTP calqué sur decennale-alerts.get.ts : fonction pure exportée + garde secret partagé + workflow GitHub Actions dédié"
    - "Signalement purement informatif (D-09/D-10) : aucune écriture ne touche le statut du lot ni du dossier, seul un compteur/raisons s'accumulent côté b2b_requests"

key-files:
  created:
    - server/api/v1/cron/close-expired-tenders.get.ts
    - .github/workflows/cron-close-expired-tenders.yml
    - server/api/v1/tenders/[id]/report.post.ts
    - tests/unit/close-expired-tenders.test.ts
  modified:
    - app/components/admin/AdminB2bTab.vue

key-decisions:
  - "Date de référence de l'expiration = date de première diffusion réelle (MIN(sent_at) sur b2b_tender_notifications), pas la date de création du lot — un lot jamais diffusé n'expire jamais"
  - "report.post.ts ne renvoie que { status: 'SUCCESS' } : le compteur de signalements reste invisible côté artisan (T-09-14)"

patterns-established:
  - "selectExpiredLots(lots, now): fonction pure testable en isolation, même style que selectAlerts (decennale-alerts.get.ts)"

requirements-completed: [TEND-12, TEND-13]

duration: 20min
completed: 2026-09-07
---

# Phase 9 Plan 03: Clôture automatique 14 jours + signalement artisan Summary

Cron HTTP + workflow GitHub Actions clôturant les lots B2B ouverts diffusés depuis 14 jours ou plus, et endpoint de signalement d'AO suspect restitué en badge informatif dans l'onglet B2B admin.

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-07T13:40:00Z
- **Completed:** 2026-09-07T14:00:00Z
- **Tasks:** 3/3
- **Files modified:** 5

## Accomplishments
- `selectExpiredLots()` — fonction pure testée (5 tests verts) : `>= 14 jours` de diffusion réelle → clos, statuts `closed`/`claimed` jamais retouchés, lot jamais diffusé jamais expiré
- `server/api/v1/cron/close-expired-tenders.get.ts` — même garde `cronSecret` (401 si absent/incorrect) que `decennale-alerts.get.ts`, clôture en masse bornée à `limit(1000)`, ne peut que `open → closed` avec `closed_reason: 'expired'`
- `.github/workflows/cron-close-expired-tenders.yml` — déclenchement quotidien 07h30 UTC (décalé du cron décennale à 07h00), `workflow_dispatch` conservé
- `server/api/v1/tenders/[id]/report.post.ts` — artisan authentifié signale un lot (`reason` enum 5 valeurs + `details` borné 500 caractères), incrémente `reported_count`/`reported_at`/`report_reasons` (tronqué aux 20 derniers) sans jamais toucher au statut du lot ou du dossier
- `AdminB2bTab.vue` — badge « ⚠ Signalé ×N » dans l'en-tête de carte + encart détaillant les raisons à l'ouverture, avec rappel explicite « l'appel d'offres reste diffusé » (24 lignes ajoutées)

## Task Commits

1. **Task 1: Cron de clôture des AO expirés (14 jours) + workflow** - `6857ea6` (test, RED) → `c792c80` (feat, GREEN)
2. **Task 2: POST /api/v1/tenders/[id]/report** - `6bbb3d8` (feat)
3. **Task 3: Badge « ⚠ signalé » dans AdminB2bTab.vue** - `d33c89d` (feat)

## Files Created/Modified
- `server/api/v1/cron/close-expired-tenders.get.ts` - Fonction pure `selectExpiredLots` + handler cron (garde secret, lecture lots ouverts + notifications, clôture en masse)
- `.github/workflows/cron-close-expired-tenders.yml` - Déclenchement quotidien GitHub Actions
- `server/api/v1/tenders/[id]/report.post.ts` - Endpoint de signalement (Zod enum + max 500, écriture sur `b2b_requests`)
- `tests/unit/close-expired-tenders.test.ts` - 5 tests couvrant les comportements du plan
- `app/components/admin/AdminB2bTab.vue` - Interface `B2bRequest` étendue + badge en-tête + encart détail

## Deviations from Plan

### Auto-fixed Issues

None — les 3 tâches ont été exécutées telles que spécifiées (schéma Zod, séquence, garde cron, badge admin).

### Out of scope (déféré)

**1. `npm run build` cassé indépendamment de ce plan** — `TypeError: trustedFunctions.difference is not a function` dès `nuxt build`, reproduit à l'identique en retirant temporairement les fichiers créés par ce plan (`server/api/v1/tenders/`). Cause probable : `Set.prototype.difference` (ES2024) nécessite Node >= 22, l'environnement d'exécution est en Node 20.20.0. Hors périmètre — documenté dans `.planning/phases/09-dashboard-pro-claim-des-ao/deferred-items.md`. Vérification de substitution effectuée : `npx vitest run tests/unit/` → 111/111 tests verts (dont les 5 nouveaux).

## Known Stubs

Aucun.

## Threat Flags

Aucun — les 4 menaces du threat_model du plan (T-09-10 à T-09-14) sont couvertes par l'implémentation telle que spécifiée, aucune surface de sécurité additionnelle introduite.

## Self-Check: PASSED
