# modules/r2_storage/variables.tf
# Buckets R2 de l'application (05.14 : 3 buckets isolés) + règles CORS pour les envois directs
# depuis le navigateur (URL présignées : le PUT part du site vers *.r2.cloudflarestorage.com).

variable "account_id" {
  description = "ID du compte Cloudflare"
  type        = string
}

variable "buckets" {
  description = "Buckets à créer, par rôle : public (logos, portfolio), vault (KBIS, décennale, RGE, CNI), b2b (CCTP, devis)"
  type = object({
    public = string
    vault  = string
    b2b    = string
  })
}

variable "allowed_origins" {
  description = "Origines autorisées à envoyer des fichiers (URL du site, domaine personnalisé, localhost hors prod)"
  type        = list(string)

  validation {
    condition     = length(var.allowed_origins) > 0 && alltrue([for o in var.allowed_origins : can(regex("^https?://[^/]+$", o))])
    error_message = "Chaque origine doit être de la forme https://domaine ou http://domaine:port, sans chemin ni barre finale."
  }
}

variable "location" {
  description = "Indication de localisation des buckets (wnam, enam, weur, eeur, apac, oc) ; vide = automatique"
  type        = string
  default     = "weur"
}
