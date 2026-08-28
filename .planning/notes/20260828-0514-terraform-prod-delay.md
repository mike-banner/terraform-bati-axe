# Note — Terraform Prod reporté après v1

**Date** : 2026-08-28
**Phase** : 05.14 Multi-Buckets R2

## Constat
- Les 3 buckets R2 prod (`batiaxe-public-prod`, `batiaxe-vault-prod`, `batiaxe-b2b-prod`) sont **déjà créés** sur le Cloudflare client.
- Le code multi-buckets est mergé dans `dev` et les secrets GitHub sont à jour.
- **Terraform prod ne doit PAS être lancé tant que la v1 n'est pas terminée.** Le déploiement prod est volontairement retardé.

## Action requise
- Ne lancer `terraform-prod.yml` qu'après validation complète de la v1 (post-merge final, tests prod, Stripe re-testé).
- Le workflow Terraform Dev continue de fonctionner normalement sur `dev`.
