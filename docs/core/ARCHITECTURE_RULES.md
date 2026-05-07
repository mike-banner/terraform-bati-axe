# 🏗️ ARCHITECTURE RULES — BÂTI-AXE

## Rule 008 — Séparation Vitrine / App
- **Vitrine (batiaxe.fr)** : Générée par Astro. Doit rester statique au maximum. Communication avec Supabase uniquement pour l'envoi des formulaires (Simulateur).
- **App (app.batiaxe.fr)** : Gérée par Next.js. Authentification obligatoire. Gestion de la logique métier lourde.

## Rule 009 — Le Verrou (Floutage)
- Toute donnée de contact client (`phone`, `email`, `full_name`) doit être masquée par défaut dans les résultats de recherche/listes.
- Le démasquage est conditionné par :
    1. Le statut de l'abonnement du pro (Stripe `active`).
    2. OU l'expiration d'un délai de 24h après création du lead.

## Rule 010 — Stockage Cloudflare R2
- Les documents sensibles (Décennales) ne doivent **pas** être stockés dans Supabase.
- Utilisation exclusive de Cloudflare R2 pour minimiser les coûts de sortie de données (Egress).

## Rule 011 — Masse Critique (Annuaire)
- Les 7 000 contacts importés sont affichés avec un badge "Profil en attente de vérification / À revendiquer".
- Un pro ne peut pas modifier son profil importé sans avoir validé son identité et sa décennale.

---

## Rule 012 — SMS Teasing
- L'envoi de SMS Twilio est déclenché par un Cloudflare Worker ou Supabase Edge Function dès qu'un projet est qualifié.
- Le SMS ne doit contenir aucune donnée floutée, seulement les données alléchantes (Budget, Métier, Ville).
