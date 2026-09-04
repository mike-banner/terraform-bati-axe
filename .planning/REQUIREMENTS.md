# Requirements: BÂTI-AXE — v2.0 « Partenaires en scène »

**Défini** : 2026-09-04
**Core Value** : Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment dont les garanties décennales sont vérifiées.
**Axe v2** : les partenaires B2B (architectes, agents immobiliers, diagnostiqueurs, syndics de copropriété) diffusent leurs appels d'offres directement aux artisans matchés — remplace le tri manuel DirCo par un matching automatique zone + corps de métier, sans nouveau rail de paiement ni vitrine publique.

## v2 Requirements

### Diffusion Appels d'Offres (TEND)

- [ ] **TEND-01** : Le partenaire décrit son besoin avec une description obligatoire (min. 20 caractères, même contrainte que le formulaire particulier), en plus de la fourchette de budget et des documents joints (CCTP/plans) déjà supportés.
- [ ] **TEND-02** : Chaque AO a un statut choisi à la qualification : **« confirmé »** (travaux décidés, budget arrêté) ou **« en attente de décision »** (devis à comparer avant une décision) — visible par l'artisan avant qu'il ne réponde. S'applique à tous les partenaires (pas seulement syndic).
- [ ] **TEND-03** : Un AO « confirmé » est exclusif à un seul artisan (premier arrivé, ferme le lot). Un AO « en attente de décision » accepte jusqu'à 3 artisans (comme les leads particuliers).
- [ ] **TEND-04** : Matching automatique de l'AO aux artisans par zone active (`pro_zones`, département 78) ET catégorie/corps de métier — remplace la sélection manuelle DirCo (`recommended_pros`).
- [ ] **TEND-05** : Un AO peut couvrir plusieurs corps de métier simultanément (ex. syndic — parties communes : toiture + façade + électricité). Chaque corps de métier devient un lot distinct, matché et claimé indépendamment.
- [ ] **TEND-06** : Les artisans matchés reçoivent une notification email dès la diffusion de l'AO (ou du lot qui les concerne), en réutilisant l'infra transactionnelle existante (Phase 06.3).
- [ ] **TEND-07** : L'artisan voit la liste des AO ouverts qui le concernent dans un onglet dédié « Appels d'offres » de son espace (`/espace/leads`), visuellement distinct des chantiers particuliers (badge/couleur).
- [ ] **TEND-08** : L'artisan peut se déclarer « intéressé » (claim) sur un AO/lot — accès conditionné à un abonnement zone actif (`pro_zones`) sur la zone du lot, pas au flag `subscription_status` Premium historique.
- [ ] **TEND-09** : Une fois le claim effectué, les coordonnées du partenaire sont révélées à l'artisan (masquées avant, même logique que le masquage serveur ADR-004).
- [ ] **TEND-10** : Le broadcast se déclenche quand DirCo qualifie le dossier (transition de statut, pas à l'intake public anonyme) — garde le filtre anti-spam existant sur les demandes non vérifiées.
- [ ] **TEND-11** : Rate-limit anti-spam : nombre d'AO actifs simultanés par partenaire plafonné (seuil bas par défaut pour le pilote, configurable) + plafond de notifications B2B par artisan par jour, tous partenaires confondus.
- [ ] **TEND-12** : Un AO/lot passe automatiquement en statut « clos » à expiration ou quand le cap de claims est atteint.
- [ ] **TEND-13** : L'artisan dispose d'un moyen de signaler un AO suspect/abusif, remonté à l'admin.
- [ ] **TEND-14** : Un badge « partenaire vérifié » (réutilise la vérification SIRET existante) est visible sur les AO diffusés — remplace le signal de confiance qu'apportait le tri manuel DirCo.
- [ ] **TEND-15** : Le dashboard artisan explique en une phrase que l'abonnement zone couvre désormais deux flux (chantiers particuliers + appels d'offres partenaires), pour éviter toute confusion sur le périmètre payé.
- [ ] **TEND-16** : Le partenaire reçoit un email à chaque étape clé de son AO (diffusé aux artisans, un artisan s'est déclaré intéressé) avec un format structuré et cohérent (sujet identifiable, statut clair) — permet à un partenaire outillé (Zapier/Make/n8n) d'automatiser son suivi sans API dédiée. Pas de dashboard ni de compte partenaire pour ce milestone (partenaire = déposant occasionnel, pas utilisateur récurrent).

### Persona Syndic (SYNDIC)

- [ ] **SYNDIC-01** : Le persona syndic/copropriété est exposé comme choix dans le tunnel `/b2b/partenaires` (déjà en base — enum `b2b_apporteur_type` — pas encore en UI).

## Reporté de v1 (non prérequis de clôture, repris ici)

- [ ] **P1** : brancher Umami (VPS déjà provisionné côté client) sur le funnel — continue en tâche de fond sur `dev`, hors dépendance avec le reste de v2.
- [ ] **P3** : re-test Stripe avec les vraies clés prod (formalité — logique déjà validée en mode test).
- [ ] **DNS-01** : DKIM/SPF/DMARC + Cloudflare Email Routing sur `bati-axe.com` (Phase 06.3, code déjà livré).
- [ ] **INFRA-DOM-01** : vérifier/finaliser la bascule Terraform prod sur `bati-axe.com` (corrigé le 2026-09-04, apply non déclenché).
- [ ] **AUTH-PWD-01/02/03, AUTH-TPL-01/02** (Phase 06.4) : mot de passe oublié pro + templates Auth Supabase brandés.

## Différé / Anti-features (décisions actées le 2026-09-04)

| Feature | Reason |
|---|---|
| Vitrine publique / annuaire partenaires | Le partenaire est côté demande (il poste un besoin), pas côté offre — pas de raison fonctionnelle d'avoir un profil public, contrairement à l'artisan. Repoussable sans coût si un besoin apparaît plus tard. |
| Commission B2B / Stripe Connect (P10) | Le pipeline B2B n'a jamais tourné en usage réel — prématuré d'investir dans un rail de paiement (KYC, split payments) avant d'avoir du volume prouvé. |
| Passerelle B2B payante (P20) | Dépend de P10, même raison. |
| Enchère / mise en concurrence in-app (comparaison de prix chiffrés dans l'outil) | Le partenaire compare les artisans par téléphone après claim, comme aujourd'hui côté particulier — un vrai système de devis chiffrés comparables est un chantier de plusieurs semaines pour un volume non prouvé. |
| Upload/comparaison de devis in-app | Même raison — les documents CCTP/plans en amont suffisent à juger la charge de travail ; le devis chiffré se négocie hors plateforme. |
| Notifications temps réel / compteur live de vues | Vanité à cette échelle (dizaines d'artisans), complexité infra (websockets) pour zéro valeur décisionnelle. |

## Out of Scope

| Feature | Reason |
|---|---|
| Real-time chat | Le contact se fait par téléphone/SMS direct. |
| Multi-département sans décision explicite | GEO-01 attend une décision produit, le 78 reste la seule zone active. |
| OAuth / SSO | Email/password suffisant. |
| Tables séparées par persona (architecte_tenders, syndic_tenders...) | Fragmenterait le matching/RLS/admin 4 fois — le pattern colonnes nullables sur `b2b_requests` (déjà utilisé en 05.17) a fait ses preuves. |

## Traceability

*(Remplie par le roadmap — voir `.planning/ROADMAP.md` après création)*

| Requirement | Phase | Status |
|---|---|---|
| TEND-01 | Phase 7 | Pending |
| TEND-02 | Phase 7 | Pending |
| TEND-05 | Phase 7 | Pending |
| SYNDIC-01 | Phase 7 | Pending |
| TEND-04 | Phase 8 | Pending |
| TEND-06 | Phase 8 | Pending |
| TEND-10 | Phase 8 | Pending |
| TEND-11 | Phase 8 | Pending |
| TEND-14 | Phase 8 | Pending |
| TEND-07 | Phase 9 | Pending |
| TEND-03 | Phase 9 | Pending |
| TEND-08 | Phase 9 | Pending |
| TEND-09 | Phase 9 | Pending |
| TEND-12 | Phase 9 | Pending |
| TEND-13 | Phase 9 | Pending |
| TEND-15 | Phase 9 | Pending |
| P1 | Phase 10 | Pending |
| P3 | Phase 10 | Pending |
| DNS-01 | Phase 10 | Pending |
| INFRA-DOM-01 | Phase 10 | Pending |
| AUTH-PWD-01 | Phase 10 | Pending |
| AUTH-PWD-02 | Phase 10 | Pending |
| AUTH-PWD-03 | Phase 10 | Pending |
| AUTH-TPL-01 | Phase 10 | Pending |
| AUTH-TPL-02 | Phase 10 | Pending |

| TEND-16 | Phase 9 | Pending |

**Coverage:**
- v2 requirements (TEND + SYNDIC) : 17 total — 17/17 mapped ✓
- Reportés de v1 : 8 — 8/8 mapped ✓ (Phase 10, piste parallèle non bloquante)
- Total mapped to phases : 25/25 ✓ (Phases 7, 8, 9, 10 — voir `.planning/ROADMAP.md`)

---
*v1.0 archivé : `.planning/milestones/v1.0-REQUIREMENTS.md`*
*Requirements v2 définis : 2026-09-04, après recherche domaine (`.planning/research/SUMMARY.md`)*
