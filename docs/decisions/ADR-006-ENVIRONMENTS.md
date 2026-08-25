# ADR-006 : Stratégie d'Environnements (CI/CD)

- **Date** : 2026-08-25
- **Statut** : Accepted
- **Auteurs** : @mike

## Contexte

BÂTI-AXE doit permettre le développement local et la vérification d'une version distante sans risquer de déclencher la future production client. La production client sera configurée plus tard, lorsque ses identifiants Cloudflare, Supabase et services externes seront disponibles.

## Décision

Le projet distingue trois environnements. Seuls `local` et `dev` sont utilisés aujourd'hui.

### 1. Local

- **Outil** : Nuxt avec Supabase CLI et Docker.
- **Usage** : développement quotidien, tests et migrations locales.
- **Base** : Supabase local.
- **Secrets** : fichier `.env` local, jamais commité.

### 2. Cloudflare Dev

- **Branche** : `dev`.
- **Workflow** : `.github/workflows/terraform-dev.yml` sur push vers `dev`, ou lancement manuel.
- **Hosting** : Cloudflare Pages, projet `bati-axe-dev`.
- **Domaine** : `https://dev.bati-axe.fr`.
- **Base** : base existante fournie par `TF_VAR_EXISTING_DATABASE_URL`. Aucune base Supabase Dev séparée n'est créée pour le moment.
- **Services** : clés de test pour Stripe et services applicatifs configurés dans les secrets GitHub.
- **Turnstile** : désactivé dans cet environnement.

### 3. Production client

- **Branche** : `main`, protégée par Pull Request.
- **Workflow** : `.github/workflows/terraform-prod.yml`, manuel uniquement tant que la configuration client n'est pas prête.
- **Hosting** : futur projet Cloudflare Pages de production.
- **Domaine et base** : à confirmer avec les identifiants client.
- **Services** : clés de production à configurer au moment du transfert.

Le dossier Terraform `environments/staging` est conservé comme fondation pour une préproduction future, mais il n'est pas le chemin de déploiement actif actuellement.

## Conséquences

- Les développements courants sont poussés vers `dev` et peuvent être vérifiés sur Cloudflare.
- Un push vers `dev` ne déclenche pas la production client.
- La base utilisée par Dev est actuellement la base existante : les données ne sont donc pas isolées de la production applicative. Cette situation est temporaire et doit être revue avant un pilote avec de vrais utilisateurs.
- La production client nécessite une Pull Request vers `main` et une exécution manuelle validée.

## Vérification du 2026-08-25

Le workflow Terraform Dev a été exécuté avec succès : `init`, `validate`, `plan` et `apply`. Le projet Cloudflare `bati-axe-dev` et le domaine `dev.bati-axe.fr` sont opérationnels.
