output "bucket_names" {
  description = "Noms des buckets créés, par rôle"
  value       = { for k, b in cloudflare_r2_bucket.this : k => b.name }
}
