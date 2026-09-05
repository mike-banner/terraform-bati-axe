# 📄 Spec Client : Benchmark HelloArtisan & Immo-Scan — Évolutions Tunnel & Monétisation Data

> 📅 **Date de réception / Analyse** : 5 septembre 2026  
> 📌 **Rattaché à** : Milestone **v2.0 « Partenaires en scène »** & Phase 05.9 (Extension Simulateur)  
> 🎯 **Objectif** : Adopter les meilleurs patterns UX et monétisation des leaders du marché (HelloArtisan & Immo-Scan) pour maximiser la conversion du tunnel Bati-Axe et la valeur des leads.

---

## 🛠️ 1. Enseignements HelloArtisan (`helloartisan.com/devis-travaux/`)

### A. Sous-tuiles Guidées par Métier (Anti-ambiguïté)
- **Principe** : Lors du choix d'un métier (ex: Chauffage), l'interface propose immédiatement 4 sous-tuiles précises (*Pompe à chaleur / Poêle / Chaudière / Radiateurs*).
- **Impact Bati-Axe** : Qualification exacte du lead dès l'entrée. L'artisan sait exactement le matériel et le badge RGE requis.
- **Rattachement** : Exigence `TUNNEL-01` (Évolutions Simulateur).

### B. Question "Projets Complémentaires" (Multiplication de la valeur du lead)
- **Principe** : Avant le Lead Wall, poser la question : *"Avez-vous d'autres travaux prévus dans les 6 prochains mois ? [x] Peinture [x] Électricité [x] Isolation"*.
- **Impact Bati-Axe** : Génération de 2 à 3 leads artisans distincts à partir d'un seul formulaire particulier.
- **Rattachement** : Exigence `TUNNEL-02`.

### C. Validation Téléphone par SMS OTP (Anti-Faux Leads)
- **Principe** : Envoi d'un code PIN par SMS au particulier pour confirmer son numéro de téléphone avant d'émettre le lead.
- **Impact Bati-Axe** : Garantie 100% pour nos artisans abonnés que chaque numéro débloqué est valide et joignable.
- **Rattachement** : Exigence `TUNNEL-03`.

---

## 🏡 2. Enseignements Immo-Scan (`immo-scan.fr/estimateur-immobilier`)

### A. Exploitation Open Data DVF Notaires (Coût 0 €)
- **Principe** : Moteur d'estimation basé sur les transactions notariales publiques DVF (Demande de Valeurs Foncières) pour donner une valeur vénale estimée au m².
- **Impact Bati-Axe** : Afficher la valeur actuelle du bien + la plus-value estimée après rénovation énergétique.
- **Rattachement** : Exigence `IMMO-DVF-01`.

### B. Double Monétisation : Lead Artisans RGE + Lead Vendeur Immo
- **Principe** : Capturer les propriétaires de passoires thermiques (DPE F/G) et leur proposer deux options :
  1. *Faire les travaux* ➔ Lead transmis aux Artisans RGE.
  2. *Vendre le bien en l'état* ➔ Lead Vendeur revendu entre **80 € et 150 €** aux agents immobiliers partenaires.
- **Rattachement** : Exigence `IMMO-DATA-01..03`.

---

## 🧭 3. Planning d'Intégration ROADMAP v2.0

| Exigence | Intitulé Fonctionnel | Phase ROADMAP Cible | Statut |
| :--- | :--- | :--- | :--- |
| **`TUNNEL-01`** | Sous-tuiles guidées par catégorie dans le simulateur. | Phase 05.9 (Évolution UI) | 📝 Cadré |
| **`TUNNEL-02`** | Question multi-projets ("Projets complémentaires"). | Phase 05.9 (Lead Wall) | 📝 Cadré |
| **`TUNNEL-03`** | Validation téléphone par SMS OTP avant émission du lead. | Phase 10 (Rattrapage SMS/Auth) | 📝 Cadré |
| **`IMMO-DVF-01`** | Estimateur DVF Notaires + Plus-value revente post-DPE. | Phase 7 / 05.9 (Aides & Data) | 📝 Cadré |
