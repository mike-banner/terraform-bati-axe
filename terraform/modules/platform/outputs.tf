# outputs.tf
# Exporte les valeurs utiles après un apply : URLs générées par Cloudflare Pages.
# Ces outputs sont lisibles via `terraform output` en local ou exploitables
# par d'autres modules Terraform via `terraform_remote_state`.

output "pages_project_url" {
  description = "URL principale du projet Cloudflare Pages (*.pages.dev)"
  value       = module.cloudflare_pages.project_url
}

output "pages_custom_domain" {
  description = "Domaine personnalisé configuré sur le projet Pages (si applicable)"
  value       = module.cloudflare_pages.custom_domain
}

output "active_workspace" {
  description = "Workspace Terraform actif au moment de l'apply (dev / staging / production)"
  value       = terraform.workspace
}

output "supabase_project_ref" {
  description = "Référence du projet Supabase créé (identifiant unique)"
  value       = var.create_supabase ? module.supabase_project[0].project_ref : ""
}

output "supabase_api_url" {
  description = "URL de l'API Supabase (NEXT_PUBLIC_SUPABASE_URL)"
  value       = var.create_supabase ? module.supabase_project[0].api_url : ""
}

output "supabase_database_url" {
  description = "URL de connexion PostgreSQL directe — sensible, ne pas exposer publiquement"
  value       = var.create_supabase ? module.supabase_project[0].database_url : var.existing_database_url
  sensitive   = true
}
