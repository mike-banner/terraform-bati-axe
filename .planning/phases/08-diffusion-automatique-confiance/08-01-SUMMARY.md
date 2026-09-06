---
phase: 08-diffusion-automatique-confiance
plan: 01
subsystem: database
tags: [supabase, postgres, vitest, notifications, email]

requires: []
provides:
  - "Table b2b_tender_notifications (idempotence pro/lot/canal) + RLS admin"
  - "Colonne professionals.b2b_alerts_email (opt-in, défaut true)"
  - "server/utils/notifyB2bPros.ts : selectB2bTargets, renderTenderEmail, notifyMatchedB2bPros"
affects: [08-02-diffusion-endpoint, 08-03-trigger-dirco]

tech-stack:
  added: []
  patterns:
    - "Deux requêtes séquentielles (pro_zones puis professionals.in(ids)) au lieu d'un embedding PostgREST filtré, pour éviter les pièges d'embedding déjà rencontrés sur auth.users"

key-files:
  created:
    - supabase/migrations/20260905000000_phase8_b2b_tender_notifications.sql
    - server/utils/notifyB2bPros.ts
    - tests/unit/notify-b2b-pros.test.ts
  modified:
    - app/types/database.types.ts

key-decisions:
  - "notifyMatchedPros (server/utils/notifyProLead.ts) non modifié — nouveau fichier séparé pour le flux B2B, filtres divergents (pro_zones absent du flux particuliers)"
  - "Migration appliquée en local via psql direct (contournement documenté en Phase 7 : supabase migration up --local bloqué par une dérive préexistante de schema_migrations)"

patterns-established:
  - "Idempotence par UNIQUE(pro_id, lot_id, channel), miroir du pattern lead_notifications"

requirements-completed: [TEND-04, TEND-06, TEND-14]

duration: ~35min
completed: 2026-09-05
---

# Phase 08: Diffusion automatique et confiance — Plan 01 Summary

**Table d'idempotence b2b_tender_notifications + opt-in b2b_alerts_email + moteur notifyMatchedB2bPros (matching zone×catégorie, plafond quotidien, badge « AO qualifié BÂTI-AXE ») — migration poussée en local et sur le projet distant**

## Performance

- **Tasks:** 3 (Task 1 migration, Task 2a application locale, Task 2b TDD moteur) + Task 3 (push remote + types, complétée après confirmation humaine explicite)
- **Files modified:** 4

## Accomplissements
- Table `b2b_tender_notifications` créée (local + remote) avec `UNIQUE(pro_id, lot_id, channel)`, index sur `lot_id` et `(pro_id, sent_at)`, RLS service_role uniquement
- Colonne `professionals.b2b_alerts_email BOOLEAN NOT NULL DEFAULT true`
- `notifyMatchedB2bPros()` : matching zone active × catégorie × vérifié × opt-in, respect du plafond quotidien par artisan, envoi email non-bloquant avec badge « AO qualifié BÂTI-AXE »
- Types Supabase régénérés depuis le projet distant après push

## Task Commits

1. **Task 1: Migration b2b_tender_notifications + opt-in b2b_alerts_email** - `b8e5b48` (feat)
2. **Task 2b: Tests unitaires en échec (RED)** - `586c1ff` (test)
3. **Task 2b: notifyMatchedB2bPros (GREEN)** - `8010d7b` (feat)
4. **Task 3: Régénération types Supabase après push remote** - `612372d` (chore)

_Task 2a (application locale de la migration) n'a produit aucun commit — action DB pure via `psql -f`, aucun fichier versionné à committer._

## Files Created/Modified
- `supabase/migrations/20260905000000_phase8_b2b_tender_notifications.sql` - Table d'idempotence + colonne opt-in + RLS
- `server/utils/notifyB2bPros.ts` - Matching, sélection cibles, rendu email, envoi
- `tests/unit/notify-b2b-pros.test.ts` - 9 tests (matching, idempotence, plafond, badge email)
- `app/types/database.types.ts` - Régénéré après push remote (contient `b2b_tender_notifications`, `b2b_alerts_email`)

## Decisions Made
- Deux requêtes séquentielles (`pro_zones` puis `professionals.in(ids)`) plutôt qu'un embedding PostgREST filtré `professionals!inner(pro_zones)` — RESEARCH.md signalait l'absence de précédent dans ce repo et un embedding cassé connu sur `auth.users`
- `notifyProLead.ts` (flux particuliers P4) non touché — nouveau fichier séparé pour le flux B2B

## Deviations from Plan
None - plan exécuté tel qu'écrit, y compris le checkpoint bloquant avant push remote (Task 3), levé après confirmation humaine explicite en conversation.

## Issues Encountered
- `supabase migration up --local` bloqué par une dérive préexistante de `schema_migrations` (connue depuis la Phase 7) → migration appliquée en local via `psql -f` directement, vérifiée par `to_regclass` et `information_schema.columns`
- Le worktree d'exécution n'avait pas de projet Supabase lié (`supabase/.temp/project-ref` absent, non versionné) → `npx supabase link --project-ref xpwoczcbyamnjknloxgz` exécuté avant le push

## User Setup Required
None - aucune configuration externe manuelle requise (push et génération de types automatisés via CLI).

## Next Phase Readiness
`notifyMatchedB2bPros()` est prêt à être appelé par l'endpoint admin « Diffuser » (Plan 08-02). Aucun blocage identifié pour la suite.

---
*Phase: 08-diffusion-automatique-confiance*
*Completed: 2026-09-05*
