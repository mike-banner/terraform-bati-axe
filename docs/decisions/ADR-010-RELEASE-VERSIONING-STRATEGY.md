# ADR-010: Stratégie de Versionnage SemVer, Git Tagging & Release Management

- **Statut** : Accepté
- **Date** : 2026-08-06

## Contexte
BÂTI-AXE a évolué rapidement via des itérations techniques fréquentes. Pour garantir la stabilité en production et des livraisons claires pour les utilisateurs et investisseurs, nous devons structurer les jalons sous forme de versions sémantiques (SemVer) associées à des tags Git immuables.

## Décisions

1. **Convention SemVer (`MAJOR.MINOR.PATCH`)** :
   - `MAJOR` (v1.0, v2.0) : Changement d'étape produit majeure (ex: Lancement MVP Pilote, Scale Multi-villes).
   - `MINOR` (v0.9, v1.1, v1.5) : Livraison d'un groupe de phases complètes ou nouvelle capacité majeure (ex: Mobile App PWA).
   - `PATCH` (v0.9.1, v1.0.2) : Correctif de bug en production ou petite amélioration UI.

2. **Jalons de Releases Produits (Milestones)** :
   - **`v0.1.0`** : Foundation & Compliance (Phases 1 + 2) — *Livré*.
   - **`v0.5.0`** : Marketplace Core (Phases 3, 4, 4.5, 4.6, 5) — *Livré*.
   - **`v0.9.0`** : Experience & Growth Pro (Phases 4.7, 5.5, 5.6, 5.8) — *État actuel*.
   - **`v1.0.0`** : MVP Launch Pilote 78 (Phase 6 - Messagerie & SMS) — *Prochain Jalon*.
   - **`v1.5.0`** : Mobile App PWA & Stores (Phase 8 - Capacitor 6) — *Planifié*.
   - **`v2.0.0`** : Scale & Réputation (Phase 7 - Avis, Parrainage, Multi-Villes) — *Planifié*.

3. **Git Tagging & Release Gate** :
   - Chaque jalon majeur donne lieu à un Tag Git annoté (`git tag -a v0.9.0-beta -m "Release v0.9.0 Experience Pro"`).
   - Une release ne peut être tagguée que si les tests E2E/Vitest passent à 100% et que le build Cloudflare Pages est validé.

4. **Alignement du Planning (`.planning/ROADMAP.md`)** :
   - Les phases unitaires sont désormais regroupées sous des en-têtes de Release (`Milestone v1.0.0`, `Milestone v1.5.0`).

## Conséquences
- Vision claire de la progression vers le lancement commercial.
- Possibilité d'effectuer des rollbacks précis grâce aux tags Git.
- Alignement multi-agents (Antigravity, Claude, Superpowers, GSD).
