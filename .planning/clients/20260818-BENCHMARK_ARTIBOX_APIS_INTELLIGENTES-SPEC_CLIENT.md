# 📄 Cahier des Charges & Synthèse IA Client — Benchmark Arti-Box & APIs Intelligentes

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Intégration API France Rénov' (Mes Aides Réno), Benchmark Arti-Box (Sous-traitance B2B) & Arbitrage APIs IA
- **Date** : 2026-08-18
- **Auteur / Client** : Hermann Avlessi (Lead PM / Direction Produit)
- **Outil IA & Relecture** : Antigravity (Gemini 3.6 Flash) — Filtrage & Arbitrage technique
- **Statut** : Cadré & Filtré — Prêt pour phasage roadmap

---

## 🎯 1. Vision & Levier Product-Led Growth (PLG) : API "Mes Aides Réno"

### 🔹 Concept & Objectif Business
- **Problème** : Les particuliers ont du mal à estimer le coût réel de leurs travaux de rénovation énergétique (MaPrimeRénov', CEE, Éco-PTZ).
- **Solution PLG Bati-Axe** :
  1. Le particulier simule son projet sur le [Simulateur Bati-Axe](file:///home/mike/projects/saas/bati-axe/app/pages/simulateur.vue).
  2. L'app interroge l'API officielle de l'État : `https://mesaides.france-renov.gouv.fr/api/v1/` (Moteur Publicodes open-source).
  3. Affichage instantané du montant des aides et du **Reste à Charge** (ex: 18 500 € d'aides sur 30 500 € de travaux → Reste à charge 12 000 €).
  4. **Call To Action (Trigger Lead)** : "Envoyer ce dossier financier qualifié aux artisans RGE Vérifiés de votre zone".
- **Impact** : Capture de leads ultra-qualifiés avec capacité de financement validée.

---

## 🏗️ 2. Benchmark Arti-Box & Sous-traitance B2B (Phase 7+)

### 🔹 Briques Fonctionnelles B2B retenues
1. **Switch "Alerte Capacité" (Profil Artisan)** :
   - Statut dynamique : `is_available_subcontracting` (Oui / Non).
   - Effectif mobilisable : `workforce_size` (nombre d'ouvriers/compagnons disponibles sous 48h).
2. **Coffre-fort Juridique "Zéro Risque"** :
   - Centralisation des documents légaux (`documents_artisan`) : KBIS (< 3 mois), Attestation URSSAF, Décennale.
   - Auto-suspension du profil en cas de document expiré.
3. **Tunnel Dépôt de Projet B2B (Lot Technique & CCTP)** :
   - Dépôt CCTP / planning prévisionnel pour Directeurs de Travaux & Architectes.

---

## 🤖 3. Arbitrage & Decision Matrix — APIs IA

| Domaine IA | Outil proposé | Décision Bati-Axe | Rationale / Motif |
| :--- | :--- | :--- | :--- |
| **Simulateur Aides** | API Mes Aides Réno (Publicodes) | ✅ **RETENU (Priorité 1)** | 100% gratuit, officiel, levier PLG direct sur le simulateur |
| **Validation Administrative** | Infolégale / Paperless / Insee API | ✅ **RETENU (Priorité 2)** | Déjà amorcé via `siretLookup.ts` (API Sirene gratuite) |
| **OCR KBIS / Décennale** | Google Doc AI / Textract / LlamaParse | ⚠️ **DIFFERÉ** | L'API Insee couvre déjà l'existence & statut légal ; OCR manuelle/hybride suffit en V1 |
| **Dictaphone Chantier** | Whisper + Claude 3.5 Sonnet | ❌ **REJETÉ (Niche)** | Diagnostiqueurs hors du persona prioritaire (Artisans 78) |
| **Rendus 2D/3D** | ControlNet / Replicate / Fal.ai | ❌ **REJETÉ (Gadget)** | Coûteux et hors du cœur marketplace de mise en relation |
| **Agents Vocaux Relance** | Vapi.ai / Retell AI | ❌ **REJETÉ (Over-engineering)** | Irritant pour les pros, complexité inutile à ce stade |

---

## 👤 4. Personas Cibles
- **L'Artisan / Entreprise du BTP ("Marc le Menuisier")** – besoin de leads qualifiés, remise fournisseurs, visibilité.
- **L'Architecte / Maître d'Œuvre ("Sophie l'Archi")** – besoin de planification, IA de réagencement, coordination.
- **Le Diagnostiqueur Immobilier ("Julien le Diag")** – automatisation de rapports DPE, fiches préconisations.
- **Le Particulier / Acheteur ("Thomas le Propriétaire")** – estimation du budget, obtention de devis, financement.

## 📜 5. User Stories (Par Périmètre)
### 🛠️ Module Artisan
- **US‑ART‑01** : Afficher le label "Artisan Vérifié & Assuré Bati‑Axe" sur le profil et les devis.
- **US‑ART‑02** : Souscrire un abonnement sectorisé (Zone Unique ou Département Complet).
- **US‑ART‑03** : Débloquer des codes privilèges chez les fournisseurs (Hilti, Berner, Foussier, Kiloutou).
- **US‑ART‑04** : Envoyer un lien d’invitation à son agence fournisseur pour intégrer le réseau.

### 📐 Module Architecte & Maître d'Œuvre
- **US‑ARC‑01** : Créer un planning GANTT interactif partagé avec les artisans.
- **US‑ARC‑02** : Utiliser l’Assistant IA Réagencement (crédits IA) pour générer 3 propositions 2D/3D.
- **US‑ARC‑03** : Déposer un projet de chantier pour obtenir +10 crédits IA offerts.
- **US‑ARC‑04** : Signer électroniquement des Ordres de Service (OS) et avenants depuis mobile.

### 🔍 Module Diagnostiqueur Immobilier
- **US‑DIA‑01** : Dictée de mémos + photos via le Dictaphone IA Terrain → relevé d’anomalies automatique.
- **US‑DIA‑02** : Éditer une Fiche de Préconisation Travaux chiffrée et proposer l’envoi de devis en 1 clic.

### 🏠 Module Particulier & Financement
- **US‑PAR‑01** : Calculer le "Reste à charge réel" en saisissant le projet (intégration MaPrimeRénov', CEE, Éco‑PTZ).
- **US‑PAR‑02** : Demander une étude de financement auprès du courtier partenaire.

## ⚖️ 6. Règles Métier & Modèle Économique
### 6.1. Découpage Territorial & Abonnements Artisans
- **Découpage** : Chaque département découpé en 2 sous‑zones (ex : 95‑Nord / 95‑Sud) via codes postaux.
- **Packs d'Accès** :
  * *Pack Zone Unique* – tarif de base.
  * *Pack Département Complet* – tarif premium.
- **Engagement** : 12 mois obligatoire pour tarif préférentiel.
- **CAC & Rémunération Freelance** : 50 % du 1er mois d’abonnement versé au commercial freelance apporteur.

### 6.2. Monétisation des Outils SaaS (Freemium IA)
- **Assistant IA Réagencement** :
  * Quota gratuit : 3 générations de plans/esquisses 3D/mois.
  * Incentive : +10 crédits IA pour chaque projet/chantier publié.
  * Paywall : packs de crédits supplémentaires ou abonnement "Tools Only".

### 6.3. Grille de Commissionnement B2B Dégressive (Par Paliers)
| Plafond HT | Commission Bati‑Axe |
|------------|----------------------|
| ≤ 25 000 € | 8 % |
| 25 001 € – 75 000 € | 6 % |
| 75 001 € – 200 000 € | 4 % |
| > 200 000 € | 2,5 % |

### 6.4. Automatisation Financière (Stripe Connect)
- Split automatique des flux : Bati‑Axe ↔ Commercial freelance ↔ Apporteur d’affaires (prescripteur/agent immo).

### 6.5. Module de Transaction & Signature
- Intégration d’une API de signature électronique conforme eIDAS (Yousign / DocuSign).
- Verrouillage juridique de la commission dès l’apposition de la signature sur le contrat/OS.

---

## 🖥️ 7. Cartographie des Écrans Principaux
1. **Écran A – Dashboard Artisan** – carnet de commandes, affichage des leads géolocalisés, onglet Avantages & Remises Fournisseurs.
2. **Écran B – Workspace Architecte (Gantt & IA)** – calendrier/Gantt collaboratif, import de plan 2D, IA Réagencement, signature d’OS.
3. **Écran C – App Mobile Diagnostiqueur (DPE‑to‑Lead)** – dictée vocale terrain, capture photos, génération fiche préconisation.
4. **Écran D – Portail Particulier (Simulateur Reste à Charge)** – formulaire projet, simulation aides d’État, CTA vers courtier crédit.

---

## 🚫 8. Hors‑Scope (Out of Scope – V1)
- **Édition / Génération de Devis Artisans** – laissée aux professionnels.
- **Gestion des stocks en temps réel des fournisseurs** – réservée à la Phase 3 (National).
- **Paiement des acomptes travaux sur la plateforme** – non géré en V1.
- **Recrutement d’une force de vente salariée interne** – uniquement réseau freelance.

---

## 📋 9. Plan d'Action & Phasage Technique

1. **Extension Phase 5.6 (Simulateur)** :
   - Brancher l'API `mesaides.france-renov.gouv.fr/api/v1/` via un proxy Nitro `/api/v1/aides-reno` (pas d'appel client direct, ne pas modifier `computeEstimate()`) pour enrichir les estimations avec les barèmes d'État.
2. **Préparation Schema BDD (Phase 7 - Pivot B2B)** :
   - Ajouter la table Supabase `documents_artisan` et les colonnes `is_available_subcontracting` et `workforce_size` sur `professionals`.
