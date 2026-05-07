# ADR-002 : Architecture Dual-Frontend (Astro + Next.js)

- **Date** : 2026-05-07
- **Statut** : Accepted
- **Auteurs** : @mike, @antigravity

## Contexte
BÂTI-AXE a deux objectifs contradictoires :
1. **Acquisition** : Nécessite de générer potentiellement des milliers de pages SEO statiques ultra-rapides (ex: "Artisan Plombier Carrières-sous-Poissy"). Le temps de chargement impacte directement le taux de conversion du simulateur.
2. **Rétention/Monétisation** : Le Dashboard Pro nécessite une application dynamique, hautement interactive, sécurisée, gérant des états complexes (floutage, paiements, upload R2).

## Décision
Séparer physiquement les deux préoccupations :
- **Domaine Principal (`batiaxe.fr`) -> Construit avec Astro.**
  - Typologie : SSG (Static Site Generation) majoritairement.
  - Rôle : Landing pages, Annuaire public (SEO), Simulateur 6 étapes.
  - Interaction Backend : Appels API "Fire-and-Forget" (envoi du lead à Supabase via Worker).
- **Sous-Domaine (`app.batiaxe.fr`) -> Construit avec Next.js (App Router).**
  - Typologie : SSR/CSR (Server-Side/Client-Side Rendering) protégé par Auth.
  - Rôle : Dashboard Pro, gestion profil, paiement Stripe, visualisation leads.
  - Interaction Backend : Connexion directe Supabase avec SSR Auth et RLS stricts.

## Conséquences
- **Positives** : Spécialisation des outils. Astro garantit un Core Web Vitals parfait pour le SEO. Next.js gère la complexité applicative sereinement. Déploiements indépendants (une modif du dashboard ne re-build pas les 10k pages SEO).
- **Négatives** : Duplication potentielle du design system (Tailwind) et de la configuration TypeScript.
- **Mitigation** : Utilisation d'un Monorepo (Turborepo) pour partager les composants UI purs, les schémas Zod et les types Supabase générés.

## Alternatives
- **Next.js SSG complet** : Possible, mais l'hydratation React côté client alourdit inutilement des pages à vocation purement consultatives/SEO par rapport à la "Zero JS architecture" (Islands) d'Astro.
