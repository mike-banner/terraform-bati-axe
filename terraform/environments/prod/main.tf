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
  umami_url                  = var.umami_url
  umami_website_id           = var.umami_website_id
  stripe_secret_key          = var.stripe_secret_key
  stripe_price_id            = var.stripe_price_id
  stripe_webhook_secret      = var.stripe_webhook_secret
  r2_account_id              = var.r2_account_id
  r2_access_key_id           = var.r2_access_key_id
  r2_secret_access_key       = var.r2_secret_access_key
  r2_bucket_name             = var.r2_bucket_name
  r2_bucket_public           = var.r2_bucket_public
  r2_bucket_vault            = var.r2_bucket_vault
  r2_bucket_b2b              = var.r2_bucket_b2b
  resend_api_key             = var.resend_api_key
  email_from                 = var.email_from
  onboarding_emails          = var.onboarding_emails
  turnstile_secret_key       = var.turnstile_secret_key
  site_url                   = var.site_url
  supabase_region            = var.supabase_region
  environment_domains        = var.environment_domains
}
