---
phase: 09-dashboard-pro-claim-des-ao
plan: 04
subsystem: ui
tags: [vue, nuxt, tailwind, tender-claim]

requires:
  - phase: 09-dashboard-pro-claim-des-ao (09-02)
    provides: "API artisan GET /api/v1/tenders, POST /claim (masquage serveur, cap 1/3)"
  - phase: 09-dashboard-pro-claim-des-ao (09-03)
    provides: "POST /api/v1/tenders/{id}/report, badge « Signalé » admin"
provides:
  - "Onglet « Appels d'offres » dans /espace/leads avec cartes AO badgées, floutage/révélation des coordonnées"
  - "Modale de confirmation de claim rappelant l'exclusivité (D-04/D-06)"
  - "Modale de signalement d'AO (raison + détails, D-09/D-10)"
affects: [dashboard-pro, b2b-tenders]

tech-stack:
  added: []
  patterns:
    - "Composants présentationnels sous app/components/espace/ : pas de $fetch/useFetch, tout émis vers la page qui orchestre"
    - "Auto-import Nuxt préfixe les composants de sous-dossier avec le nom du dossier (EspaceTenderCard, pas TenderCard) — à respecter dans les templates qui les consomment"

key-files:
  created:
    - app/components/espace/TenderCard.vue
    - app/components/espace/TenderClaimModal.vue
    - app/components/espace/TenderReportModal.vue
  modified:
    - app/pages/espace/leads/index.vue

key-decisions:
  - "Onglets « Chantiers particuliers » / « Appels d'offres » ajoutés sans réécrire la page existante (tout le contenu leads enveloppé dans un v-if, section AO en v-else)"
  - "Vérification checkpoint humaine faite en environnement local avec deux bugs d'environnement trouvés et corrigés hors plan (voir Déviations)"

patterns-established:
  - "Toujours vérifier le préfixe d'auto-import Nuxt (nom du dossier) avant de référencer un nouveau composant dans app/components/<dossier>/ pour la première fois"

requirements-completed: [TEND-07, TEND-08, TEND-09, TEND-13, TEND-15]

duration: ~45min (dont vérification humaine)
completed: 2026-09-08
---

# Phase 09 Plan 04: Onglets AO dans l'espace artisan Summary

**Onglet « Appels d'offres » dans /espace/leads avec cartes badgées, floutage/révélation serveur des coordonnées, modale d'exclusivité au claim et modale de signalement — dernière brique de la Phase 9.**

## Performance

- **Duration:** ~45 min (tasks 1-3) + vérification humaine (checkpoint task 4)
- **Tasks:** 4/4 (3 auto + 1 checkpoint humain approuvé)
- **Files modified:** 4 (3 créés, 1 modifié) + 1 fix post-checkpoint

## Accomplissements

- `TenderCard.vue` : carte AO reprenant la coque visuelle des cartes leads, badge « AO Partenaire », badge de décision (confirmé/en attente), coordonnées floutées côté client (`*** *** ***`, jamais reconstruites — ADR-004) avant claim, coordonnées en clair + boutons de copie après claim.
- `TenderClaimModal.vue` / `TenderReportModal.vue` : modales présentationnelles pures (aucun appel réseau), textes d'avertissement exacts du plan (exclusivité, non-annulation D-06, mention RGPD, enum des 5 raisons de signalement, compteur 500 caractères).
- `app/pages/espace/leads/index.vue` : deux onglets avec compteurs, phrase TEND-15 sur le double flux de l'abonnement, chargement `/api/v1/tenders` via `useAsyncData`, handlers `confirmClaim`/`submitReport`, grille AO avec squelette/erreur/état vide, modales câblées.

## Task Commits

1. **Task 1: TenderCard.vue** — `a794345` (feat)
2. **Task 2: Modales de claim et de signalement** — `d102aaa` (feat)
3. **Task 3: Onglets Chantiers particuliers / Appels d'offres** — `4180637` (feat)
4. **Task 4: Checkpoint humain approuvé** — pas de commit propre (vérification), fix associé ci-dessous
5. **Fix post-checkpoint (nommage composants)** — `88fa06b` (fix)

**Plan metadata:** (ce commit) `docs: complete plan`

## Files Created/Modified

- `app/components/espace/TenderCard.vue` — carte AO masquée/révélée
- `app/components/espace/TenderClaimModal.vue` — confirmation de claim avec avertissement d'exclusivité
- `app/components/espace/TenderReportModal.vue` — formulaire de signalement
- `app/pages/espace/leads/index.vue` — onglets + orchestration claim/report

## Decisions Made

- Le contenu existant de la page leads (bandeaux, filtres, pagination) n'a pas été touché : simplement enveloppé dans `v-if="activeTab === 'leads'"`, conformément à la contrainte du plan de ne pas réécrire la page.
- `?tab=ao` et `?src=email` ouvrent directement l'onglet AO, pour rester cohérent avec les liens de diffusion Phase 8.

## Deviations from Plan

### Auto-fixed Issues (trouvées pendant la vérification checkpoint, corrigées par l'orchestrateur, commit rattaché à ce plan)

**1. [Rule 1 - Bug] Nommage des composants espace/Tender* non préfixé**
- **Trouvé pendant :** vérification checkpoint (Task 4) — l'onglet AO paraissait vide, erreur console « Failed to resolve component ».
- **Problème :** `TenderCard.vue`, `TenderClaimModal.vue`, `TenderReportModal.vue` sont les premiers composants placés dans `app/components/espace/`. L'auto-import Nuxt préfixe les composants de sous-dossier avec le nom du dossier, produisant `EspaceTenderCard`/`EspaceTenderClaimModal`/`EspaceTenderReportModal`. La page les référençait sans préfixe (`<TenderCard>`, etc.).
- **Correction :** les 3 usages dans `app/pages/espace/leads/index.vue` renommés vers les tags `Espace`-préfixés.
- **Fichiers modifiés :** `app/pages/espace/leads/index.vue`
- **Vérification :** `grep -c "EspaceTender" app/pages/espace/leads/index.vue` → 3 ; onglet AO fonctionnel en test manuel.
- **Committed in :** `88fa06b`

### Constats hors-code (pas de fix requis dans ce plan)

**2. Écart d'environnement local — migration 09-01 non appliquée localement.** La migration `supabase/migrations/20260907000000_phase9_tender_claims.sql` avait été poussée sur le projet Supabase distant uniquement (par l'exécuteur 09-01), jamais sur la base Postgres locale — `b2b_tender_claims`, `b2b_tender_lots.closed_at/closed_reason` et `b2b_requests.reported_count/reported_at/report_reasons` étaient absents en local. Appliquée manuellement via `psql` pendant la vérification de ce checkpoint, pas de changement de code nécessaire. **À retenir : pousser les migrations Supabase en local en même temps qu'en distant** (`supabase db push` sans `--linked`, ou application locale explicite), sinon `npm run dev` casse silencieusement sur les phases suivantes.

**3. Compte de test reconfiguré.** Le pro `newtest@example.com` (`ccc91585-930b-4c26-bd3e-ae032006dafd`) a été modifié pour les besoins du test manuel : catégorie `electricite` ajoutée, `pro_zones` actif sur St-Germain-en-Laye (`11d671ea-77cc-4e0e-90a3-b974fd497edb`), `subscription_status: active`, mot de passe réinitialisé. Aucune migration associée — donnée de test locale, signalée pour éviter toute surprise sur cet enregistrement.

---

**Total deviations:** 1 auto-fixé (Rule 1 - bug), 2 constats d'environnement documentés sans fix de code.
**Impact on plan:** Le fix de nommage était nécessaire pour que l'onglet AO fonctionne — corrige un vrai bug, pas de scope creep. Les deux constats sont des écarts d'environnement de développement, sans impact sur le code livré ni sur la prod.

## Issues Encountered

- **Email partenaire non vérifiable en environnement local** — voir `.planning/phases/09-dashboard-pro-claim-des-ao/deferred-items.md` (entrée du 2026-09-07) : `EMAIL_LIVE=true` local pointe vers Resend avec un domaine `bati-axe.com` non vérifié (403). L'appel `sendEmail`/`notifyB2bPros` est bien déclenché au claim, mais le rendu exact de l'email n'a pas pu être inspecté visuellement. **À revérifier en staging/prod une fois le domaine Resend vérifié** (DKIM/SPF, cf. blocage déjà noté pour la Phase 06.3).
- `npm run build` reste cassé indépendamment de ce plan (`trustedFunctions.difference is not a function`, Node 20 vs ES2024 requis) — déjà documenté dans `deferred-items.md` (entrée Plan 03), hors périmètre.

## User Setup Required

None - aucune configuration de service externe requise pour ce plan (le point Resend est un problème d'environnement pré-existant, déjà tracké en Phase 06.3/deferred-items).

## Next Phase Readiness

- Phase 09 (Dashboard Pro & Claim des AO) complète : schéma (09-01), API claim/cap (09-02), cron clôture + signalement admin (09-03), UI artisan (09-04).
- Point de vigilance à reporter en Phase 10/pré-prod : re-tester l'email partenaire une fois le domaine Resend vérifié, et vérifier que les migrations Supabase locales sont à jour sur toute nouvelle machine de dev.

---
*Phase: 09-dashboard-pro-claim-des-ao*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: `app/components/espace/TenderCard.vue`, `TenderClaimModal.vue`, `TenderReportModal.vue`
- FOUND commits: `a794345`, `d102aaa`, `4180637`, `88fa06b`
- `grep -c "EspaceTender" app/pages/espace/leads/index.vue` → 3 (fix confirmed present)
- `npx vitest run` → 147/147 passing
