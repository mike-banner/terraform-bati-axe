# Déclencheur CI/CD de test
module "platform" {
  source = "../../modules/platform"

  environment                = "production"
  create_supabase            = false
  existing_database_url      = var.existing_database_url
  cloudflare_api_token       = var.cloudflare_api_token
  cloudflare_account_id      = var.cloudflare_account_id
  project_name               = var.project_name
  github_owner               = var.github_owner
  github_repo_name           = var.github_repo_name
  supabase_access_token      = var.supabase_access_token
  supabase_organization_id   = var.supabase_organization_id
  supabase_database_password = var.supabase_database_password
  supabase_url               = var.supabase_url
  supabase_anon_key          = var.supabase_anon_key
  supabase_service_role_key  = var.supabase_service_role_key
  supabase_region            = var.supabase_region
  environment_domains        = var.environment_domains
}
