---
gsd_state_version: 1.0
milestone: v1.0-lancement-pilote
milestone_name: Lancement v1 — Pilote Carrières-sous-Poissy
status: v1_in_progress
stopped_at: "V1 en cours — phases 05.10/05.11/06.1/06.2/05.12 + P4 livrées, PRs #44-48 mergés, #49 ouvert"
last_updated: "2026-08-23T23:00:00.000Z"
last_activity: 2026-08-23
progress:
  total_phases: 20
  completed_phases: 18
  total_plans: 68
  completed_plans: 66
  percent: 97
---

# Project State

## 🔒 Lock & Sync Status

- **Lock Type:** None
- **Git-Pulse:** Enabled (run `scripts/git-pulse.sh` to check for Claude's activity)
- **Vault Sync:** Enabled (run `scripts/sync-vault-to-ki.py` after Vault updates)

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02)

**Core value**: Mettre en relation exclusive des particuliers porteurs de projets avec des professionnels certifiés du bâtiment.
**Current focus**: Milestone **v1.0 « Pilote 78 en orbite »** EN COURS — la machine B2C + couche Partenaires B2B + KPIs sont livrés ; il reste la priorité pilote (P3 Stripe re-test, P1 Matomo, P9 mobile QA, P5 feedback loop, P7 packs zonés) puis le go-live réel.

## Current Position

Milestone: **v1.0 « Pilote 78 en orbite »** (déclaré au ROADMAP le 2026-08-23)
Phases complètes récentes :
- **05.10 — Espace Partenaires & Apporteurs d'Affaires** ✅ 7/7 (2026-08-22) : landing `/b2b/partenaires`, tunnel 4 étapes, POST + presign R2, back-office admin `b2b_requests`, workflow DirCo (qualification + sélection 2-3 sous-traitants + restitution email).
- **05.11 — Coffre-Fort Juridique & Capacité Sous-traitance** ✅ 4/4 (2026-08-23) : `documents_artisan`, alerte capacité + effectif, suspension auto à expiration, devoir de vigilance 6 mois, vue admin documents.
- **06.1 — Console Admin Opérationnelle** ✅ (2026-08-22) : 8 composants modulaires, sidebar, dark mode, search/pagination, audit log, onglets B2B + Documents légaux.
- **06.2 — KPIs de Pilotage** ✅ (2026-08-22, merge PR #45 le 2026-08-22) : kpi-engine 6 KPIs + dashboard admin. *(récupéré d'une branche jamais mergée — docs le marquaient « livré » à tort)*.
- **05.12 — Front Polish & Branding** ✅ 2/2 (2026-08-23, PR #49) : landing `/partenaires` dédiée (9 sections) + tunnel allégé + scroll fluide ; déclinaisons web du logo (détourage flood-fill, transparent/monochrome, favicons, apple-touch, PWA, og-image) + script `scripts/generate-logo-variants.mjs` ; passe anti-slop, icônes Phosphor duotone, FAQ éditoriale, univers `copper`, radius pill unifié, retour « Particuliers » dans le header. Aucune migration DB.
- **P4 — Notif pro nouveaux leads (email)** ✅ (2026-08-23, PR #48 mergé) : `notifyProLead` sur `projects.post.ts`, opt-in `lead_alerts_email`, idempotence `lead_notifications`, page « Lead non accessible » (Premium ou 48h), déblocage auto 72h → 48h, focus offre 15 s à l'arrivée depuis l'email.

Ensuite (priorité pilote, voir ROADMAP § « Priorités pilote v1 ») : **P3** (Stripe + cron re-test prod), **P1** (Matomo funnel), **P9** (mobile QA), **P5** (feedback loop testé), **P7** (packs zonés — bloqué tarifs), **P6/P8/P10** (leviers B2B).

## Plans récents livrés

- [x] 05.10-06 — Back-office admin `b2b_requests` (queue, pipeline, assignation, notes, audit) — PR #44
- [x] 05.10-08 — Workflow DirCo (qualification CCTP, sélection 2-3 sous-traitants, restitution email) — PR #46
- [x] 05.11-01..04 — Coffre-fort juridique (migration documents_artisan, capacité sous-traitance, cron expiration, vue admin) — PR #47
- [x] 06.2 récupération — moteur KPI (endpoint + dashboard + migration `20260822000001`) — PR #45
- [x] P4 — Notif email nouveaux leads + page « Lead non accessible » + déblocage 48h — PR #48 (mergé)
- [x] 05.12-01 — Landing `/partenaires` dédiée + tunnel allégé + header/footer (PR #49)
- [x] 05.12-02 — Déclinaisons web du logo (détourage + 11 fichiers + branchements) (PR #49)

## Decisions (récentes)

- [2026-08-22] **Fixes prod appliqués directement** : les migrations en attente (`20260822000000` showcase, `20260822000001` KPI, `20260822000002` b2b) ont été poussées sur la base de production via `supabase db push` (feu vert utilisateur). La table `b2b_requests` n'existait nulle part (ni local ni cloud) — c'était la cause racine de la page « Dossiers B2B » cassée.
- [2026-08-22] **Embedding `auth.users` inutilisable sur cette instance PostgREST** (parse error) : les emails des pros assignés sont résolus via l'API admin (`listUsers`) au lieu de l'embedding — corrigé sur `b2b-requests.get.ts` et `audit-logs.get.ts` (bug latent : l'onglet Journal était cassé depuis longtemps).
- [2026-08-22] **Ordre de merge des PRs** : #44 (back-office B2B) → #46 (DirCo, stacké) → #45 (KPI, rebasé après conflit sidebar — résolu en gardant les deux onglets B2B + KPIs). Les 3 mergés dans `main`.
- [2026-08-23] **P4 — la notification ne débloque pas l'accès** : un pro non-premium reçoit l'email mais voit la page « Lead non accessible » (Premium ou attente 48h). Philosophie « plus laxiste au lancement » : déblocage auto **72h → 48h** (cron `auto-unlock-leads-48h`).
- [2026-08-23] **Focus offre à l'arrivée email** : le panneau sombre de l'offre (budget/délai/qualification) est mis en surbrillance (ring + glow orange) 15 s quand le lien porte `?src=email` — au lieu d'un bandeau textuel.
- [2026-08-23] **Migration P4 appliquée en prod** : `20260823000002_p4_lead_notifications` (colonne `lead_alerts_email`, table `lead_notifications`, cron 48h).

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
| **P1** Matomo funnel | ❌ à implémenter (décidé : Matomo) |
| **P2** Turnstile anti-spam | ✅ code livré — standby (clés client à créer au transfert Cloudflare) |
| **P3** Stripe + cron re-test prod | ❌ **à faire en premier** (critique, runbook prêt) |
| **P4** Notif leads email | ✅ livré (PR #48 mergé) — temps 2 Web Push = Phase 8 |
| **P5** Feedback loop refus→marché testé | ❌ à tester |
| **P6** Étude financement courtier | ❌ absent |
| **P7** Packs zonés & exclusivité | ❌ absent — bloqué tarifs définitifs (Basic 150-200 / Premium 300) |
| **P8** Compte Prescripteur | ❌ absent |
| **P9** Mobile QA + états vides | ❌ à faire |
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
- ✅ **#48** P4 notif email leads — mergé 2026-08-23 (résolution conflits ROADMAP/STATE faite au merge de #49)
- 🟡 **#49** front polish partenaire (landing, logo, Phosphor, FAQ, copper) — ouvert, mergeable — branche `fix/tweaks-front`

## Blockers/Concerns

- **P3 — Stripe non re-testé en prod** : checkout + webhook + cron n'ont pas été re-vérifiés depuis Phase 4/4.5 (le paywall mort a été découvert par hasard en 08/2026). Runbook prêt, nécessite l'accès aux clés Stripe prod.
- **Tarifs P7 non tranchés** : Basic 150-200 € / Premium 300 € à confirmer par le client avant d'implémenter les packs zonés.
- **Browser tests block** : l'environnement de navigation Chromium local a des soucis d'initialisation dans le sandbox, mais les tests d'API et compilations sont OK. Dette connue : passe Playwright jamais câblée.
- **Test badge préexistant cassé** : `tests/badges.test.ts` attend `bg-[#F8FAFC]` alors que le composant utilise `bg-green-100` (dérive de palette antérieure) — hors périmètre des chantiers récents, à corriger dans une passe dédiée.

## Session Continuity

Last session: 2026-08-23 (matinée → fin de journée)
Stopped at: **P4 + polish front partenaire livrés** (PRs #48 et #49 mergés) + planning GSD resynchronisé (milestone v1.0, 20 phases / 68 plans)
Resume: prochain chantier au choix — **P3** (Stripe re-test prod, critique), **P1** (Matomo), **P9** (mobile QA), **P5** (feedback loop), **P7** (packs zonés, après validation tarifs)
