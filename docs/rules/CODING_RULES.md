# CODING RULES

> Règles de développement applicables à tout le codebase.
> Violations détectées par ESLint/TypeScript ou en code review.

---

## TypeScript

| Règle | Standard |
| :--- | :--- |
| `strict: true` | Obligatoire dans `tsconfig.json` |
| `noImplicitAny` | Interdit tout `any` implicite |
| `strictNullChecks` | Gestion explicite du `null`/`undefined` |
| `type` vs `interface` | `type` pour contrats API/DB, `interface` pour objets extensibles |
| Pas de `as` casting abusif | Préférer le type guard |
| Exports nommés | Préférer aux exports default |

---

## Architecture des Fichiers

```
.
├── app.vue                 # Entrée de l'application
├── nuxt.config.ts          # Configuration Nuxt 3
├── pages/                  # Pages Nuxt (Unified App)
│   ├── index.vue           # Landing / Vitrine publique
│   ├── simulateur.vue      # Tunnel de capture 6 étapes
│   ├── [metier]/[ville].vue # Annuaire dynamique (SSG/ISR)
│   └── app/                # Application Pro (SSR Authentifié)
│       ├── index.vue       # Dashboard Pro
│       ├── leads/          # Liste et détail des leads
│       └── profile/        # Profil et documents (Claim)
├── components/             # Composants Vue 3
│   ├── ui/                 # Composants UI (shadcn-vue)
│   └── features/           # Composants métier (LeadCard, etc.)
├── layouts/                # Layouts (public, pro, admin)
├── middleware/             # Middlewares (ex: auth.global.ts)
├── composables/            # State & hooks Vue (ex: useAuth.ts)
├── server/                 # Backend Nitro
│   ├── api/                # Routes API (/api/...)
│   │   ├── leads.ts        # Floutage et locking
│   │   ├── stripe/         # Webhooks et Checkout Stripe
│   │   └── twilio/         # Webhooks Twilio SMS
│   └── middleware/         # Logs, Sentry, security headers
└── types/                  # Types TypeScript
    ├── database.ts         # Types générés Supabase
    └── api.ts              # Types réponses API
```

---

## Conventions de Code

### Nommage

| Élément | Convention | Exemple |
| :--- | :--- | :--- |
| Composants Vue | `PascalCase` | `LeadCard.vue` |
| Fonctions / composables | `camelCase` | `useLeadStatus()` |
| Nitro Endpoints | `kebab-case` | `server/api/leads.ts` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_LEADS_PER_PRO` |
| Types / Interfaces | `PascalCase` | `type LeadStatus` |
| Fichiers Vue | `PascalCase` ou `kebab-case` | `LeadCard.vue` |

---

## Git Conventions

### Commits (Conventional Commits)

```
feat(leads): add geographic routing for lead assignment
fix(auth): resolve session expiry on dashboard refresh
chore(db): add index on professionals.status
docs(adr): add ADR-002 for Stripe payment integration
refactor(actions): extract lead validation logic
```

Prefixes obligatoires :
- `feat` — nouvelle fonctionnalité
- `fix` — correction de bug
- `chore` — maintenance (deps, config)
- `docs` — documentation uniquement
- `refactor` — refactoring sans changement fonctionnel
- `test` — ajout/modification tests
- `perf` — optimisation performance

### Branches

```
main        → Future production client (protégée, merge via PR uniquement)
dev         → Travail et déploiement Cloudflare Dev (CI obligatoire)
feat/xxx    → Nouvelle feature
fix/xxx     → Correction bug
chore/xxx   → Maintenance
```

### Pull Requests

- Description obligatoire (quoi, pourquoi, comment tester)
- Minimum 1 review pour les changements `core/` ou `docs/`
- CI verte obligatoire avant merge
- Pas de `git push --force` sur `main` ou `dev`

---

## Qualité

- Tests unitaires sur toute logique métier critique (lead scoring, routing)
- Pas de `console.log` en production (ESLint rule)
- Pas de code commenté sans explication (`// TODO: xxx` avec ticket)
- Chaque PR doit passer le linter sans warnings
