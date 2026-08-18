# 📄 Cahier des Charges & Synthèse IA Client

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Architecture PWA Mobile-First & Packaging Stores (App Store / Play Store)
- **Date** : 2026-08-06
- **Auteur / Client** : Client (brainstorming via Antigravity/Gemini, comparaison avec le projet Locaboma)
- **Outil IA utilisé pour le brainstorming** : Gemini (Antigravity)
- **Statut** : Brouillon reformaté et réduit — correspond à la Phase 8 du ROADMAP (release v1.5.0-mobile-app), **non planifiée activement** (dépend de la Phase 6 en cours)

---

## 🎯 1. Vision & Objectif Business
- **Problème à résoudre** : Bâti-Axe n'a aucune installabilité mobile (pas de manifest, pas de Service Worker) ; l'app dépend à 100% du réseau (SSR Cloudflare + requêtes directes Supabase).
- **Valeur apportée** : Meilleure UX mobile (installable, chargement perçu plus rapide), présence potentielle sur les stores pour la crédibilité et l'acquisition.
- **Indicateur de succès (KPI)** : à définir — non chiffré dans le brief initial. Point à clarifier avant exécution (installs PWA ? taux de rebond mobile ? demande explicite d'artisans ?).

---

## 👤 2. Acteurs & Personas Concernés
- [x] **Particulier / Client final** : bénéficie d'un chargement plus rapide / installabilité, usage ponctuel donc impact secondaire.
- [x] **Professionnel / Artisan / Prestataire** : persona principal visé — consultation sur le terrain (4G/5G instable).
- [ ] **Administrateur / Back-Office** : non concerné.

---

## 💡 3. Spécifications Fonctionnelles (User Stories)

### 🔹 3.1 Fonctionnalité Principale : PWA installable et résiliente au réseau
- **En tant qu'** artisan, **je veux** que l'app se charge vite et reste utilisable en cas de coupure réseau ponctuelle, **afin de** consulter mes leads/messages sans être bloqué par une erreur brute.
- **Règles métier & contraintes** :
  1. `@vite-pwa/nuxt` avec stratégie *StaleWhileRevalidate* pour le shell UI et les assets statiques uniquement (pas de queue de mutations offline).
  2. Web App Manifest complet (`display: standalone`, `theme_color`, `icons`, `orientation: portrait`).
  3. Pas de duplication de la couche de masquage serveur (ADR-004) — le cache client ne doit jamais exposer de coordonnées non débloquées.
- **Étapes du parcours** :
  1. L'artisan ouvre l'app, elle se charge depuis le cache si le réseau est lent/coupé (shell + assets déjà visités).
  2. Les données métier (leads, messages) restent en ligne strict — pas de faux positif "à jour" sur des leads obsolètes.
  3. Proposition d'installation ("Ajouter à l'écran d'accueil") sur mobile.

### 🔹 3.2 Fonctionnalité Secondaire : Mobile-First UX Shell
- **Description** : Navigation Bottom Bar sur `< 768px`, Safe Area Insets iOS, touch targets ≥ 44x44px.
- **Règles métier** : cohérent avec le design system existant (ADR/MASTER.md), pas de nouvelle librairie UI.

---

## 🖥️ 4. Exigences UI / UX & Parcours Visuel
- **Layout souhaité** : [x] Mobile-First (Bottom Bar) [ ] Desktop Dashboard (déjà existant, non impacté)
- **Éléments visuels clés** :
  - Bottom Navigation Bar mobile
  - Safe Area Insets iOS (`env(safe-area-inset-top/bottom)`)
- **Inspirations / Références** : Comparaison initiale avec Locaboma (app terrain offline-first) — **écartée comme référence directe**, cas d'usage différent (voir §6).

---

## ⚙️ 5. Données & Intégrations Techniques
- **Services/libs à ajouter** : `@vite-pwa/nuxt` (Service Worker + Manifest).
- **Aucune nouvelle dépendance de stockage local** (pas de Dexie.js/IndexedDB) tant qu'un besoin métier concret ne l'exige pas.

---

## 🚨 6. Cas Limites & Ce qu'il NE FAUT PAS FAIRE (Out of Scope)

- ❌ **Hors-scope pour cette version** :
  - **Queue de mutations offline (Dexie.js / IndexedDB)** — solution calquée sur Locaboma (app de terrain/saisie sans réseau) ; Bâti-Axe est une marketplace de mise en relation, pas un outil de saisie terrain. Un pro doit de toute façon être connecté pour recevoir un nouveau lead ou un message. Complexité non justifiée par le besoin actuel.
  - **Capacitor 6 + publication App Store / Play Store** — engagement de maintenance native permanente (certificats, review Apple, cycles de build) sans validation business (aucune demande utilisateur documentée à ce jour). À ne considérer que si un besoin terrain réel émerge côté artisans, avec KPI à l'appui.
  - **React Native / Expo** — écarté d'emblée, réécriture non justifiée pour ce produit.
- ⚠️ **Cas de panne / Gestion des erreurs** : en cas de coupure réseau, le shell UI reste affichable (cache), mais toute action nécessitant une donnée fraîche (nouveaux leads, envoi de message) doit afficher un état "hors-ligne" explicite plutôt que d'échouer silencieusement ou de servir des données périmées sans le signaler.

---

## 📋 Séquencement (contrainte projet, pas du brief client)
- Ce sujet correspond à la **Phase 8** du ROADMAP (`release v1.5.0-mobile-app`), positionnée après la **Phase 6** (SMS + Acquisition + Messagerie, en cours, 0/TBD) et la Phase 4.7 (terminée).
- **Ne pas démarrer avant la fin de la Phase 6.** Le moteur d'acquisition/messagerie est prioritaire sur l'installabilité mobile.
- Si Capacitor est un jour retenu, il nécessitera un **ADR dédié** (nouvelle couche native, décision structurante au sens d'ADR-008) avant toute implémentation.
