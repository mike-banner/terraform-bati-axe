# Phase 8: Diffusion Automatique & Confiance - Research

**Researched:** 2026-09-05
**Domain:** Matching zone×catégorie + notification email de masse + rate-limiting anti-spam (Nuxt/Nitro + Supabase, code interne existant)
**Confidence:** HIGH — cette phase n'introduit aucune nouvelle dépendance ni aucun concept externe. Tout le travail consiste à répliquer trois patterns déjà en production dans ce repo (`notifyMatchedPros`, `matchZone`, `restitution.post.ts`). Le CONTEXT.md a déjà pris toutes les décisions produit ; ce document vérifie que les fondations citées existent réellement et documente les écarts trouvés.

## Summary

Le CONTEXT.md (D-01 à D-14) est déjà très prescriptif — ce n'est pas une phase où plusieurs architectures s'affrontent. La recherche a consisté à vérifier que chaque brique citée dans `canonical_refs` existe bien, avec la forme exacte décrite, et à repérer les incohérences entre CONTEXT.md et le code réel avant que le planner ne bâtisse dessus.

**Verdict : les fondations citées sont réelles et directement réutilisables.** `notifyMatchedPros` (`server/utils/notifyProLead.ts`) est un template quasi copier-collable pour le matching + notification B2B : sélection pros filtrés, exclusion des déjà-notifiés via table dédiée `UNIQUE`, envoi séquentiel non-bloquant, `renderEmail()`, trace après succès uniquement. `matchZone()` (`server/utils/zoneMatcher.ts`) résout un CP en zone active via la table `zones` (`type='area'`, `is_active=true`, `postal_codes @> [cp]`) — même fonction, aucune adaptation nécessaire pour `b2b_tender_lots.zone_id`. `restitution.post.ts` est le squelette exact de l'endpoint admin à créer (auth admin, charge dossier, action métier, `audit_logs`, réponse structurée).

**Primary recommendation :** créer `server/utils/notifyMatchedB2bPros.ts` (nouvelle fonction, ne pas modifier `notifyMatchedPros` qui sert au flux particuliers B2C) en clonant fidèlement la structure de `notifyProLead.ts`, avec les filtres D-07/D-08 en plus (`pro_zones` actif, `b2b_alerts_email`), et un nouvel endpoint `diffuse.post.ts` calqué sur `restitution.post.ts`.

**Point de vigilance découvert (pas dans CONTEXT.md) :** `b2b_requests.status` a pour valeurs `nouveau/en_cours/rappele/qualifie/converti/perdu` (CHECK constraint, voir `AdminB2bTab.vue` + migrations `20260822000002`/`20260822000003`) — **pas** de valeur `clos`. Or D-09 dit compter les AO actifs comme `status NOT IN ('converti', 'perdu', 'clos')`. `clos` n'existe pas dans le CHECK actuel sur `b2b_requests.status` : soit c'est une référence anticipée à un futur statut (peut-être confondu avec `b2b_tender_lots.status` qui a bien `open/claimed/closed`), soit il faut l'ajouter à la contrainte. Voir Pitfall 1 et Assumptions Log A1.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Déclenchement**
- D-01 : Un seul bouton « Diffuser » par AO (pas par lot), dans `AdminB2bTab.vue`, remplace le picker manuel `recommended_pros` dans ce flux.
- D-02 : Bouton actionnable seulement si `decision_status` ET `project_postal_code` sont renseignés.
- D-03 : Un clic traite tous les lots `open` du dossier en une fois.
- D-04 : Idempotence par (pro, lot) via nouvelle table `b2b_tender_notifications`, forme miroir de `lead_notifications`, `UNIQUE(pro_id, lot_id, channel)`.
- D-05 : `recommended_pros` reste en base, plus alimentée par ce flux — dépréciation douce, pas de migration destructive.

**Matching (TEND-04)**
- D-06 : `zone_id` du lot résolu **au clic « Diffuser »** via `matchZone(project_postal_code)`, pas à la qualification.
- D-07 : Match si simultanément : `pro_zones(pro_id, zone_id=lot.zone_id, status='active')` ET `professionals.categories @> [lot.category]` ET `professionals.is_verified = true`. Contrairement à `notifyMatchedPros` (P4), TEND-04 exige explicitement une zone active payante.
- D-08 : Nouvelle colonne `professionals.b2b_alerts_email` (boolean, défaut `true`), distincte de `lead_alerts_email`, ajoutée au filtre de matching.

**Rate-limit anti-spam (TEND-11)**
- D-09 : Plafond d'AO actifs simultanés par partenaire : 3 par défaut (`B2B_MAX_ACTIVE_TENDERS_PER_PARTNER`). Compté sur `b2b_requests.status` NOT IN (`converti`, `perdu`, `clos`). Au-delà : bouton « Diffuser » (ou qualification) désactivé avec message clair — pas de blocage silencieux.
- D-10 : Plafond de notifications B2B par artisan/jour tous partenaires confondus : 5 par défaut (`B2B_MAX_NOTIFICATIONS_PER_ARTISAN_PER_DAY`). Au-delà : artisan silencieusement exclu de la diffusion en cours (même pattern non-bloquant que `notifyMatchedPros`).
- D-11 : Les deux seuils en `.env.example` — pas de table config ni UI admin (YAGNI pilote).

**Signal de confiance « AO qualifié BÂTI-AXE » (TEND-14)**
- D-12 : Aucun SIRET partenaire en base — impossible de vérifier littéralement le partenaire. Le badge communique que l'AO a été qualifié manuellement par l'équipe BÂTI-AXE avant diffusion.
- D-13 : Libellé : « AO qualifié BÂTI-AXE » (pas « partenaire vérifié »).
- D-14 : Affiché uniquement dans l'email de notification à l'artisan (`renderEmail()`) — pas d'UI dashboard cette phase.

### Claude's Discretion
- Emplacement exact du check de plafond D-09 (au clic « Diffuser » vs à la transition `decision_status` → qualifié) — choisir le point le plus simple sans dupliquer la logique.
- Design exact du badge dans le template email (texte, icône/emoji, position dans `renderEmail()`).
- Structure exacte de `b2b_tender_notifications` (colonnes additionnelles type `sent_at`) — mirroring `lead_notifications`.
- Où stocker le compteur de notifications/jour/artisan — requête `COUNT` sur `b2b_tender_notifications.sent_at::date = today` plutôt qu'un compteur dédié.

### Deferred Ideas (OUT OF SCOPE)
- Vraie vérification SIRET côté partenaire (v2+, pas actée).
- UI/table de configuration des seuils de rate-limit (env vars fixes pour le pilote).
- Dashboard artisan, claim, révélation coordonnées, fermeture auto, signalement, emails structurés au partenaire → Phase 9.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEND-04 | Matching automatique AO → artisans par zone active (`pro_zones`) + catégorie, remplace `recommended_pros` | `matchZone()` vérifié réutilisable tel quel ; requête de matching = clone du `.from('professionals')...contains('categories',...)` de `notifyMatchedPros` + jointure `pro_zones` (D-07) |
| TEND-06 | Notification email dès diffusion, infra transactionnelle existante (Phase 06.3) | `sendEmail()` + `renderEmail()` (`server/utils/email.ts`, `server/utils/emailLayout.ts`) déjà utilisés par `notifyMatchedPros` et `restitution.post.ts` — même infra, `sender: 'notifications'` |
| TEND-10 | Broadcast déclenché à la qualification DirCo, pas à l'intake public | Confirmé : bouton D-01/D-02 vit dans `AdminB2bTab.vue`, gating sur `decision_status`/`project_postal_code` déjà en base (migration `20260904000000_phase7_tender_lots.sql`) |
| TEND-11 | Rate-limit AO actifs/partenaire + notifs/artisan/jour | Pattern non-bloquant déjà en place dans `notifyMatchedPros` (skip individuel sans casser la boucle) ; comptage `b2b_requests.status` — voir Pitfall 1 sur la valeur `clos` manquante |
| TEND-14 | Badge confiance réutilisant la vérif SIRET | Aucun SIRET partenaire en base (vérifié : `b2b_requests` n'a pas de colonne SIRET) — CONTEXT.md a déjà réorienté vers « AO qualifié BÂTI-AXE », badge email uniquement |

## Standard Stack

Aucune nouvelle dépendance. Stack 100% interne :

| Brique | Fichier | Rôle dans Phase 8 |
|--------|---------|--------------------|
| `sendEmail` | `server/utils/email.ts` | Envoi transactionnel (déjà utilisé par 06.3, P4, restitution) |
| `renderEmail` | `server/utils/emailLayout.ts` | Layout HTML commun — badge D-13/D-14 à y injecter |
| `matchZone` | `server/utils/zoneMatcher.ts` | CP → zone active, à réutiliser tel quel pour `lot.zone_id` |
| `notifyMatchedPros` | `server/utils/notifyProLead.ts` | Template de référence à cloner (pas à modifier — flux B2C distinct) |
| Supabase service role | `serverSupabaseServiceRole(event)` | Contourne RLS pour l'endpoint admin, pattern `restitution.post.ts` |
| `audit_logs` | table existante | Trace de l'action « Diffuser » (pattern `b2b_restitution_sent`) |

**Installation :** aucune — tout existe déjà dans le repo.

## Architecture Patterns

### Pattern 1 : Endpoint admin d'action métier
**Source :** `server/api/v1/admin/b2b-requests/[id]/restitution.post.ts` (existant, à cloner)
**Structure à répliquer pour `diffuse.post.ts` :**
1. Auth admin (`serverSupabaseUser` + check `app_metadata.role === 'admin'`)
2. Charger le dossier `b2b_requests` + ses lots `open` (`b2b_tender_lots`)
3. Résoudre `zone_id` par lot via `matchZone(req.project_postal_code)` si absent (D-06)
4. Check plafond D-09 (bloquant, message clair, pas de diffusion partielle silencieuse sur ce plafond-là — différent du plafond D-10 qui lui est silencieux par destinataire)
5. Pour chaque lot ouvert : matcher les pros (D-07/D-08), filtrer idempotence + plafond D-10, envoyer emails, tracer `b2b_tender_notifications`
6. `audit_logs.insert({ action: 'b2b_tender_diffused', ... })`
7. Réponse structurée (`{ status, lots_diffused, notifications_sent }`)

### Pattern 2 : Notification de masse idempotente non-bloquante
**Source :** `notifyProLead.ts` (à cloner en `notifyMatchedB2bPros.ts` ou équivalent, adapté par lot)
```typescript
// Squelette vérifié dans server/utils/notifyProLead.ts — adapter par lot :
// 1. SELECT pros matchés (categories @> [lot.category] AND is_verified AND b2b_alerts_email)
//    + jointure pro_zones (status='active', zone_id=lot.zone_id)  → D-07/D-08
// 2. SELECT déjà notifiés sur CE lot (b2b_tender_notifications WHERE lot_id = lot.id)
// 3. filtrer targets = pros - déjà_notifiés - (plafond D-10 dépassé aujourd'hui)
// 4. for (pro of targets): try { sendEmail(...); if success → insert notification }
//    catch { console.error, continue } // jamais de throw qui casse la boucle
```

### Pattern 3 : Résolution zone tardive (D-06)
`matchZone(postalCode)` interroge `zones` (`type='area'`, `is_active=true`, `postal_codes @> [cp]`) et retourne `{id, name} | null`. Si `matchZone` retourne `null` (CP hors zone couverte), le lot ne peut pas être diffusé — cas à gérer explicitement (message DirCo, ne pas planter tout le clic « Diffuser » si un seul lot est hors zone).

### Anti-Patterns à éviter
- **Ne pas modifier `notifyMatchedPros`** pour y ajouter le cas B2B — c'est le flux particuliers (P4), les filtres divergent (D-07 exige `pro_zones` actif, P4 ne le fait pas). Créer une fonction séparée.
- **Ne pas réutiliser `maskLead.ts`** pour le B2B — déjà noté dans `.planning/research/ARCHITECTURE.md`, hors périmètre Phase 8 de toute façon (révélation coordonnées = Phase 9).
- **Ne pas bloquer toute la diffusion** si un pro individuel échoue à l'envoi ou dépasse son plafond quotidien — seul le plafond D-09 (AO actifs/partenaire) est bloquant et visible, tout le reste est skip silencieux par design (D-10).

## Don't Hand-Roll

| Problème | Ne pas construire | Utiliser à la place | Pourquoi |
|----------|--------------------|-----------------------|----------|
| Résolution CP → zone | Nouvelle fonction de matching géographique | `matchZone()` existant | Déjà testé en prod (05.16), logique `postal_codes @> [cp]` centralisée |
| Envoi email + template | Nouveau système de templating | `renderEmail()` + `sendEmail()` | Infra 06.3 déjà en place (multi-expéditeurs, LCEN) |
| Compteur de notifications/jour | Table de compteurs dédiée | `COUNT(*)` sur `b2b_tender_notifications.sent_at::date = today` | Cohérent avec l'absence de table de compteurs ailleurs dans le repo (décision explicite en Claude's Discretion) |
| Idempotence d'envoi | Flag booléen sur la ressource parente | Table dédiée avec `UNIQUE` (comme `lead_notifications`) | Permet de rejouer sans dupliquer et de granulariser par destinataire/lot |

**Key insight :** cette phase n'a aucun problème "déceptivement complexe" à résoudre — tout est déjà résolu ailleurs dans le repo, le travail est de la réplication disciplinée avec les filtres spécifiques B2B (D-07/D-08).

## Common Pitfalls

### Pitfall 1 : `b2b_requests.status` n'a pas de valeur `clos`
**Ce qui casse :** D-09 spécifie de compter les AO actifs via `status NOT IN ('converti', 'perdu', 'clos')`. Or la contrainte CHECK réelle sur `b2b_requests.status` (migrations `20260822000002`/`003`, confirmée par les types dans `AdminB2bTab.vue`) n'autorise que `nouveau | en_cours | rappele | qualifie | converti | perdu` — **pas `clos`**.
**Pourquoi ça arrive :** confusion probable avec `b2b_tender_lots.status` qui, lui, a bien `open | claimed | closed` (Phase 7). Ce sont deux colonnes différentes sur deux tables différentes.
**Comment l'éviter :** le planner doit trancher explicitement : soit (a) le comptage D-09 se fait réellement sur `status NOT IN ('converti', 'perdu')` seulement (aucune valeur `clos` à ajouter — le dossier reste `qualifie` tant qu'il a des lots actifs), soit (b) une migration ajoute `clos` au CHECK constraint de `b2b_requests.status` si un futur mécanisme de clôture globale du dossier est prévu. Vu que TEND-12 (clôture auto par lot) est Phase 9 et hors scope, l'option (a) est la plus cohérente avec le périmètre de cette phase — signaler ceci au discuss/plan avant de coder.
**Signal d'alerte :** un `INSERT`/`UPDATE` avec `status = 'clos'` sur `b2b_requests` échouera silencieusement en erreur CHECK constraint côté Postgres si jamais codé tel quel.

### Pitfall 2 : lot sans zone résolvable
**Ce qui casse :** si `project_postal_code` correspond à un CP hors couverture (`matchZone` retourne `null`), `b2b_tender_lots.zone_id` reste `NULL` et le lot ne peut être matché à aucun pro (`pro_zones.zone_id = lot.zone_id` ne matchera jamais `NULL`).
**Comment l'éviter :** gérer le cas explicitement dans l'endpoint `diffuse.post.ts` — si `matchZone` échoue pour un lot, exclure ce lot de la diffusion et le signaler dans la réponse (pas d'erreur globale sur tout le clic), cohérent avec le principe non-bloquant déjà appliqué ailleurs.

### Pitfall 3 : double filtrage `is_verified` vs `b2b_alerts_email` par défaut
**Ce qui casse :** `b2b_alerts_email` a un défaut `true` (D-08) — un pro fraîchement inscrit/vérifié recevra des AO sans avoir explicitement opt-in, ce qui est cohérent avec `lead_alerts_email` (même défaut) mais à documenter clairement pour ne pas être perçu comme un bug lors des tests.
**Comment l'éviter :** RAS côté code, juste s'assurer que la migration ajoute bien `DEFAULT true NOT NULL` comme pour `lead_alerts_email` (cohérence de pattern déjà actée par D-08).

## Code Examples

### Matching zone×catégorie×verification (à écrire, calqué sur le SELECT de `notifyMatchedPros`)
```typescript
// Source : server/utils/notifyProLead.ts ligne 33-38, étendu avec pro_zones (D-07/D-08)
const { data: pros, error } = await supabase
  .from('professionals')
  .select('id, email, company_name, full_name, pro_zones!inner(zone_id, status)')
  .contains('categories', [lot.category])
  .eq('is_verified', true)
  .eq('b2b_alerts_email', true)
  .eq('pro_zones.zone_id', lot.zone_id)
  .eq('pro_zones.status', 'active')
```
Note : à vérifier au moment du plan si le client Supabase-js gère bien le filtre imbriqué sur relation `!inner` de cette façon (embedding), ou s'il faut une requête séparée sur `pro_zones` puis un `IN` — `restitution.post.ts` et `notifyMatchedPros` n'utilisent pas d'embedding filtré ailleurs dans le repo, donc pas de précédent vérifié. Prévoir un test/vérification manuelle en local avant de committer ce pattern (le repo a déjà eu un bug d'embedding cassé sur `auth.users`, cf. STATE.md 2026-08-22 — PostgREST peut être capricieux sur les jointures).

### Résolution zone au clic diffusion (D-06)
```typescript
// Source : server/utils/zoneMatcher.ts, déjà en prod
const zone = await matchZone(req.project_postal_code)
if (zone) {
  await supabase.from('b2b_tender_lots').update({ zone_id: zone.id }).eq('id', lot.id)
}
```

## Runtime State Inventory

Non applicable — phase additive (nouvelle table, nouvelle colonne, nouvel endpoint), pas de rename/refactor/migration de données existantes. `recommended_pros` reste en base sans migration destructive (D-05).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | La valeur `clos` citée en D-09 pour `b2b_requests.status` n'existe pas dans le CHECK constraint actuel — le comptage du plafond devrait se limiter à `NOT IN ('converti', 'perdu')` pour cette phase | Common Pitfalls #1 | Si le planner code littéralement `NOT IN (..., 'clos')` sans vérifier, aucune erreur immédiate (une valeur absente dans un NOT IN ne casse rien), mais le plafond D-09 sera correct par coïncidence — le vrai risque est qu'un futur `UPDATE ... status = 'clos'` échoue en silence côté DirCo si quelqu'un l'ajoute ailleurs en pensant que la valeur est supportée |
| A2 | Le filtre `pro_zones` actif (D-07) se fait via jointure Supabase `!inner` filtrée plutôt que deux requêtes séparées | Code Examples | Si l'embedding filtré ne fonctionne pas comme attendu avec PostgREST (précédent de bug connu sur `auth.users`), le planner doit prévoir une requête `pro_zones` séparée puis un `.in('id', proIdsActifs)` — pattern de repli plus sûr basé sur le style déjà utilisé partout ailleurs dans ce repo |

## Open Questions

1. **Que fait exactement le check de plafond D-09 en cas de dépassement — désactive-t-il le bouton « Diffuser », ou bloque-t-il l'action au clic avec une erreur 409 ?**
   - Ce qu'on sait : CONTEXT.md dit « le bouton est désactivé avec un message clair » ET laisse le choix du point d'implémentation à Claude's Discretion.
   - Ce qui est flou : « désactivé » suggère un état UI calculé côté client (nécessite que le compte d'AO actifs soit renvoyé par l'API de listing), alors qu'un blocage serveur au clic est plus simple à coder sans toucher au payload de listing.
   - Recommandation : le planner choisit le blocage serveur (retour 409 avec message, affiché en toast) — plus simple, cohérent avec le pattern `assertSubscriptionModifiable` déjà utilisé dans ce repo (`zoneMatcher.ts`) qui throw un `createError` 409 avec message utilisateur.

2. **`clos` doit-il être ajouté au CHECK constraint de `b2b_requests.status`, ou le comptage D-09 doit-il simplement l'omettre ?**
   - Recommandation : omettre `clos` du `NOT IN` pour cette phase (aucun mécanisme ne fait passer un `b2b_requests.status` à `clos` dans le scope actuel) — à trancher explicitement en début de plan, pas en cours d'implémentation.

## Environment Availability

Aucune dépendance externe nouvelle (pas de nouvel appel API tiers, pas de nouveau service). `sendEmail`/Resend déjà configuré et vérifié en Phase 06.3 (`EMAIL_LIVE` toggle existant). Skip.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (tests unitaires existants, ex. `handleLeadDecision.test.ts` en Phase 05.13) |
| Config file | `vitest.config.ts` (racine projet) |
| Quick run command | `npx vitest run <fichier>` |
| Full suite command | `npm test` (voir `package.json`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEND-04 | Matching zone×catégorie×verification exclut un pro sans zone active | unit | `npx vitest run tests/notifyMatchedB2bPros.test.ts` | ❌ Wave 0 |
| TEND-06 | Email envoyé une seule fois par (pro, lot) même si diffusion relancée | unit | `npx vitest run tests/notifyMatchedB2bPros.test.ts::idempotence` | ❌ Wave 0 |
| TEND-10 | Bouton « Diffuser » actionnable seulement si `decision_status` + `project_postal_code` renseignés | unit/e2e | `npx vitest run tests/diffuse.post.test.ts` | ❌ Wave 0 |
| TEND-11 | Plafond AO actifs/partenaire bloque, plafond notifs/artisan/jour skip silencieux | unit | `npx vitest run tests/diffuse.post.test.ts::rate-limit` | ❌ Wave 0 |
| TEND-14 | Badge « AO qualifié BÂTI-AXE » présent dans le HTML de l'email généré | unit | `npx vitest run tests/notifyMatchedB2bPros.test.ts::badge` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit :** `npx vitest run <fichier concerné>`
- **Per wave merge :** `npm test`
- **Phase gate :** suite complète verte avant `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/notifyMatchedB2bPros.test.ts` — couvre TEND-04, TEND-06, TEND-14 (matching, idempotence, badge email) — mock Supabase comme dans `handleLeadDecision.test.ts` (05.13)
- [ ] `tests/diffuse.post.test.ts` — couvre TEND-10, TEND-11 (gating bouton/endpoint, plafonds)
- Framework déjà installé, aucune installation requise

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | oui | Endpoint admin protégé par `serverSupabaseUser` + check `app_metadata.role === 'admin'` (pattern existant `restitution.post.ts`) |
| V3 Session Management | non | Pas de nouvelle session, réutilise l'auth Supabase existante |
| V4 Access Control | oui | RLS déjà en place sur `b2b_requests`/`b2b_tender_lots` (`admin_all_*` policies) — nouvelle table `b2b_tender_notifications` doit avoir la même politique RLS (service_role uniquement) |
| V5 Input Validation | oui | `project_postal_code` déjà contraint par CHECK regex `^\d{5}$` en base (migration Phase 7) ; l'endpoint `diffuse.post.ts` doit valider `id` (UUID) en entrée comme `restitution.post.ts` le fait |
| V6 Cryptography | non | Aucune donnée chiffrée manipulée dans cette phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rejeu du clic « Diffuser » pour spammer les artisans | Denial of Service (côté artisan, spam) | Idempotence D-04 (`UNIQUE(pro_id, lot_id, channel)`) + plafond quotidien D-10 déjà spécifiés |
| Accès direct à `diffuse.post.ts` sans passer par l'UI admin | Elevation of Privilege | Check `app_metadata.role === 'admin'` obligatoire côté serveur (pas de confiance dans l'état du bouton désactivé côté client) |
| Fuite de la liste de pros matchés via la réponse de l'endpoint | Information Disclosure | Ne renvoyer que des compteurs (`notifications_sent`, `lots_diffused`) dans la réponse admin, pas la liste nominative des pros contactés si non nécessaire à l'UI |

## Sources

### Primary (HIGH confidence — lecture directe du code du repo)
- `server/utils/notifyProLead.ts` — pattern de notification de masse idempotente
- `server/utils/zoneMatcher.ts` — `matchZone()` et fonctions de pricing associées
- `server/api/v1/admin/b2b-requests/[id]/restitution.post.ts` — squelette d'endpoint admin
- `supabase/migrations/20260904000000_phase7_tender_lots.sql` — schéma `b2b_tender_lots`
- `supabase/migrations/20260823000002_p4_lead_notifications.sql` — schéma `lead_notifications`
- `supabase/migrations/20260828000002_zones_78_packs.sql` — schéma `pro_zones`
- `app/components/admin/AdminB2bTab.vue` — types et statuts réels de `b2b_requests`
- `.planning/REQUIREMENTS.md` — texte exact TEND-04/06/10/11/14
- `.planning/STATE.md` — historique décisions et pièges connus (embedding PostgREST cassé, etc.)

### Secondary / Tertiary
Aucune — cette phase ne nécessite aucune recherche externe (pas de nouvelle librairie, pas de nouveau service tiers).

## Metadata

**Confidence breakdown :**
- Standard stack : HIGH — aucune nouvelle dépendance, tout vérifié dans le code existant
- Architecture : HIGH — patterns directement clonables, vérifiés fichier par fichier
- Pitfalls : HIGH (Pitfall 1, incohérence `clos`) / MEDIUM (Pitfall 2/3, déduits par lecture de schéma sans test d'exécution)

**Research date :** 2026-09-05
**Valid until :** tant que `b2b_requests`/`b2b_tender_lots`/`pro_zones` ne changent pas de schéma — pas de péremption liée au temps (code interne stable, pas de dépendance externe versionnée).
