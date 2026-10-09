# Adoption des buckets R2 de dev créés à la main le 2026-10-09 (wrangler r2 bucket create + cors set).
# Sans ces blocs, `terraform apply` tenterait de recréer des buckets qui existent déjà.
# À SUPPRIMER une fois l'état à jour (un import déjà appliqué est sans effet, mais le fichier devient inutile).
# Seuls les buckets sont importés : la ressource cloudflare_r2_bucket_cors (fournisseur 5.21.1) ne supporte pas
# l'import ; ses règles sont simplement (re)posées par l'apply, à valeurs identiques (idempotent).
# Identifiants : <account_id>/<nom_du_bucket>/<juridiction>. Les valeurs sont figées ici (import ne supporte pas
# les variables avant Terraform 1.6) ; ne concerne que le dev, la prod créera ses buckets normalement.

import {
  to = module.platform.module.r2_storage.cloudflare_r2_bucket.this["public"]
  id = "711bef7095122fdf531555b64f8256e8/batiaxe-public-dev/default"
}
import {
  to = module.platform.module.r2_storage.cloudflare_r2_bucket.this["vault"]
  id = "711bef7095122fdf531555b64f8256e8/batiaxe-vault-dev/default"
}
import {
  to = module.platform.module.r2_storage.cloudflare_r2_bucket.this["b2b"]
  id = "711bef7095122fdf531555b64f8256e8/batiaxe-b2b-dev/default"
}
