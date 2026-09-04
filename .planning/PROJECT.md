# BÂTI-AXE

## What This Is
BÂTI-AXE est une marketplace sélective de mise en relation B2B/B2C dans le bâtiment. Elle agit comme un tiers de confiance qui sécurise la chaîne de valeur en vérifiant les garanties décennales des professionnels. Déploiement prototype-first sur Carrières-sous-Poissy (78).

## Core Value
Garantir la sécurité et la confiance des chantiers de particuliers en les mettant en relation exclusive avec des professionnels du bâtiment certifiés (assurance décennale et labels vérifiés).

## Current State (v1.0 shipped 2026-09-04)

Socle B2C + couche Partenaires B2B livrés (voir `.planning/milestones/v1.0-ROADMAP.md`).
Le pilote tourne sur `dev` (`dev.bati-axe.fr`) — **pas de bascule prod déclenchée à la
clôture v1.0** : le client priorise le lancement du volet Partenaires (v2) avant la mise
en prod réelle. Domaine de production officiel confirmé : `bati-axe.com` (Terraform
corrigé le 2026-09-04, apply non lancé).

## Requirements

### Validated
- **Infrastructure Dev** : Cloudflare Pages `bati-axe-dev` déployé via Terraform depuis `dev`, vérifié le 2026-08-25.
- **Terraform Production** : configuré et appliqué avec succès avec les identifiants réels du client (2026-08-25) — corrigé le 2026-09-04 pour pointer `bati-axe.com` au lieu de `bati-axe.fr`.
- ✓ Espace Partenaires B2B (landing, tunnel, back-office, workflow DirCo) — v1.0
- ✓ Coffre-fort juridique artisan — v1.0
- ✓ Console admin opérationnelle + KPIs de pilotage — v1.0
- ✓ Packs zonés 78 + pricing dégressif Stripe — v1.0
- ✓ Notifications email transactionnelles (code) — v1.0

### Active (v2.0 « Partenaires en scène »)
- [ ] **PART-01..04** (Phase 05.18) : Annuaire public, vitrines partenaires, dashboard privé — axe prioritaire du client pour v2.
- [ ] **P1** : brancher Umami (VPS déjà provisionné côté client) sur le funnel, continue sur `dev`.
- [ ] **P3** : re-test Stripe avec les vraies clés prod (formalité).
- [ ] **DNS-01** : activer DKIM/SPF/DMARC + Email Routing sur `bati-axe.com` pour la Phase 06.3.
- [ ] **P10/P20** : commission B2B / Stripe Connect, passerelle B2B payante.
- [ ] **06.4** : mot de passe oublié pro + templates Auth Supabase brandés.

Détail complet : `.planning/REQUIREMENTS.md`.

### Out of Scope
- **Real-time chat** — Le contact se fait par téléphone/SMS direct.
- **Multi-département sans décision explicite** — GEO-01 attend une décision produit, le 78 reste la seule zone active.
- **OAuth / SSO** — Email/password suffisant.

## Context
- v1.0 shipped sur `dev`, prod réelle différée à la préparation v2 (décision client 2026-09-04).
- Le client veut la partie Partenaires visible publiquement (annuaire/vitrines), pas juste un back-office interne — c'est devenu l'axe v2.
- Stack Serverless à faible coût mensuel (<50€) sur Cloudflare.
- ~7 000 prospects bruts en table interne, jamais publics sans opt-in (ADR-007).

## Constraints
- **Tech Stack**: Nuxt 4 (Vue 3) unique hébergé sur Cloudflare Pages (ADR-008).
- **Database**: PostgreSQL (Supabase) avec migrations CLI et RLS strict.
- **Storage**: Cloudflare R2 pour documents et décennales (ADR-003).
- **URL Routing**: Hybride slug + nanoid(8) pour les profils pro (ADR-009).
- **Privacy & Security**: Floutage côté serveur Nitro obligatoire (ADR-004). Consentement explicite conforme LCEN (ADR-007).
- **Environments**: `local` (Docker/Supabase local) / `dev` (Cloudflare Dev) / `prod` (future production client) (ADR-006).
- **API**: Préfixe `/api/v1/`, validation Zod, format de réponse standardisé (API_RULES.md).

## Key Decisions
| Decision | Rationale | Outcome |
|---|---|---|
| Nuxt 4 unique (ADR-008) | Consolide la vitrine et l'application au sein d'une stack unique | Appliqué |
| Floutage Nitro (ADR-004) | Sécurise les coordonnées clients côté serveur avant déblocage | Appliqué |
| R2 Storage (ADR-003) | Bypass le backend Supabase pour réduire les coûts d'egress | Appliqué |
| Séparation Env (ADR-006) | Sépare local, Cloudflare Dev et future production client | Appliqué |
| RGPD/LCEN double opt-in (ADR-007) | Conformité légale et protection de la délivrabilité SMS | En vigueur |
| URL hybride slug+ID (ADR-009) | SEO préservé, zéro collision, résistant aux changements de nom | Appliqué |

---
*Last updated: 2026-09-04 after v1.0 milestone completion*
