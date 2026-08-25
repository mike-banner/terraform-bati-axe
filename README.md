# BÂTI-AXE

Plateforme SaaS de mise en relation entre particuliers et professionnels certifiés du bâtiment.

Stack principale : **Nuxt**, **Supabase**, **Cloudflare Pages** et **Cloudflare R2**. L'infrastructure Cloudflare est gérée par Terraform.

## Environnements

| Environnement | Usage | Déploiement | Base de données |
|---|---|---|---|
| `local` | Développement sur le poste | `npm run dev` avec Docker/Supabase local | Supabase local |
| `dev` | Environnement Cloudflare de développement | Push sur la branche `dev` via `terraform-dev.yml` | Base existante via `TF_VAR_EXISTING_DATABASE_URL` |
| `prod` | Future production client | Workflow `terraform-prod.yml` manuel | À confirmer avec les identifiants client |

L'environnement Cloudflare Dev est disponible sur `https://dev.bati-axe.fr` dans le projet Pages `bati-axe-dev`.

La production client n'est pas déclenchée automatiquement. Les identifiants et la configuration de production seront finalisés plus tard.

## Terraform

```text
terraform/
├── modules/                 Modules réutilisables
├── environments/dev/       Environnement Cloudflare Dev
├── environments/staging/   Préproduction prévue, non utilisée actuellement
└── environments/prod/      Configuration de la future production client
```

Le workflow Dev s'exécute uniquement sur un push vers `dev` et réalise :

1. `terraform init`
2. `terraform validate`
3. `terraform plan`
4. `terraform apply`

Le workflow Production est déclenchable uniquement avec `workflow_dispatch`.

## Développement local

### Prérequis

- Node.js `22+` (version du projet : `22.22.1`)
- Docker pour Supabase local

### Installation

```bash
npm install
```

### Variables d'environnement

Copier `.env.example` vers `.env` et renseigner les valeurs locales. Le fichier `.env` ne doit jamais être commité.

### Lancement

```bash
npm run dev
```

### Vérifications

```bash
npm test -- --run
npm run build
```

## Branches

- `dev` : branche de travail et déploiement Cloudflare Dev.
- `main` : branche réservée à la future production client, protégée par Pull Request.
- `feat/*`, `fix/*`, `docs/*` : branches temporaires créées depuis `dev`.

Voir `.planning/GIT_WORKFLOW.md` pour le détail du flux Git.
