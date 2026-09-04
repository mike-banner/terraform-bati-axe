# Research Summary — Diffusion Appels d'Offres B2B (v2.0)

**Researched:** 2026-09-04
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Stack additions
Aucune nouvelle dépendance. Le pipeline de matching/notification B2C existant
(`zoneMatcher.ts`, `notifyProLead.ts`, pattern `lead_notifications`) se
transpose tel quel. Une queue (Redis/BullMQ/Cloudflare Queues) serait du
sur-engineering à cette échelle (dizaines d'artisans par zone) — noté comme
"à ne pas ajouter".

## Découverte critique (change le scope)
**Le matching des leads particuliers actuel (`leads/index.get.ts`) filtre
par catégorie SEULEMENT, pas par zone** — `pro_zones` (05.16) est un système
de pricing par abonnement, pas (encore) un filtre de visibilité. Le milestone
demandait "diffusion sur l'abonnement zone existant" : ça veut dire un
**nouveau chemin de matching** (zone active `pro_zones` × catégorie), pas la
réutilisation du chemin B2C actuel.

## Table stakes (à livrer en v2)
- Formulaire AO scopé par persona (extension `b2b_requests`, colonnes
  conditionnelles nullable — pattern déjà utilisé en 05.17 pour le
  diagnostiqueur, pas de fork en 4 tables)
- Matching zone+catégorie automatique au déclenchement admin
- Notification email aux artisans matchés (infra 06.3 réutilisée)
- Liste des AO ouverts dans le dashboard pro (`/espace/leads`, nouvel onglet)
- Claim + réponse (contact partenaire révélé après claim, masquage
  réutilisant le pattern ADR-004)
- Cycle de statut AO (ouvert/clos) + expiration automatique
- **Formulaire multi-lots syndic** (un AO peut nécessiter plusieurs corps de
  métier simultanément — façade+toiture+électricité) — seule vraie
  divergence structurelle entre personas

## Anti-features (explicitement écartées)
Enchère/mise en concurrence in-app, upload/comparaison de devis, escrow,
notation/litiges, vitrine publique (déjà écartée), notifications temps réel —
tout ça résout des problèmes qu'un pilote à poignée de partenaires n'a pas
encore.

## Architecture — décision structurante
Le modèle plat `b2b_requests` (1 dossier) ne peut pas porter un statut de
claim par artisan ET par corps de métier. **Promotion d'un cran, même
topologie que `projects`→`leads` :**
```
b2b_requests (1 AO) → b2b_tender_lots (N lots, 1/métier) → b2b_tender_claims (N claims/lot)
```
`maskLead.ts`/ADR-004 **ne s'applique pas** au partenaire B2B (déjà
consentant) — mais le masquage reste appliqué au moment opportun côté
artisan pour rester cohérent avec l'invariant de sécurité. Le broadcast se
déclenche à la **qualification** DirCo (remplace le picker manuel
`recommended_pros`), pas à l'intake brut (garde le filtre anti-spam actuel).

**Gate de claim = `pro_zones` (zone active), pas `subscription_status`**
(flag Premium legacy) — les deux systèmes coexistent aujourd'hui sans être
unifiés, le milestone vise explicitement le premier.

## Pièges à traiter DANS la même phase que le lancement (pas après)
1. **Anti-spam** : rate-limit partenaire (AO actifs simultanés) + rate-limit
   artisan (notifications/jour tous partenaires confondus) + filtre minimal
   `pending_review` avant diffusion effective.
2. **Confiance artisan** : le tri DirCo faisait office de garantie implicite
   de qualité — le retirer sans rien de visible en remplacement (badge
   partenaire vérifié, historique, bouton signalement) érode la confiance
   dans TOUT le canal B2B, pas juste le broadcast.
3. **Syndic ≠ décision individuelle** : champ statut "besoin voté/mandaté"
   vs "sondage de prix avant AG" obligatoire dès l'exposition du persona —
   sinon réputation "AO syndic = perte de temps" chez les artisans,
   difficile à défaire après coup.
4. **Confusion abonnement** : documenter/distinguer visuellement (badge
   B2C vs B2B) que l'abonnement zone couvre désormais deux flux — sinon
   flou perçu, et risque de bait-and-switch si une commission B2B arrive
   plus tard (P10, différé).

## Ordre de build suggéré
1. Schéma (`b2b_tender_lots`, `b2b_tender_claims`, `b2b_tender_notifications`,
   `b2b_requests.project_postal_code`) + `matchTenderPros.ts` (pur, testable isolément)
2. Déclenchement broadcast admin (`AdminB2bTab.vue` : bouton diffusion
   remplace le picker manuel) + rate-limit/`pending_review`
3. Notification email matched artisans (idempotente)
4. Dashboard pro (nouvel onglet, lecture seule d'abord)
5. Claim (gate `pro_zones`, décision produit : cap partagé comme les leads
   B2C, ou exclusif ?)
6. (Optionnel) Retour de visibilité partenaire sur l'état de diffusion

## Décisions produit à trancher avant le roadmap
- **Cap de claims par lot** : partagé (jusqu'à 3 pros comme les leads
  particuliers) ou exclusif (1 seul pro, premier arrivé) ?
- **Champ statut syndic** ("voté" vs "sondage de prix") : inclus dès le
  départ ou reporté ? (recommandation recherche : dès le départ, coût de
  correction après coup nettement plus élevé)
