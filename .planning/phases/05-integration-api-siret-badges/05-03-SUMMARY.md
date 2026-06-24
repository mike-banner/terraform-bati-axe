---
phase: "05"
plan: "03"
subsystem: "frontend-badges"
tags: [badges, vue-components, vitest, trust-signals]
one_liner: "Composants badge BadgeEntrepriseVerifiee (cyan/bâtiment) et BadgeDecennaleCertifiee (green/shield) avec shimmer PremiumBadge, couverts par 5 tests Vitest"

dependency_graph:
  requires:
    - "05-01: migration colonnes siret_* (pour savoir quelles valeurs déclenchent les badges)"
  provides:
    - "BadgeEntrepriseVerifiee auto-importable dans dashboard.vue et profil public"
    - "BadgeDecennaleCertifiee auto-importable dans dashboard.vue et profil public"
  affects:
    - "app/pages/app/dashboard.vue (consommateur — plan 04)"
    - "app/pages/mon-projet/[token].vue (consommateur futur)"

tech_stack:
  added:
    - "@vue/test-utils ^2.x — mounting composants Vue dans Vitest"
    - "happy-dom — environnement DOM pour tests unitaires Vue"
  patterns:
    - "Pattern shimmer PremiumBadge.vue réutilisé exactement (animate-shimmer, group-hover, prefers-reduced-motion)"
    - "Auto-import Nuxt via app/components/ui/ — aucun import manuel requis"
    - "@vitest-environment happy-dom annotation par fichier — pas de changement global d'environnement"

key_files:
  created:
    - "app/components/ui/BadgeEntrepriseVerifiee.vue — badge cyan, icône bâtiment SVG, slot 'Entreprise Vérifiée (API Gouv)'"
    - "app/components/ui/BadgeDecennaleCertifiee.vue — badge green, icône shield-check SVG, slot 'Décennale Certifiée BÂTI-AXE'"
    - "tests/badges.test.ts — 5 tests Vitest (texte, classes CSS, slot override)"
    - "tests/tsconfig.json — tsconfig minimal pour parsing TypeScript hors .nuxt/"
  modified:
    - "vitest.config.ts — ajout @vitejs/plugin-vue pour transformer les .vue en test"

decisions:
  - "Ajout @vue/test-utils + happy-dom : absents de la stack initiale malgré la mention 'Phase 4'. Installés comme devDependencies — packages officiels Vue/vitest."
  - "Plugin @vitejs/plugin-vue ajouté à vitest.config.ts : déjà installé dans node_modules (via Nuxt), juste non configuré pour vitest."
  - "tests/tsconfig.json créé : la worktree n'a pas de .nuxt/ généré, le tsconfig racine référence des fichiers inexistants. Tsconfig minimal dans tests/ comme solution propre."
  - "Annotation @vitest-environment happy-dom par fichier : préféré à un changement global pour ne pas casser les tests serveur (environment: 'node' dans vitest.config.ts)."

metrics:
  duration: "~15 min"
  completed_date: "2026-06-24T13:24:52Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
  tests_passed: 5
---

# Phase 05 Plan 03 : Composants Badge de Confiance — Summary

Composants badge BadgeEntrepriseVerifiee (cyan/bâtiment) et BadgeDecennaleCertifiee (green/shield) avec shimmer identique à PremiumBadge, couverts par 5 tests Vitest passants.

## Tâches exécutées

| Tâche | Nom | Commit | Fichiers |
|-------|-----|--------|---------|
| 1 | Créer BadgeEntrepriseVerifiee + BadgeDecennaleCertifiee | c499613 | app/components/ui/BadgeEntrepriseVerifiee.vue, app/components/ui/BadgeDecennaleCertifiee.vue |
| 2 | Tests Vitest composants badge | 1da47e4 | tests/badges.test.ts, tests/tsconfig.json, vitest.config.ts, package.json |

## Résultat de vérification

```
✓ tests/badges.test.ts > BadgeEntrepriseVerifiee > affiche le texte par défaut "Entreprise Vérifiée (API Gouv)"
✓ tests/badges.test.ts > BadgeEntrepriseVerifiee > contient la classe bg-cyan-100/80
✓ tests/badges.test.ts > BadgeEntrepriseVerifiee > accepte un slot personnalisé
✓ tests/badges.test.ts > BadgeDecennaleCertifiee > affiche le texte par défaut "Décennale Certifiée BÂTI-AXE"
✓ tests/badges.test.ts > BadgeDecennaleCertifiee > contient la classe bg-green-100/80

Test Files  1 passed (1)
Tests       5 passed (5)
```

## Déviations du plan

### Dépendances manquantes corrigées (Rule 3 — Blocking)

**1. [Rule 3 - Blocking] @vue/test-utils absent malgré la mention "installé Phase 4"**
- **Trouvé pendant :** Tâche 2 (setup tests)
- **Problème :** @vue/test-utils non présent dans node_modules ni package.json
- **Correction :** `npm install --save-dev @vue/test-utils` — package officiel Vue.js team
- **Fichiers :** package.json, package-lock.json

**2. [Rule 3 - Blocking] DOM environment (happy-dom) requis pour mount() Vue**
- **Trouvé pendant :** Tâche 2
- **Problème :** vitest.config.ts avec `environment: 'node'`, pas de DOM disponible
- **Correction :** `npm install --save-dev happy-dom` + annotation `@vitest-environment happy-dom` par fichier
- **Fichiers :** package.json, tests/badges.test.ts

**3. [Rule 3 - Blocking] @vitejs/plugin-vue non configuré dans vitest**
- **Trouvé pendant :** Tâche 2 (premier run des tests)
- **Problème :** vitest ne sait pas transformer les .vue sans le plugin
- **Correction :** Ajout de `import vue from '@vitejs/plugin-vue'` et `plugins: [vue()]` dans vitest.config.ts (plugin déjà installé via Nuxt)
- **Fichiers :** vitest.config.ts

**4. [Rule 3 - Blocking] tsconfig racine référence .nuxt/ inexistant dans la worktree**
- **Trouvé pendant :** Premier run des tests
- **Problème :** `tsconfig.json` racine pointe vers `.nuxt/tsconfig.*.json` non générés dans la worktree
- **Correction :** `tests/tsconfig.json` minimal autonome pour les tests
- **Fichiers :** tests/tsconfig.json

## Known Stubs

Aucun stub. Les composants affichent le texte via slot (texte par défaut hardcodé = comportement intentionnel du composant).

## Threat Flags

Aucune nouvelle surface de sécurité. Les composants sont passifs (lecture seule, pas d'input utilisateur, pas d'accès réseau).

## Self-Check: PASSED

| Item | Résultat |
|------|---------|
| app/components/ui/BadgeEntrepriseVerifiee.vue | FOUND |
| app/components/ui/BadgeDecennaleCertifiee.vue | FOUND |
| tests/badges.test.ts | FOUND |
| 05-03-SUMMARY.md | FOUND |
| commit c499613 | FOUND |
| commit 1da47e4 | FOUND |
| 5 tests Vitest verts | PASSED |
