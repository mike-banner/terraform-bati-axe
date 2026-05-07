# ADR-004 : Implémentation du Mécanisme "Le Verrou" (Floutage)

- **Date** : 2026-05-07
- **Statut** : Accepted
- **Auteurs** : @mike, @antigravity

## Contexte
Le business model de BÂTI-AXE repose sur la vente d'un accès prioritaire aux leads qualifiés. Les coordonnées du particulier (`phone`, `email`, `full_name`) doivent être masquées aux professionnels non-abonnés (PRO_BASIC) pendant les 24 premières heures, mais visibles instantanément pour les abonnés (PRO_PREMIUM).
Après 24h, le lead devient public (gratuit) pour tous les pros inscrits, afin d'assurer au particulier qu'il sera contacté.

## Décision
L'implémentation du floutage se fera **côté Backend API (Next.js Server Actions / Supabase RPC)** et non uniquement via Supabase Row Level Security (RLS) ou côté Frontend.

## Justification et Mécanisme
Si le floutage est fait dans le frontend, les données circulent en clair sur le réseau (faille critique).
Si le floutage est fait uniquement via RLS, le professionnel ne pourrait tout simplement *pas voir* la ligne du lead dans la base. Or, nous voulons qu'il voie l'existence du lead (budget, ville, urgence) pour créer la frustration (l'effet Teasing) qui pousse à l'abonnement, mais sans les coordonnées de contact.

**Le Flux Technique :**
1. Le composant Next.js appelle une Server Action (ou une View Supabase sécurisée).
2. La logique vérifie l'état de l'abonnement du professionnel demandeur (via Stripe / Supabase `profiles.plan_status`).
3. Elle compare `lead.created_at` avec le Timestamp actuel.
4. Si (NON PREMIUM) ET (< 24h) :
   La réponse JSON transmise au client mute les données de manière irréversible avant envoi :
   `data.phone = "***"`
   `data.email = "contact@***.fr"`
   `data.full_name = "Projet en cours..."`
5. Sinon, les données réelles sont transmises.

## Conséquences
- **Positives** : Sécurité absolue (les données n'atteignent jamais le navigateur). L'effet Teasing est préservé.
- **Négatives** : La logique d'accès est déportée dans l'application ou une vue SQL complexe plutôt que de reposer sur un simple RLS `SELECT` binaire.

## Alternatives
- **Column Level Security (PostgreSQL)** : Complexe à gérer avec Supabase Auth/PostgREST.
- **Frontend Masking** : Totalement proscrit (Violation des règles de sécurité).
