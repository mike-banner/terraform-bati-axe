# Checklist Sécurité — BÂTI-AXE

Audit du 2026-08-18, corrections appliquées le jour même. À revisiter périodiquement (voir section Outils en bas). Complète `.planning/RLS-SECURITY.md` (policies RLS Postgres) — ce document couvre l'app layer (Nitro API, uploads, secrets, logs).

Légende : ✅ corrigé/correct · ⚠️ partiel, geste manuel requis · ❌ non corrigé (nécessite une refonte)

---

## 1. Mots de passe hashés
✅ Délégué entièrement à **Supabase Auth** — aucun hash custom dans le code.
**À revérifier périodiquement** (manuel, pas de fix code) : dashboard Supabase → Auth → Policies, activer *"Leaked password protection"* si pas déjà fait. Aucune MFA sur l'espace admin actuellement.

## 2. Rate limiting login / API
⚠️ **Partiellement corrigé.** Ajouté un rate limit best-effort (5 tentatives / 10 min / IP, `server/utils/rateLimit.ts`) sur `admin/promote.post.ts` — l'endpoint le plus sensible (bootstrap admin par secret). Limite : mémoire par isolate Workers, pas de garantie cross-région — ralentit un brute-force naïf, ne le bloque pas totalement.
❌ Rien sur le login (délégué aux limites internes Supabase Auth, seuil inconnu) ni sur le reste des endpoints `server/api/v1/**`.
**Action manuelle recommandée** : règle Cloudflare Rate Limiting (dashboard → Security → WAF) sur `/api/v1/admin/*` et les routes d'auth — plus fiable qu'une solution applicative sur Workers. Cloudflare Turnstile est autorisé dans la CSP mais jamais branché ; à implémenter sur claim/simulateur si le spam devient un problème, sinon retirer l'autorisation CSP inutile.

## 3. Droits vérifiés côté serveur
✅ 8/8 endpoints admin protégés par `user.app_metadata?.role === 'admin'` (claim JWT posé uniquement via service_role) — cohérent partout.
✅ `admin/promote.post.ts` (bootstrap, ne peut pas dépendre d'un rôle admin déjà existant) : comparaison du secret passée en **timing-safe** (`timingSafeEqual`) au lieu de `!==`, + rate limit (§2).
✅ **Vérifié 2026-08-18** : `ADMIN_BOOTSTRAP_SECRET` **absent** des env vars Cloudflare Pages Production (confirmé par l'utilisateur) — l'endpoint est bien désactivé (404) en prod. Rien à faire.
Note : CLAUDE.md mentionne encore "admin contrôlé par ADMIN_EMAILS (env)" — **périmé**, à corriger dans CLAUDE.md (le code utilise `app_metadata.role` depuis un moment).

## 4. Inputs validés (Zod)
✅ Tous les endpoints POST/PATCH/DELETE utilisent un schema Zod avec `safeParse`.

## 5. Taille max upload
❌ **Non corrigé — nécessite une refonte, pas un fix ponctuel.** Les 3 presign R2 (`documents/`, `logo-`, `realisations/presign.post.ts`) signent une URL PUT sans aucune limite de taille appliquée par R2 lui-même ; seule une limite côté client (5 Mo, contournable) existe pour le logo.
**Pourquoi non corrigé maintenant** : `tests/api/presign-headers.test.ts` interdit explicitement d'ajouter `Content-Length` à la signature — un essai passé a cassé les uploads en prod (`SignatureDoesNotMatch`, voir commentaires dans `logo-presign.post.ts`/`realisations/presign.post.ts`). Le vrai fix (presigned **POST** avec policy `content-length-range`, mécanisme S3/R2 différent d'un PUT signé) change le format de signature ET le code client des 3 flows d'upload (actuellement `fetch(signedUrl, {method:'PUT', body: file})` → passerait à un `FormData` avec les champs de policy). C'est un chantier à part, pas une correction de sécurité isolée — à planifier en phase dédiée si tu veux qu'on le fasse.

## 6. Type de fichier vérifié
✅ **`documents/presign.post.ts` corrigé** : ajout d'un champ `content_type` validé par allow-list Zod (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`) — auparavant aucune vérification, un `.exe` passait comme "document KBIS". Les 3 appelants client (`claim.vue`, `admin/index.vue`, `espace/dashboard.vue`) envoient maintenant `file.type`.
⚠️ Reste une vérification **déclarative uniquement** (le client peut mentir sur `content_type`, aucune inspection des octets réels) — vrai pour les 3 endpoints, y compris `logo-presign.post.ts` qui avait déjà son allow-list. Le commentaire déjà présent dans le code note le risque XSS du SVG en allow-list logo.
❌ Pas de vérification post-upload (magic bytes). Nécessite, comme §5, un mécanisme de validation après coup (webhook R2, ou lecture des premiers octets avant d'exposer publiquement) — hors scope d'une correction rapide.

## 7. console.log propres
✅ **Corrigé** : le bloc `MOCK EMAIL` dans `server/api/v1/projects.post.ts` (qui loggait l'URL du magic link — un token d'accès — **en clair, en toute prod**) est maintenant gardé par `import.meta.dev`. Le `console.log` de debug côté client dans `useIdleLogout.ts` a été retiré.
✅ `server/utils/email.ts` vérifié : déjà correctement gardé par `import.meta.dev`, pas de fix nécessaire.
Reste ~16 `console.log`/`console.error` côté serveur (Nitro logs, jamais exposés au navigateur) — non sensibles, laissés en l'état (utiles pour le debugging opérationnel).

## 8. Erreurs détaillées coupées (pas de leak)
✅ **Corrigé sur les 16 occurrences trouvées.** Nouveau helper `server/utils/safeError.ts` (`serverError(context, err, opts)`) : logue le détail réel côté serveur (`console.error`), renvoie un message générique au client. Appliqué à : `projects.post.ts`, `pro/realisations/{index.get,index.post,[id].delete}.ts`, `pro/claim.post.ts`, `pro/documents/presign.post.ts`, `pro/profile/{logo-presign,me.patch}.post.ts`, `pro/realisations/presign.post.ts`, `stripe/checkout.post.ts`, `projects/[id]/like.post.ts`, `admin/{verify,realisations,projects,promote}.{post,get}.ts`.
Les erreurs de validation Zod (`parsed.error.message`, statusCode 400) sont laissées telles quelles — safe à exposer, ce sont des messages utilisateur.
Le contournement délibéré "400 au lieu de 500 pour éviter le masquage Nuxt" est conservé (toujours utile pour que le client distingue un vrai échec) mais ne fuite plus le détail interne.

## 9. Clés API / .env
✅ `.env`/`.env.*` gitignorés, seul `.env.example` tracké sans valeurs réelles. Aucun secret en dur trouvé.
**À revérifier périodiquement** (manuel) : Cloudflare Pages Production **et** Preview ont bien toutes les variables de `.env.example`, sans valeur de test en prod (`sk_test_...`).

---

## Mise à jour 2026-08-18 (soir) — accès Supabase/Cloudflare obtenu

Le ref projet réel (`xpwoczcbyamnjknloxgz`, trouvé dans `.env` commenté) fonctionne avec le MCP Supabase malgré `list_projects` qui ne le listait pas (bug/scoping du tool, pas un vrai manque d'accès). Advisors relancés avec succès, 3 correctifs appliqués en prod **et** ajoutés en migration versionnée (`supabase/migrations/`) :

- ✅ `promote_to_admin`/`revoke_admin` (SECURITY DEFINER) : `search_path` fixé (`20260818204830_fix_admin_functions_search_path.sql`) — empêchait un search_path-hijack sur ces 2 fonctions à privilèges élevés.
- ✅ `st_estimatedextent` (fonction interne PostGIS, jamais appelée par l'app — grep confirmé) : tentative de retrait de l'exécution publique. **Non résolue malgré 2 essais** (`REVOKE FROM anon,authenticated` puis `REVOKE FROM PUBLIC`, aucun des deux n'a retiré le droit — `has_function_privilege` reste `true`). Cause probable : `ALTER DEFAULT PRIVILEGES` au niveau schéma qui re-grant automatiquement, à investiguer via dashboard Supabase ou support. Risque réel faible (WARN, fonction non sensible, non utilisée).
- ❌ `spatial_ref_sys` (table de référence PostGIS sans RLS, finding ERROR) : `ALTER TABLE` refusé — `must be owner of table spatial_ref_sys` (appartient au rôle propriétaire de l'extension). Nécessite le dashboard Supabase ou le support Supabase, pas accessible via migration SQL classique.
- Non touché, intentionnel : les 7 `rls_enabled_no_policy` (INFO) sur `audit_logs`/`free_lead_grants`/`likes`/`paywall_events`/`projects`/`prospects`/`sms_logs` — tables service-role-only par design (cf `RLS-SECURITY.md`), pas de policy = comportement voulu.
- Non touché : `extension_in_public` (déplacer l'extension postgis — risqué à faire à l'aveugle, prévoir un chantier dédié), `auth_leaked_password_protection` (toggle dashboard uniquement, pas de SQL/API disponible côté MCP).

**Cloudflare** : connecteur authentifié via `/mcp`. Compte confirmé correct (bucket `batiaxe-documents` retrouvé), mais **ce connecteur ne couvre que Workers/D1/KV/R2/Hyperdrive — pas Cloudflare Pages** (`workers_list` vide, outil `migrate_pages_to_workers_guide` présent qui le confirme). Impossible de lister les env vars Pages par ce biais. `ADMIN_BOOTSTRAP_SECRET` vérifié manuellement par l'utilisateur dans le dashboard à la place — absent, confirmé. Les autres valeurs de prod (`sk_test_...` etc.) restent à checker à la main de la même façon si besoin.

**`npm audit fix` — résolu à 14/16 (2026-08-18 soir).** Cause racine du blocage initial confirmée : bug npm **10.8.2** dans Arborist (`#loadPeerSet`), reproductible même sur une réinstallation 100% à froid (pas un souci de lockfile). Contournement : lancer via `npx --yes npm@11 audit fix` (npm 11 via npx, sans toucher à l'install globale). Résultat :
- ✅ 14 vulnérabilités corrigées (`tar`, `@nuxt/devtools`, `postcss`, `svgo`, `body-parser`, `brace-expansion`, `esbuild`, `fast-uri`, `hono`, `ip-address`, `nanoid`, `shell-quote`, `@hono/node-server`, `@nuxt/vite-builder` partiel) — build/tests/typecheck revérifiés verts après coup.
- ✅ **Les 2 restantes (nuxt RCE + vite-builder) sont maintenant corrigées aussi.** `nuxt@4.5.2` cassait le build sous Node 20 (`TypeError: trustedFunctions.difference is not a function` — `nuxt@4.5.2` embarque `rolldown@~1.2.1`, qui utilise `Set.prototype.difference`, une méthode JS disponible seulement à partir de V8/Node 22+). Testé et confirmé : build + tests + typecheck tous verts sous **Node 22.22.1**. `.nvmrc` (22.22.1) et `"engines": {"node": ">=22"}` ajoutés dans `package.json` pour que Cloudflare Pages et tout futur environnement de build utilisent la bonne version automatiquement.
**`npm audit` final : 0 vulnérabilité** (16 → 0).
**Action manuelle restante** : Cloudflare Pages détecte généralement `.nvmrc` automatiquement pour choisir la version Node du build, mais vérifie/pose `NODE_VERSION=22` en variable d'environnement de build (Cloudflare dashboard → Pages → bati-axe → Settings → Environment variables → Build) en filet de sécurité si le premier déploiement après ce merge échoue avec une erreur Node.

## Bonus — trouvé pendant l'audit, positif

- Headers de sécurité (`server/middleware/security.ts`) déjà bien en place : CSP, X-Frame-Options, X-Content-Type-Options, HSTS en prod, Referrer-Policy, Permissions-Policy. Rien à changer.
- `maskLead.ts` (ADR-004) correctement appelé dans tous les endpoints leads/messages concernés.
- Tests (`npx vitest run`) et typecheck (`npx nuxi typecheck`) passent après toutes les corrections ci-dessus — un seul échec pré-existant sans rapport (couleur d'un badge, changement en cours ailleurs dans la session).

---

## Outils à disposition pour ré-auditer régulièrement

| Outil | Ce qu'il couvre | Comment |
|---|---|---|
| **`/code-review` skill (mode `security-review`)** | Diff de la branche courante contre `main` | À lancer avant chaque merge de PR sensible (auth, paiement, upload) |
| **`npm audit`** | Vulnérabilités connues dans les dépendances npm | `npm audit` en local ; absent du pipeline CI actuellement |
| **Supabase Advisors** (MCP `mcp__claude_ai_Supabase__get_advisors`) | RLS manquantes, policies trop permissives, index manquants sur FK | "check les advisors Supabase" — vérifier d'abord que le bon projet est connecté |
| **`gh` + GitHub Advanced Security** | Secret scanning automatique sur chaque push | Vérifier Settings → Code security — pas confirmé activé à ce jour |
| **Cloudflare Dashboard → Security → WAF** | Rate limiting réseau, bot management (complète le §2) | Manuel — à configurer sur `/api/v1/admin/*` et les routes d'auth |
| **`nuxi typecheck`** | Pas de la sécurité à proprement parler, mais des `any` mal gérés côté API cachent souvent des trous de validation | `npx nuxi typecheck` |
| **`npx vitest run`** | Garde anti-régression (ex: `presign-headers.test.ts` qui a évité de recasser l'upload en tentant un fix naïf sur §5) | À lancer après toute modif touchant auth/upload/paiement |

**Rythme suggéré** : `npm audit` + `npx vitest run` à chaque session un peu longue (coûte 10-20 secondes) ; passage complet de cette checklist + Supabase Advisors une fois par mois ou avant chaque mise en prod majeure.

**Non fait, à planifier séparément si voulu** : refonte upload (§5/§6, presigned POST + policy conditions), résolution `npm audit fix`, vérification manuelle Cloudflare/Supabase listée ci-dessus.
