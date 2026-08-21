# 📄 Cahier des Charges & Synthèse IA Client — KPIs de Pilotage & Scalabilité

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Métriques de pilotage & Dashboard de scalabilité (CAC, LTV, churn, matching, rétention prescripteurs, activation fournisseurs)
- **Date** : 2026-08-21
- **Auteur / Client** : Hermann Avlessi (Lead PM / Direction Produit)
- **Statut** : **Cadré — NON implémenté** (seul le funnel `paywall_events` CNV-07 existe). À plannifier.

---

## 🎯 1. Vision & Objectif Business
Transformer le département pilote (78) en **laboratoire mathématique** pour prouver que la machine est réplicable au national. Ce qui compte : **l'efficacité économique** (rentabilité du modèle) et **la liquidité du marché** — pas les téléchargements ni les inscrits gratuits.

- **Objectif** : suivre en temps réel, dès J1 du lancement, les 5 KPIs qui conditionnent le passage au département suivant.

---

## 💰 2. L'Équation Économique (rentabilité du modèle)

| KPI | Formule | Cible |
| :--- | :--- | :--- |
| **CAC** (Coût d'Acquisition) | (Commissions commercial freelance + Frais marketing locaux) ÷ Artisans payants recrutés | **< 150 €** (≈ 1 mois d'abonnement Classic) |
| **LTV** (Valeur Vie) | Marge brute mensuelle (Abonnement + Commissions B2B) × Rétention moyenne (mois) | **> 1 500 €** |
| **LTV / CAC** | LTV ÷ CAC | **> 3** (idéal > 4-5 B2B) |
| **Churn mensuel** | Artisans payants résiliés dans le mois ÷ Artisans payants début de mois | **< 3 %/mois** |

> **Règle d'or PM** : LTV/CAC > 4 = « machine à billets » → levier de financement (100 k€ investis → 400 k€ au national).

---

## 🔄 3. La Liquidité de la Marketplace (rétention des prescripteurs)

| KPI | Formule | Cible |
| :--- | :--- | :--- |
| **Taux de Matching** | Projets ayant reçu ≥ 3 devis en 48h ÷ Total projets déposés | **> 85 %** |
| **Rétention prescripteurs** | Prescripteurs actifs (≥ 1 projet/mois) ÷ Total prescripteurs inscrits | **> 40 %** |

---

## 🏗️ 4. L'Effet de Réseau (partenaires fournisseurs)

| KPI | Formule | Cible |
| :--- | :--- | :--- |
| **Taux d'activation fournisseurs** | Artisans payants ayant utilisé ≥ 1 code promo fournisseur dans le mois ÷ Total artisans payants | **> 60 %** |

---

## 📊 5. Dashboard de Pilotage (5 lignes rouges)

| KPI | Vert (scalable) | Orange (alerte) | Rouge (danger) | Action si rouge |
| :--- | :--- | :--- | :--- | :--- |
| Ratio LTV / CAC | > 4 | 2 à 4 | < 2 | Revoir commissions freelances / augmenter le prix des packs |
| Churn artisans | < 3 % | 3-6 % | > 6 % | Appeler les sortants (volume/qualité chantiers) |
| Taux matching 48h | > 85 % | 60-85 % | < 60 % | Pénurie d'artisans → injecter des pros massivement |
| Rétention prescripteurs | > 40 % | — | — | Animation réseau / rappels notifications |
| Activation fournisseurs | > 60 % | 30-60 % | < 30 % | Remises nazes / onglet « Avantages » invisible |

---

## 🧭 6. Faisabilité & Arbitrage (mapping données)

| # | KPI | Verdict | Rationale / données |
| :--- | :--- | :--- | :--- |
| 1 | **Churn** | ✅ Faisable maintenant | Webhook Stripe `customer.subscription.deleted` existant (Phase 4) + snapshot mensuel des payants. |
| 2 | **LTV (part abonnement)** | ⚠️ Partiel | Revenu abonnement = Stripe existant. La **commission B2B** n'existe pas (P10). |
| 3 | **CAC** | ⚠️ Nouveau modèle | Aucune table « commission freelance » ni « frais marketing ». Nécessite `acquisition_costs` + saisie admin. |
| 4 | **LTV / CAC** | ⚠️ Partiel | Dérivé de 2 + 3. |
| 5 | **Taux de matching** | ⚠️ Adaptation sémantique | Le produit n'a **pas de notion de « devis »** : marché pull (`leads`) + messagerie. Adapter → « projets ayant reçu ≥ 3 réponses de pros en 48h » ou « ≥ 3 leads débloqués ». À trancher. |
| 6 | **Rétention prescripteurs** | ⚠️ Dépend 05.10 | « Prescripteurs » = archis/agents immo → table `b2b_requests` (Phase 05.10, non construite). V1 = « particuliers actifs » (projets/mois) possible dès maintenant. |
| 7 | **Activation fournisseurs** | ❌ Impossible tant que la feature n'existe pas | Codes privilèges fournisseurs = US-ART-03 / **P11** (Phase 7+). KPI « en avance » → stub. |

### Arbitrage outils (✅ tranché — Matomo)
- Le client proposait **PostHog / Mixpanel** mais **Matomo est confirmé le 2026-08-21** (open-source, GDPR, souveraineté FR, self-hostable — déjà décidé le 2026-08-19, P1).
- **Décision** : **Matomo** pour le funnel (événements) + calculs KPIs financiers **côté serveur** (Supabase/Stripe) + affichage dans la **console admin** (cohérent avec P14). PostHog/Mixpanel = écartés.

---

## 📋 7. Séquencement (contrainte projet)
- **Rattachement ROADMAP** : nouvelle **Phase 06.2** (s'appuie sur Phase 06.1 Console Admin + P1 Matomo).
- **Ordre de valeur** : ① churn + LTV/CAC (rentabilité) → ② matching (liquidité) → ③ rétention prescripteurs (avec 05.10) → ④ activation fournisseurs (avec P11).
- **Pré-requis** : P1 (Matomo) + Phase 06.1 (admin) pour l'hébergement du dashboard.
- **À trancher avant build** : définition opérationnelle du « matching » (devis vs réponses vs leads débloqués).
