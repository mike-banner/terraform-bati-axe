# Phase 9: Dashboard Pro & Claim des AO - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

<domain>
## Phase Boundary

L'artisan peut consulter, réclamer (claim) et traiter les appels d'offres (AO) partenaires qui le concernent depuis son espace (`/espace/leads`), sans confusion sur ce que couvre son abonnement zone. Couvre : affichage des AO matchés, mécanique de claim avec révélation des coordonnées, clôture automatique des lots (expiration ou cap de claims atteint), signalement d'AO suspect.

</domain>

<decisions>
## Implementation Decisions

### Structure de l'onglet AO
- **D-01:** Deux onglets dans la page existante `/espace/leads` (pas de nouvelle route dédiée) : « Chantiers particuliers » / « Appels d'offres ».
- **D-02:** Les cartes AO réutilisent le style visuel des cartes leads existantes (même composant/patterns) — cohérence, l'artisan reconnaît le pattern d'interaction masqué/débloqué.
- **D-03 (Claude's Discretion — réconciliation avec le roadmap) :** Le critère de succès du roadmap demande un onglet « visuellement distinct » — comme le style de carte est réutilisé, la distinction se fait via un badge/accent visuel sur les cartes AO (ex. « AO Partenaire ») plutôt qu'un système de cartes entièrement différent. Le wording exact de la phrase d'explication (« votre abonnement zone couvre désormais deux flux ») est laissé à la discrétion de l'exécutant.

### Mécanique du claim
- **D-04:** Claim en 2 étapes : clic → modale de confirmation qui rappelle explicitement que si l'AO est « confirmé », ce claim ferme le lot pour les autres artisans (engagement exclusif, cap = 1).
- **D-05:** Une fois le claim effectué, TOUTES les coordonnées de contact du partenaire sont révélées (nom, entreprise, téléphone, email) — symétrique au pattern de déblocage des leads particuliers déjà en place (D-06/D-07 sur `leads`/`maskLead.ts`).
- **D-06:** Pas d'annulation/retrait de claim dans cette phase — hors périmètre des critères de succès du roadmap. Un partenaire insatisfait passe par le support.

### Expiration automatique des lots
- **D-07:** Délai avant clôture automatique d'un lot sans claim : **14 jours**.
- **D-08:** Mécanisme : cron HTTP, même pattern que `server/api/v1/cron/decennale-alerts.get.ts` (Phase 06.3) — nouvel endpoint `server/api/v1/cron/close-expired-tenders.get.ts` (ou nom similaire), protégé par le même `cronSecret`/`CRON_SECRET` partagé, déclenché par un nouveau workflow GitHub Actions calqué sur `.github/workflows/cron-decennale-alerts.yml`.

### Signalement AO suspect
- **D-09:** Un signalement pose un flag/badge « ⚠ signalé » directement sur le dossier concerné dans l'`AdminB2bTab.vue` existant — pas de nouvel écran de modération.
- **D-10:** Le signalement est purement informatif : l'AO reste visible/diffusable normalement, aucun blocage/masquage automatique. L'admin décide ensuite manuellement (garder, clore, contacter le partenaire).

### Claude's Discretion
- Wording exact de la phrase d'explication du nouvel onglet
- Design précis du badge « AO Partenaire » et du badge « ⚠ signalé »
- Contenu exact de la modale de confirmation de claim
- Structure exacte du formulaire de signalement (raison libre vs catégories prédéfinies)
- Nommage exact de l'endpoint cron et de la table `b2b_tender_claims`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Masquage / révélation de coordonnées
- `docs/decisions/ADR-004-BLUR-LOCK-MECHANISM.md` — Mécanisme de masquage serveur (source du pattern à répliquer pour les AO)
- `server/utils/maskLead.ts` — Implémentation de référence du masquage/déblocage pour les leads particuliers

### Cron / tâches planifiées
- `server/api/v1/cron/decennale-alerts.get.ts` — Pattern d'endpoint cron HTTP protégé par secret partagé
- `.github/workflows/cron-decennale-alerts.yml` — Déclenchement externe (GitHub Actions scheduled workflow)

### RGPD / consentement
- `docs/decisions/ADR-007-RGPD-LCEN.md` — Contraintes consentement/traçabilité applicables à la révélation de coordonnées

### Schéma existant Phase 7/8
- `supabase/migrations/20260904000000_phase7_tender_lots.sql` — Schéma `b2b_tender_lots` (statuts `open/claimed/closed`)
- `supabase/migrations/20260905000000_phase8_b2b_tender_notifications.sql` — Schéma `b2b_tender_notifications` (idempotence, pattern à répliquer pour `b2b_tender_claims`)
- `server/utils/notifyB2bPros.ts` — Convention de nommage/structure pour les futurs emails partenaire (notification au partenaire lors du claim)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/pages/espace/leads/index.vue` (550 lignes) — Page à faire évoluer avec le système d'onglets ; cartes leads existantes à répliquer visuellement pour les AO
- `leads` table (`project_id`, `pro_id`, `status`, `unlocked_at`) — Modèle exact à répliquer pour `b2b_tender_claims` (`lot_id`, `pro_id`, `claimed_at`, statut)
- `server/utils/maskLead.ts` — Fonction pure de masquage à répliquer en `maskTenderClaim.ts` ou équivalent
- `server/api/v1/cron/decennale-alerts.get.ts` + `.github/workflows/cron-decennale-alerts.yml` — Pattern cron complet (endpoint + déclenchement) à répliquer

### Established Patterns
- Ligne dans une table de junction (`leads`, `b2b_tender_notifications`) créée uniquement à l'événement (déblocage/notification), jamais en amont — ADR-004 : « une ligne leads n'existe qu'au déblocage/claim », même principe pour `b2b_tender_claims`
- Emails transactionnels via `server/utils/email.ts` (`sendEmail`) + `server/utils/emailLayout.ts` (`renderEmail`) — mock en dev (`EMAIL_LIVE` non défini ou `false`), réel via Resend sinon
- RLS service_role uniquement sur les tables B2B sensibles (`b2b_tender_notifications`, probable pattern identique pour `b2b_tender_claims`)

### Integration Points
- `app/pages/espace/leads/index.vue` — Point d'entrée UI pour le nouvel onglet
- `b2b_tender_lots.status` (`open/claimed/closed`) — Le claim doit transitionner ce statut
- `professionals.categories` × `pro_zones` — Filtre déjà utilisé en Phase 8 (`notifyMatchedB2bPros`) pour matcher les artisans ; même filtre à appliquer pour n'afficher/permettre le claim que sur les AO dans la zone active de l'artisan connecté
- `AdminB2bTab.vue` — Cible du badge de signalement

</code_context>

<specifics>
## Specific Ideas

Aucune référence produit externe spécifique mentionnée — approche standard alignée sur les patterns déjà en place dans le repo (symétrie avec le flux particuliers).

</specifics>

<deferred>
## Deferred Ideas

- Annulation/retrait de claim par l'artisan après coup — hors périmètre Phase 9, à considérer si le besoin remonte après lancement.
- Écran de modération dédié pour les signalements — à envisager seulement si le volume de signalements devient significatif.

</deferred>

---

*Phase: 09-dashboard-pro-claim-des-ao*
*Context gathered: 2026-09-07*
