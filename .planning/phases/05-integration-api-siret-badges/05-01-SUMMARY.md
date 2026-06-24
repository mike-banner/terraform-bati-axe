---
phase: "05"
plan: "01"
subsystem: database
tags: [migration, siret, schema, professionals]
dependency_graph:
  requires: []
  provides: [siret_verified_at, siret_company_name, siret_address, siret_status]
  affects: [professionals table]
tech_stack:
  added: []
  patterns: [IF NOT EXISTS idempotent migration, TEXT+CHECK constraint]
key_files:
  created:
    - supabase/migrations/20260624000000_phase5_siret_badges.sql
  modified: []
decisions:
  - "TEXT + CHECK (pas ENUM) pour siret_status afin d'éviter ALTER TYPE si nouveaux statuts"
  - "IF NOT EXISTS sur chaque ADD COLUMN pour idempotence complète"
metrics:
  duration: "~5min"
  completed: "2026-06-24"
  tasks_completed: 1
  tasks_total: 2
---

# Phase 05 Plan 01 : Migration SQL colonnes siret_* — Summary

**One-liner :** Migration idempotente ajoutant 4 colonnes `siret_*` sur `professionals` avec CHECK constraint pour débloquer les plans Wave 2.

## Tasks

| # | Nom | Statut | Commit |
|---|-----|--------|--------|
| 1 | Créer la migration SQL siret_* | DONE | 2ca1074 |
| 2 | [BLOCKING] supabase db push + vérification colonnes | PENDING — checkpoint humain requis | — |

## Ce qui a été livré

- `supabase/migrations/20260624000000_phase5_siret_badges.sql` : 4 colonnes `siret_*` ajoutées sur `public.professionals`
  - `siret_verified_at TIMESTAMPTZ` — null = pas encore vérifié
  - `siret_company_name TEXT` — raison sociale retournée par l'API
  - `siret_address TEXT` — adresse complète retournée
  - `siret_status TEXT CHECK (siret_status IN ('active', 'closed', 'not_found', 'error'))` — statut de la vérification

## Checkpoint en attente

La tâche 2 est un gate bloquant de type `checkpoint:human-verify`. L'exécuteur s'arrête ici.

**Actions requises par l'utilisateur :**
1. `supabase db push` depuis la racine du projet
2. Vérifier l'absence d'erreurs
3. Contrôler les 4 colonnes :
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'professionals' AND column_name LIKE 'siret_%'
   ORDER BY column_name;
   ```
4. Résultat attendu : 4 lignes (siret_address, siret_company_name, siret_status, siret_verified_at)
5. Taper "ok" pour débloquer les plans Wave 2

## Deviations from Plan

None - plan exécuté exactement tel qu'écrit.

## Known Stubs

None.

## Threat Flags

Aucun — la surface introduite est uniquement des colonnes DB avec une CHECK constraint côté serveur, conforme au threat model du plan (T-05-01).

## Self-Check: PASSED

- [x] `supabase/migrations/20260624000000_phase5_siret_badges.sql` existe
- [x] Commit `2ca1074` présent dans le log git
- [x] `grep -c "siret_status.*CHECK"` retourne 1
