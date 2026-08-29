# Spec Client : Outils Agents Immobiliers (Home Staging 3D IA, Chiffrage Express & Dossier VIP)

> 📅 **Date de réception** : 28 août 2026  
> 📌 **Rattaché à** : Item **P19 / Prescripteurs Agents Immobiliers** (Valeur Ajoutée & Lead Magnet B2B)  
> 💡 **Objectif Business** : Donner à l'agent immobilier des outils d'aide à la vente (Coup de cœur 3D + Chiffrage post-visite) pour déclencher la vente immobilière et réinjecter les projets de travaux vers le réseau BÂTI-AXE.

---

## 🏡 1. User Stories & Fonctionnalités Agents Immobiliers

### A. Projection Vente & Home Staging IA (Rendu 3D en 5 sec)
> *« En tant qu'agent immobilier, je veux générer en 5 secondes un rendu 3D rénové (Home Staging) à partir d'une simple photo de pièce vétuste, afin d'aider l'acheteur à se projeter et déclencher un coup de cœur lors de la visite. »*

- **Entrée** : Import de photo d'une pièce vétuste depuis le téléphone/PC de l'agent.
- **Moteur IA** : Transformation d'image (IA Style Redesign / ControlNet / Stable Diffusion / Midjourney API).
- **Sortie** : Rendu visuel 3D projeté (Cuisine moderne, Salle de bain rénovée, Pièce de vie épurée).

### B. Chiffrage Express Post-Visite (Chiffreur Flash IA)
> *« En tant qu'agent immobilier, je veux obtenir une estimation enveloppe globale du coût des travaux (Chiffreur Flash IA) directement après la visite, afin de rassurer immédiatement l'acheteur sur la faisabilité financière de son achat. »*

- **Entrée** : Sélection des lots de travaux (Ex: Cuisine 15m² + Peinture 70m² + Électricité).
- **Calculateur** : Enveloppe budgétaire estimative instantanée (min / max HT).

### C. Pack "Dossier Visite VIP" & Prescription (Export PDF 3D + Aides)
> *« En tant qu'agent immobilier, je veux exporter un document PDF personnalisé comprenant le visuel 3D, le chiffrage estimatif et la simulation des aides d'État, afin d'offrir un dossier complet à l'acheteur et réinjecter le lead de travaux directement vers les artisans certifiés BÂTI-AXE. »*

- **Génération PDF** : Synthèse 1-Page (Visuel 3D + Chiffrage Flash + Subventions MaPrimeRénov' via API Mes Aides Réno + Coordonnées de l'Agent).
- **Injection Lead BÂTI-AXE** : Envoi du dossier qualifié vers le réseau d'artisans certifiés de la zone (déclenche la commission d'apport d'affaires).

---

## 📌 2. Rattachement au Plan de Vol GSD

- **Phase 1 (Pilote 78 v1.0)** : Offre Partenaires B2B standard sur `/b2b/partenaires` (Phase 05.17 / 05.18).
- **Phase P19+ (v2.0)** : Intégration du module Home Staging 3D IA & Générateur de Dossier VIP PDF pour les agents immobiliers abonnés.
