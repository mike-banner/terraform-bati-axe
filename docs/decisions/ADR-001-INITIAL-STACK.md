# ADR-001 : Stack Technique BÂTI-AXE (Révision)

- **Date** : 2026-05-07
- **Statut** : Accepted
- **Auteurs** : @mike, @antigravity

## Contexte
Le projet BÂTI-AXE nécessite une infrastructure hybride capable de combiner une performance SEO extrême (pour l'acquisition de leads locaux) et une logique métier complexe et sécurisée (pour le dashboard Pro et la gestion des abonnements). Le stockage de milliers de documents PDF (décennales) représente un risque de coût caché important.

## Décision
Utilisation du socle technologique "Best-of-Breed" suivant :
- **Astro** (Hébergé sur Cloudflare Pages) : Pour la vitrine publique, le tunnel de simulation et les pages SEO dynamiques par ville/métier.
- **Next.js 15+** (Hébergé sur Cloudflare Pages via @cloudflare/next-on-pages) : Pour l'application métier protégée (`app.batiaxe.fr`), la logique de floutage et l'intégration Stripe.
- **Supabase (PostgreSQL)** : Comme unique source de vérité (Database, Auth) partagée entre Astro et Next.js.
- **Cloudflare R2** : Pour le stockage des documents (Décennales), évitant les coûts d'egress de AWS/Supabase Storage.
- **Twilio & Resend** : Pour le pipeline critique d'alertes SMS/Email.

## Conséquences
- **Positives** : Vitesse foudroyante en acquisition (Astro SSG), coûts d'infrastructure proches de zéro, sécurité granulaire, coûts de stockage prédictibles (R2).
- **Négatives** : Complexité accrue due à la gestion de deux repositories front-end (ou un monorepo lourd) et la nécessité de partager les types TypeScript générés par Supabase entre Astro et Next.js.

## Alternatives
- **Tout en Next.js** : Rejeté. Le SSR de Next.js, même optimisé, est plus lourd et coûteux à scaler pour des dizaines de milliers de pages SEO locales que la génération statique (SSG) hyper-légère d'Astro.
- **Supabase Storage** : Rejeté pour les documents lourds. Les coûts d'egress pourraient exploser avec 7000 pros uploadant/téléchargeant des PDFs volumineux.
