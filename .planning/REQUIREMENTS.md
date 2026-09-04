# Requirements: BÂTI-AXE — v2.0 « Partenaires en scène »

**Défini** : 2026-09-04
**Core Value** : Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment dont les garanties décennales sont vérifiées.
**Axe v2** : le client veut le volet Partenaires (apporteurs d'affaires) visible et exploitable publiquement — pas seulement un back-office interne.

## v2 Requirements

### Partenaires — Annuaire, Vitrines & Dashboard (cœur v2)
- [ ] **PART-01** (ex Phase 05.18) : section Partenaires sur l'accueil `/`
- [ ] **PART-02** (ex Phase 05.18) : annuaire public par catégorie `/partenaires/annuaire`
- [ ] **PART-03** (ex Phase 05.18) : vitrine publique par partenaire `/partenaire/[dept]/[slug]`
- [ ] **PART-04** (ex Phase 05.18) : dashboard privé de gestion du profil `/espace/partenaire`

### Monétisation B2B (reporté de v1)
- [ ] **P10** : Commission B2B / Stripe Connect
- [ ] **P20** : Passerelle B2B payante

### Production réelle (reporté de v1, plus un prérequis de clôture)
- [ ] **P3** : re-test Stripe avec les vraies clés prod (formalité — logique déjà validée en mode test).
- [ ] **DNS-01** : DKIM/SPF/DMARC + Cloudflare Email Routing sur `bati-axe.com` (Phase 06.3, code déjà livré).
- [ ] **INFRA-DOM-01** : vérifier/finaliser la bascule Terraform prod sur `bati-axe.com` (corrigé le 2026-09-04, apply non déclenché).

### Analytics
- [ ] **P1** : Umami — VPS déjà provisionné côté client, à brancher sur le funnel (en cours sur `dev`).

### Auth & confort pro (reporté de v1, recherche déjà faite)
- [ ] **AUTH-PWD-01/02/03, AUTH-TPL-01/02** (Phase 06.4) : mot de passe oublié pro + templates Auth Supabase brandés.

### Confiance & Badges
- [ ] **TRST-02** : Badge Label RGE — qualification RGE obligatoire pour les lots Rénovation Énergétique, badge `BadgeRGECertifie`, matching exclusif leads MaPrimeRénov'/CEE.

### SEO
- [ ] **SEO-01** : Annuaire public `/[metier]/[ville]` activé dynamiquement quand ≥ 5 pros opt-in par zone.
- [ ] **SEO-02** : Landing pages thématiques SEO (`/renovation-energetique`, `/extension`, `/surelevation`, `/amenagement-combles`) avec OpenGraph, canonical, Schema.org.

### Scalabilité géographique
- [ ] **GEO-01** : Scalabilité géographique dynamique (activation multi-villes via console admin) — pertinent seulement si un 2ᵉ département est décidé, aucune zone au-delà du 78 n'existe à ce jour.

## Différé, non repris en v2 (décisions produit assumées)
- **SMS-01/02** (teasing SMS) : différé depuis Phase 6 (2026-08-18), toujours pas de date.
- **Phase 7** (Réputation & Scale), **Phase 8** (PWA Mobile-First) : hors scope v2, reportés au-delà.

## Out of Scope
| Feature | Reason |
|---|---|
| Messagerie temps réel (Realtime) | Le vrai objectif est le déblocage téléphonique, pas le chat — polling actuel suffit (décision 2026-08-19). |
| Multi-département sans décision explicite | GEO-01 attend une décision produit, pas un développement anticipé. |

## Traceability

| Requirement | Phase cible | Status |
|---|---|---|
| PART-01..04 | 05.18 | Not started |
| P10 | — | Not started |
| P20 | — | Not started |
| P3 | — | Not started (formalité) |
| DNS-01 | 06.3 (activation) | Not started |
| INFRA-DOM-01 | — | Corrigé en code, apply non fait |
| P1 | — | En cours (VPS prêt) |
| AUTH-PWD-01..03, AUTH-TPL-01/02 | 06.4 | Recherche faite, non planifié |
| TRST-02 | — | Not started |
| SEO-01/02 | — | Not started |
| GEO-01 | — | Not started (attend décision) |

---
*v1.0 archivé : `.planning/milestones/v1.0-REQUIREMENTS.md`*
*Requirements v2 définis : 2026-09-04*
