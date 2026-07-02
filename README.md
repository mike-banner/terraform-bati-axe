# BÂTI-AXE

Plateforme SaaS dédiée aux artisans du bâtiment.

Ce projet utilise une architecture moderne basée sur **Nuxt 3** (Frontend/Backend Serverless), **Supabase** (Base de données/Auth), et une infrastructure 100% gérée par **Terraform** (GitOps) sur **Cloudflare Pages**.

---

## 🏗️ Architecture Cloud & Infrastructure as Code (IaC)

Toute l'infrastructure de production est gérée comme du code via **Terraform**. Aucun clic manuel n'est requis sur le tableau de bord Cloudflare ou Supabase.

### Structure Terraform (Modèle Multi-Environnements)
Le dossier `terraform/` suit le standard de l'industrie (Séparation Modules / Environnements) :
- `modules/platform` : Contient la logique d'orchestration entre Cloudflare Pages et Supabase (injection des variables `NUXT_PUBLIC_SUPABASE_URL`, etc.).
- `environments/dev` : Environnement de développement (Base de données sandbox).
- `environments/staging` : Environnement de pré-production.
- `environments/prod` : Environnement de production réel.

### 🚀 Pipeline GitOps (CI/CD)
Le déploiement est **100% automatisé** (Continuous Deployment) :
1. Les modifications d'infrastructure dans le dossier `terraform/` sont détectées par **GitHub Actions**.
2. Lors de la fusion d'une Pull Request sur la branche `main`, l'Action GitHub exécute `terraform apply` pour mettre à jour la configuration Cloudflare en direct.
3. L'intégration native Cloudflare/GitHub compile ensuite le projet Nuxt (vers le dossier `dist`) et déploie le site de production.

---

## 💻 Développement Local

### Prérequis
- Node.js (v22+)
- Un compte Supabase (avec le projet Bâti-Axe lié)

### Installation

```bash
# Installer les dépendances
npm install
```

### Variables d'environnement
Créez un fichier `.env` à la racine (ne le commitez jamais) :
```env
NUXT_PUBLIC_SUPABASE_URL="votre_url_supabase"
NUXT_PUBLIC_SUPABASE_KEY="votre_cle_anon_supabase"
SUPABASE_SERVICE_KEY="votre_cle_service_supabase"
```

### Lancement du serveur

Démarrez le serveur de développement sur `http://localhost:3000` :

```bash
npm run dev
```

### Compilation (Build Test)
Avant de pousser sur la branche `main`, vérifiez toujours que le build (Nitro preset Cloudflare) passe correctement :

```bash
npm run build
```
