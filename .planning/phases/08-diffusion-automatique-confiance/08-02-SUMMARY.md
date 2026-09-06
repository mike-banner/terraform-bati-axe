---
phase: 08-diffusion-automatique-confiance
plan: 02
subsystem: api
tags: [nitro, admin, b2b, notifications, vitest]

requires: ["08-01"]
provides:
  - "server/utils/b2bDiffusion.ts : ACTIVE_TENDER_STATUSES, assertDiffusable, assertTenderQuota"
  - "POST /api/v1/admin/b2b-requests/[id]/diffuse — endpoint admin Diffuser"
  - "Seuils runtimeConfig b2bMaxActiveTendersPerPartner / b2bMaxNotificationsPerArtisanPerDay"
affects: [08-03-trigger-dirco]

tech-stack:
  added: []
  patterns:
    - "Gardes pures sans accès Supabase (b2bDiffusion.ts), testables en Vitest node, miroir de b2bTender.ts et assertSubscriptionModifiable (zoneMatcher.ts)"

key-files:
  created:
    - server/utils/b2bDiffusion.ts
    - server/api/v1/admin/b2b-requests/[id]/diffuse.post.ts
    - tests/unit/b2b-diffuse.test.ts
  modified:
    - nuxt.config.ts
    - .env.example

key-decisions:
  - "Écart D-09 résolu : 'clos' n'existe pas dans le CHECK réel de b2b_requests.status (nouveau|en_cours|rappele|qualifie|converti|perdu) — confusion avec b2b_tender_lots.status (open|claimed|closed). Liste positive ACTIVE_TENDER_STATUSES retenue plutôt qu'un NOT IN, pour qu'une future valeur de statut soit un choix explicite."
  - "Check du plafond D-09 appliqué au clic Diffuser (409 côté serveur), pas à la transition de decision_status — un seul point d'application, cohérent avec assertSubscriptionModifiable déjà présent dans le repo."
  - "Partenaire identifié par b2b_requests.contact_email (aucune table partenaires n'existe en base) — documenté dans le code."

requirements-completed: [TEND-04, TEND-06, TEND-10, TEND-11]

duration: ~25min
completed: 2026-09-06
---

# Phase 08: Diffusion automatique et confiance — Plan 02 Summary

**Endpoint admin « Diffuser » avec gardes pures testées (gating dossier 422, plafond AO/partenaire 409, auth serveur 401/403), résolution tardive de zone au clic et délégation à notifyMatchedB2bPros par lot**

## Performance

- **Tasks:** 3 (env vars, gardes TDD, endpoint)
- **Files modified:** 5

## Accomplissements
- `server/utils/b2bDiffusion.ts` : `ACTIVE_TENDER_STATUSES` (liste positive `nouveau|en_cours|rappele|qualifie`), `assertDiffusable` (422 si `decision_status` ou `project_postal_code` manquant/invalide), `assertTenderQuota` (409 au-delà du plafond d'AO actifs par partenaire)
- `server/api/v1/admin/b2b-requests/[id]/diffuse.post.ts` : auth admin serveur, chargement dossier (404 si absent), gating TEND-10, plafond TEND-11, chargement des lots `open`, résolution de zone au clic via `matchZone` (persistée sur les lots), diffusion non-bloquante par lot déléguée à `notifyMatchedB2bPros` (plan 08-01), audit log `b2b_tender_diffused`, réponse limitée à des compteurs (aucune liste nominative de pros)
- Deux seuils configurables par variable d'env (`B2B_MAX_ACTIVE_TENDERS_PER_PARTNER=3`, `B2B_MAX_NOTIFICATIONS_PER_ARTISAN_PER_DAY=5`), documentés dans `.env.example` et exposés en `runtimeConfig` (jamais `public`)

## Résolution de l'écart D-09 (« clos »)

CONTEXT.md indiquait de compter les AO actifs via
`b2b_requests.status NOT IN ('converti', 'perdu', 'clos')`. La valeur `clos`
n'existe pas dans la contrainte CHECK réelle de `b2b_requests.status`
(migrations 20260822000002/003 : `nouveau|en_cours|rappele|qualifie|converti|perdu`).
La confusion vient de `b2b_tender_lots.status`, qui lui a bien
`open|claimed|closed` — deux colonnes, deux tables distinctes.

**Décision retenue (option a de RESEARCH.md) : `clos` est omis.** Aucun
mécanisme de la Phase 8 ne fait passer un `b2b_requests.status` à `clos`, et la
clôture automatique (TEND-12) est prévue en Phase 9. Implémentation en liste
**positive** plutôt qu'un `NOT IN`, pour que toute future valeur de statut soit
un choix explicite : `ACTIVE_TENDER_STATUSES = ['nouveau', 'en_cours', 'rappele', 'qualifie']`.
Documenté en commentaire dans `server/utils/b2bDiffusion.ts`.

## Task Commits

1. **Task 1: Variables d'env des plafonds (runtimeConfig + .env.example)** - `3fcdab5` (chore)
2. **Task 2 (RED): Tests en échec b2b-diffuse.test.ts** - `14a502f` (test)
3. **Task 2 (GREEN): Gardes pures b2bDiffusion** - `6d231ae` (feat)
4. **Task 3: Endpoint admin diffuse.post.ts** - `2818ecf` (feat)

## Files Created/Modified
- `server/utils/b2bDiffusion.ts` - Gardes pures : statuts actifs, gating diffusion, plafond AO/partenaire
- `server/api/v1/admin/b2b-requests/[id]/diffuse.post.ts` - Endpoint admin « Diffuser »
- `tests/unit/b2b-diffuse.test.ts` - 9 tests (D-09, TEND-10, TEND-11)
- `nuxt.config.ts` - Ajout `b2bMaxActiveTendersPerPartner` / `b2bMaxNotificationsPerArtisanPerDay` dans `runtimeConfig`
- `.env.example` - Documentation des deux nouvelles variables

## Decisions Made
- Voir « key-decisions » en frontmatter (D-09, emplacement du check plafond, identifiant partenaire par `contact_email`)
- `restitution.post.ts` et `notifyProLead.ts` non modifiés — confirmé par `git diff --name-only`, aucune trace de ces fichiers dans les commits de ce plan

## Deviations from Plan
None - plan exécuté tel qu'écrit, y compris la résolution de l'écart D-09 déjà tranchée dans les notes du plan (décision de plan, non re-tranchée ici).

## Issues Encountered
- `npm run build` échoue dans ce worktree avec `TypeError: trustedFunctions.difference is not a function` — bug environnemental Node 20.20.0 (le repo cible Node 22.22.1, cf. STATE.md ligne infra 2026-08-25) sur une fonctionnalité `Set.prototype.difference` non disponible en Node 20. Confirmé pré-existant et sans rapport avec ce plan : l'échec est identique avant tout changement de ce plan (`git stash` → build échoue déjà à l'identique). Vérification faite via `npx vitest run` (128/128 tests verts, suite complète) et `vue-tsc --noEmit` (les erreurs de types sur les auto-imports Nitro `createError`/`defineEventHandler`/etc. sont symétriques sur `diffuse.post.ts` et sur `restitution.post.ts` préexistant — non spécifiques à ce plan, `tsconfig.test.json` n'a pas les types Nitro).

## User Setup Required
None - aucune configuration externe manuelle requise pour ce plan (les nouvelles variables d'env ont des valeurs par défaut sûres dans le code : 3 et 5).

## Next Phase Readiness
L'endpoint `diffuse.post.ts` est prêt pour le câblage du bouton « Diffuser » côté DirCo (plan 08-03). Le build Nuxt complet devra être revérifié sur un environnement Node 22 (CI ou machine à jour) avant merge — la suite de tests et le typecheck applicatif sont verts.

---
*Phase: 08-diffusion-automatique-confiance*
*Completed: 2026-09-06*

## Self-Check: PASSED

Fichiers vérifiés : `server/utils/b2bDiffusion.ts`, `server/api/v1/admin/b2b-requests/[id]/diffuse.post.ts`, `tests/unit/b2b-diffuse.test.ts`, présents.
Commits vérifiés dans `git log` : `3fcdab5`, `14a502f`, `6d231ae`, `2818ecf`, tous présents.
