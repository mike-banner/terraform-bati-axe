# 📄 Cahier des Charges Fonctionnel — Bati-Axe Platform (v1.1.0) — Spec Maître

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Cahier des charges fonctionnel maître (Marketplace B2B/B2C + Suite SaaS BTP)
- **Version** : 1.1.0 (validée, prête pour développement)
- **Date** : Août 2026 (email 06/08 19:03 + **révision §4.1 le 08/08 18:39**)
- **Auteur / Client** : Hermann Avlessi (Lead Product Manager)
- **Statut** : **Spec maître fondatrice** — la spec Arti-Box (18/08) en est une dérivation « benchmark + arbitrage ». Fait/restant : voir §7.

---

## 🎯 1. Objectifs du Produit
### 1.1 Vision
Faire de Bati-Axe **l'OS central du bâtiment** : interconnecter particuliers, prescripteurs immobiliers, maîtres d'œuvre, artisans BTP et fournisseurs de matériaux.

### 1.2 Objectifs stratégiques & business
- **Autofinancement rapide** : seuil de rentabilité dès **Mois 2-3** (cible **28 artisans abonnés actifs par secteur**).
- **Adoption PLG** : capter les prescripteurs (archis, diagnostiqueurs, agents immo) via des outils SaaS gratuits générant des flux de chantiers.
- **Monétisation hybride** (5 flux) : abonnements récurrents artisans (par zones) + commissions B2B par paliers + crédits IA SaaS + apport d'affaires courtage/financement + rétrocommissions fournisseurs.

---

## 👤 2. Personas Cibles
1. **Artisan / Entreprise BTP (« Marc le Menuisier »)** — chantiers qualifiés, rassurer, remises matériel.
2. **Architecte / Maître d'Œuvre (« Sophie l'Archi »)** — artisans fiables, plannings, esquisse/réagencement.
3. **Diagnostiqueur Immobilier (« Julien le Diag »)** — compte-rendu terrain, valeur post-DPE.
4. **Particulier / Acheteur (« Thomas le Propriétaire »)** — budget réel (aides déduites), devis vérifiés, financement.

---

## 📜 3. User Stories (par périmètre)
### 🛠️ Module Artisan
- **US-ART-01** : label « Artisan Vérifié & Assuré Bati-Axe » sur profil/devis.
- **US-ART-02** : abonnement sectorisé (Zone Unique / Département Complet).
- **US-ART-03** : codes privilèges fournisseurs (Hilti, Berner, Foussier, Kiloutou).
- **US-ART-04** : invitation agence fournisseur au réseau.

### 📐 Module Architecte & Maître d'Œuvre
- **US-ARC-01** : planning GANTT interactif partagé avec artisans (réajustement jalons).
- **US-ARC-02** : Assistant IA Réagencement (crédits) → 3 propositions 2D/3D.
- **US-ARC-03** : dépôt projet → +10 crédits IA offerts.
- **US-ARC-04** : signature électronique OS/avenants depuis mobile.

### 🔍 Module Diagnostiqueur Immobilier
- **US-DIA-01** : Dictaphone IA Terrain (dictée + photos) → relevé d'anomalies auto.
- **US-DIA-02** : Fiche de Préconisation Travaux chiffrée (post-DPE) + envoi devis 1 clic.

### 🏠 Module Particulier & Financement
- **US-PAR-01** : calcul du « reste à charge réel » (MaPrimeRénov', CEE, Éco-PTZ).
- **US-PAR-02** : demande d'étude de financement du reste à charge (courtier partenaire).

---

## ⚖️ 4. Règles Métier & Modèle Économique

### 4.1. Découpage Territorial & Abonnements Artisans — **⚠️ RÉVISÉ le 08/08**
> **Version 08/08 (remplace le modèle « 2 sous-zones » initial) :**
- **Zone Principale (incluse)** : l'abonnement de base = **1 sous-zone géographique** (ex : 95-Sud).
- **Option Multi-Zones (add-on payant)** : chaque sous-zone supplémentaire (ex : 95-Nord, 78-Est) = **supplément mensuel récurrent par zone**.
- **Pack Département / Région** : tarif **dégressif** si l'artisan débloque **> 3 zones** simultanées.
- **Engagement** : 12 mois obligatoire pour le tarif préférentiel.
- **CAC & rémunération freelance** : 50 % du 1er mois d'abonnement versé au commercial freelance apporteur.

### 4.2. Monétisation des Outils SaaS (Freemium IA Archi)
- Quota gratuit : 3 générations de plans/esquisses 3D/mois.
- Incentive : +10 crédits IA par projet/chantier publié.
- Paywall : packs de crédits ou abonnement « Tools Only ».

### 4.3. Grille de Commissionnement B2B Dégressive (par paliers)
| Plafond HT | Commission Bati-Axe |
|---|---|
| ≤ 25 000 € | 8 % |
| 25 001 – 75 000 € | 6 % |
| 75 001 – 200 000 € | 4 % |
| > 200 000 € | 2,5 % |

### 4.4. Automatisation Financière (Stripe Connect)
- Split automatique : Bati-Axe ↔ commercial freelance ↔ apporteur d'affaires (prescripteur/agent immo).

### 4.5. Module de Transaction & Signature
- API signature eIDAS (Yousign/DocuSign) ; verrou juridique de la commission dès signature.

---

## 🖥️ 5. Cartographie des Écrans Principaux
1. **Écran A — Dashboard Artisan** : carnet de commandes, leads géolocalisés par sous-zone, onglet « Avantages & Remises Fournisseurs ».
2. **Écran B — Workspace Architecte (Gantt & IA)** : Gantt multi-lots, import plan 2D, Assistant IA + solde crédits, émission/signature OS.
3. **Écran C — App Mobile Diagnostiqueur (DPE-to-Lead)** : dictée vocale terrain, photos, fiche préconisation post-DPE.
4. **Écran D — Portail Particulier (Simulateur Reste à Charge)** : saisie projet, aides d'État + reste à charge, CTA courtier crédit.

---

## 🚫 6. Hors-Scope (V1)
- Édition/génération de devis artisans (laissée aux pros).
- Gestion des stocks fournisseurs temps réel (→ Phase 3 National).
- Paiement des acomptes travaux (pas de compte séquestre).
- Recrutement d'une force de vente salariée (100 % réseau freelance).

---

## 🧭 7. Statut fait / restant (vérification 2026-08-21)

| Item | Statut | Référence |
| :--- | :--- | :--- |
| **US-ART-01** label vérifié | ✅ fait | Phase 5 (badges SIRET/décennale) |
| **US-ART-02** abonnement sectorisé | ⚠️ partiel (abonnement plat) | P7 (packs zonés) |
| **US-ART-03** codes privilèges fournisseurs | ❌ | P11 |
| **US-ART-04** invitation fournisseur | ❌ | P11 |
| **US-ARC-01** GANTT | ❌ | P11 |
| **US-ARC-02** Assistant IA Réagencement | ❌ (différé) | P11 / spec Arti-Box §3 |
| **US-ARC-03** dépôt projet → +10 crédits | ⚠️ partiel | dépôt = 05.10 ; crédits = P11 |
| **US-ARC-04** signature OS | ❌ | P11 |
| **US-DIA-01** dictaphone | ❌ (rejeté V1 — niche) | spec Arti-Box §3 |
| **US-DIA-02** fiche préconisation | ❌ (rejeté V1 — niche) | spec Arti-Box §3 |
| **US-PAR-01** reste à charge | ✅ fait | Phase 05.9 |
| **US-PAR-02** étude financement courtier | ❌ | P6 |
| §4.1 packs zonés (révisé 08/08) | ❌ | P7 (à mettre à jour avec add-on par zone) |
| §4.2 freemium IA | ❌ | P11 |
| §4.3 commission dégressive | 📝 doc only | P10 |
| §4.4 Stripe Connect | 📝 doc only | P10 |
| §4.5 signature eIDAS | ❌ | P11 |
| Écran A — Dashboard artisan | ⚠️ partiel (sans onglet Avantages) | Phase 4/4.5 + P11 |
| Écran B — Workspace archi | ❌ | P11 |
| Écran C — App diag | ❌ (rejeté V1) | — |
| Écran D — Portail particulier | ⚠️ partiel (courtier manquant) | 05.9 + P6 |
| Autofinancement M2-3 / 28 artisans | ❌ non mesuré | → Phase 06.2 (KPIs) |

**Synthèse** : cœur B2C (capture, vérification, abonnement, badges, simulateur aides) = **fait**. Tout le pivot B2B/SaaS (packs zonés, fournisseurs, GANTT/IA, signature, commission/Stripe Connect, courtier) = **à faire** (P6, P7, P10, P11, 05.10, 06.2).
