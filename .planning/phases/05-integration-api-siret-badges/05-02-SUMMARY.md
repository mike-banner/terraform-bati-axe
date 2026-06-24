---
phase: "05"
plan: "02"
subsystem: backend
tags: [siret, api, claim, vitest, tdd]
dependency_graph:
  requires: [05-01]
  provides: [lookupSiret, siret_status, siret_company_name, siret_address, siret_verified_at]
  affects: [professionals table, claim endpoint]
tech_stack:
  added: []
  patterns: [fetch natif AbortSignal.timeout, server/utils helper Nitro, TDD RED/GREEN Vitest]
key_files:
  created:
    - server/utils/siretLookup.ts
    - tests/siret-lookup.test.ts
    - tsconfig.test.json
  modified:
    - server/api/v1/pro/claim.post.ts
    - vitest.config.ts
decisions:
  - "lookupSiret extrait dans server/utils/ pour rester testable sans globals Nitro"
  - "tsconfig.test.json + stubs .nuxt/tsconfig*.json pour faire tourner Vitest dans le worktree sans nuxt prepare"
  - "Blocage 422 uniquement sur etat_administratif=F ; not_found et error sont non bloquants (graceful degradation)"
  - "Troncature company_name à 255 chars dans le helper, pas dans claim.post.ts (mitigation T-05-04)"
metrics:
  duration: "~20min"
  completed: "2026-06-24"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 05 Plan 02 : Lookup SIRET inline + tests Vitest — Summary

**One-liner :** Lookup SIRET via API Recherche Entreprises ajouté dans claim.post.ts avec fallback gracieux, blocage entreprise fermée, et 4 tests Vitest couvrant tous les cas.

## Tasks

| # | Nom | Statut | Commit |
|---|-----|--------|--------|
| 1 | Tests Vitest RED pour lookupSiret (4 cas) | DONE | 61b5cb7 |
| 2 | Extraire lookupSiret + modifier claim.post.ts | DONE | 82ec410 |

## Ce qui a été livré

- `server/utils/siretLookup.ts` : helper exportant `SiretLookupResult` et `lookupSiret(siret)`
  - Appel `https://recherche-entreprises.api.gouv.fr/search?q={siret}&page=1&per_page=1`
  - `AbortSignal.timeout(5000)` — pas de blocage indéfini
  - Troncature `company_name` à 255 chars (mitigation T-05-04)
  - Jamais de throw : status `'error'` en cas d'exception réseau
  - 4 cas : `active` / `closed` / `not_found` / `error`

- `server/api/v1/pro/claim.post.ts` modifié :
  - Import `lookupSiret` depuis `~/server/utils/siretLookup`
  - Appel inline après le check SIRET doublon
  - Blocage `422` avec message explicite sur `status === 'closed'`
  - 4 colonnes `siret_*` intégrées dans le payload upsert professionals
  - Log `[claim.post] SIRET lookup: {status}` conservé

- `tests/siret-lookup.test.ts` : 4 tests Vitest passants (mock `vi.stubGlobal('fetch', ...)`)

- Outillage worktree : `tsconfig.test.json` + stubs `.nuxt/tsconfig*.json` + alias `~` dans `vitest.config.ts`

## TDD Gate Compliance

- RED gate : commit `61b5cb7` `test(05-02): ...` — 4 tests échouant (module not found)
- GREEN gate : commit `82ec410` `feat(05-02): ...` — 4 tests passants

## Deviations from Plan

### Infrastructure ajoutée (Rule 2)

**1. [Rule 2 - Infrastructure] tsconfig minimal pour Vitest dans le worktree**
- **Trouvé pendant :** Tâche 1 (phase RED)
- **Problème :** Le worktree n'a pas de `.nuxt/` généré ; `tsconfig.json` racine pointe vers `.nuxt/tsconfig*.json` → erreur `vite:oxc TSCONFIG_ERROR`
- **Fix :** `tsconfig.test.json` minimal + stubs `.nuxt/tsconfig.*.json` vides + alias `~` dans `vitest.config.ts`
- **Fichiers modifiés :** `tsconfig.test.json`, `vitest.config.ts`, `.nuxt/tsconfig.{app,server,shared,node}.json`
- **Impact :** Aucun sur le code de production ; les stubs `.nuxt/` sont dans le worktree temporaire

## Known Stubs

None.

## Threat Flags

Aucun — surface ajoutée : appel fetch server-side sortant uniquement, conforme au threat model (T-05-02 à T-05-05 mitigés dans l'implémentation).

## Self-Check: PASSED

- [x] `server/utils/siretLookup.ts` existe
- [x] `grep -c "lookupSiret" server/api/v1/pro/claim.post.ts` retourne 2
- [x] `grep -c "siret_status" server/api/v1/pro/claim.post.ts` retourne 1
- [x] `npx vitest run tests/siret-lookup.test.ts` → 4 tests passants
- [x] Commits `61b5cb7` (RED) et `82ec410` (GREEN) présents dans le log git
