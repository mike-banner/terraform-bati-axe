# 📄 Template : Cahier des Charges & Synthèse IA Client
> **Nom du fichier préconisé** : `YYYYMMDD-[SUJET_COURT]-SPEC_CLIENT.md` (ex: `20260806-BATI_AXE-NOUVELLE_FEATURE.md`)

---

## 📌 Metadata du projet
- **Projet** : {{NOM_DU_PROJET}}
- **Sujet / Fonctionnalité** : {{SUJET_COURT}}
- **Date** : {{YYYY-MM-DD}}
- **Auteur / Client** : {{NOM_DU_CLIENT}}
- **Outil IA utilisé pour le brainstorming** : {{ChatGPT / Claude / NotebookLM / Autre}}

---

## 🎯 1. Vision & Objectif Business
*Résumez en 3 à 5 puces l'intention derrière cette idée ou ce projet.*
- **Problème à résoudre** : 
- **Valeur apportée** : 
- **Indicateur de succès (KPI)** : 

---

## 👤 2. Acteurs & Personas Concernés
*Qui utilise cette fonctionnalité ou cette partie du projet ?*
- [ ] **Particulier / Client final** : 
- [ ] **Professionnel / Artisan / Prestataire** : 
- [ ] **Administrateur / Back-Office** : 

---

## 💡 3. Spécifications Fonctionnelles (User Stories)
*Décrivez le fonctionnement souhaité sous forme d'actions utilisateur.*

### 🔹 3.1 Fonctionnalité Principale : {{TITRE_FEATURE_1}}
- **En tant que** {{PERSONA}}, **je veux** {{ACTION}}, **afin de** {{BÉNÉFICE}}.
- **Règles métier & contraintes** :
  1. {{RÈGLE_1}} (ex: Le montant minimum est de 50€)
  2. {{RÈGLE_2}} (ex: Seuls les profils vérifiés y ont accès)
- **Étapes du parcours** :
  1. Étape 1 : {{DESCRIPTION}}
  2. Étape 2 : {{DESCRIPTION}}
  3. Étape 3 : {{DESCRIPTION}}

### 🔹 3.2 Fonctionnalité Secondaire : {{TITRE_FEATURE_2}} (Si applicable)
- **Description** : 
- **Règles métier** : 

---

## 🖥️ 4. Exigences UI / UX & Parcours Visuel
*Donnez des indications sur le style, les tuiles, les boutons ou la mise en page.*
- **Layout souhaité** : [ ] Mobile-First (Bento Grid, Bottom Bar) [ ] Desktop Dashboard
- **Éléments visuels clés** :
  - {{ÉLÉMENT_1}} (ex: Formulaire en tuiles avec jauge de progression)
  - {{ÉLÉMENT_2}} (ex: Badge de confiance avec couleur de statut)
- **Inspirations / Références** : (Ex: "Comme l'écran de paiement Uber" ou "Style dashboard Shopify")

---

## ⚙️ 5. Données & Intégrations Techniques (Si identifiées)
*Quelles informations doivent être collectées ou envoyées ?*
- **Champs de formulaire requis** :
  - `Champ 1` (Obligatoire / Optionnel)
  - `Champ 2` (Format attendu : Email / Téléphone / Fichier PDF)
- **Services tiers / API souhaités** : (Ex: Stripe, Resend, WhatsApp, Supabase)

---

## 🚨 6. Cas Limites & Ce qu'il NE FAUT PAS FAIRE (Out of Scope)
- ❌ **Hors-scope pour cette version (MVP)** : 
  - {{EXCLUSION_1}}
  - {{EXCLUSION_2}}
- ⚠️ **Cas de panne / Gestion des erreurs** : (ex: Que fait-on si l'utilisateur perd sa connexion réseau ?)

---

## 🤖 Prompt Meta pour le Client (À copier-coller dans votre IA)

```markdown
Act en tant que Lead Product Manager Senior.
Lis l'ensemble de nos échanges précédents et de mes notes de réflexion.
Synthétise toutes mes idées en remplissant STRICTEMENT le template Markdown ci-dessus.
Format de sortie attendu : Fichier Markdown nommé `YYYYMMDD-[SUJET_COURT]-SPEC_CLIENT.md`.
Ne garde que ce qui est décisionnel. Élimine toutes les hésitations et discussions inutiles.
```
