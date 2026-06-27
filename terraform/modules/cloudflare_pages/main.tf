# modules/cloudflare_pages/main.tf
# Crée un projet Cloudflare Pages connecté à un dépôt GitHub.
#
# Architecture du module :
#  - cloudflare_pages_project : déploie et configure le projet Pages
#  - cloudflare_pages_domain  : attache un domaine custom (conditionnel)
#
# Ce module est réutilisé par les trois workspaces (dev / staging / production)
# via le module racine. Le nom du projet est différencié par workspace pour
# éviter les collisions dans l'interface Cloudflare.

terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

resource "cloudflare_pages_project" "this" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = var.production_branch

  # Connexion au dépôt GitHub source via l'intégration native Cloudflare Pages.
  # Cloudflare déclenche un build automatique à chaque push sur la branche configurée.
  source = {
    type = "github"
    config = {
      owner                          = var.github_owner
      repo_name                      = var.github_repo_name
      production_branch              = var.production_branch
      pr_comments_enabled            = true
      production_deployments_enabled = true

      preview_deployment_setting = "all"
    }
  }

  # Configuration du build Astro/Nuxt (commande et répertoire de sortie)
  build_config = {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = ""
  }

  # Variables d'environnement injectées dans les déploiements production et preview.
  # Utilisées pour passer DATABASE_URL (Supabase) sans fuiter en clair dans le code.
  deployment_configs = {
    production = {
      compatibility_flags = ["nodejs_compat"]
      compatibility_date  = "2024-06-26"
      env_vars = {
        for k, v in var.env_vars : k => {
          type  = startswith(k, "NUXT_PUBLIC_") ? "plain_text" : "secret_text"
          value = v
        }
      }
    }
    preview = {
      compatibility_flags = ["nodejs_compat"]
      compatibility_date  = "2024-06-26"
      env_vars = {
        for k, v in var.env_vars : k => {
          type  = startswith(k, "NUXT_PUBLIC_") ? "plain_text" : "secret_text"
          value = v
        }
      }
    }
  }
}

# Domaine personnalisé — créé uniquement si var.custom_domain est renseigné.
# ponytail: count=0/1 suffit pour un domaine optionnel unique par projet
resource "cloudflare_pages_domain" "custom" {
  count        = var.custom_domain != "" ? 1 : 0
  account_id   = var.account_id
  project_name = cloudflare_pages_project.this.name
  name         = var.custom_domain
}
