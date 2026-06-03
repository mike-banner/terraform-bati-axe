# Requirements: BÂTI-AXE

**Defined**: 2026-06-02
**Core Value**: Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment dont les garanties décennales sont vérifiées.

## v1 Requirements

### Infrastructure & Setup
- [x] **INFRA-01**: Projet Nuxt 3 initialisé avec `@nuxtjs/supabase`, Pinia, Zod
- [x] **INFRA-02**: Supabase CLI + Docker configuré pour le développement local
- [x] **INFRA-03**: Cloudflare Pages configuré avec preset Nitro `cloudflare-pages` (Staging = Preview, Prod = main)
- [x] **INFRA-04**: Middleware Nitro de sécurité (headers, rate limiting, Sentry, healthcheck `/api/v1/health`)

### Compliance & Légal
- [x] **LEGAL-01**: Mentions légales, politique de confidentialité, politique cookies et CGU v1 publiées sur `/legal/*`
- [x] **LEGAL-02**: Registre des traitements RGPD maintenu dans `docs/legal/`

### Capture (Simulateur Nuxt)
- [x] **CPTR-01**: Sélection dynamique par nature de projet (icônes)
- [x] **CPTR-02**: Localisation avec code postal (Focus 78)
- [x] **CPTR-03**: Saisie du budget estimé et délai souhaité
- [x] **CPTR-04**: Saisie des coordonnées de contact (nom, email, téléphone)
- [x] **CPTR-05**: Enregistrement sécurisé du projet anonyme sans compte requis

### Le Verrou (Logique de Floutage)
- [ ] **LCK-01**: Floutage serveur (Nitro API) des coordonnées des prospects (`customer_full_name`, `customer_phone`, `customer_email`, `exact_address`)
- [ ] **LCK-02**: Accès immédiat non flouté pour les pros PREMIUM via abonnement Stripe
- [ ] **LCK-03**: Déblocage automatique gratuit après un délai d'attente de 24 heures pour les pros BASIC (pg_cron)

### Revendication (Claim) & Vérification
- [ ] **CLM-01**: Revendication de profil pour les prospects importés via page `/pro/{dept}/{slug}-{short_id}` (ADR-009)
- [ ] **CLM-02**: Authentification de compte pro sécurisée (Supabase Auth)
- [ ] **CLM-03**: Chargement et stockage isolé de la pièce d'identité, du KBIS et de l'assurance décennale sur R2 via presigned URLs
- [ ] **CLM-04**: Statut de vérification mis à jour après validation manuelle par l'administrateur

### SMS Teasing
- [ ] **SMS-01**: Teasing par SMS instantané aux pros PREMIUM après un dépôt de projet
- [ ] **SMS-02**: Teasing par SMS avec délai de 30 minutes aux pros BASIC
- [ ] **SMS-03**: Consentement SMS explicite obligatoire (case distincte, RGPD / LCEN)

### Administration
- [ ] **ADM-01**: Interface de validation des documents administratifs (Kbis, décennale) stockés sur R2
- [ ] **ADM-02**: Modération et nettoyage des leads suspects avant envoi aux artisans
- [ ] **ADM-03**: Console d'analytics (taux d'ouverture SMS vs taux de clic)

## v2 Requirements
- **GEO-01**: Scalabilité géographique dynamique automatisée (activation multi-villes via console admin)
- **PAY-01**: Facturation automatisée Stripe et gestion des factures PDF
- **SEO-01**: Annuaire public `/[metier]/[ville]` activé dynamiquement quand ≥ 5 pros opt-in par zone

## Out of Scope
| Feature | Reason |
|---|---|
| Messagerie interne | Le contact se fait directement par téléphone et SMS. |
| Inscription client obligatoire | Zéro friction lors de la capture du besoin. |
| OAuth / SSO | Email/password suffisant pour la Phase 1 artisans. |
| App mobile native | Web-first, PWA ultérieurement. |

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| INFRA-01 | Phase 1 | Completed |
| INFRA-02 | Phase 1 | Completed |
| INFRA-03 | Phase 1 | Completed |
| INFRA-04 | Phase 1 | Completed |
| LEGAL-01 | Phase 1 | Completed |
| LEGAL-02 | Phase 1 | Completed |
| CPTR-01 | Phase 2 | Completed |
| CPTR-02 | Phase 2 | Completed |
| CPTR-03 | Phase 2 | Completed |
| CPTR-04 | Phase 2 | Completed |
| CPTR-05 | Phase 2 | Completed |
| CLM-01 | Phase 3 | Pending |
| CLM-02 | Phase 3 | Pending |
| CLM-03 | Phase 3 | Pending |
| CLM-04 | Phase 3 | Pending |
| SMS-03 | Phase 3 | Pending |
| ADM-01 | Phase 3 | Pending |
| LCK-01 | Phase 4 | Pending |
| LCK-02 | Phase 4 | Pending |
| LCK-03 | Phase 4 | Pending |
| SMS-01 | Phase 5 | Pending |
| SMS-02 | Phase 5 | Pending |
| ADM-02 | Phase 5 | Pending |
| ADM-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-02*
*Last updated: 2026-06-03 after Phase 2 completion*
