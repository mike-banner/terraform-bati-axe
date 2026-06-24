---
phase: "05"
plan: "06"
subsystem: "auto-approve-decennale"
tags: [decennale, auto-approve, upload, vitest, badges]
one_liner: "Upload décennale auto-approuvé : numéro de police + date d'expiration requis, endpoint serveur déclenche decennal_status=valid + badge decennale_certified sans validation admin"

dependency_graph:
  requires:
    - "05-01: migration colonnes decennal_status + labels JSONB"
    - "05-03: BadgeDecennaleCertifiee.vue (label 'decennale_certified')"
    - "05-04: dashboard.vue câblage badges"
    - "05-05: approve-pro.post.ts (pattern SELECT+UPDATE idempotent réutilisé)"
  provides:
    - "Workflow pro autonome : upload décennale → badge activé immédiatement"
    - "Stockage policy_number + expiry_date dans verifications pour future vérification d'expiration"
  affects:
    - "app/pages/app/dashboard.vue"
    - "server/api/v1/pro/documents/upload.post.ts"
    - "tests/auto-approve.test.ts"

tech_stack:
  added: []
  patterns:
    - "Auto-approbation sous responsabilité contractuelle (CGU) — validation admin bypassée"
    - "Bouton désactivé côté client si policyNumber ou expirationDate vide — UX guard"
    - "serverSupabaseServiceRole sans await (pattern cohérent avec approve-pro.post.ts)"
    - "SELECT labels → concat JS idempotent → UPDATE (même pattern que plan-05)"

key_files:
  created:
    - "server/api/v1/pro/documents/upload.post.ts — endpoint auto-approbation décennale"
    - "tests/auto-approve.test.ts — 5 tests Vitest couvrant insert/update/idempotence/422/kbis-pending"
  modified:
    - "app/pages/app/dashboard.vue — 2 inputs obligatoires (numéro de police + date d'expiration), appel /api/v1/pro/documents/upload"

decisions:
  - "Endpoint serveur upload.post.ts plutôt qu'insert client direct : la logique d'auto-approbation (update professionals) doit être côté serveur, pas client"
  - "serverSupabaseServiceRole sans await : cohérent avec approve-pro.post.ts (retourne directement le client)"
  - "policy_number et expiration_date dans la table verifications (colonnes expiry_date et policy_number) : stockage pour futur cron d'expiration automatique"

metrics:
  duration: "~20 min"
  completed_date: "2026-06-24T18:37:00Z"
  tasks_completed: 3
  files_created: 2
  files_modified: 1
  tests_passed: 5
---

# Phase 05 Plan 06 : Auto-approbation décennale — Summary

Upload décennale auto-approuvé : le pro saisit son numéro de police et sa date d'expiration, l'endpoint serveur insère dans `verifications` avec `status='approved'` et met à jour `professionals` (`decennal_status='valid'` + label `'decennale_certified'`) sans intervention admin. 5 tests Vitest verts.

## Tâches exécutées

| Tâche | Nom | Commit | Fichiers |
|-------|-----|--------|---------|
| 1 | Formulaire dashboard — champs numéro de police + date d'expiration | cae17ad | app/pages/app/dashboard.vue |
| 2 | Endpoint upload.post.ts avec auto-approbation | 0e0beaf | server/api/v1/pro/documents/upload.post.ts |
| 3 | Tests Vitest auto-approve | 44228a0 | tests/auto-approve.test.ts |

## Résultat de vérification

```
✓ auto-approve : upload décennale > Test 1 : décennale → verifications insérée avec status approved + policy_number + expiry_date
✓ auto-approve : upload décennale > Test 2 : décennale → professionals mis à jour avec decennal_status=valid + label decennale_certified
✓ auto-approve : upload décennale > Test 3 : décennale → label idempotent si decennale_certified déjà présent
✓ auto-approve : upload décennale > Test 4 : décennale sans numéro de police → createError 422
✓ auto-approve : upload décennale > Test 5 : kbis → verifications insérée avec status pending (pas d'auto-approbation)

Test Files  1 passed (1)
Tests       5 passed (5)
```

grep "Numéro de police" dashboard.vue → FOUND
grep "Date d'expiration" dashboard.vue → FOUND
grep "decennal_status.*valid" upload.post.ts → FOUND

## Déviations du plan

### Corrections automatiques (Rule 1 — Bug)

**1. [Rule 1 - Bug] Mock { from } vs from directement**
- **Trouvé pendant :** Tâche 3 (premier run des tests — 4 tests KO)
- **Problème :** `mockServerSupabaseServiceRole.mockReturnValue(sb.from)` passait la fonction `from` comme valeur de retour, mais le handler fait `supabase.from(...)` — donc il cherche `.from` sur une fonction. Il faut `{ from: sb.from }`.
- **Correction :** Tous les appels `mockReturnValue(sb.from)` remplacés par `mockReturnValue({ from: sb.from })`.
- **Fichiers :** tests/auto-approve.test.ts
- **Impact :** Aucun sur la logique métier — correction pure du test

## Known Stubs

Aucun. Le formulaire envoie de vraies valeurs à un vrai endpoint. L'affichage badge après upload est déclenché par `loadProData()` qui re-lit la DB.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: repudiation | server/api/v1/pro/documents/upload.post.ts | Auto-approbation sous responsabilité contractuelle — accepté par T-05-06-1 dans le plan |

Conforme au registre STRIDE du plan : T-05-06-1 disposition `accept` — la note CGU côté dashboard et l'engagement écrit du pro suffisent.

## Self-Check: PASSED

| Item | Résultat |
|------|---------|
| "Numéro de police" dans dashboard.vue | FOUND |
| "Date d'expiration" dans dashboard.vue | FOUND |
| decennal_status=valid dans upload.post.ts | FOUND |
| auto-approve dans tests/auto-approve.test.ts | FOUND |
| commit cae17ad | FOUND |
| commit 0e0beaf | FOUND |
| commit 44228a0 | FOUND |
| 5 tests Vitest verts | PASSED |
