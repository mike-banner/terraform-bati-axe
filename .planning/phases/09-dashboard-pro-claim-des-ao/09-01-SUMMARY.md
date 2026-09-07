---
phase: 09-dashboard-pro-claim-des-ao
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migration, masking, vitest]

# Dependency graph
requires:
  - phase: 08-diffusion-automatique-confiance
    provides: b2b_tender_lots, b2b_tender_notifications (schéma AO partenaire)
provides:
  - Table b2b_tender_claims (miroir de leads) tracant qui a claim quel lot
  - Colonnes de clôture (closed_at/closed_reason) sur b2b_tender_lots
  - Colonnes de signalement (reported_count/reported_at/report_reasons) sur b2b_requests
  - server/utils/maskTender.ts — fonction pure de masquage/révélation coordonnées AO
affects: [09-02, 09-03, 09-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Table de junction créée uniquement à l'événement (claim) — jamais en amont, miroir de leads/ADR-004"
    - "RLS service_role uniquement sur table B2B sensible (policy admin, aucun accès anon/authenticated)"

key-files:
  created:
    - supabase/migrations/20260907000000_phase9_tender_claims.sql
    - server/utils/maskTender.ts
    - tests/unit/mask-tender.test.ts
  modified:
    - app/types/database.types.ts

key-decisions:
  - "maskTender() réplique exactement la forme de maskLead() (locked/claimed) pour cohérence avec le pattern leads déjà en prod"
  - "Aucune colonne status sur b2b_tender_claims (D-06) : le retrait de claim est hors périmètre Phase 9"

patterns-established:
  - "maskTender(lot, claimed): fonction pure sans dépendance Nitro/Supabase, testable en isolation sous vitest"

requirements-completed: [TEND-03, TEND-09, TEND-12, TEND-13]

duration: 25min
completed: 2026-09-07
---

# Phase 9 Plan 01: Fondation base + masquage AO partenaire Summary

Migration `b2b_tender_claims` poussée en distant (miroir de `leads`), colonnes de clôture/signalement ajoutées, et `maskTender()` teste et masque les coordonnées partenaire tant que l'artisan n'a pas claim le lot.

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-07T11:15:00Z
- **Completed:** 2026-09-07T11:40:00Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- Table `b2b_tender_claims` créée et appliquée en base distante (`xpwoczcbyamnjknloxgz`) avec RLS activée (policy admin uniquement) et contrainte `UNIQUE (lot_id, pro_id)`
- Colonnes de clôture automatique (`closed_at`, `closed_reason` CHECK cap/expired/manual) sur `b2b_tender_lots`
- Colonnes de signalement (`reported_count`, `reported_at`, `report_reasons`) sur `b2b_requests`
- `app/types/database.types.ts` régénéré et committé
- `maskTender()` — fonction pure testée (6 tests verts), ne fuit jamais de coordonnée ni `postal_code` avant claim

## Task Commits

1. **Task 1: Migration schéma claims + clôture + signalement** - `4411430` (feat)
2. **Task 2: Push migration distante + régénération des types** - `508d016` (chore)
3. **Task 3: maskTender() — masquage coordonnées partenaire** - `319dbc6` (test, RED) → `46f2757` (feat, GREEN)

## Files Created/Modified
- `supabase/migrations/20260907000000_phase9_tender_claims.sql` - Table claims + colonnes clôture/signalement, RLS admin
- `app/types/database.types.ts` - Types régénérés incluant `b2b_tender_claims`, `closed_reason`, `report_reasons`
- `server/utils/maskTender.ts` - Masquage/révélation coordonnées partenaire (miroir `maskLead`)
- `tests/unit/mask-tender.test.ts` - 6 tests couvrant locked/claimed, troncature description, masquage `postal_code`

## Deviations from Plan

None - plan executed exactly as written. Seul ajustement : le projet Supabase n'était pas lié dans ce worktree fraîchement créé (`.supabase/.temp` non versionné) — `npx supabase link --project-ref xpwoczcbyamnjknloxgz` exécuté avant le `db push` (Rule 3 - blocage d'exécution, pas une déviation du plan).

## Self-Check: PASSED
