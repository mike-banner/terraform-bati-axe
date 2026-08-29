# Spec Client : Synthèse des User Stories de l'Écosystème BÂTI-AXE

> 📅 **Date de réception** : 28 août 2026  
> 📌 **Cartographie Fonctionnelle** : Synthèse des User Stories par Persona (B2C, Artisans BTP, Prescripteurs, Courtiers & Fournisseurs).

---

## 👤 1. Particuliers (Porteurs de projet / B2C)

| User Story | Statut | Rattachement GSD |
| :--- | :--- | :--- |
| **Simulateur Aides & Reste à Charge** : Estimer MaPrimeRénov' & CEE sans engagement. | ✅ **LIVRÉ** | Phase 05.9 (Proxy Nitro + `AidesMiniTunnel`) |
| **Dépôt de Projet Qualifié** : Demande de devis basée sur le reste à charge réel. | ✅ **LIVRÉ** | Phase 2 & Phase 4 (Tunnel B2C) |
| **Suivi & Espace Client** : Suivi des devis et validation en ligne. | ✅ **LIVRÉ** | Phase 6 (Espace Client Magic-Link) |

---

## 👷 2. Artisans & Entreprises du BTP (Abonnés SaaS)

| User Story | Statut | Rattachement GSD |
| :--- | :--- | :--- |
| **Visibilité & Leads Locaux 78** : Réception de chantiers qualifiés sur sa zone. | 🚧 **EN COURS** | Phase 05.16 (Packs Zonés 78 - 150€ à 300€) |
| **Switch Capacité Sous-traitance** : Indiquer le nombre d'ouvriers mobilisables. | ✅ **LIVRÉ** | Phase 05.11 (`is_available_subcontracting`, `workforce_size`) |
| **Coffre-Fort Administratif** : Déposer KBIS/URSSAF/Décennale & Badge Certifié. | ✅ **LIVRÉ** | Phase 05.11 (Table `documents_artisan` + auto-suspension) |

---

## 📐 3. Prescripteurs & Partenaires (Architectes, Diagnostiqueurs, Syndics)

| User Story | Statut | Rattachement GSD |
| :--- | :--- | :--- |
| **Architectes / Esquisses 3D IA & GANTT** : Génération 3D et suivi de chantier. | 🔴 **v2.0 (Post-Pilote)** | US-ARC-01..04 / Phase 7+ |
| **Diagnostiqueurs / Rapport DPE & Dictaphone** : Dépôt rapide de dossier & préconisations. | 🚧 **EN COURS (v1.0)** | Phase 05.17 (Tunnel `/b2b/partenaires` DPE) |
| **Syndics de Copropriété / PPPT & AG** : Matrice comparatrice devis copro. | 🔴 **v3.0 (Scale)** | Phase B2B Copros |

---

## 💶 4. Courtiers en Financement & Fournisseurs BTP

| User Story | Statut | Rattachement GSD |
| :--- | :--- | :--- |
| **Courtiers en Financement** : Réception des leads travaux avec reste à charge > 10 k€. | 🚧 **EN COURS (v1.0)** | Phase 05.18 (Annuaire `/partenaires/annuaire` & Profils) |
| **Fournisseurs de Matériaux BTP** : Grilles de remises & offres privilèges artisans. | 🔴 **v2.0 (Post-Pilote)** | US-ART-03/04 (Fournisseurs BTP) |
