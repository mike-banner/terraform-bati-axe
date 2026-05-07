# ADR-005 : Exit Strategy & Migration AWS (Scale Phase)

- **Date** : 2026-05-07
- **Statut** : Accepted
- **Auteurs** : @mike, @antigravity

## Contexte
BÂTI-AXE utilise Supabase en Phase 1 pour sa vélocité (BaaS). Cependant, si la plateforme atteint une "autre dimension" (ex: Serie B, +10M€ ARR, trafic massif, exigences de compliance bancaire/assurances), la question de migrer vers une infrastructure 100% AWS (RDS/Aurora, ECS/EKS) se posera.

## Décision : "Vendor Lock-in Mitigation"
Nous structurons l'architecture actuelle pour que la migration vers AWS soit indolore (moins de 2 semaines de sprint).

**Stratégie de Mitigation :**
1. **Base de données** : Supabase **EST** PostgreSQL (standard). Aucune fonction propriétaire fermée. Migration = `pg_dump` vers AWS RDS/Aurora.
2. **Authentification** : Supabase Auth est basé sur le projet Open Source *GoTrue*. Les mots de passe sont hashés en `bcrypt`/`argon2`. Export total possible vers AWS Cognito ou Auth0.
3. **Stockage** : Déjà mitigé (ADR-003). Nous utilisons Cloudflare R2 au lieu de Supabase Storage. Zéro migration de fichiers nécessaire.
4. **API (PostgREST)** : Si nous quittons Supabase, nous perdrons les API auto-générées.
   *Mitigation* : Toute la logique critique doit être encapsulée dans des Server Actions Next.js ou des Edge Functions. Le client (Astro/Next) ne doit **jamais** écrire de requêtes complexes via le SDK client Supabase.

## Conséquences
- **Positives** : Nous profitons de la vitesse de Supabase aujourd'hui sans hypothéquer le futur.
- **Négatives** : Impose une discipline stricte (ne pas abuser des features propriétaires Supabase non-exportables).

## Alternatives
- **Démarrer sur AWS RDS aujourd'hui** : Rejeté. Gérer un VPC, des Security Groups, RDS, Cognito et API Gateway au jour 1 pour une startup demande un ingénieur DevOps dédié et ralentit le Go-To-Market de 40%.
