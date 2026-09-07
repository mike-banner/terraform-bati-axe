---
phase: 09-dashboard-pro-claim-des-ao
plan: 02
subsystem: api
tags: [nitro, supabase, zod, email, vitest]

# Dependency graph
requires:
  - phase: 09-dashboard-pro-claim-des-ao
    plan: 01
    provides: maskTender(), b2b_tender_claims, colonnes closed_at/closed_reason
provides:
  - GET /api/v1/tenders — liste des AO matchés (zone active × catégorie), masqués sauf claim du pro
  - POST /api/v1/tenders/[id]/claim — claim gaté (catégorie, zone, vérif, décennale), cap 1/3, clôture auto, révélation, email partenaire
  - server/utils/tenderClaim.ts (tenderCap, shouldCloseLot, renderTenderClaimEmail)
affects: [09-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cap dynamique par decision_status (confirme=1 exclusif, en_attente=3) recompté serveur après insertion — jamais délégué à un état client"
    - "Contrainte UNIQUE (lot_id, pro_id) absorbe la course concurrente (23505) → même chemin idempotent que le double-claim explicite"
    - "Échec d'envoi email jamais bloquant pour le claim (try/catch autour de sendEmail, console.error seul)"

key-files:
  created:
    - server/utils/tenderClaim.ts
    - server/api/v1/tenders/index.get.ts
    - server/api/v1/tenders/[id]/claim.post.ts
    - tests/unit/tender-claim.test.ts
  modified: []

key-decisions:
  - "CATEGORY_LABELS réutilisé depuis server/utils/categoryLabels.ts (déjà partagé) plutôt qu'exporté depuis b2bTender.ts comme suggéré par le plan — évite une nouvelle duplication alors qu'un util partagé existe déjà"
  - "Le lot ne passe jamais à 'claimed' (seulement 'open' → 'closed' au cap), conformément à l'action du plan : nécessaire pour que le cap 3 (en_attente) reste ouvert aux positionnements suivants"

patterns-established:
  - "tenderCap/shouldCloseLot/renderTenderClaimEmail : fonctions pures sans import #supabase, testables en isolation (miroir b2bTender.ts / notifyB2bPros.ts)"

requirements-completed: [TEND-03, TEND-07, TEND-08, TEND-09, TEND-16]

duration: 35min
completed: 2026-09-07
---

# Phase 9 Plan 02: API artisan des appels d'offres — liste + claim Summary

Deux endpoints Nitro (GET liste matchée masquée, POST claim gaté abonnement/catégorie/vérification) et un util pur `tenderClaim.ts` (cap 1/3, clôture, email partenaire) qui forment le cœur métier réel de la Phase 9 — le reste (plan 04, UI) n'est qu'une façade dessus.

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-07T13:40:00Z
- **Completed:** 2026-09-07T14:15:00Z
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- `server/utils/tenderClaim.ts` : `tenderCap()` (1 si confirmé, 3 sinon), `shouldCloseLot()` (comptage post-insertion), `renderTenderClaimEmail()` (sujet + HTML réutilisant le style `renderTenderEmail`) — 8 tests verts
- `GET /api/v1/tenders` : matching `pro_zones` actives × `professionals.categories`, masquage systématique via `maskTender()` sauf lots déjà claim par le pro connecté, `canClaim` calculé pour l'UI
- `POST /api/v1/tenders/[id]/claim` : gate en cascade (401 → 404 profil → 403 non vérifié → 403 décennale invalide → 404 lot → 403 catégorie → 403 zone non abonnée → 409 lot clos), idempotence sur claim existant et sur violation `23505`, cap/clôture recomptés serveur, email partenaire best-effort (jamais bloquant)
- Suite complète (`npx vitest run`) : 142/142 tests verts, aucune régression

## Task Commits

1. **Task 1 (RED): tests tender-claim** - `f8fbf75` (test)
2. **Task 1 (GREEN): tenderClaim.ts** - `7908234` (feat)
3. **Task 2: GET /api/v1/tenders** - `fab24c2` (feat)
4. **Task 3: POST /api/v1/tenders/[id]/claim** - `6ff7024` (feat)

## Files Created/Modified
- `server/utils/tenderClaim.ts` - cap, clôture, rendu email partenaire (fonctions pures)
- `tests/unit/tender-claim.test.ts` - 8 tests (cap, clôture, email)
- `server/api/v1/tenders/index.get.ts` - liste AO matchés, masqués
- `server/api/v1/tenders/[id]/claim.post.ts` - claim gaté, cap, clôture, révélation, email

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocage] Worktree forké sur le mauvais commit de base**
- **Found during:** démarrage (vérification de branche)
- **Issue:** le worktree était basé sur `main` (HEAD à `63d068e`, un point d'historique totalement différent, sans les fichiers de la Phase 9) au lieu du commit cible `a7a44e70` (contenant le wave 1 — plan 09-01 — de cette même phase). Les fichiers requis (`09-02-PLAN.md`, `maskTender.ts`, la migration `b2b_tender_claims`) étaient absents du disque.
- **Fix:** `git reset --hard a7a44e70c8bfc4cbd24c5ef0677843ae8b6c1667` (aucun commit local de valeur perdu — le worktree venait d'être créé).
- **Commit:** N/A (reset, pas un commit applicatif)

### Notes
- `npm run build` échoue en environnement local (Node 20 : `Set.prototype.difference` requiert Node 22+) — préexistant, indépendant des fichiers de ce plan, confirmé par `git stash` + build identique. Vérifié à la place via `npx nuxt typecheck` : aucune nouvelle erreur TS dans les 2 fichiers créés (les erreurs présentes dans `maskTender.ts`, `zoneMatcher.ts`, `pro/zones/*` sont préexistantes, hors périmètre de ce plan).
- CATEGORY_LABELS : réutilisé depuis `server/utils/categoryLabels.ts` (déjà partagé, non mentionné dans le plan) au lieu de l'exporter depuis `b2bTender.ts` comme suggéré — évite une 3e copie de la même map.

## Self-Check: PASSED
