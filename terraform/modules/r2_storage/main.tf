# modules/r2_storage/main.tf
# Crée les 3 buckets R2 et leurs règles CORS. Les buckets restent PRIVÉS (aucun accès public) :
# les logos sont servis par le proxy serveur /api/v1/pro/logo/[slug], les documents par URL présignées.

terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

locals {
  buckets = {
    public = var.buckets.public
    vault  = var.buckets.vault
    b2b    = var.buckets.b2b
  }
}

resource "cloudflare_r2_bucket" "this" {
  for_each = local.buckets

  account_id = var.account_id
  name       = each.value
  location   = var.location
}

resource "cloudflare_r2_bucket_cors" "this" {
  for_each = local.buckets

  account_id  = var.account_id
  bucket_name = cloudflare_r2_bucket.this[each.key].name

  rules = [
    {
      allowed = {
        origins = var.allowed_origins
        methods = ["PUT", "GET", "HEAD"]
        headers = ["*"]
      }
      expose_headers  = ["ETag"]
      max_age_seconds = 3600
    }
  ]
}
