# Git Workflow — BÂTI-AXE

**Objectif** : Structure de travail claire pour collaborer efficacement en équipe (ou seul) comme si on était plusieurs.

---

## ✅ RÉALITÉ ACTUELLE (à lire en premier)

- **`dev`** est la branche de travail et de déploiement Cloudflare Dev.
- Le workflow `.github/workflows/terraform-dev.yml` se déclenche sur un push vers `dev`.
- Cloudflare Dev utilise le projet `bati-axe-dev` et le domaine `dev.bati-axe.fr`.
- **`main`** est réservé à la future production client et reste protégé par Pull Request.
- Le workflow `.github/workflows/terraform-prod.yml` est volontairement manuel tant que les identifiants client ne sont pas disponibles.
- La base utilisée par Cloudflare Dev est temporairement la base existante via `TF_VAR_EXISTING_DATABASE_URL`; aucune base Supabase Dev séparée n'est créée.

## 📋 Types de branches

```
main                  ← Production client, protégée, déploiement manuel pour l'instant
└─ dev                ← Travail + Cloudflare Dev (`dev.bati-axe.fr`)
   ├─ feat/*           ← Fonctionnalités
   ├─ fix/*            ← Corrections
   ├─ refactor/*       ← Refactorisations
   └─ docs/*           ← Documentation
```

**Règle** : travailler sur `dev`; ne pas pousser directement sur `main`. Une future mise en production client passera par une Pull Request et une validation explicite.

---

## 🚀 Flow complet (par tâche)

### 1️⃣ **Créer une nouvelle tâche** (e.g., "Ajouter timeout logout")

```bash
# Sync local avec remote
git fetch origin
git checkout dev
git pull origin dev

# Créer la branche pour la tâche
git checkout -b fix/idle-logout-timeout
```

**Format du nom** :
- `feat/nom-feature` — Nouvelle fonctionnalité
- `fix/nom-bug` — Correction bug
- `refactor/nom-refactor` — Refactorisation
- `docs/nom-doc` — Documentation

---

### 2️⃣ **Pendant le développement**

Faire des **commits atomiques** = un commit = une idée complète

```bash
# Ajouter les fichiers changés
git add composables/useIdleLogout.ts layouts/dynamic.vue

# Commit avec message explicite
git commit -m "feat(auth): timeout auto-logout après 30min inactivité

Implémentation :
- useIdleLogout.ts : détecte l'inactivité (click, keydown, scroll)
- Appliqué au layout dynamic.vue pour les pages protégées
- Durée : 30 minutes (standard)

Tests : 23/23 E2E ✓"
```

**Format du message commit** :
```
<type>(<scope>): <subject>

<body>
- Description des changements
- Logique métier
- Références bugs/features

Tests: mention des tests validés
```

**Types** : `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

---

### 3️⃣ **Tester avant de pousser**

```bash
# Tests unitaires/E2E
npm run test
npx playwright test

# Vérifier le lint
npm run lint

# Si tout est OK → pousser
git push origin fix/idle-logout-timeout
```

---

### 4️⃣ **Ouvrir une Pull Request (PR)**

Une fois pushée, ouvrir une PR sur GitHub/GitLab :

**Title** : `feat(auth): timeout auto-logout après 30min inactivité`

**Description** :
```markdown
## Summary
Ajoute une auto-déconnexion après 30 minutes d'inactivité pour améliorer la sécurité.

## Changes
- Nouveau composable `useIdleLogout.ts`
- Appliqué au layout `dynamic.vue`
- Détecte : click, keydown, scroll, touchstart

## Test plan
- [ ] Tests E2E : 23/23 passent
- [ ] Manuel : rester inactif 30min → vérifier redirection /
- [ ] Manuel : cliquer → timer réinitialise

## Références
- Ref: Durée standard pour inactivité = 30 min (OWASP)
- Décision : adresse préoccupation sécurité Phase 4
```

---

### 5️⃣ **Merger dans dev**

**Checklist avant merge** :
- ✅ Tous les tests passent (CI/CD green)
- ✅ Code review (au moins 1 personne si équipe)
- ✅ Documentation mise à jour (STATE.md, ADR, etc.)
- ✅ Aucun conflit

```bash
# Approuver sur GitHub → merger via UI
# OU en CLI :
git checkout dev
git pull origin dev
git merge fix/idle-logout-timeout --no-ff
git push origin dev
```

**Important** : `--no-ff` conserve l'historique de la tâche. Ne pas pousser directement sur `main`.

---

### 6️⃣ **Mettre à jour STATE.md**

Après chaque feature/fix, documentez dans `.planning/STATE.md` :

```yaml
- [2026-06-13 PM]: Timeout auto-logout après 30min inactivité 
  (composable useIdleLogout.ts)
```

---

## 📊 Statut du projet (checklist quotidienne)

Chaque matin/fin de session :

```bash
# Où on en est ?
git log --oneline -10

# Y a-t-il des branches non-mergées ?
git branch -v

# Stat des changements
git status
```

---

## 🔄 Workflow pour Claude (automatisé)

**Quand je vois une nouvelle tâche, je dois :**

1. ✅ Lire `.planning/STATE.md` et `.planning/ROADMAP.md`
2. ✅ Créer une branche `fix/*` ou `feat/*` appropriée
3. ✅ Développer + commits atomiques
4. ✅ Tester (npm test, playwright test)
5. ✅ Documenter dans STATE.md (nouvelles décisions)
6. ✅ Push et créer la PR (simulation GitHub)
7. ✅ Merger dans `dev` si validation ✅

**Output** :
```
✅ Branch: fix/idle-logout-timeout
✅ Commits: 2 atomiques
✅ Tests: 23/23 E2E passent
✅ Documentation: STATE.md mis à jour
✅ Prêt pour production
```

---

## 🚨 Cas d'erreur courants

| Cas | Solution |
|-----|----------|
| **Oublié une dépendance** | `git add <file>` + `git commit --amend` (si pas pushé) |
| **Mauvais message commit** | `git rebase -i HEAD~3` (si pas pushé) |
| **Conflit merge** | Résoudre les `.rej` manuellement + `git add` + `git commit` |
| **Poussé trop tôt** | `git reset HEAD~1` (défaire le dernier commit, garder les changes) |
| **Besoin de revenir** | `git log --oneline` → `git reset --hard <hash>` |

---

## 📝 Checklist PR avant merge

```markdown
- [ ] Branch créée à partir de `dev` (pas `main`)
- [ ] Commits atomiques avec messages explicites
- [ ] Tests passent (npm test + playwright test)
- [ ] Linting OK
- [ ] Documentation mise à jour (STATE.md, ADR si besoin)
- [ ] Pas de changements sur `main` en direct
- [ ] Aucun conflit avec `dev`
```

---

## 🎯 Résumé rapide

```
Pour chaque tâche :
1. git checkout -b fix/nom-tache (depuis dev)
2. Coder + commits atomiques
3. Tests verts
4. Documenter dans STATE.md
5. git push + créer PR si nécessaire
6. Merger dans dev
7. ✅ Terminé
```

**Jamais** :
- ❌ Pousser directement sur `main`
- ❌ Commits énormes ("Fixed stuff")
- ❌ Pousser sans tests
- ❌ Mergers sans documentation
- ❌ Squash l'historique (sauf si vraiment nécessaire)
