# CLAUDE.md — BÂTI-AXE

Guide opérationnel court. Le suivi détaillé (phases, décisions, roadmap) vit dans `.planning/` (GSD) — `STATE.md` en premier.

## Produit
Mise en relation **exclusive** particuliers ↔ artisans certifiés du bâtiment. Stack : **Nuxt 3** (unique, ADR-008), Supabase (auth + Postgres + RLS), déploiement Cloudflare Pages/Workers, Tailwind.

## Invariants à ne jamais casser
- **Masquage serveur (ADR-004)** : les coordonnées d'un prospect sont masquées **côté serveur** (`server/utils/maskLead.ts`). Un pro BASIC non débloqué ne doit jamais recevoir nom/téléphone/email ni rien de géolocalisable. Ne jamais déplacer ce filtrage côté client.
- **Marché dynamique (Phase 4.6)** : les chantiers se lisent en direct depuis `projects` selon `professionals.categories TEXT[]`. Une ligne `leads` n'existe qu'au déblocage/claim. Pas de modèle « push ».
- **Profil non vérifié ≠ 404** : pour un profil existant mais non validé, renvoyer les données avec `is_verified: false`. Réserver 404 aux profils réellement introuvables.

## Patterns de code
- **Route protégée** : `useRequireAuth()` en tête de `<script setup>` (`app/composables/useRequireAuth.ts`). ⚠️ NE PAS utiliser `watchEffect(() => { if (!user.value) navigateTo('/pro/claim') })` — il redirige sur le `null` transitoire de `useSupabaseUser()` à l'hydratation et éjecte un pro connecté au rechargement. Pas de middleware global : `supabase.redirect` est à `false`.
- **Admin** : contrôlé par `ADMIN_EMAILS` (env), pas de table rôles. À ajouter dans `.env` local **et** Cloudflare Pages > Env vars en prod. Check dans `server/api/v1/admin/verify.post.ts` + `app/pages/admin/index.vue`.
- **Nouvelle variable d'env** : la documenter immédiatement dans `.env.example` (seul fichier committé listant les vars requises).
- **API publiques** : valider avec Zod + client Service Role pour contourner le RLS client quand nécessaire (ex. `/api/v1/projects`).

## Dev & tests
- **Un seul** serveur dev à la fois sur `:3000` (`npm run dev`). En cas de doublons : `pkill -f "nuxt dev"` puis relancer. Ajouter un nouveau composable/auto-import peut nécessiter un restart.
- **Supabase local** : `http://127.0.0.1:54321` (voir `.env`), confirmations d'e-mail **désactivées** → l'inscription crée une session immédiate. Le `.env.example` pointe aussi sur le local.
- **E2E Playwright** (`tests/e2e/`, Node 20) : l'auth est mockée par cookie injecté **côté client** → absent de la requête SSR. Pour les pages protégées, naviguer via le helper **`gotoLeads`** (charge `/` public puis push SPA), pas `page.goto('/espace/...')` direct, sinon redirection login.
- Lancer : `npx playwright test` · unitaires : voir `package.json`.

## Langue
Tout en **français** (UI, commentaires, commits), accents inclus.
