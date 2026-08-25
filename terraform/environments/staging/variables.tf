# variables.tf
# Centralise toutes les variables d'entrée du module racine.
# Les valeurs sensibles (tokens, IDs) ne doivent JAMAIS avoir de default ici :
# Les valeurs sensibles (tokens, IDs) ne doivent JAMAIS avoir de default ici :
# Terraform les demandera en interactif ou les lira depuis TF_VAR_* en CI.

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
  description = "Mot de passe utilisé uniquement si un projet Supabase est créé"
  type        = string
  default     = ""
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

# --- Stripe ---

variable "stripe_secret_key" {
  description = "Clé secrète Stripe"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_price_id" {
  description = "Identifiant du prix Stripe"
  type        = string
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Secret du webhook Stripe"
  type        = string
  default     = ""
  sensitive   = true
}

# --- Cloudflare R2 ---

variable "r2_account_id" {
  description = "Identifiant du compte Cloudflare R2"
  type        = string
  default     = ""
}

variable "r2_access_key_id" {
  description = "Clé d'accès R2 de l'application"
  type        = string
  default     = ""
  sensitive   = true
}

variable "r2_secret_access_key" {
  description = "Clé secrète R2 de l'application"
  type        = string
  default     = ""
  sensitive   = true
}

variable "r2_bucket_name" {
  description = "Nom du bucket R2 de l'application"
  type        = string
  default     = "batiaxe-documents"
}

# --- Email ---

variable "resend_api_key" {
  description = "Clé API Resend"
  type        = string
  default     = ""
  sensitive   = true
}

variable "email_from" {
  description = "Expéditeur des e-mails"
  type        = string
  default     = "BÂTI-AXE <onboarding@resend.dev>"
}

variable "onboarding_emails" {
  description = "Active les e-mails d'onboarding"
  type        = bool
  default     = false
}

variable "turnstile_secret_key" {
  description = "Clé Turnstile"
  type        = string
  default     = ""
  sensitive   = true
}

variable "site_url" {
  description = "URL publique de l'application staging"
  type        = string
  default     = "https://staging.bati-axe.fr"
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
