---
phase: "05"
phase_slug: integration-api-siret-badges
date: "2026-06-24"
status: pending
---

# Phase 05 — Validation Strategy (Nyquist)

## Suites de tests automatisées

| Suite | Fichier | Requirements couverts | Commande |
|-------|---------|----------------------|----------|
| SIRET lookup helper | `tests/siret-lookup.test.ts` | API-01 | `npx vitest run tests/siret-lookup.test.ts` |
| Composants badges | `tests/badges.test.ts` | API-02, TRST-01 | `npx vitest run tests/badges.test.ts` |
| Auto-approve upload | `tests/auto-approve.test.ts` | TRST-01 | `npx vitest run tests/auto-approve.test.ts` |

## Cas de test critiques

### API-01 — Lookup SIRET (siret-lookup.test.ts)

| Cas | Entrée | Résultat attendu |
|-----|--------|-----------------|
| SIRET actif valide | `44306184100047` | `{ status: 'A', nom_complet: '...', ok: true }` |
| SIRET entreprise fermée | SIRET avec `etat_administratif: 'F'` | `createError(422, 'Entreprise radiée')` |
| SIRET non diffusible | SIRET avec `total_results: 0` | `{ status: 'non_diffusible', ok: false }` (non bloquant) |
| API down / timeout | fetch qui échoue | `{ status: 'api_error', ok: false }` (non bloquant) |

### API-02 — Badge Entreprise Vérifiée (badges.test.ts)

| Cas | Condition | Badge affiché |
|-----|-----------|--------------|
| SIRET actif | `siret_status = 'A'` | `🏢 Entreprise Vérifiée (API Gouv)` visible |
| SIRET non diffusible | `siret_status = 'non_diffusible'` | Badge absent |
| SIRET absent | `siret_status = null` | Badge absent |

### TRST-01 — Badge Décennale Certifiée & Auto-approbation (auto-approve.test.ts)

| Cas | Action | Résultat |
|-----|--------|----------|
| Upload décennale complet | Saisie numéro police + date exp + fichier | `decennal_status = 'valid'` automatiquement, date et numéro sauvegardés. |
| Badge affiché | `decennal_status = 'valid'` et date valide | `🛡️ Décennale Certifiée BÂTI-AXE` visible |
| Expiration bloquante | Date d'expiration dépassée | Badge masqué, alerte `Expiré ⚠️` sur le dashboard |

## Commande de validation complète

```bash
npx vitest run tests/siret-lookup.test.ts tests/badges.test.ts tests/auto-approve.test.ts
```

## Invariants non bloquants (fallback gracieux)

- SIRET non diffusible → inscription non bloquée, badge absent
- API down (timeout 5s) → inscription non bloquée, badge absent
- Ces deux cas NE déclenchent PAS d'erreur utilisateur visible
