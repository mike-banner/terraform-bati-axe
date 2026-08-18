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

## 📋 4. Plan d'Action & Phasage Technique

1. **Extension Phase 5.6 (Simulateur)** :
   - Brancher l'API `mesaides.france-renov.gouv.fr/api/v1/` dans `app/utils/calculateur.ts` pour enrichir les estimations avec les barèmes d'État.
2. **Préparation Schema BDD (Phase 7 - Pivot B2B)** :
   - Ajouter la table Supabase `documents_artisan` et les colonnes `is_available_subcontracting` et `workforce_size` sur `professionals`.
