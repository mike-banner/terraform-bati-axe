---
gsd_state_version: 1.0
milestone: v1.0-lancement-pilote
milestone_name: Lancement v1 — Pilote Carrières-sous-Poissy
status: v1_in_progress
stopped_at: "Infrastructure Dev Cloudflare validée sur la branche dev ; production client volontairement laissée intacte et manuelle"
last_updated: "2026-08-28T18:00:00.000Z"
last_activity: 2026-08-28
progress:
  total_phases: 21
  completed_phases: 20
  total_plans: 72
  completed_plans: 71
  percent: 99
---

# Project State

## 🔒 Lock & Sync Status

- **Lock Type:** None
- **Git-Pulse:** Enabled (run `scripts/git-pulse.sh` to check for Claude's activity)
- **Vault Sync:** Enabled (run `scripts/sync-vault-to-ki.py` after Vault updates)

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-25)

**Core value**: Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment.
**Current focus**: Milestone **v1.0 « Pilote 78 en orbite »** EN COURS — le produit et l'environnement Cloudflare Dev sont opérationnels. La branche `dev` déploie `bati-axe-dev` sur `dev.bati-axe.fr`; elle utilise temporairement la base existante via `TF_VAR_EXISTING_DATABASE_URL`. La production client reste séparée, non modifiée et manuelle.

## Current Position

Milestone: **v1.0 « Pilote 78 en orbite »** (déclaré au ROADMAP le 2026-08-23)
Phases complètes récentes :
- **05.10 — Espace Partenaires & Apporteurs d'Affaires** ✅ 7/7 (2026-08-22) : landing `/b2b/partenaires`, tunnel 4 étapes, POST + presign R2, back-office admin `b2b_requests`, workflow DirCo (qualification + sélection 2-3 sous-traitants + restitution email).
- **05.11 — Coffre-Fort Juridique & Capacité Sous-traitance** ✅ 4/4 (2026-08-23) : `documents_artisan`, alerte capacité + effectif, suspension auto à expiration, devoir de vigilance 6 mois, vue admin documents.
- **06.1 — Console Admin Opérationnelle** ✅ (2026-08-22) : 8 composants modulaires, sidebar, dark mode, search/pagination, audit log, onglets B2B + Documents légaux.
- **06.2 — KPIs de Pilotage** ✅ (2026-08-22, merge PR #45 le 2026-08-22) : kpi-engine 6 KPIs + dashboard admin. *(récupéré d'une branche jamais mergée — docs le marquaient « livré » à tort)*.
- **05.12 — Front Polish & Branding** ✅ 2/2 (2026-08-23, PR #49) : landing `/partenaires` dédiée (9 sections) + tunnel allégé + scroll fluide ; déclinaisons web du logo (détourage flood-fill, transparent/monochrome, favicons, apple-touch, PWA, og-image) + script `scripts/generate-logo-variants.mjs` ; passe anti-slop, icônes Phosphor duotone, FAQ éditoriale, univers `copper`, radius pill unifié, retour « Particuliers » dans le header. Aucune migration DB.
- **05.13 — Dette technique + P9 Mobile QA + P5 Feedback Loop** ✅ 3/3 (2026-08-23, branche `fix/dette-p9-p5`) : suite e2e Playwright câblée sur le Chrome système (`channel: 'chrome'`, 24 specs → 24 pass, jamais lancée avant) + specs simulateur réécrites (flux 6 étapes) + test badge réparé (`bg-[#F8FAFC]`) ; QA mobile mesurée (scripts `mobile-audit`/`touch-audit`/`monprojet-mobile`), cibles tactiles ≥ 44px (header/simulateur/tunnel/footer), état vide catégorie leads atteignable, projet Playwright `mobile-chromium` (48/48 specs desktop + mobile) ; feedback loop extrait dans `server/utils/handleLeadDecision.ts` + 9 tests unitaires (remise au marché, garde-fou MAX_RELAUNCHES, 403/404). Aucune migration DB.
- **05.14 — FIX: Refactoring Multi-Buckets Cloudflare R2** ✅ 1/1 (2026-08-28) : Isolation des buckets `batiaxe-public-[env]`, `batiaxe-vault-[env]`, `batiaxe-b2b-[env]` — code mergé dans `dev`, 3 buckets R2 prod créés, secrets GitHub à jour. **Terraform prod reporté après v1.**
- **05.15 — FIX: Verrouillage Leads non-vérifiés sur `/espace/leads`** ✅ 1/1 (2026-08-29) : le gate n'existait qu'côté UI (bouton désactivé) — un pro non vérifié pouvait débloquer un lead en appelant `leads/[id]/claim.patch.ts` directement. Ajout du contrôle `decennal_status === 'valid'` côté serveur + email admin (`NUXT_ADMIN_EMAIL`) quand le SIRET n'est pas confirmé actif au claim (Kbis restera bloqué en attente de revue manuelle sinon). OCR/IA décennale reste dans le backlog Deferred (post-lancement), non traité cette session.
- **05.16 — P7: Découpage 78 en 4 Zones & Pricing Dégressif** ✅ 2/2 (2026-08-29) : Quadrillage des Yvelines (Mantes, Rambouillet, Versailles, St-Germain), abonnement dégressif sans engagement mensuel (190€ → 350€) + annuel économique (150€ → 300€, -21%). 05.16-01 : sélection de zones, toggle mensuel/annuel, Stripe Checkout. 05.16-02 : retrait individuel de zone (Subscription Schedule, effet fin de période payée), garde-fou `assertSubscriptionModifiable` (un seul changement en vol à la fois, blocage si résiliation en cours) — cf. `05.16-STRIPE-SCHEDULES.md`.
- **05.17 — P19: Partenaires Diagnostiqueurs Immobiliers** 🚧 0/1 (2026-08-27) : Profil diagnostiqueur sur `/b2b/partenaires` + dépôt de rapports DPE/diagnostics.
- **05.18 — Annuaire, Vitrines Publiques & Dashboard Partenaires** 🚧 0/1 (2026-08-27) : Section Partenaires sur l'accueil `/`, annuaire filtrable par catégorie (`/partenaires/annuaire`), profil public (`/partenaire/[dept]/[slug]`) et dashboard d'édition (`/espace/partenaire`).
- **P4 — Notif pro nouveaux leads (email)** ✅ (2026-08-23, PR #48 mergé) : `notifyProLead` sur `projects.post.ts`, opt-in `lead_alerts_email`, idempotence `lead_notifications`, page « Lead non accessible » (Premium ou 48h), déblocage auto 72h → 48h. Le délai 48h est retenu pour v1 ; 72h ou une autre valeur pourra être décidé dans une version ultérieure avec le client.

Ensuite (priorité pilote, voir ROADMAP § « Priorités pilote v1 ») : **P3** (Stripe + cron re-test prod — inclut désormais un test webhook réel de transition de Subscription Schedule sur retrait de zone, non vérifié en conditions réelles), **P1** (Umami funnel — self-hosted VPS PostgreSQL), puis P6/P8/P10.

## Infrastructure vérifiée le 2026-08-25

- Branche active : `dev`, propre et synchronisée avec `origin/dev`.
- Workflow : `.github/workflows/terraform-dev.yml` exécuté avec succès (Terraform Init, Validate, Plan, Apply).
- Cloudflare Dev : projet `bati-axe-dev`, domaine `dev.bati-axe.fr`, mise à jour Terraform réussie (`0 ajout`, `1 modification`, `0 destruction`).
- Application : build Nuxt réussi avec Node `22.22.1`; tests unitaires `73/73` réussis.
- Base Dev Cloudflare : base existante fournie par `TF_VAR_EXISTING_DATABASE_URL`; aucune base Supabase Dev séparée n'est créée.
- Production : workflow Terraform prod manuel dans la branche `dev`; aucune modification de l'environnement client n'a été appliquée.

## Plans récents livrés

- [x] 05.10-06 — Back-office admin `b2b_requests` (queue, pipeline, assignation, notes, audit) — PR #44
- [x] 05.10-08 — Workflow DirCo (qualification CCTP, sélection 2-3 sous-traitants, restitution email) — PR #46
- [x] 05.11-01..04 — Coffre-fort juridique (migration documents_artisan, capacité sous-traitance, cron expiration, vue admin) — PR #47
- [x] 06.2 récupération — moteur KPI (endpoint + dashboard + migration `20260822000001`) — PR #45
- [x] P4 — Notif email nouveaux leads + page « Lead non accessible » + déblocage 48h — PR #48 (mergé)
- [x] 05.12-01 — Landing `/partenaires` dédiée + tunnel allégé + header/footer (PR #49)
- [x] 05.12-02 — Déclinaisons web du logo (détourage + 11 fichiers + branchements) (PR #49)
- [x] 05.13-01 — Dette technique : suite e2e câblée (channel chrome) + specs alignées + badge réparé (PR #51)
- [x] 05.13-02 — P9 Mobile QA : audit + cibles ≥ 44px + projet e2e mobile 48/48 (PR #51)
- [x] 05.13-03 — P5 Feedback loop : `handleLeadDecision` + 9 tests (PR #51)
- [x] 05.14 — Multi-Buckets R2 : isolation 3 buckets (Public/Vault/B2B) + Terraform module + endpoints + workflows (mergé dev 2026-08-28). Terraform prod reporté après v1.

## Decisions (récentes)

- [2026-08-22] **Fixes prod appliqués directement** : les migrations en attente (`20260822000000` showcase, `20260822000001` KPI, `20260822000002` b2b) ont été poussées sur la base de production via `supabase db push` (feu vert utilisateur). La table `b2b_requests` n'existait nulle part (ni local ni cloud) — c'était la cause racine de la page « Dossiers B2B » cassée.
- [2026-08-22] **Embedding `auth.users` inutilisable sur cette instance PostgREST** (parse error) : les emails des pros assignés sont résolus via l'API admin (`listUsers`) au lieu de l'embedding — corrigé sur `b2b-requests.get.ts` et `audit-logs.get.ts` (bug latent : l'onglet Journal était cassé depuis longtemps).
- [2026-08-22] **Ordre de merge des PRs** : #44 (back-office B2B) → #46 (DirCo, stacké) → #45 (KPI, rebasé après conflit sidebar — résolu en gardant les deux onglets B2B + KPIs). Les 3 mergés dans `main`.
- [2026-08-23] **P4 — la notification ne débloque pas l'accès** : un pro non-premium reçoit l'email mais voit la page « Lead non accessible » (Premium ou attente 48h). Philosophie « plus laxiste au lancement » : déblocage auto **72h → 48h** (cron `auto-unlock-leads-48h`).
- [2026-08-23] **Focus offre à l'arrivée email** : le panneau sombre de l'offre (budget/délai/qualification) est mis en surbrillance (ring + glow orange) 15 s quand le lien porte `?src=email` — au lieu d'un bandeau textuel.
- [2026-08-23] **Migration P4 appliquée en prod** : `20260823000002_p4_lead_notifications` (colonne `lead_alerts_email`, table `lead_notifications`, cron 48h).
- [2026-08-23] **Dette technique** : suite e2e Playwright jamais lancée (bundle Chromium cassé en sandbox) → `channel: 'chrome'` (Chrome système) ; specs simulateur réécrites pour le flux 6 étapes (les helpers dataient de l'ancien flux) ; `BadgeEntrepriseVerifiee` aligné sur `bg-[#F8FAFC]` (palette Sketch 001) ; branche `test-fix` supprimée.
- [2026-08-23] **P9 Mobile QA** : aucun débordement horizontal à 320/390px sur les pages publiques ; cibles tactiles header/simulateur/tunnel passées à ≥ 44px (h-11/min-h-11) ; état vide « Aucun lead pour cette catégorie » rendu atteignable (le filtre listait les catégories des leads présents → code mort) ; projet Playwright `mobile-chromium` (Pixel 7) verrouille le responsive (48/48 = 24 desktop + 24 mobile).
- [2026-08-23] **P5 Feedback loop testé** : orchestration de `decision.post.ts` extraite dans `server/utils/handleLeadDecision.ts` (pattern `handleStripeEvent`) + 9 tests unitaires. E2e via `page.route` abandonnée : les appels Supabase du service role partent du serveur Nitro et ne sont pas interceptables par Playwright.
- [2026-08-23] **Pass e2e admin sur la prod (PR #52)** : login admin (cookie + rôle OK) mais pas de redirection auto → cause racine = `navigateTo('/admin')` immédiat après `signInWithPassword` alors que `useSupabaseUser()` n'est pas encore hydraté → le middleware `/admin` rebondissait vers `/pro/claim` (un reload corrigeait). Fix : le `watch(user)` route l'utilisateur dès que la session est hydratée (admin → `/admin` prioritaire, pro existant → dashboard, sinon onboarding étape 2). Spec e2e `tests/e2e/admin-login.spec.ts` (rouge sans fix, verte avec). Audit des 9 onglets admin en prod : tous OK + API admin protégées (401 sans session). Scripts réutilisables : `scripts/admin-audit.mjs`, `scripts/admin-tabs-deep.mjs`.

## Known Patterns (à appliquer dans les prochaines phases)

**Ajouter un admin** : le rôle admin passe par `app_metadata.role` (pattern actuel, cf. `server/api/v1/admin/*`). L'ancien `ADMIN_EMAILS` est obsolète. Compte admin générique : `admin@batiaxe.com` (+ scripts).

**Nouvelle route protégée** : appeler `useRequireAuth()` en haut du `<script setup>` (composable `app/composables/useRequireAuth.ts`). NE PAS utiliser `watchEffect(() => { if (!user.value) navigateTo('/pro/claim') })` : ce pattern redirige sur le `null` transitoire de `useSupabaseUser()` pendant l'hydratation et éjecte un pro pourtant connecté au rechargement (bug corrigé le 2026-06-13). Le composable valide la session de façon autoritaire via `getSession()` puis ne réagit qu'à une déconnexion explicite. Toujours pas de middleware global car `supabase.redirect` est à `false` (ADR).

**Profil non encore vérifié** : ne jamais retourner 404 pour un profil existant — retourner les données avec `is_verified: false` et laisser la page afficher l'état pending. Réserver 404 aux profils introuvables en DB.

**Variable d'env manquante** : documenter dans `.env.example` immédiatement après ajout dans le code. C'est le seul endroit committé qui liste toutes les vars requises.

**Migration + types** : après tout `supabase db push`, régénérer `app/types/database.types.ts` via `npx supabase gen types typescript --project-id xpwoczcbyamnjknloxgz --schema public > app/types/database.types.ts` (fichier committé — il était périmé depuis le 19/08, régénéré le 2026-08-23).

**Nouvelle migration** : ajouter le fichier dans `supabase/migrations/` puis `npx supabase db push --yes` (projet lié : `xpwoczcbyamnjknloxgz`, session CLI authentifiée). Ne jamais rééditer une migration déjà appliquée en remote.

## Backlog pilote v1 — Statut au 2026-08-23

| Item | Statut |
|---|---|
| **P1** Umami funnel | ❌ à implémenter (décidé : Umami VPS PostgreSQL, sans cookie) |
| **P2** Turnstile anti-spam | ✅ code livré — standby (clés client à créer au transfert Cloudflare) |
| **P3** Stripe + cron re-test prod | ❌ à faire en premier (runbook prêt ; accès prod client nécessaire) |
| **P4** Notif leads email | ✅ livré (PR #48 mergé) — Web Push reporté à la Phase 8 |
| **P5** Feedback loop refus→marché testé | ✅ testé (2026-08-23, 05.13-03 — reste vérif sur données réelles au go-live) |
| **P6** Étude financement courtier | ❌ absent |
| **P7** Packs zonés & exclusivité | ❌ absent — bloqué tarifs définitifs (Basic 150-200 / Premium 300) |
| **P8** Compte Prescripteur | ❌ absent |
| **P9** Mobile QA + états vides | ✅ fait (2026-08-23, 05.13-02 — projet e2e mobile 48/48) |
| **P10** Commission B2B + Stripe Connect | 📝 doc only |
| **P11** eIDAS / workspace archi | ❌ Phase 7+ |
| **P12** Page pro public digne | ❌ à faire (CTA devis ajouté, avis = Phase 7) |
| **P13** White-label Terraform | 📝 fondation existe |
| **P14** Monitoring Axiom | ❌ à faire |
| **P15** Messagerie temps réel | 📝 noté — polling OK |
| **P16** Ouverture TP | ❌ Phase 2 (après 78) |
| **P17** Modèle 2 piliers | ❌ à trancher (avec P7/P10) |
| **P18** Devoir de vigilance 6 mois | ✅ couvert par 05.11-03 |
| **P19** Diagnostiqueurs apporteurs | ❌ à faire |
| **P20** Passerelle B2B payante | ❌ à faire (avec P7/P8) |
| **P21** Tunnel Sinistres/Assurances | ❌ à faire |
| **P22** Majors / Grands Comptes | ❌ Phase 3 |

## PRs récents

- ✅ **#44** back-office B2B + fix embedding `auth.users` — mergé 2026-08-22
- ✅ **#45** récupération moteur KPI (06.2) — mergé 2026-08-22 (après rebase + résolution conflit sidebar)
- ✅ **#46** workflow DirCo — mergé 2026-08-22
- ✅ **#47** coffre-fort juridique 05.11 — mergé 2026-08-23
- ✅ **#48** P4 notif email leads — mergé 2026-08-23 (conflits ROADMAP/STATE résolus au merge de #49)
- ✅ **#49** front polish partenaire (landing, logo, Phosphor, FAQ, copper) — mergé 2026-08-23 (conflits planning résolus : base rewrite #48 + apports 05.12)
- ✅ **#51** dette technique + P9 mobile QA + P5 feedback loop (phase 05.13) — mergé 2026-08-23
- ✅ **#52** fix redirection login admin (`watch(user)` + spec e2e admin-login) — mergé 2026-08-23

## Blockers/Concerns

- **P3 — Stripe non re-testé en prod** : checkout + webhook + cron 48h n'ont pas été re-vérifiés depuis Phase 4/4.5 (le paywall mort a été découvert par hasard en 08/2026). Runbook prêt, nécessite l'accès aux clés Stripe prod. Le délai 48h est la référence v1 ; 72h ou une autre valeur reste une décision future. **Sous-partie testée en local le 2026-08-29** : signature webhook + transition Subscription Schedule de retrait de zone validées via Stripe CLI (test mode) + Test Clock — cf. `05.16-02-SUMMARY.md`. Reste à re-tester en conditions prod réelles (clés client) : checkout initial + cron 48h.
- **GoTrue local rejette l'API admin (`/admin/users`) avec la clé service_role legacy HS256** (découvert le 2026-08-29, GoTrue v2.189.0, instance `supabase_auth_bati-axe`) — erreur `signing method HS256 is invalid`. Les requêtes REST classiques (PostgREST) avec cette même clé fonctionnent normalement ; seule l'API d'administration des utilisateurs est impactée. Impact potentiel sur tout script/endpoint utilisant `supabase.auth.admin.*` en local (ex. `scripts/reset-admin.mjs`) — à vérifier avant d'en dépendre.
- **Tarifs P7 non tranchés** : Basic 150-200 € / Premium 300 € à confirmer par le client avant d'implémenter les packs zonés.
- **Playwright** : la suite est câblée sur Chrome système et les scénarios desktop/mobile ont été validés dans la phase 05.13. Les tests unitaires et le build passent localement avec Node 22.
- **Test badge préexistant cassé** : `tests/badges.test.ts` attend `bg-[#F8FAFC]` alors que le composant utilise `bg-green-100` (dérive de palette antérieure) — hors périmètre des chantiers récents, à corriger dans une passe dédiée.

## Accumulated Context

### Roadmap Evolution

- [2026-08-29] Phase ajoutée puis renumérotée : Notifications Email Transactionnelles (bati-axe.com), repris d'un plan externe Antigravity IDE. D'abord créée en 05.19 (indépendante), puis déplacée en **06.3** — rattachée à la Phase 6 qui est déjà « la phase notifications » (EML-01 email + SMS 06-04 différé). Contexte détaillé : `.planning/phases/06.3-notifications-email-transactionnelles/06.3-CONTEXT.md`.

## Session Continuity

Last session: 2026-08-29
Stopped at: **Phase 05.16-02 committée + push `dev` ; test P3 (retrait de zone / Subscription Schedule) validé en local via Stripe Test Clock ; Phase 06.3 (notifs email, ex-05.19) créée à partir du plan Antigravity et rattachée à la Phase 6, pas encore planifiée en détail.**
Resume: `/gsd-plan-phase 06.3` pour découper la phase email en plans exécutables, puis **P3** (re-test Stripe/cron en conditions prod réelles quand les identifiants client seront disponibles), **P1** Umami (VPS + PostgreSQL).
