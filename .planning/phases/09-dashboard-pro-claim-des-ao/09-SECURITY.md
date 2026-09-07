# SECURITY.md — Phase 09 : Dashboard Pro & Claim des AO

**Audit date:** 2026-09-08
**ASVS Level:** 1
**block_on:** high
**Threats closed:** 18/18

## Threat Verification

| Threat ID | Category | Disposition | Evidence |
|-----------|----------|-------------|----------|
| T-09-01 | Information Disclosure | mitigate | `server/utils/maskTender.ts:47-56` — branche `!claimed` ne retourne aucune clé `postal_code` et masque les 4 champs `contact_*` ; couvert par `tests/unit/mask-tender.test.ts` |
| T-09-02 | Elevation of Privilege | mitigate | `supabase/migrations/20260907000000_phase9_tender_claims.sql:19-24` — `ENABLE ROW LEVEL SECURITY` + policy unique `auth.jwt()->>'role' = 'admin'` sur `b2b_tender_claims`, aucune policy anon/authenticated |
| T-09-03 | Tampering | accept | Migration additive uniquement (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`), pushée via CLI authentifiée (09-01-SUMMARY.md) ; risque accepté et documenté dans le plan, aucune donnée existante réécrite |
| T-09-04 | Elevation of Privilege | mitigate | `server/api/v1/tenders/[id]/claim.post.ts:30-62` — 3 gates séquentiels avant écriture : `is_verified !== true` (403), `decennal_status !== 'valid'` (403), `pro_zones` actif sur `lot.zone_id` (403) |
| T-09-05 | Information Disclosure | mitigate | `claim.post.ts:72,94,137` et `index.get.ts:68-71` — toutes les réponses passent par `maskTender(...)`, aucune construction manuelle de `contact_*` |
| T-09-06 | Tampering | mitigate | `claim.post.ts:79-97` — insertion suivie de gestion explicite du code `23505` (violation `UNIQUE(lot_id, pro_id)`) retombant sur le chemin idempotent `ALREADY_CLAIMED` |
| T-09-07 | Denial of Service | accept | Endpoint authentifié (401 sans session), idempotence par contrainte unique ; pas de rate-limit dédié — accepté tel que documenté dans le plan (volume B2B faible) |
| T-09-08 | Information Disclosure | mitigate | `tenderClaim.ts:17-36` (`renderTenderClaimEmail`) — seules `proCompany`, `proContactName`, `proEmail`, `proPhone` de l'artisan positionné sont injectées ; aucune donnée d'un autre pro ni du particulier |
| T-09-09 | Repudiation | mitigate | `b2b_tender_claims.claimed_at NOT NULL DEFAULT clock_timestamp()` (migration ligne 12) ; `closed_reason CHECK IN ('cap','expired','manual')` (lignes 30-33) |
| T-09-10 | Spoofing | mitigate | `close-expired-tenders.get.ts:18-22` — `if (!secret \|\| auth !== \`Bearer ${secret}\`) throw 401` |
| T-09-11 | Tampering | mitigate | `close-expired-tenders.get.ts:26-30,59-65` — lecture bornée `.eq('status','open').limit(1000)`, update uniquement `status: 'closed', closed_reason: 'expired'` (aucune réouverture/suppression possible dans le code) |
| T-09-12 | Tampering / XSS | mitigate | `report.post.ts:6-10` — `z.enum(REPORT_REASONS)` (5 valeurs) + `z.string().max(500)` ; `AdminB2bTab.vue:382,406-409` — rendu via interpolation `{{ }}` uniquement, aucun `v-html` dans le fichier |
| T-09-13 | Denial of Service | mitigate | `report.post.ts:48` — `report_reasons: [...(req.report_reasons ?? []), label].slice(-20)` ; endpoint protégé par 401 sans session |
| T-09-14 | Information Disclosure | mitigate | `report.post.ts:54` — `return { status: 'SUCCESS' }`, aucun compteur renvoyé à l'artisan |
| T-09-15 | Information Disclosure | mitigate | `TenderCard.vue:78-90` — les 4 spans affichent uniquement les valeurs reçues du serveur (`*** *** ***`), `blur-[3px]` est une classe CSS décorative, aucune reconstruction côté client |
| T-09-16 | Elevation of Privilege | mitigate | `TenderCard.vue:100-104` — `canClaim` ne fait que désactiver le bouton ; `claim.post.ts:30-62` refait les 3 contrôles serveur indépendamment de tout état client |
| T-09-17 | Tampering | mitigate | `app/pages/espace/leads/index.vue` (`claimSubmitting`) désactive le bouton pendant l'appel ; `claim.post.ts` protégé par `UNIQUE (lot_id, pro_id)` + gestion `23505` |
| T-09-18 | Information Disclosure | mitigate | `index.get.ts:31-33` — `if (zoneIds.length === 0 \|\| !pro.categories?.length) return { tenders: [], zones: [], canClaim }` ; filtrage exclusivement serveur |

## Unregistered Flags

None — SUMMARY.md 09-03 déclare explicitement "Threat Flags: Aucun" ; les autres SUMMARY (09-01, 09-02, 09-04) ne portent pas de section `## Threat Flags` avec surface non couverte par le registre ci-dessus.

## Accepted Risks Log

- **T-09-03** (Tampering, migration distante) — accepté : push manuel via CLI authentifiée, périmètre strictement additif (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`), aucune donnée existante réécrite. Constat opérationnel (09-01-SUMMARY.md) : la migration a été appliquée en distant avant l'exécution locale du plan 09-02 (worktree non synchronisé), sans impact sur la disposition retenue.
- **T-09-07** (Denial of Service, POST claim en boucle) — accepté : endpoint authentifié + idempotent par contrainte `UNIQUE (lot_id, pro_id)`, volume B2B jugé trop faible pour justifier un rate-limit dédié à ce stade.

## Notes d'audit

- `npm run build` est cassé en environnement local (Node 20, `Set.prototype.difference` nécessite Node 22+) — préexistant et hors périmètre de cette phase, documenté dans chaque SUMMARY concerné (09-02, 09-03). N'affecte pas la vérification des mitigations ci-dessus, faites par lecture directe du code source.
- Aucun fichier d'implémentation n'a été modifié pendant cet audit.
