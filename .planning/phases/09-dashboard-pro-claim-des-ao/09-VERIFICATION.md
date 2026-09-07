---
phase: 09-dashboard-pro-claim-des-ao
verified: 2026-09-08T00:00:00Z
status: passed
score: 5/5 must-haves verified
deferred:
  - truth: "Le partenaire reçoit un email structuré à chaque étape clé (TEND-16) — rendu visuel confirmé en conditions réelles"
    addressed_in: "Phase 10"
    evidence: "Phase 10 (Rattrapage Infra & Auth Pro) couvre DNS-01/INFRA-DOM-01 : « DNS bati-axe.com (DKIM/SPF/DMARC) + bascule Terraform prod » — c'est exactement le blocage (domaine Resend non vérifié, erreur 403) qui a empêché l'inspection visuelle de l'email au checkpoint du 2026-09-07/08."
---

# Phase 9: Dashboard Pro & Claim des AO Verification Report

**Phase Goal:** L'artisan peut consulter, réclamer et traiter les appels d'offres qui le concernent depuis son espace, sans confusion sur ce que couvre son abonnement.
**Verified:** 2026-09-08
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | L'artisan voit un onglet « Appels d'offres » distinct, avec phrase expliquant les deux flux | ✓ VERIFIED | `app/pages/espace/leads/index.vue:173-196` — onglets + phrase exacte « Votre abonnement de zone couvre désormais deux flux… » (grep confirmé), `TenderCard.vue:44` badge « AO Partenaire » |
| 2 | Claim possible uniquement si `pro_zones` actif sur la zone du lot | ✓ VERIFIED | `server/api/v1/tenders/[id]/claim.post.ts` — requête `pro_zones` `.eq('status','active')` avant insertion, 403 explicite sinon |
| 3 | Après claim, coordonnées révélées à l'artisan + email structuré au partenaire | ✓ VERIFIED (code) / voir déféré | `maskTender(lot, true)` retourne les 4 coordonnées en clair ; `renderTenderClaimEmail()` + `sendEmail()` appelés dans `claim.post.ts` avec sujet contenant « Un artisan est intéressé » + réf. AO. Rendu visuel de l'email non inspecté en local (domaine Resend non vérifié) — voir section Déféré |
| 4 | Clôture auto au cap (1 si confirmé / 3 sinon) ou à expiration (14j) | ✓ VERIFIED | `shouldCloseLot()` appelé post-insertion dans `claim.post.ts` (`closed_reason: 'cap'`) ; `selectExpiredLots()` + cron `close-expired-tenders.get.ts` (`closed_reason: 'expired'`), vérifié en DB pendant le checkpoint humain (lot `en_attente` à 1 claim reste `open`) |
| 5 | Signalement d'un AO suspect, visible par l'admin | ✓ VERIFIED | `report.post.ts` incrémente `reported_count`/`reported_at`/`report_reasons` sans toucher au statut ; `AdminB2bTab.vue` affiche le badge « ⚠ Signalé » et le détail des raisons |

**Score:** 5/5 truths verified (1 avec réserve documentée, déférée à Phase 10)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Rendu visuel réel de l'email partenaire (TEND-16) | Phase 10 | Phase 10 couvre DNS-01/INFRA-DOM-01 (vérification DKIM/SPF du domaine `bati-axe.com`) — cause racine du 403 Resend rencontré en local. Le chemin de code (`sendEmail`/`renderTenderClaimEmail`) est confirmé exécuté au claim. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260907000000_phase9_tender_claims.sql` | Schéma claims + clôture + signalement | ✓ VERIFIED | Contient `CREATE TABLE b2b_tender_claims`, `UNIQUE(lot_id,pro_id)`, RLS admin-only, `closed_reason` CHECK, colonnes `reported_*` |
| `app/types/database.types.ts` | Types régénérés | ✓ VERIFIED | Contient `b2b_tender_claims`, `closed_reason`, `report_reasons` |
| `server/utils/maskTender.ts` | Masquage/révélation pur | ✓ VERIFIED & WIRED | Fonction pure, aucune coordonnée fuitée avant claim, importée dans les 2 endpoints tenders |
| `tests/unit/mask-tender.test.ts` | Tests masquage | ✓ VERIFIED | 6 tests, tous verts |
| `server/utils/tenderClaim.ts` | Cap/clôture/email | ✓ VERIFIED & WIRED | `tenderCap`, `shouldCloseLot`, `renderTenderClaimEmail` exportés, importés dans `claim.post.ts` |
| `tests/unit/tender-claim.test.ts` | Tests cap/clôture/email | ✓ VERIFIED | 8 tests verts |
| `server/api/v1/tenders/index.get.ts` | Liste AO matchés masqués | ✓ VERIFIED & WIRED | Auth 401, `pro_zones` actives, `maskTender()` systématique, aucune coordonnée construite à la main |
| `server/api/v1/tenders/[id]/claim.post.ts` | Claim gaté cap/clôture/email | ✓ VERIFIED & WIRED | Gate en cascade (401→404→403 vérifié→403 décennale→404 lot→403 catégorie→403 zone→409 clos), idempotence 23505, email try/catch non bloquant |
| `server/api/v1/cron/close-expired-tenders.get.ts` | Clôture 14j | ✓ VERIFIED & WIRED | `selectExpiredLots()` pure + garde `cronSecret`, `closed_reason: 'expired'` |
| `.github/workflows/cron-close-expired-tenders.yml` | Déclenchement quotidien | ✓ VERIFIED | Cron `30 7 * * *`, cible le bon endpoint, `secrets.CRON_SECRET` |
| `server/api/v1/tenders/[id]/report.post.ts` | Signalement | ✓ VERIFIED & WIRED | Zod enum 5 valeurs + `.max(500)`, écrit `reported_count`/`reported_at`/`report_reasons`, ne touche pas au statut |
| `app/components/admin/AdminB2bTab.vue` | Badge signalé | ✓ VERIFIED & WIRED | Badge « ⚠ Signalé ×N » + encart détail + mention « reste diffusé » |
| `app/components/espace/TenderCard.vue` | Carte AO masquée/révélée | ✓ VERIFIED & WIRED | Badge « AO Partenaire », `blur-[3px]` sur coordonnées non-claim, bouton « Je suis intéressé », lien signalement, aucun `$fetch`/`useFetch` (présentationnel pur) |
| `app/components/espace/TenderClaimModal.vue` | Modale exclusivité | ✓ VERIFIED & WIRED | Textes exacts d'avertissement confirme/en_attente, note D-06 non-annulation |
| `app/components/espace/TenderReportModal.vue` | Modale signalement | ✓ VERIFIED & WIRED | 5 raisons énumérées, `maxlength="500"`, mention D-10 |
| `app/pages/espace/leads/index.vue` | Onglets + orchestration | ✓ VERIFIED & WIRED | Onglets, phrase TEND-15, fetch `/api/v1/tenders`, handlers claim/report, composants référencés avec le préfixe auto-import correct (`EspaceTenderCard` etc. — bug corrigé en `88fa06b`) |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `tenders/index.get.ts` | `maskTender.ts` | `import { maskTender }` | ✓ WIRED |
| `tenders/[id]/claim.post.ts` | `pro_zones` | requête `.eq('status','active')` | ✓ WIRED |
| `tenders/[id]/claim.post.ts` | `sendEmail` | notification partenaire, try/catch non bloquant | ✓ WIRED |
| `cron/close-expired-tenders.get.ts` | workflow GitHub Actions | curl Bearer CRON_SECRET | ✓ WIRED |
| `report.post.ts` | `b2b_requests.reported_count` | incrément + append raison | ✓ WIRED |
| `AdminB2bTab.vue` | `b2b_requests.reported_count` | badge conditionnel | ✓ WIRED |
| `espace/leads/index.vue` | `/api/v1/tenders`, `/claim`, `/report` | `useAsyncData` + `$fetch` POST | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Suite unitaire Phase 9 | `npx vitest run tests/unit/mask-tender.test.ts tests/unit/tender-claim.test.ts tests/unit/close-expired-tenders.test.ts` | 19/19 tests verts | ✓ PASS |
| Flux complet (claim → cap → clôture → email → signalement → badge admin) | Checkpoint humain manuel (09-04 Task 4) | Approuvé le 2026-09-07/08, vérifié en DB (lot `en_attente` à 1 claim reste `open`) | ✓ PASS (walkthrough humain déjà réalisé) |
| `npm run build` | — | Cassé indépendamment du code de la phase (`Set.prototype.difference`, Node 20 vs ES2024 requis) | ? SKIP — préexistant, documenté dans `deferred-items.md`, substitué par `npx nuxt typecheck`/`vitest` sans nouvelle erreur |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TEND-03 | 09-01, 09-02 | AO confirmé exclusif à 1 artisan, en_attente jusqu'à 3 | ✓ SATISFIED | `tenderCap()`/`shouldCloseLot()` + gate cap dans `claim.post.ts` ; **REQUIREMENTS.md non mis à jour** (case toujours décochée / tableau « Pending ») — écart documentaire, pas un écart de code |
| TEND-07 | 09-02, 09-04 | Liste des AO ouverts dans onglet dédié | ✓ SATISFIED | Onglet + `GET /api/v1/tenders` |
| TEND-08 | 09-02, 09-04 | Claim conditionné à `pro_zones` actif | ✓ SATISFIED | Gate zone dans `claim.post.ts` |
| TEND-09 | 09-01, 09-02, 09-04 | Révélation coordonnées après claim | ✓ SATISFIED | `maskTender(lot, true)` |
| TEND-12 | 09-01, 09-03 | Clôture auto (cap ou 14j) | ✓ SATISFIED | `shouldCloseLot()` + cron `close-expired-tenders.get.ts` ; **REQUIREMENTS.md non mis à jour** (idem TEND-03) |
| TEND-13 | 09-01, 09-03, 09-04 | Signalement AO suspect | ✓ SATISFIED | `report.post.ts` + modale + badge admin |
| TEND-15 | 09-04 | Phrase explicative deux flux | ✓ SATISFIED | Phrase exacte présente dans `espace/leads/index.vue` |
| TEND-16 | 09-02 | Email structuré au partenaire | ✓ SATISFIED (code) | `renderTenderClaimEmail()` + `sendEmail()` appelés ; rendu visuel non inspecté en local (Resend 403, domaine non vérifié) — déféré Phase 10. **REQUIREMENTS.md non mis à jour** (case décochée / tableau « Pending ») |

### Anti-Patterns Found

Aucun. Recherche `TODO|FIXME|PLACEHOLDER|not implemented` sur les 10 fichiers de code de la phase : 0 résultat. Pas de `$fetch`/`useFetch` dans les composants présentationnels (conforme au plan). Pas de reconstruction manuelle de coordonnées côté client ou serveur hors `maskTender()`.

### Documentation Gap (non-blocking)

`.planning/REQUIREMENTS.md` liste encore TEND-03, TEND-12 et TEND-16 comme non cochés (`[ ]`) et « Pending » dans le tableau de couverture, alors que le code correspondant est livré et testé (confirmé ci-dessus). Les SUMMARY des plans 09-01/09-02/09-03 déclarent pourtant ces IDs dans `requirements-completed`. Recommandation : cocher ces 3 lignes et passer leur statut à `Complete` dans REQUIREMENTS.md — ceci est un écart de suivi documentaire, pas un écart d'implémentation (le code a été vérifié indépendamment de ces cases).

### Human Verification Required

Aucune action humaine bloquante restante — le checkpoint (09-04 Task 4) a déjà été exécuté et approuvé le 2026-09-07/08, couvrant : visibilité onglet AO/badges, flux de claim avec modale d'exclusivité et révélation, logique de cap (vérifiée en DB), flux de signalement, badge admin, layout mobile 390px.

Un seul point est reporté à un environnement ultérieur (non bloquant pour clore cette phase) :

### 1. Rendu réel de l'email partenaire au claim

**Test:** Une fois le domaine Resend `bati-axe.com` vérifié (DKIM/SPF, Phase 10/DNS-01), déclencher un claim en staging/prod et inspecter l'email reçu par le partenaire.
**Expected:** Sujet contenant « Un artisan est intéressé par votre appel d'offres [catégorie] — réf. [XXXXXXXX] », corps avec entreprise/interlocuteur/téléphone/email de l'artisan, CTA `mailto:`.
**Why human:** Le code du chemin d'envoi (`renderTenderClaimEmail`/`sendEmail`) est confirmé exécuté, mais le rendu visuel réel n'a pas pu être inspecté en local — `EMAIL_LIVE=true` pointe vers un vrai compte Resend dont le domaine `bati-axe.com` n'est pas vérifié (erreur 403), un problème d'environnement préexistant et hors périmètre du code de cette phase.

### Gaps Summary

Aucun gap de code. Le seul écart relevé (rendu visuel de l'email partenaire) est un problème d'environnement (domaine Resend non vérifié) déjà documenté par l'équipe d'exécution dans `deferred-items.md`, dont la résolution est explicitement prévue en Phase 10 (DNS-01/INFRA-DOM-01). Un écart purement documentaire existe sur `.planning/REQUIREMENTS.md` (3 cases non cochées malgré un code livré et testé) — à corriger mais non bloquant pour la clôture de la phase.

---

*Verified: 2026-09-08*
*Verifier: Claude (gsd-verifier)*
