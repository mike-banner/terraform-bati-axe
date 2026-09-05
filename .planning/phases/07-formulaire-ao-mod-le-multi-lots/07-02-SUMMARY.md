---
phase: 07-formulaire-ao-mod-le-multi-lots
plan: 02
subsystem: api
tags: [zod, supabase, b2b]

requires:
  - phase: 07-01
    provides: table b2b_tender_lots, colonnes description/decision_status/project_postal_code sur b2b_requests
provides:
  - util server/utils/b2bTender.ts (schéma Zod d'intake B2B + buildTenderLots, testable sans Nitro)
  - intake public persistant description et créant les lots multi-métiers pour un syndic
  - PATCH admin qualification acceptant decision_status et project_postal_code
affects: [phase-07-03, phase-08]

tech-stack:
  added: []
  patterns:
    - "Zod schema + util pur extrait dans server/utils/ pour être testable sous vitest sans charger #supabase/server"

key-files:
  created:
    - server/utils/b2bTender.ts
    - tests/unit/b2b-tender.test.ts
  modified:
    - server/api/v1/b2b/requests.post.ts
    - "server/api/v1/admin/b2b-requests/[id].patch.ts"

key-decisions:
  - "Description obligatoire (>=20 caractères) uniquement sur need_type=projet_immediat — le tunnel saute l'étape 3 pour un partenariat régulier, donc la contrainte ne peut pas être inconditionnelle."
  - "buildTenderLots dédoublonne les catégories en amont plutôt que de compter sur la contrainte UNIQUE(request_id, category), qui ferait échouer l'insert en bloc."
  - "L'insert des lots est non bloquant (log console en cas d'échec) — la demande B2B reste enregistrée même si la création des lots échoue."

patterns-established:
  - "Util serveur pur (0 import #supabase/server) pour toute logique de validation/transformation testable unitairement — voir server/utils/qualifyScore.ts pour le précédent."

requirements-completed: [TEND-01, TEND-02, TEND-05]

duration: 25min
completed: 2026-09-05
---

# Phase 07: Formulaire AO & Modèle Multi-Lots — Plan 02 Summary

**Backend B2B câblé sur le socle 07-01 : description obligatoire à l'intake, création des lots par corps de métier pour un syndic, et qualification DirCo étendue (statut de décision + code postal structuré)**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 4 (2 créés, 2 modifiés)

## Accomplissements
- `server/utils/b2bTender.ts` : schéma Zod d'intake extrait et étendu (`description`, `lots_categories`), `buildTenderLots()` pur et testé
- Intake public (`requests.post.ts`) persiste la description et insère 1 ligne `b2b_tender_lots` par corps de métier sélectionné (syndic uniquement)
- PATCH admin (`[id].patch.ts`) accepte `decision_status` (confirme/en_attente) et `project_postal_code` (regex 5 chiffres), les trace dans `audit_logs`

## Task Commits

1. **Task 1: Util b2bTender** - `a226bbf` (feat)
2. **Task 2: Intake public** - `df02ae2` (feat)
3. **Task 3: Qualification DirCo** - `987959a` (feat)

## Files Created/Modified
- `server/utils/b2bTender.ts` - Schéma Zod d'intake + `buildTenderLots`
- `tests/unit/b2b-tender.test.ts` - 7 tests (validation description, catégories, dédoublonnage lots)
- `server/api/v1/b2b/requests.post.ts` - Persistance description + création lots, email interne enrichi
- `server/api/v1/admin/b2b-requests/[id].patch.ts` - Champs `decision_status`/`project_postal_code`

## Decisions Made
Voir `key-decisions` en frontmatter.

## Deviations from Plan

None - plan exécuté exactement comme écrit, à une exception d'exécution locale : le build a d'abord échoué sous Node 20 (`trustedFunctions.difference is not a function`, API `Set.prototype.difference` absente avant Node 22) — non lié au code de ce plan, résolu en basculant sur `nvm use 22` (déjà installé) avant `npm run build`.

## Issues Encountered
Build Nuxt initialement lancé sous Node 20.20 (version par défaut de l'environnement) — échec par incompatibilité d'API native, pas une régression introduite par ce plan. Résolu avec Node 22.22.1.

## Next Phase Readiness
Le backend expose désormais tous les champs et tables nécessaires à l'UI (07-03) : `description`, `lots_categories` à l'intake, `decision_status`/`project_postal_code` en qualification. Aucun blocage.

---
*Phase: 07-formulaire-ao-mod-le-multi-lots*
*Completed: 2026-09-05*
