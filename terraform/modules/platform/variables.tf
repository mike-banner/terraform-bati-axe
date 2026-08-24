# variables.tf
# Centralise toutes les variables d'entrée du module racine.
# Les valeurs sensibles (tokens, IDs) ne doivent JAMAIS avoir de default ici :
# Les valeurs sensibles (tokens, IDs) ne doivent JAMAIS avoir de default ici :
# Terraform les demandera en interactif ou les lira depuis TF_VAR_* en CI.

variable "environment" {
  description = "Nom de l'environnement (ex: dev, staging, production)"
  type        = string
}

variable "create_supabase" {
  description = "Si false, Terraform ne provisionnera pas de nouveau projet Supabase (utile pour la prod existante)"
  type        = bool
  default     = true
}

variable "existing_database_url" {
  description = "URL de la base de données existante (si create_supabase = false)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Token API Cloudflare avec les permissions Pages:Edit et Zone:Read"
  type        = string
  sensitive   = true # Masque la valeur dans les logs Terraform
}

variable "cloudflare_account_id" {
  description = "ID du compte Cloudflare (visible dans l'URL du dashboard)"
  type        = string
}

variable "project_name" {
  description = "Nom de base du projet Cloudflare Pages (ex: bati-axe-dashboard)"
  type        = string
  default     = "bati-axe"
}

variable "github_owner" {
  description = "Organisation ou utilisateur GitHub propriétaire du dépôt source"
  type        = string
}

variable "github_repo_name" {
  description = "Nom du dépôt GitHub contenant le code source de l'application"
  type        = string
}

# ─── Supabase ───────────────────────────────────────────────────────────────

variable "supabase_access_token" {
  description = "Token d'accès personnel Supabase (Management API) — généré dans app.supabase.com > Account > Access Tokens"
  type        = string
  sensitive   = true
}

variable "supabase_organization_id" {
  description = "ID de l'organisation Supabase cible (visible dans l'URL du dashboard)"
  type        = string
}

variable "supabase_database_password" {
  description = "Mot de passe de la base de données PostgreSQL (géré via CI)"
  type        = string
  sensitive   = true
}

variable "supabase_url" {
  description = "URL de l'API Supabase (ex: https://xxxx.supabase.co) — visible dans Project Settings > API"
  type        = string
}

variable "supabase_anon_key" {
  description = "Clé anonyme Supabase (gérée via CI)"
  type        = string
  sensitive   = true
}

variable "supabase_service_role_key" {
  description = "Clé service role Supabase (gérée via CI)"
  type        = string
  sensitive   = true
}

# ─── Région Supabase ────────────────────────────────────────────────────────

variable "supabase_region" {
  description = "Région Supabase des projets créés (ex: eu-west-3 pour Paris)"
  type        = string
  default     = "eu-west-3"
}

# ─── Domaines par workspace ─────────────────────────────────────────────────

variable "umami_url" {
  description = "URL publique de l'instance Umami"
  type        = string
}

variable "umami_website_id" {
  description = "Identifiant public du site dans Umami"
  type        = string
}

variable "environment_domains" {
  description = "Mapping workspace → domaine personnalisé (laisser vide pour désactiver le domaine custom)"
  type        = map(string)
  default = {
    dev        = "dev.bati-axe.fr"
    staging    = "staging.bati-axe.fr"
    production = "bati-axe.fr"
  }
}
