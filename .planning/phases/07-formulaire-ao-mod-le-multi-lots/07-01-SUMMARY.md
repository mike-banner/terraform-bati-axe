---
phase: 07-formulaire-ao-mod-le-multi-lots
plan: 01
status: complete
requirements: [TEND-01, TEND-02, TEND-05]
---

# 07-01 — Socle de données multi-lots (SUMMARY)

## What shipped

1. **Migration `supabase/migrations/20260904000000_phase7_tender_lots.sql`**
   - `b2b_requests` gagne `description` (TEXT), `decision_status` (TEXT NOT NULL
     DEFAULT `'en_attente'`, CHECK `IN ('confirme', 'en_attente')`) et
     `project_postal_code` (TEXT, CHECK `~ '^\d{5}$'`).
   - Nouvelle table `b2b_tender_lots` (1 lot par corps de métier sur un AO) :
     `request_id` → `b2b_requests(id) ON DELETE CASCADE`, `category` contraint
     aux 6 valeurs de `professionals.categories`, `zone_id` → `zones(id)`
     (nullable, résolu en Phase 8), `status` (`open`/`claimed`/`closed`),
     `UNIQUE (request_id, category)`. RLS activé, seule policy = service role
     admin (miroir exact de `b2b_requests`).
   - Appliquée en production via `npx supabase db push --yes` (projet
     `xpwoczcbyamnjknloxgz`).

2. **`app/types/b2b.ts`** — ajout de `B2bDecisionStatus`, `B2bLotCategory`,
   `B2bTenderLotStatus`, `B2bTenderLot`, des 3 nouveaux champs dans
   `B2bRequest`, et de `LOT_CATEGORY_OPTIONS` / `DECISION_STATUS_LABELS`.
   `LOT_CATEGORY_OPTIONS` dérive de `CATEGORY_LABELS` (import
   `~/types/admin`) — aucun libellé de catégorie dupliqué.

3. **`app/types/database.types.ts`** régénéré depuis le schéma distant
   (`supabase gen types typescript`), reflète `b2b_tender_lots` et les 3
   nouvelles colonnes de `b2b_requests`.

## Verification

- `npx supabase db push --yes` → migration appliquée sans erreur.
- `grep -c "b2b_tender_lots" app/types/database.types.ts` → 4 (≥3 attendu).
- `grep -q "project_postal_code"` / `"decision_status"` → présents.
- `npx vitest run` → 103/103 verts, aucune régression.
- Toutes les acceptance criteria du plan (grep sur la migration et sur
  `app/types/b2b.ts`) vérifiées manuellement — voir commits.

## Commits

1. `feat(07): migration multi-lots b2b_tender_lots + colonnes AO`
2. `feat(07): types front B2bTenderLot, décision, corps de métier`
3. `chore(07): régénérer database.types.ts (b2b_tender_lots, colonnes AO)`

## Notes for downstream plans (07-02, 07-03)

- Le socle de données est en place et vérifiable en base réelle (prod
  `xpwoczcbyamnjknloxgz`) — 07-02/07-03 peuvent construire le formulaire
  tunnel (description, sélecteur multi-lots syndic) et l'écran de
  qualification DirCo (statut, code postal) sans attendre de migration
  supplémentaire.
- `b2b_tender_claims` et `b2b_tender_notifications` (Phase 8/9) n'ont
  volontairement pas été créées — hors scope de cette phase.
- Deux fichiers `.planning/graphs/GRAPH_REPORT.md` et `.planning/graphs/graph.json`
  étaient déjà modifiés dans le worktree avant l'exécution de ce plan (état
  hérité, non lié à 07-01) — laissés tels quels, non commités par cet agent.
