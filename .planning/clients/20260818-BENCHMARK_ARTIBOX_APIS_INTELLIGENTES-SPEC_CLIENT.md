# 📄 Cahier des Charges & Synthèse IA Client — Benchmark Arti-Box, APIs Intelligentes & Simulateur Aides

> **Source :** emails Hermann Avlessi (Lead PM / Direction Produit) — 17/08 12:12, 17/08 12:17, 17/08 12:21, 18/08 11:08.
> **Consolidé le 2026-08-21** (fusion des 4 emails, dédupliqué, statuts d'implémentation ajoutés pour le plan).

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Sous-traitance B2B (Arti-Box), Arbitrage APIs IA, Simulateur Mes Aides Réno
- **Date** : 2026-08-17 → 2026-08-18
- **Auteur / Client** : Hermann Avlessi (Lead PM / Direction Produit)
- **Statut** : **Consolidé — SPEC COMPLÈTE** (comble le morceau manquant du 18/08). Items marqués ✅ implémenté / ❌ à faire pour le phasage.

---

## 🎯 1. Vision & Levier PLG : API « Mes Aides Réno »

### 🔹 Concept & Objectif Business
- **Problème** : Les particuliers ont du mal à estimer le coût réel de leurs travaux de rénovation énergétique (MaPrimeRénov', CEE, Éco-PTZ).
- **Solution PLG Bati-Axe** :
  1. Le particulier simule son projet sur le simulateur.
  2. L'app interroge l'API officielle de l'État `https://mesaides.france-renov.gouv.fr/api/v1/` (moteur Publicodes open-source).
  3. Affichage instantané des aides + **Reste à Charge** (ex : 18 500 € d'aides sur 30 500 € de travaux → reste 12 000 €).
  4. **Trigger Lead (CTA)** : « Envoyer ce plan d'aide à nos Artisans RGE Vérifiés sur votre zone pour recevoir des devis compatibles avec ces subventions. »
- **Impact** : capture de leads ultra-qualifiés avec dossier financier préparé + imputation de la commission à la mise en relation.

### 🔹 Ce que calcule l'API (source 17/08 12:21)
- MaPrimeRénov' (par gestes + rénovation d'ampleur/accompagnée), catégorisation des revenus (tranches Bleue/Jaune/Violette/Rose), Éco-PTZ, prime CEE + aides locales.
- **Payload JSON type** (à adapter au contrat réel — cf. RESEARCH Phase 05.9) :
```json
{
  "logement": { "commune": "78000", "periode_construction": "au_moins_15_ans" },
  "menage": { "personnes": 3, "revenu": 32000 },
  "DPE": { "actuel": "F", "vise": "C" },
  "projet": { "travaux_estimes_ht": 45000 }
}
```

### 🔹 Alternatives privées B2B (évaluées, non retenues V1)
- **Calculeo / Effy API** : endpoints MaPrimeRénov' + CEE avec rôle mandataire/dossier.
- **Aides-energie.fr API** : barèmes CEE obligés (Total, EDF…) + cumuls d'aides.
- **Décision** : API officielle gratuite retenue (✅ implémenté), alternatives privées non retenues en V1 (pas de coût, pas de dépendance).

### 🔹 Positionnement simulateur — « les deux, sous deux formes » (18/08 11:08)
1. **Dans le tunnel de dépôt (obligatoire pour le lead)** : après la saisie du besoin, le simulateur tourne en arrière-plan avec 3 infos rapides (revenu fiscal de référence, code postal, nb personnes). Affiche `travaux − aides = reste à charge`. Effet : le pro reçoit un projet où le client sait déjà ce qu'il paie.
2. **Outil autonome « Lead Magnet »** : page dédiée (ex : `/simulateur-aides-renovation`) accessible depuis le menu / campagnes Pub/SEO. Trigger de fin : « Transformer mon calcul en projet de travaux ».
- **Décision d'architecture** : **un seul composant réutilisable**, placé en standalone + en étape intégrée.
- **Statut** : ✅ **implémenté (Phase 05.9)** — proxy Nitro `/api/v1/aides-reno`, composant `AidesMiniTunnel`, fork optionnel avant le lead wall + route standalone `/calculateur-aides`. *(NB : le client suggérait `/simulateur-aides-renovation`, l'implémentation a retenu `/calculateur-aides`.)*
- **Restant** : précision DPE actuel/visé + parcours d'aide (Deferred, non bloquant — dégradation propre en place).

---

## 🏗️ 2. Benchmark Arti-Box & Sous-traitance B2B

### 🔹 2.1 Analyse du modèle Arti-Box (les forces)
- A validé le besoin **Pro-à-Pro** (Entreprises Générales ↔ Artisans/Sous-traitants), en ignorant volontairement le B2C.
- **Disponibilité Immédiate** : matching de capacité pour combler les trous de planning + renforts d'urgence.
- **Devoir de Vigilance** : centralisation + vérification des documents légaux (KBIS, URSSAF, décennale) — sécurisation des donneurs d'ordres (**obligation légale de contrôle tous les 6 mois**).
- **Calibrage 100 % B2B** : exclusion des petits chantiers particuliers au profit de volumes pro qualifiés.

### 🔹 2.2 Briques fonctionnelles à intégrer
1. **Switch « Alerte Capacité » (profil artisan)** : `is_available_subcontracting` (Oui/Non) + `workforce_size` (effectif mobilisable). Vendu aux majors (« 12 équipes de maçonnerie prêtes sous 48h dans les Yvelines »).
2. **Coffre-Fort Juridique « Zéro Risque » (API)** : dépôt/vérif automatisée KBIS (< 3 mois), Attestation vigilance URSSAF, Décennale (contrôle activités souscrites). API Infolégale/Paperless. **Règle métier : suspension auto du profil dès expiration d'un document.**
3. **Dépôt de Projet « Lot Technique & CCTP »** : import direct CCTP, planning prévisionnel (début/fin), exigences de qualification (Qualibat, RGE, habilitations).

### 🔹 2.3 Plan de Dépassement (matrice comparative) — NOUVEAU
| Axe | Limites d'Arti-Box | Réponse Bâti Axe |
| :--- | :--- | :--- |
| **Modèle Économique** | Abonnements lourds / commissions fixes bloquantes | **Hybride** : forfait abordable (visibilité B2C locale) + commission au succès uniquement sur la sous-traitance B2B signée |
| **Accompagnement** | 100 % self-service (aucun intermédiaire) | **Human-in-the-Loop** : analyse du CCTP par le DirCo, qualification du besoin, présentation de 2-3 sous-traitants validés au donneur d'ordres |
| **Périmètre Métier** | Bâtiment traditionnel (gros œuvre/second œuvre) | **Ouverture aux TP** : VRD, terrassement, géomètres (volumes d'affaires élevés) |

### 🔹 2.4 Recommandation PM & Directive Tech — NOUVEAU
- **Feuille de route inchangée** : priorité au résidentiel/architectes sur le **78** pour le cash-flow immédiat.
- **Directive Back-End (immédiate)** : intégrer au schéma Supabase/PostgreSQL la table **`documents_artisan`** (avec gestion des statuts de validation API) + colonnes `is_available_subcontracting` / `workforce_size` sur `professionals`.
- **Résultat visé** : au basculement B2B Majors, la base d'artisans est **pré-qualifiée administrativement** → envoi de dossiers conformes en un clic.
- **Statut** : ❌ à faire (Phase 7 — §9.2).

---

## 🤖 3. Arbitrage APIs IA (decision matrix enrichie)

| Domaine | Outils proposés | Décision Bâti Axe | Rationale |
| :--- | :--- | :--- | :--- |
| **Simulateur Aides** | API Mes Aides Réno (Publicodes) | ✅ RETENU (P1) — **implémenté 05.9** | Gratuit, officiel, levier PLG direct |
| **Validation Administrative** | Infolégale / Paperless / API Sirene | ✅ **FAIT** (SIRET/activité via `siretLookup.ts`) | API Sirene gratuite — **confirmé fait par le client 21/08** |
| **OCR KBIS/Décennale** | Google Doc AI / Textract / LlamaParse + **Once / Provigis / BatiDocs** (BTP spécialisés) | ⚠️ DIFFÉRÉ | Activité = ✅ fait (Insee). **Décennale = pas d'annuaire public universel** → API conformité BTP (OCR attestation + date + codes NAF/APE cochés) en V2 |
| **Assistant Réagencement 2D/3D** | ControlNet/Stable Diffusion (Replicate/Fal.ai), GetFloorPlan, Interior AI | ⚠️ DIFFÉRÉ Phase 7+ (US-ARC-02) | Coût compute faible mais hors cœur marketplace V1 |
| **Dictaphone chantier** | Whisper + Claude 3.5 Sonnet / GPT-4o | ❌ REJETÉ (niche) | Diagnostiqueurs hors persona prioritaire (Artisans 78) |
| **Support/relance vocale** | Vapi.ai / Retell AI | ❌ REJETÉ (over-engineering) | Irritant pour les pros |
| **Chatbot B2B (actions DB)** | OpenAI Assistants API (Function Calling) | ❌ REJETÉ V1 | Complexité inutile à ce stade |

**Architecture IA recommandée (source 17/08 12:17)** — à reconsidérer seulement en Phase 7+ :
- `Whisper + Claude 3.5 Sonnet` → dictaphone diagnostiqueur (combo vitesse/précision).
- `Replicate (ControlNet)` → régénateur 2D/3D architecte (qualité/prix).
- `Stripe + Yousign` → paiement + signature légale eIDAS.

---

## 👤 4. Personas Cibles
- **L'Artisan / Entreprise BTP (« Marc le Menuisier »)** — leads qualifiés, remises fournisseurs, visibilité.
- **L'Architecte / Maître d'Œuvre (« Sophie l'Archi »)** — planification, IA réagencement, coordination.
- **Le Diagnostiqueur Immobilier (« Julien le Diag »)** — automatisation DPE, fiches préconisations (hors priorité V1).
- **Le Particulier / Acheteur (« Thomas le Propriétaire »)** — estimation budget, devis, financement.
- **La Major BTP / Entreprise Générale** — renfort de capacité, dossiers conformes (Phase 7+).

## 📜 5. User Stories (Par Périmètre)
### 🛠️ Module Artisan
- **US-ART-01** : label « Artisan Vérifié & Assuré Bâti Axe » sur profil/devis.
- **US-ART-02** : abonnement sectorisé (Zone Unique / Département Complet).
- **US-ART-03** : codes privilèges fournisseurs (Hilti, Berner, Foussier, Kiloutou).
- **US-ART-04** : lien d'invitation fournisseur.
- **US-ART-05** (nouveau) : switch « Alerte Capacité » + effectif mobilisable.

### 📐 Module Architecte & Maître d'Œuvre
- **US-ARC-01** : planning GANTT partagé avec les artisans.
- **US-ARC-02** : Assistant IA Réagencement (crédits IA) → 3 propositions 2D/3D.
- **US-ARC-03** : dépôt de projet → +10 crédits IA offerts.
- **US-ARC-04** : signature électronique OS/avenants depuis mobile.
- **US-ARC-05** (nouveau) : dépôt CCTP + exigences de qualification (Qualibat/RGE).

### 🔍 Module Diagnostiqueur (hors priorité V1)
> **⚠️ Réversal 21/08** : le **diagnostiqueur comme apporteur d'affaires** (dépôt de rapport DPE → lead travaux + commission 15-20 €) passe en **GO** (P19). Les outils IA dictaphone/fiche (US-DIA-01/02) restent, eux, différés.
- **US-DIA-01** : dictée de mémos + photos → relevé d'anomalies auto.
- **US-DIA-02** : fiche préconisation chiffrée + envoi devis 1 clic.

### 🏠 Module Particulier & Financement
- **US-PAR-01** : calcul du reste à charge (MaPrimeRénov'/CEE/Éco-PTZ) — **✅ implémenté 05.9**.
- **US-PAR-02** : étude de financement courtier partenaire.

## ⚖️ 6. Règles Métier & Modèle Économique
### 6.1. Découpage Territorial & Abonnements Artisans
- Découpage départemental en 2 sous-zones (ex : 95-Nord / 95-Sud) via codes postaux.
- Packs : *Zone Unique* (base) / *Département Complet* (premium). Engagement 12 mois pour tarif préférentiel.
- CAC : 50 % du 1er mois d'abonnement versé au commercial freelance apporteur.

> **⚠️ Révisé le 08/08 (cahier des charges v1.1 §4.1)** : le modèle évolue vers **1 zone principale incluse + add-on mensuel par sous-zone supplémentaire + tarif dégressif si > 3 zones** (Pack Département/Région). Voir spec maître 2026-08-06 §4.1 — à utiliser pour P7.

### 6.2. Modèle Hybride (nouveau — cf. §2.3)
- Forfait abordable (visibilité B2C locale) + **commission au succès uniquement sur la sous-traitance B2B signée**.

### 6.3. Monétisation des Outils SaaS (Freemium IA)
- Assistant IA Réagencement : 3 générations gratuites/mois, +10 crédits par projet publié, paywall packs de crédits ou abonnement « Tools Only ».

### 6.4. Grille de Commissionnement B2B Dégressive (Paliers)
| Plafond HT | Commission Bâti Axe |
|---|---|
| ≤ 25 000 € | 8 % |
| 25 001 – 75 000 € | 6 % |
| 75 001 – 200 000 € | 4 % |
| > 200 000 € | 2,5 % |

### 6.5. Automatisation Financière (Stripe Connect)
- Split automatique : Bâti Axe ↔ Commercial freelance ↔ Apporteur d'affaires (prescripteur/agent immo).

### 6.6. Transaction & Signature
- API signature électronique eIDAS (Yousign/DocuSign) ; verrou juridique de la commission dès signature.

### 6.7. Devoir de vigilance (nouveau — légal)
- Re-contrôle des documents légaux **tous les 6 mois** (obligation donneur d'ordres) → aligné sur la suspension auto si expiration (§2.2).

---

## 🖥️ 7. Cartographie des Écrans Principaux
1. **Écran A – Dashboard Artisan** — carnet de commandes, leads géolocalisés, onglet Avantages & Remises + **switch Alerte Capacité**.
2. **Écran B – Workspace Architecte (Gantt & IA)** — calendrier/Gantt collaboratif, import plan 2D, IA Réagencement, signature OS.
3. **Écran C – App Mobile Diagnostiqueur (DPE-to-Lead)** — dictée vocale, photos, fiche préconisation (hors priorité V1).
4. **Écran D – Portail Particulier (Simulateur Reste à Charge)** — formulaire projet, simulation aides, CTA courtier — **✅ partiel implémenté (05.9)**.

---

## 🚫 8. Hors-Scope (Out of Scope – V1)
- Édition/génération de devis artisans — laissée aux pros.
- Gestion des stocks fournisseurs en temps réel — Phase 3 (National).
- Paiement des acomptes travaux sur la plateforme.
- Recrutement d'une force de vente salariée interne — uniquement réseau freelance.

---

## 📋 9. Plan d'Action & Phasage Technique (COMPLET)

1. ✅ **Extension Simulateur Aides (ex-Phase 5.6)** — brancher l'API Mes Aides Réno via proxy Nitro `/api/v1/aides-reno`, sans modifier `computeEstimate()`. **Livré (Phase 05.9).**
2. ❌ **Préparation Schema BDD (Pivot B2B)** — table `documents_artisan` + colonnes `is_available_subcontracting` / `workforce_size` sur `professionals` (directive immédiate, cf. §2.4). **Phase 7.**
3. ❌ **Espace Partenaires & tunnel B2B (CCTP, human-in-the-loop DirCo)** — **Phase 05.10** (cf. spec 2026-08-21).
4. ❌ **Packs zonés + sous-zones par CP** — **P7** (backlog).
5. ❌ **Stripe Connect + commission dégressive** — **P10** (doc only).
6. ❌ **Signature eIDAS (Yousign/DocuSign)** — **P11** (Phase 7+).
7. ❌ **Workspace Architecte (Gantt, IA réagencement, crédits)** — **P11** (Phase 7+).
8. ❌ **Ouverture TP (VRD, terrassement, géomètres)** — extension catégories, Phase 7+.
9. ❌ **Étude de financement courtier (US-PAR-02)** — **P6** (backlog).

---

## 🧭 10. Statut fait / à faire (synthèse « puisable » pour le plan)

| Item | Statut | Référence |
| :--- | :--- | :--- |
| Simulateur Mes Aides Réno (proxy + mini-tunnel + reste à charge + standalone) | ✅ fait | Phase 05.9 |
| SIRET lookup + badges vérifiés + forme juridique/NAF | ✅ fait | Phase 5 + 05.8 |
| documents_artisan + sous-traitance (capacité/effectif) | ❌ à faire | Phase 7 (§9.2) |
| Espace Partenaires + tunnel B2B + human-in-the-loop DirCo | ❌ à faire | Phase 05.10 |
| Packs zonés (sous-zones CP) | ❌ à faire | P7 |
| Commission dégressive + Stripe Connect | ❌ à faire | P10 |
| Signature eIDAS | ❌ à faire | P11 |
| Workspace architecte + IA réagencement | ❌ à faire | P11 / Phase 7+ |
| Ouverture TP | ❌ à faire | Phase 7+ |
| Étude financement courtier (US-PAR-02) | ❌ à faire | P6 |
| Devoir de vigilance 6 mois (re-contrôle docs) | ❌ à faire | §6.7 (légal/ops) |
| Dictaphone IA / agents vocaux / chatbot | ❌ rejeté V1 | §3 |
