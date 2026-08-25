# 🧭 Plan de Vol BÂTI-AXE — Synthèse de Pilotage (mise à jour 2026-08-25)

> Source : specs client consolidées (`.planning/clients/`) + ROADMAP + backlog P1→P22.
> Objectif : répondre à « ce qui est fait, ce qui reste dans l'ordre, ce qui constitue V1/V2/V3, et les milestones ».

---

## ✅ 1. Ce qui est FAIT (déjà livré — le cœur B2C)

| Brique | Phase |
| :--- | :--- |
| Tunnel de capture particulier (6 étapes) | Phase 2 |
| Onboarding pro + vérif manuelle | Phase 3 |
| **API SIRET/activité** + badges (SIRET/décennale) | Phase 5 + 05.8 |
| Billing Stripe + floutage + déblocage 48h (72h → 48h via P4) | Phase 4 |
| Conversion (3 leads gratuits, trial 14j, CRM minimaliste) | Phase 4.5 |
| Marché dynamique multi-catégories (pull) | Phase 4.6 |
| Design system (gris industriel + orange) | Phase 4.7 |
| Portfolio pro + profil public immersif | Phase 5.5 |
| Calculateur + simulateur aides (Mes Aides Réno + reste à charge) | Phase 5.6 + 05.9 |
| Durcissement inputs (Zod ↔ HTML) | Phase 5.7 |
| Messagerie + espace client + email onboarding | Phase 6 |

**En résumé : la machine B2C est construite (Milestone v0.9.0 clôturé).** Il manque le **lancement réel** + toute la **couche B2B/commission** (la marge).

---

## 🚀 2. Ce qui reste — DANS L'ORDRE

### 🟢 V1 — Lancement pilote 78 (objectif : machine B2C qui tourne + premières archis/immo)
| # | Item | Statut | Réf |
| :--- | :--- | :--- | :--- |
| 1 | **Stripe + cron 48h re-testés en prod** | ⏳ runbook prêt; accès aux identifiants client requis | P3 |
| 2 | **Turnstile anti-spam** | ✅ code livré (standby clés) | P2 |
| 3 | **Console admin opérationnelle** | ✅ livré (composants, dark, KPIs, audit) | 06.1 |
| 4 | **KPIs de pilotage (dashboard)** | ✅ livré; Matomo reste à brancher | 06.2/P1 |
| 5 | **Notif leads aux pros (email)** | ✅ livré le 2026-08-23; Web Push reporté Phase 8 | P4 |
| 6 | **Mobile QA** (landing + simulateur + états vides) | ✅ livré le 2026-08-23 | P9 |
| 7 | **Page pro publique « digne »** | ✅ CTA fait (avis = Phase 7) | P12 |
| 8 | **Espace Partenaires MVP** (landing + tunnel + back-office + workflow DirCo) | ✅ livré le 2026-08-22 | 05.10 |
| 9 | **Packs zonés & exclusivité métier** (tarifs + charte) | ⬜ à faire | P7 |
| 10 | **Feedback loop refus → remise marché** | ✅ testé le 2026-08-23 | P5 |

### 💰 V2 — Pivot B2B apporteurs d'affaires (objectif : la marge / commissions)
| # | Item | Réf |
| :--- | :--- | :--- |
| 1 | **Espace Partenaires complet** (tunnel par type de lot, DirCo human-in-the-loop, sinistres) | 05.10 + P21 |
| 2 | **Coffre-fort juridique** (`documents_artisan` + auto-suspension décennale + vigilance 6 mois) | 05.11 |
| 3 | **Diagnostiqueurs apporteurs** (compte + bouton dépôt rapport + 15-20 €/lead) | P19 |
| 4 | **Compte prescripteur** (« Mes dossiers », pipeline, jauge 40 leads) | P8 |
| 5 | **Ticket à l'acte (79 €) + Pack Elite (450 €)** | P20 |
| 6 | **Commission + Stripe Connect + signature eIDAS + contrat anti-contournement** (⚠️ d'abord **manuel sur 10 chantiers**) | P10 + P11 |
| 7 | **Avis clients + referral + multi-ville** | Phase 7 |

### 🏗️ V3 — Scale & Expansion
| # | Item | Réf |
| :--- | :--- | :--- |
| 1 | **Travaux Publics** (géomètres, promoteurs, VRD) | P16 |
| 2 | **Majors / Grands Comptes** (Vinci, Eiffage…) | P22 |
| 3 | **PWA mobile** (installable + push) | Phase 8 |
| 4 | **Multi-déploiement white-label (Terraform)** | P13 |
| 5 | **Monitoring Axiom** (observabilité) | P14 |

---

## 🎯 3. Les Milestones

| Milestone | Contenu | Condition de sortie |
| :--- | :--- | :--- |
| **v1.0 — « Pilote 78 en orbite »** | V1 complet (go-live B2C + Espace Partenaires MVP + KPIs) | Stripe/Turnstile OK, KPIs mesurés, 1ères archis/immo captées, 1ʳˢ exclusivités vendues |
| **v2.0 — « Machine à commissions »** | V2 complet (B2B monétisé) | 1ʳᵉ commission encaissée (même manuelle), coffre-fort juridique actif, diagnostiqueurs branchés |
| **v3.0 — « Scale national »** | V3 (TP + Majors + PWA + white-label) | Modèle validé multi-départements, TP/Majors amorcés |

---

## ✅ 4. Décisions tranchées (2026-08-21)

1. ✅ **Commission %** : artisan B2B = **grille dégressive par volume** (cahier §4.3 : 8 % ≤25 k€ → 2,5 % >200 k€) ; rétrocession apporteur = **3-5 %** (sous Art. 27).
2. ✅ **Livrables client** : PDF (Book/Kit/Attestation), clé Turnstile, webhook Slack, **2 contrats types** (charte d'exclusivité B2C + contrat d'apport B2B).
3. ✅ **Analytics** : Matomo (pas PostHog).
4. ✅ **Séquençage B2B** : Stripe Connect/signature **après** 10 chantiers manuels validés.

---

## 🧭 5. Le « pourquoi » de cet ordre
- **V1 = cash + preuve** : on ne construit le B2B qu'une fois la machine B2C en prod et mesurée (sinon on automatise dans le vide).
- **V2 = marge** : le B2B est le moteur de forte marge, mais il exige d'abord le coffre-fort (05.11) + la confiance (badges, anti-contournement).
- **V3 = scale** : TP/Majors/PWA ne font sens qu'une fois le modèle B2B2C validé sur le 78.
