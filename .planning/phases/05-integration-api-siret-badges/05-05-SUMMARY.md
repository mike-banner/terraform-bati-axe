---
phase: "05"
plan: "05"
subsystem: "admin-approval-badges"
tags: [admin, vitest, badges, labels-jsonb, requirements]
one_liner: "approve-pro.post.ts déclenche decennal_status=valid + label decennale_certified idempotent, couvert par 4 tests Vitest, requirements API-01/API-02/TRST-01 formalisés"

dependency_graph:
  requires:
    - "05-03: BadgeDecennaleCertifiee.vue (label string 'decennale_certified' confirmé)"
    - "05-01: migration colonnes decennal_status + labels JSONB"
  provides:
    - "Boucle admin→badge complète : approbation → decennal_status=valid + labels=['decennale_certified']"
    - "Requirements API-01, API-02, TRST-01 formalisés dans REQUIREMENTS.md"
  affects:
    - "server/api/v1/admin/approve-pro.post.ts"
    - ".planning/REQUIREMENTS.md"

tech_stack:
  added: []
  patterns:
    - "SELECT labels → concat JS idempotent → UPDATE : évite RPC custom PostgreSQL"
    - "vi.stubGlobal pour defineEventHandler/createError/readBody — test du handler Nitro sans Nuxt runtime"
    - "server/tsconfig.json minimal : résout OXC transform dans le worktree (pas de .nuxt/)"

key_files:
  created:
    - "tests/admin-approve.test.ts — 4 tests Vitest approve/reject/idempotence/422"
    - "server/tsconfig.json — tsconfig minimal pour OXC dans le worktree"
  modified:
    - "server/api/v1/admin/approve-pro.post.ts — approve déclenche decennal_status+labels, reject isole is_verified=false"
    - "tsconfig.test.json — include étendu à server/api/**/*.ts"
    - ".planning/REQUIREMENTS.md — section Phase 5 + API-01/API-02/TRST-01 + traceability"

decisions:
  - "SELECT+UPDATE séquentiel (2 requêtes) plutôt qu'une RPC PostgreSQL custom : plus simple, moins de migration, idempotence en JS"
  - "server/tsconfig.json dans le worktree : OXC cherche le tsconfig le plus proche du fichier transformé — server/ > root (qui référence .nuxt/ absent)"
  - "Test 4 utilise rejects.toMatchObject({statusCode:422}) : le handler throw une erreur, donc await doit capturer le rejet"

metrics:
  duration: "~20 min"
  completed_date: "2026-06-24T17:53:00Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
  tests_passed: 4
---

# Phase 05 Plan 05 : Approbation Admin → Badge Décennale — Summary

approve-pro.post.ts déclenche `decennal_status='valid'` + label `'decennale_certified'` idempotent lors d'une approbation admin, isolé sur rejet, couvert par 4 tests Vitest. Requirements API-01, API-02, TRST-01 formalisés dans REQUIREMENTS.md.

## Tâches exécutées

| Tâche | Nom | Commit | Fichiers |
|-------|-----|--------|---------|
| 1 | Modifier approve-pro.post.ts + tests Vitest | db30008 | server/api/v1/admin/approve-pro.post.ts, tests/admin-approve.test.ts, server/tsconfig.json, tsconfig.test.json |
| 2 | Ajouter API-01, API-02, TRST-01 dans REQUIREMENTS.md | 710078d | .planning/REQUIREMENTS.md |

## Résultat de vérification

```
✓ tests/admin-approve.test.ts > approve-pro handler > Test 1 : approve(true) → update avec is_verified=true et decennal_status=valid
✓ tests/admin-approve.test.ts > approve-pro handler > Test 2 : approve(true) → labels mis à jour avec decennale_certified (idempotent si déjà présent)
✓ tests/admin-approve.test.ts > approve-pro handler > Test 3 : approve(false) → update avec is_verified=false uniquement (decennal_status et labels inchangés)
✓ tests/admin-approve.test.ts > approve-pro handler > Test 4 : approve(true) sans KBIS approuvé → createError 422 levé

Test Files  1 passed (1)
Tests       4 passed (4)
```

grep -c "decennale_certified" approve-pro.post.ts → 3
grep -c "decennal_status.*valid\|decennal_status: 'valid'" approve-pro.post.ts → 2
grep -c "API-01" REQUIREMENTS.md → 2
grep -c "TRST-01" REQUIREMENTS.md → 2

## Déviations du plan

### Corrections automatiques (Rule 3 — Bloquant)

**1. [Rule 3 - Blocking] server/tsconfig.json absent → OXC transform échoue**
- **Trouvé pendant :** Tâche 1 (premier run des tests)
- **Problème :** OXC cherche un tsconfig depuis `server/api/v1/admin/` en remontant l'arbre. Trouve `tsconfig.json` à la racine, qui référence `.nuxt/tsconfig.*.json` (absents dans le worktree). Résultat : `TSCONFIG_ERROR`.
- **Correction :** Créé `server/tsconfig.json` minimal (même pattern que `tests/tsconfig.json` de plan-03). OXC s'arrête là et n'atteint pas la racine.
- **Fichiers :** server/tsconfig.json, tsconfig.test.json (include étendu)

**2. [Rule 1 - Bug] Test 4 await sans rejects → le throw passe en erreur non capturée**
- **Trouvé pendant :** Tâche 1 (run des tests après GREEN)
- **Problème :** `await (handler as Function)({})` ne capture pas le throw — le test échoue au lieu de vérifier l'erreur.
- **Correction :** `await expect(...).rejects.toMatchObject({ statusCode: 422 })`
- **Fichiers :** tests/admin-approve.test.ts

## Known Stubs

Aucun stub. La logique de mise à jour est complète et connectée à la DB via le service role Supabase.

## Threat Flags

Aucune nouvelle surface de sécurité. L'endpoint existant est déjà protégé par `app_metadata.role === 'admin'` (lignes 13-14). La modification ajoute des champs dans le UPDATE existant — même périmètre de confiance.

## Self-Check: PASSED

| Item | Résultat |
|------|---------|
| server/api/v1/admin/approve-pro.post.ts modifié | FOUND |
| tests/admin-approve.test.ts créé | FOUND |
| server/tsconfig.json créé | FOUND |
| .planning/REQUIREMENTS.md contient API-01 | FOUND |
| .planning/REQUIREMENTS.md contient TRST-01 | FOUND |
| commit db30008 | FOUND |
| commit 710078d | FOUND |
| 4 tests Vitest verts | PASSED |
