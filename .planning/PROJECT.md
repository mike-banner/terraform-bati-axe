# BÂTI-AXE

## What This Is
BÂTI-AXE est une marketplace sélective de mise en relation B2B/B2C dans le bâtiment. Elle agit comme un tiers de confiance qui sécurise la chaîne de valeur en vérifiant les garanties décennales des professionnels. Déploiement prototype-first sur Carrières-sous-Poissy (78).

## Core Value
Garantir la sécurité et la confiance des chantiers de particuliers en les mettant en relation exclusive avec des professionnels du bâtiment certifiés (assurance décennale et labels vérifiés).

## Requirements

### Validated
- **Infrastructure Dev** : Cloudflare Pages `bati-axe-dev` déployé via Terraform depuis `dev` et vérifié le 2026-08-25.
- **Application** : build Node 22 réussi et 73 tests unitaires réussis le 2026-08-25.

### Remaining
- [ ] **P3** : re-test Stripe et cron 48h avec les identifiants de production client.
- [ ] **P1** : brancher Matomo sur le funnel avec le bandeau cookies RGPD.
- [ ] **P7** : confirmer les tarifs et implémenter les packs zonés/exclusivité métier.
- [ ] **P6/P8/P10** : étude financement, compte prescripteur et commission Stripe Connect.
- [ ] **Production client** : préparer Cloudflare, domaine, base et secrets après réception des identifiants.

### Out of Scope
- **Real-time chat** — Le contact se fait par téléphone/SMS direct.
- **Multi-villes initial** — Restreint à Carrières-sous-Poissy pour valider le modèle.
- **OAuth / SSO** — Email/password suffisant pour la Phase 1.

## Context
- Phase prototype axée sur Carrières-sous-Poissy (78) pour valider la conversion avant scale.
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
*Last updated: 2026-08-25 after Cloudflare Dev validation and environment strategy update*
