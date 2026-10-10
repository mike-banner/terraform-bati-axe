# Runbook — Bascule en production chez le client

> **Statut : à exécuter UNIQUEMENT sur demande explicite de Mike.** Rien de ce document n'a été appliqué en prod.
> Rédigé le 2026-10-10 d'après l'état réel du dev (Cloudflare Pages `bati-axe-dev-dev`, Supabase cloud) et les
> incidents rencontrés. Les éléments marqués **[À VÉRIFIER]** n'ont pas pu être confirmés depuis le dev.
> Stripe (paiement des pros) est volontairement **en dernier** : voir `docs/P3-STRIPE-RETEST-RUNBOOK.md`.

## 0. Règles de conduite (à relire avant toute action)

- **Ne rien déployer, ne rien appliquer, ne rien pousser en prod sans « GO » explicite** de Mike, étape par étape.
- **Tout push de `terraform/**` sur `dev` lance `terraform apply -auto-approve`** (workflow `terraform-dev.yml`).
  Le workflow de prod (`terraform-prod.yml`) est, lui, **manuel** (`workflow_dispatch`).
- **La base Supabase cloud est aujourd'hui PARTAGÉE dev/prod** (même projet `xpwoczcbyamnjknloxgz`, `PROD_TF_VAR_SUPABASE_URL`
  pointe dessus). Toute migration ou suppression de données y touche la prod. Voir §2 (décision à prendre).
- Un secret posé sur Cloudflare Pages **ne s'applique qu'aux nouveaux déploiements** : relancer un déploiement après chaque changement.
- Ne jamais lancer `pkill -f "<motif>"` avec un motif présent dans la propre commande (tue le shell).

## 1. Comptes, jetons et accès (client)

| Élément | Où | Détail |
|---|---|---|
| Compte Cloudflare du client | secret GitHub `PROD_CLOUDFLARE_ACCOUNT_ID` | **[À VÉRIFIER]** différent du compte perso `711bef70…` ? |
| Jeton API Cloudflare (Terraform) | secret `PROD_CLOUDFLARE_API_TOKEN` | Doit avoir : Pages (Modifier), DNS (Modifier) si domaine géré, **Workers R2 Storage : Modifier** (sinon `403 Authentication error` sur la création des buckets). Modifier le jeton via https://dash.cloudflare.com/profile/api-tokens → crayon → « + Ajouter plus » → Compte → Workers R2 Storage → Modifier. **Ne pas « rouler » le jeton** (la valeur changerait). |
| Test du jeton R2 | terminal | `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets` → doit renvoyer **200**. |
| État Terraform | bucket R2 `terraform-state-bati-axe` (clé `prod/terraform.tfstate`) | Accès via `PROD_CF_R2_ACCESS_KEY_ID` / `PROD_CF_R2_SECRET_ACCESS_KEY`. |
| Dépôt GitHub / Pages | `mike-banner/terraform-bati-axe` | Branche de production Pages = **`main`** (voir §3). |

## 2. Base de données Supabase (DÉCISION À PRENDRE)

**Problème :** dev et prod partagent la même base. Avant d'ouvrir au client :
1. **Décider** : base dédiée à la prod (recommandé) ou nettoyage de la base partagée.
2. Si **base dédiée** : le module `terraform/modules/supabase_project` sait la créer (`create_supabase = true`, nécessite `TF_VAR_SUPABASE_ACCESS_TOKEN` et `TF_VAR_SUPABASE_ORGANIZATION_ID`, présents). Puis :
   - lier : `npx supabase link --project-ref <nouveau_ref>` ;
   - **appliquer TOUTES les migrations** : `npx supabase db push --linked --dry-run` (vérifier la liste) puis `npx supabase db push --linked` ;
   - mettre à jour les secrets `PROD_TF_VAR_SUPABASE_URL`, `PROD_TF_VAR_SUPABASE_ANON_KEY`, `PROD_TF_VAR_SUPABASE_SERVICE_ROLE_KEY`, `PROD_TF_VAR_EXISTING_DATABASE_URL` (clé **service_role** et non anon ; l'oubli d'une valeur correcte a causé un `500` « Missing server key » sur le dev).
3. **Extensions requises** : `postgis`, `pg_cron`, `pgcrypto`, `uuid-ossp`.
4. **Tâches pg_cron attendues** (toutes `0 * * * *`) : `auto-unlock-leads-48h`, `expire-artisan-documents`, `expire-rge-status`. Vérifier : `select jobname, schedule from cron.job;`.
5. **Migrations récentes (appliquées au dev le 2026-10-09)** : `20260915` (professional_type + selected_*), `20260916` (egb_status), `20260917` (categories_reviewed_at + verrou EGB), `20260918` (RLS `professionals` en lecture seule + verrou `verifications`), `20260919` (rge_status + cron). Procédure : dry-run → liste exacte → GO → push → `migration list --linked` sans écart → régénérer les types (`npx supabase gen types typescript --linked > app/types/database.types.ts`).
6. **Auth Supabase** : en local les confirmations d'e-mail sont désactivées ; **[À VÉRIFIER]** le réglage en prod (e-mail de confirmation, URL de redirection du site, SMTP/Resend, templates brandés → phase 06.4/10).
7. **Données à créer** : zones actives (`zones` : 4 zones des Yvelines, codes postaux), compte admin (voir §7).
8. **Données de test à purger avant ouverture** : 31 projets de test dans `projects`, comptes `*.test`, `e2e.*`, `admin@bati.com`.

## 3. Branches et déploiement du code

- `main` est **~95 commits en retard sur `dev`**. Cloudflare Pages construit la production depuis `main`.
- Procédure : PR `dev` → `main` (ne rien fusionner sans GO), vérifier le build, puis laisser Pages déployer.
- Le dev doit rester autonome : ne pas casser `dev.bati-axe.fr`.

## 4. Terraform de production (`terraform/environments/prod`)

Lancer **manuellement** : GitHub → Actions → « Terraform Production » → Run workflow. Ce workflow crée :
projet Pages + variables d'environnement, buckets R2 + CORS (module `r2_storage`), domaine personnalisé.

### 4.1 R2 — ordre à respecter (œuf et poule)
1. Le module **crée** `batiaxe-public-prod`, `batiaxe-vault-prod`, `batiaxe-b2b-prod` (noms par défaut de `modules/platform/variables.tf`, aussi fournis par les secrets `PROD_R2_BUCKET_PUBLIC/VAULT/B2B` : **les deux doivent être identiques**). Il n'y a **pas d'import** en prod (les buckets n'existent pas) : ne pas copier `environments/dev/imports.tf`.
2. CORS posé automatiquement : `https://<projet>.pages.dev` + le domaine personnalisé (`environment_domains` du workflow) ; **pas de `localhost` en prod**. Ajouter ici tout autre domaine qui doit envoyer des fichiers.
3. Créer ensuite le **jeton R2 applicatif** (« Object Read & Write », limité aux 3 buckets prod) → secrets `PROD_R2_APP_ACCESS_KEY_ID` / `PROD_R2_APP_SECRET_ACCESS_KEY`, puis **relancer** « Terraform Production » pour propager aux variables Pages, puis redéployer.
4. Les buckets restent **privés** : logos servis par `/api/v1/pro/logo/[slug]`, documents par URL présignées. Ne pas activer l'accès public.
5. Test : dépôt d'un Kbis, d'une attestation RGE et d'un logo (voir §9). « Erreur réseau (CORS…) » = bucket inexistant ou origine absente du CORS.

### 4.2 Variables Pages à vérifier après apply
`NUXT_SUPABASE_SECRET_KEY` (**clé service_role ; absente de l'ancien projet prod `bati-axe-production`, qui n'avait que `SUPABASE_SERVICE_ROLE_KEY`, non lue à l'exécution**), `SUPABASE_URL`, `SUPABASE_KEY`, `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `DATABASE_URL`, `NUXT_R2_*` (compte, clés, 3 buckets + `NUXT_R2_BUCKET_NAME`), `NUXT_RESEND_API_KEY`, `NUXT_EMAIL_FROM`, `NUXT_ONBOARDING_EMAILS`, `NUXT_TURNSTILE_SECRET_KEY`, `NUXT_PUBLIC_SITE_URL` (= `https://bati-axe.com`), `NUXT_STRIPE_*` (en dernier). Lister (sans valeurs) : `npx wrangler pages secret list --project-name <projet>`.

### 4.3 Variables MANQUANTES dans Terraform (à ajouter avant la prod)
- **`NUXT_ADMIN_EMAIL`** : absent de `modules/platform/main.tf` (`env_vars`). Sans elle, les alertes admin (nouvelle inscription, SIRET non confirmé) sont ignorées sans erreur. À ajouter (variable + secret GitHub).
- **`NUXT_CRON_SECRET`**, **`NUXT_PUBLIC_TURNSTILE_SITE_KEY`**, variables e-mail par expéditeur (`NUXT_EMAIL_FROM_NO_REPLY`, `_NOTIFICATIONS`, `_CONTACT`) : **[À VÉRIFIER]** présentes dans `nuxt.config.ts`, absentes de `env_vars`.
- Règle projet : toute nouvelle variable est documentée dans `.env.example` immédiatement.

## 5. Tâches planifiées GitHub (inactives aujourd'hui)

Les workflows `cron-decennale-alerts.yml` (07h00 UTC, alertes J-30/J-7) et `cron-close-expired-tenders.yml` appellent `${{ secrets.CRON_BASE_URL }}/api/v1/cron/...` avec `CRON_SECRET`. **Ces deux secrets n'existent pas** dans le dépôt : à créer (`CRON_BASE_URL` = URL de prod, `CRON_SECRET` identique à `NUXT_CRON_SECRET` côté Pages). Test : `workflow_dispatch` puis vérifier le code HTTP 200.
Le workflow `supabase-keep-alive.yml` pinge la base (secrets `TF_VAR_SUPABASE_URL` / `_ANON_KEY` : **[À VÉRIFIER]**, ils n'existent pas sous ce nom, seuls les `PROD_TF_VAR_*`).

## 6. Domaine, DNS, e-mails

- Domaine du client `bati-axe.com` (workflow prod : `site_url = https://bati-axe.com`) rattaché au projet Pages (Terraform `custom_domain`).
- **E-mails transactionnels** (phase 06.3 / 10) : DNS **DKIM, SPF, DMARC** sur `bati-axe.com`, domaine vérifié chez Resend, Cloudflare Email Routing pour `contact@`, `notifications@`, `no-reply@`. Aujourd'hui l'expéditeur est `onboarding@resend.dev` (test).
- `NUXT_ONBOARDING_EMAILS` : `false` par défaut ; activer seulement une fois le domaine d'envoi validé.

## 7. Administration

- Compte admin générique `admin@batiaxe.com` : rôle `app_metadata.role = 'admin'`. Promotion : `SELECT promote_to_admin('email')` (service_role) ou `node supabase/scripts/reset-admin.mjs`. **`ADMIN_EMAILS` est obsolète.**
- Définir un mot de passe fort propre au client ; supprimer `admin@bati.com` (ancien).
- Valider les pros « Entreprise Générale du Bâtiment » : onglet admin « Entreprises générales » (le code NAF n'est qu'un indice, la décision est humaine).
- Valider les attestations RGE : fiche pro, ligne RGE, date d'expiration obligatoire.

## 8. Sécurité — points acquis et restants

**Acquis (dev, cloud partagé) :** RLS `professionals` en lecture seule (seul `select_own_professional`) ; trigger `trg_guard_professional_admin_fields` (professional_type / egb_status) ; trigger `trg_guard_verification_review_fields` (un pro ne modifie ni statut, ni dates, ni type d'un justificatif) ; `rge_status` calculé par trigger SQL, fonctions `SECURITY DEFINER` non exécutables par `anon`/`authenticated` ; masquage serveur des coordonnées (ADR-004) inchangé ; toutes les écritures sur `professionals` passent par le serveur avec la clé `service_role`, **bornées à `user.id`** (`profile/me.patch.ts`).

**À traiter / vérifier avant l'ouverture :**
- **Expiration de la décennale** : job `expire-decennale-status` (migration `20260920`, à appliquer avec les autres) — vérifier qu'il figure dans `select jobname from cron.job;`. Une approbation admin sans date d'expiration reste « valide » indéfiniment (voulu).
- Politiques côté pro auditées le 2026-10-10 : `consents` en lecture seule, `completed_projects` (écriture permise, `is_showcased` réservé à l'admin par trigger), `verifications` verrouillée — via la migration `20260920`, à appliquer.
- Toute nouvelle écriture serveur sur `professionals` doit utiliser le service role (un `UPDATE` avec le jeton du pro ne modifie **aucune ligne, sans erreur** : défaut déjà rencontré, test de non-régression `tests/unit/profile-patch-service-role.test.ts`).
- Turnstile (anti-spam) : clés de prod à créer côté client (`PROD_TURNSTILE_SECRET_KEY`, `NUXT_PUBLIC_TURNSTILE_SITE_KEY`).

## 9. Test de fumée après déploiement (à rejouer en prod, comptes de test jetables)

1. Inscription spécialiste puis EGB (`/pro/claim`) : choix du type, 1–2 métiers (spécialiste) / jusqu'à 9 (EGB), claim sans erreur 500.
2. Étape « Documents » : dépôt Kbis, décennale ; carte **RGE facultative** présente uniquement si « Rénovation énergétique » est coché.
3. Profil : modifier présentation, téléphone, zone, métiers ; recharger ; vérifier en base. Ajouter/retirer « Rénovation énergétique » → le module RGE du dashboard apparaît/disparaît.
4. Logo : envoi → `logo_url` = `https://<site>/api/v1/pro/logo/<slug>?v=…`, image servie (200), affichée sur la page publique.
5. Admin : approuver une attestation RGE (date) → `rge_status = valid` → le chantier « pompe à chaleur seule » devient visible pour ce pro ; après expiration, il disparaît.
6. Simulateur : case « rénovation énergétique » dans Globale/Ciblée ; tunnel d'aides affiché **seulement** s'il y a un poste énergétique.
7. API : `PATCH /api/v1/pro/profile/me` avec `professional_type`, `egb_status`, `is_verified`, `subscription_status` ou `rge_status` → **400**.
8. Tâches planifiées (§5) : 200.
9. Nettoyage des comptes et fichiers de test (base + buckets).

## 10. Décisions produit à faire valider par le client

- **Correspondance des postes réservés aux EGB** (`egbMatches` dans `app/utils/workTypeMatrix.ts`) : pompe à chaleur et géothermie → rénovation énergétique + plomberie ; photovoltaïque → rénovation énergétique + électricité ; démolition → maçonnerie ; assainissement → maçonnerie + plomberie.
- **Projets mixtes** (poste énergétique + autre poste) : visibles en entier pour un pro non RGE retenu par l'autre poste (décision de Mike).
- **Qualification RGE** : statut unique oui/non (pas de RGE par domaine) ; sous-traitance non gérée (l'EGB sans RGE cherche son sous-traitant).
- **Spécialiste 1 à 2 métiers ; EGB plusieurs métiers**, validation admin obligatoire de l'EGB.
- Aucun e-mail n'est envoyé au pro quand il ajoute le métier « Rénovation énergétique » (le module apparaît à l'ouverture du dashboard) : à décider.
- Stripe : paiement des pros **après** application fonctionnelle et premiers leads (via partenaires).

## 11. Nettoyage du dépôt avant la prod

- Supprimer `terraform/environments/dev/imports.tf` une fois l'état du dev à jour (les buckets de dev sont désormais gérés par Terraform).
- Reconstruire le graphe `graphify` si besoin (`graphify . --update`), ne pas le commiter par erreur (`.planning/graphs/*` est modifié localement par un hook).
- Mettre à jour `.planning/STATE.md`, `ROADMAP.md`, `PLAN_DE_VOL.md` (v2.0 / phase 05.19 terminée ; phase 05.21 « Verrou juridique B2B » marquée urgente).

## 12. Retour arrière

- **Code :** redéployer le commit précédent depuis Cloudflare Pages (Deployments → « Rollback »).
- **Base :** les migrations 20260915–20260919 sont additives ; pas de retour arrière automatique. La valeur d'énumération `audit_action = 'egb_decided'` ne peut pas être retirée sans recréer le type.
- **Terraform :** ne jamais `terraform destroy` en prod ; en cas de doute, `terraform plan` en lecture seule d'abord (`-lock=false`).
