---
created: 2026-07-19T20:16:34.589Z
title: Durcir la validation client de tous les inputs
area: ui
files:
  - app/pages/pro/claim.vue
  - app/pages/espace/profil.vue
  - app/pages/simulateur*
  - app/pages/espace/messages/index.vue
  - app/pages/admin/index.vue
---

## Problem

Audit rapide du 2026-07-19 : la validation serveur est déjà solide (Zod sur
20/22 endpoints POST/PUT/PATCH ; le seul vrai gap trouvé, l'UUID non
vérifié sur `leads/[id]/claim.patch.ts`, a été corrigé séparément —
commit `fdeae29` sur la branche `fix/input-validation-hardening`).

Le vrai trou est côté client : la majorité des `<input>` texte du site
n'ont ni `maxlength`, ni `pattern`, ni le `type` HTML adapté (email, tel).
Échantillon sur seulement 2 fichiers (`claim.vue`, `profil.vue`) : ~26
inputs concernés. Le pattern est probablement répété sur tout le site
(simulateur, messages, admin) — à confirmer par un grep exhaustif
`<input` sur `app/pages/` et `app/components/` avant de planifier.

Sans contraintes client, un utilisateur peut saisir n'importe quoi
(longueur, format) avant l'envoi — la requête est rejetée côté serveur
(Zod protège la donnée en base), mais l'UX est mauvaise (erreur générique
après soumission au lieu d'un feedback immédiat) et ça laisse une marge
d'input non filtré qui transite jusqu'au serveur à chaque essai.

## Solution

TBD — probablement un passage systématique phase par phase (`/gsd:plan-phase`
dédié plutôt qu'un `/gsd:quick`, vu l'ampleur). Pistes :
- Grep exhaustif `<input` (et `<textarea>`) sur `app/` pour établir la
  liste complète avant de committer à une estimation de taille.
- Pour chaque input texte : `maxlength` cohérent avec la contrainte Zod
  serveur correspondante (éviter la dérive entre client et serveur — les
  deux doivent refléter la même règle, pas juste "mettre une limite").
  `type="email"` / `type="tel"` / `pattern` où pertinent.
- Vérifier si un composant `Input` partagé existe déjà (shadcn-vue est
  utilisé dans le projet) pour centraliser plutôt que dupliquer les
  contraintes input par input.
