# main.tf
# Point d'entrée du module racine. Crée un projet Supabase et un projet
# Cloudflare Pages pour le workspace actif, puis injecte l'URL de la base
# de données dans les variables d'environnement de Cloudflare.
#
# Ordre de dépendance garanti par Terraform :
#   supabase_project → (database_url) → cloudflare_pages (env_vars)
#
# Exemples :
#   environment = "dev"        → bati-axe-dev (Supabase + CF Pages)
#   environment = "staging"    → bati-axe-staging
#   environment = "production" → bati-axe-production

# ─── Module Supabase ─────────────────────────────────────────────────────────

module "supabase_project" {
  source = "../supabase_project"
  count  = var.create_supabase ? 1 : 0

  project_name      = "${var.project_name}-${var.environment}"
  organization_id   = var.supabase_organization_id
  database_password = var.supabase_database_password
  region            = var.supabase_region
}

# ─── Module Cloudflare Pages ─────────────────────────────────────────────────

module "cloudflare_pages" {
  source = "../cloudflare_pages"

  account_id       = var.cloudflare_account_id
  project_name     = "${var.project_name}-${var.environment}"
  github_owner     = var.github_owner
  github_repo_name = var.github_repo_name

  # Domaine personnalisé selon le workspace (lookup retourne "" si clé absente → pas de domaine)
  custom_domain = lookup(var.environment_domains, var.environment, "")

  env_vars = {
    DATABASE_URL                  = var.create_supabase ? module.supabase_project[0].database_url : var.existing_database_url
    SUPABASE_URL                  = var.supabase_url
    NUXT_PUBLIC_SUPABASE_URL      = var.supabase_url
    SUPABASE_KEY                  = var.supabase_anon_key
    NUXT_PUBLIC_SUPABASE_KEY      = var.supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY     = var.supabase_service_role_key
  }
}
