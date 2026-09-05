---
phase: 07-formulaire-ao-mod-le-multi-lots
plan: 03
subsystem: ui
tags: [vue, nuxt, b2b, tunnel, admin]

requires:
  - phase: 07-01
    provides: table b2b_tender_lots, colonnes description/decision_status/project_postal_code
  - phase: 07-02
    provides: server/utils/b2bTender.ts, intake étendu, PATCH admin étendu
provides:
  - tunnel public exposant description obligatoire + sélecteur multi-lots (syndic uniquement)
  - fiche admin B2B exposant description en lecture, statut de décision, code postal structuré
affects: [phase-08, phase-09]

tech-stack:
  added: []
  patterns:
    - "Réutilisation verbatim des classes Tailwind existantes (pattern TRAVAUX_OPTIONS pour le picker de lots) plutôt que d'introduire un nouveau style"

key-files:
  modified:
    - app/pages/b2b/partenaires.vue
    - app/components/admin/AdminB2bTab.vue

key-decisions:
  - "project_location (tunnel, texte libre) et project_postal_code (admin, 5 chiffres) restent deux champs distincts — le CP structuré est saisi par le DirCo à la qualification, pas extrait automatiquement du texte libre. Source de confusion signalée par l'utilisateur pendant la vérification humaine, confirmée comme comportement voulu (préparation TEND-04/Phase 8 matching par zone)."
  - "decision_status a une valeur par défaut en base (en_attente) — le select admin doit refléter cette valeur dès l'ouverture d'un dossier neuf, pas un champ vide."

patterns-established: []

requirements-completed: [TEND-01, TEND-02, TEND-05, SYNDIC-01]

duration: 40min
completed: 2026-09-05
---

# Phase 07: Formulaire AO & Modèle Multi-Lots — Plan 03 Summary

**UI exposant le socle 07-01/07-02 : tunnel avec description obligatoire + sélecteur multi-lots syndic, fiche admin avec statut de décision et code postal structuré — vérifié en conditions réelles avec un dépôt syndic complet**

## Performance

- **Duration:** ~40 min (dont checkpoint humain)
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 2

## Accomplissements
- Étape 3 du tunnel bloque "Continuer" tant que la description fait moins de 20 caractères
- Sélecteur de corps de métier (pills copper) visible uniquement pour le persona syndic, absent pour les autres personas (vérifié avec architecte)
- Fiche admin B2B affiche la description du partenaire, un select de statut de décision, un input code postal avec erreur inline hors format 5 chiffres
- Checkpoint humain approuvé après un incident bloquant découvert et corrigé pendant la vérification (voir Issues Encountered)

## Task Commits

1. **Task 1: Tunnel public** - `ba67178` (feat)
2. **Task 2: Fiche DirCo** - `82106a8` (feat)
3. **Task 3: Vérification humaine** - checkpoint, pas de commit de code (correctif hors-plan documenté ci-dessous)

## Files Created/Modified
- `app/pages/b2b/partenaires.vue` - Description obligatoire + sélecteur multi-lots syndic
- `app/components/admin/AdminB2bTab.vue` - Statut de décision, code postal, description en lecture

## Decisions Made
Voir `key-decisions` en frontmatter.

## Deviations from Plan

None sur le code — plan exécuté exactement comme écrit.

## Issues Encountered

**Blocage découvert pendant le checkpoint humain (hors scope du code de ce plan) :** la migration 07-01 avait été appliquée via `supabase db push` sur le projet **remote** lié (`xpwoczcbyamnjknloxgz`), mais jamais sur la base **locale** (`127.0.0.1:54322`) utilisée par le serveur `npm run dev` de l'utilisateur. Le premier dépôt syndic testé a donc échoué en 500 silencieux (colonne `description` inexistante localement). Diagnostiqué en interrogeant directement PostgREST local, puis corrigé en appliquant le fichier de migration `20260904000000_phase7_tender_lots.sql` directement via `psql` sur la base locale (idempotent, sans toucher à `supabase_migrations.schema_migrations` qui présentait déjà une dérive préexistante non liée à cette phase — `supabase migration up --local` refusait pour cette raison). Après correction, un second dépôt syndic a été enregistré avec succès (description + 2 lots `electricite`/`peinture` créés), vérifié par l'utilisateur dans l'admin.

**Point de confusion utilisateur, clarifié, pas un bug :** le champ "Code postal du projet" (admin) reste vide après un dépôt tunnel, car le tunnel ne capture que `project_location` (texte libre, ex. "78 — Yvelines") — le code postal structuré à 5 chiffres est un champ distinct saisi manuellement par le DirCo à la qualification, pas dérivé automatiquement.

## User Setup Required

**Environnements locaux existants avant cette phase doivent réappliquer la migration `20260904000000_phase7_tender_lots.sql` sur leur base locale** (`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/migrations/20260904000000_phase7_tender_lots.sql`) si `supabase migration up --local` échoue à cause d'une dérive de `schema_migrations` préexistante (non liée à cette phase, à investiguer séparément si elle bloque d'autres migrations futures).

## Next Phase Readiness
Phase 7 fonctionnellement complète et vérifiée de bout en bout (tunnel → base → admin). Phase 8 (diffusion automatique) peut s'appuyer sur `b2b_tender_lots.zone_id` (actuellement NULL, résolution via `matchZone()` prévue en Phase 8) et `decision_status` pour distinguer AO confirmés/en attente.

**Point de vigilance pour la suite** : la dérive de `supabase_migrations.schema_migrations` en local (détectée ici, non résolue — hors scope) pourrait refaire échouer `supabase migration up --local` sur une prochaine migration. À investiguer si elle bloque une future phase.

---
*Phase: 07-formulaire-ao-mod-le-multi-lots*
*Completed: 2026-09-05*
