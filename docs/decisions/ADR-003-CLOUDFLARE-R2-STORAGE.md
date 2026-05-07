# ADR-003 : Stockage des Documents Sensibles via Cloudflare R2

- **Date** : 2026-05-07
- **Statut** : Accepted
- **Auteurs** : @mike, @antigravity

## Contexte
BÂTI-AXE fonde sa promesse de confiance sur la vérification des assurances décennales et Kbis. Avec 7 000 professionnels ciblés initialement, le volume de stockage de PDF lourds (souvent des scans mal optimisés) sera important. 
De plus, ces documents devront être lus par les administrateurs pour validation.

## Décision
Utiliser **Cloudflare R2** au lieu du service de stockage intégré Supabase Storage (basé sur AWS S3).

## Justification
Le modèle économique de Cloudflare R2 ne facture pas les coûts de sortie de bande passante (Egress fees = 0$). AWS S3 (et donc Supabase Storage par extension, au-delà de la limite du plan) facture le trafic sortant. Pour un système documentaire, le coût d'egress peut rapidement devenir le poste de dépense d'infrastructure numéro 1 de la startup.

## Implémentation
- La base de données Supabase stocke uniquement la **référence** (URL ou clé) du document dans la table `verifications`.
- L'upload se fait depuis l'application Next.js vers R2 en utilisant des **Presigned URLs** (S3-compatible API) pour ne pas faire transiter les fichiers volumineux par le backend Next.js (bypass).
- L'accès en lecture (par les admins) se fait via des Signed URLs temporaires pour garantir la confidentialité des pièces d'identité et contrats.

## Conséquences
- **Positives** : Coûts de bande passante neutralisés. Haute disponibilité Cloudflare.
- **Négatives** : Ajoute un fournisseur tiers (Cloudflare) à la stack backend, nécessitant une gestion de clés API supplémentaires hors de l'écosystème unifié Supabase.

## Alternatives
- **Supabase Storage** : Plus simple à implémenter car intégré nativement au client JS Supabase et géré par les RLS SQL. Rejeté uniquement pour des raisons de prédictibilité des coûts à grande échelle.
