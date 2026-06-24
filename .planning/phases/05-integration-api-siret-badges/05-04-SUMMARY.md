---
phase: "05"
plan: "04"
subsystem: "frontend-badges-wiring"
tags: [badges, dashboard, profil-public, siret_status, decennal_status]
one_liner: "Badges BadgeEntrepriseVerifiee et BadgeDecennaleCertifiee câblés sur dashboard.vue et profil public [slug].vue via v-if strict sur siret_status/decennal_status"

dependency_graph:
  requires:
    - "05-01: migration colonnes siret_* en DB"
    - "05-02: lookupSiret dans claim.post.ts (fournit siret_status en DB)"
    - "05-03: composants BadgeEntrepriseVerifiee et BadgeDecennaleCertifiee"
  provides:
    - "Badges visibles pour les pros sur dashboard /app/dashboard"
    - "Badges visibles pour les visiteurs sur profil public /pro/[dept]/[slug]"
  affects:
    - "app/pages/app/dashboard.vue"
    - "app/pages/pro/[dept]/[slug].vue"
    - "server/api/v1/pro/profile/[slug].get.ts"

tech_stack:
  added: []
  patterns:
    - "v-if strict sur siret_status === 'active' (string exact, null-safe)"
    - "Auto-import Nuxt pour BadgeEntrepriseVerifiee et BadgeDecennaleCertifiee (aucun import manuel)"
    - "Endpoint [slug].get.ts étendu avec siret_status dans select + payload retourné"

key_files:
  created: []
  modified:
    - "app/pages/app/dashboard.vue — interface Pro étendue, select étendu, 2 badges ajoutés"
    - "app/pages/pro/[dept]/[slug].vue — ProProfile étendu, 2 badges ajoutés dans section publique"
    - "server/api/v1/pro/profile/[slug].get.ts — siret_status dans select DB et payload retourné"

decisions:
  - "Badges ajoutés dans la div flex existante du header dashboard (flex-wrap gap-2) — pas de nouvelle div wrapper"
  - "Sur profil public, ml-2 retiré de la span catégorie en faveur de gap-2 sur le conteneur flex pour cohérence avec les badges"
  - "siret_status exposé dans le payload [slug].get.ts sans condition isAdmin — c'est une information publique (statut annuaire État)"

metrics:
  duration: "~10 min"
  completed_date: "2026-06-24"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 05 Plan 04 : Câblage badges confiance — Summary

Badges BadgeEntrepriseVerifiee et BadgeDecennaleCertifiee câblés sur dashboard.vue (espace pro privé) et profil public [slug].vue via conditions v-if strictes sur siret_status === 'active' et decennal_status === 'valid'.

## Tâches exécutées

| Tâche | Nom | Commit | Fichiers |
|-------|-----|--------|---------|
| 1 | Badges dans dashboard.vue | a21d1ec | app/pages/app/dashboard.vue |
| 2 | Badges sur profil public [slug].vue | 8640315 | app/pages/pro/[dept]/[slug].vue, server/api/v1/pro/profile/[slug].get.ts |

## Ce qui a été livré

**dashboard.vue :**
- `interface Pro` étendue avec `siret_status?: string | null` et `siret_company_name?: string | null`
- `.select()` Supabase étendu avec `siret_status, siret_company_name`
- `<BadgeEntrepriseVerifiee v-if="pro.siret_status === 'active'" />`
- `<BadgeDecennaleCertifiee v-if="pro.decennal_status === 'valid'" />`
- Conteneur badges converti en `flex flex-wrap gap-2` pour aligner PremiumBadge + nouveaux badges

**[slug].vue + [slug].get.ts :**
- `ProProfile` étendu avec `siret_status: string | null`
- `[slug].get.ts` : `siret_status` ajouté au `.select()` DB et au payload retourné
- `<BadgeEntrepriseVerifiee v-if="pro!.siret_status === 'active'" />`
- `<BadgeDecennaleCertifiee v-if="pro!.decennal_status === 'valid'" />`
- Section badge publique convertie en `flex flex-wrap items-center gap-2`

## Deviations from Plan

### Modification mineure scope élargi (Rule 2 — cohérence)

**1. [Rule 2 - Cohérence] Extension [slug].get.ts nécessaire**
- **Trouvé pendant :** Tâche 2
- **Problème :** Le plan mentionnait uniquement `[slug].vue` mais `siret_status` doit d'abord être retourné par l'API `/api/v1/pro/profile/[slug]` pour être disponible côté Vue
- **Fix :** Ajout de `siret_status` dans le `.select()` et le payload de `[slug].get.ts`
- **Fichiers modifiés :** `server/api/v1/pro/profile/[slug].get.ts`
- **Impact :** Minimal — ajout d'une colonne publique dans un endpoint existant

## Known Stubs

Aucun. Les badges s'affichent uniquement quand la condition DB est remplie (siret_status lu en base). Comportement correct en l'absence de données (null → pas de badge affiché).

## Threat Flags

Aucune nouvelle surface. `siret_status` est une information publique (reflète l'annuaire État) — conforme à T-05-07 (accepted).

## Self-Check: PASSED

| Item | Résultat |
|------|---------|
| `grep -c "BadgeEntrepriseVerifiee" dashboard.vue` | 1 (FOUND) |
| `grep -c "siret_status" dashboard.vue` | 3 (interface + select + v-if) |
| `grep -c "BadgeEntrepriseVerifiee" [slug].vue` | 1 (FOUND) |
| `grep -c "siret_status" [slug].vue` | 2 (interface + v-if) |
| `grep -c "siret_status" [slug].get.ts` | 2 (select + payload) |
| commit a21d1ec | FOUND |
| commit 8640315 | FOUND |
