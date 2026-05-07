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
src/
├── app/                    # Next.js App Router
│   ├── (public)/           # Routes publiques (landing, SEO)
│   ├── (auth)/             # Auth flows
│   ├── (dashboard)/        # Dashboard particulier
│   ├── (pro)/              # Dashboard professionnel
│   ├── (admin)/            # Back-office admin
│   └── api/v1/             # Webhooks & API publique
├── components/
│   ├── ui/                 # Composants atomiques (shadcn/ui)
│   └── features/           # Composants logique métier
├── lib/
│   ├── supabase/           # Client Supabase (server/client)
│   ├── stripe/             # Client Stripe
│   ├── resend/             # Templates emails
│   └── validations/        # Schémas Zod partagés
├── actions/                # Server Actions organisées par domaine
│   ├── leads.ts
│   ├── professionals.ts
│   └── payments.ts
└── types/                  # Types TypeScript partagés
    ├── database.ts         # Types générés Supabase
    └── api.ts              # Types réponses API
```

---

## Conventions de Code

### Nommage

| Élément | Convention | Exemple |
| :--- | :--- | :--- |
| Composants React | `PascalCase` | `LeadCard.tsx` |
| Fonctions / hooks | `camelCase` | `useLeadStatus()` |
| Server Actions | `camelCase` + verbe | `createLead()`, `assignLeadToPro()` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_LEADS_PER_PRO` |
| Types / Interfaces | `PascalCase` | `type LeadStatus` |
| Fichiers | `kebab-case` | `lead-card.tsx` |

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
main        → Production (protégée, merge via PR uniquement)
develop     → Intégration (CI obligatoire)
feat/xxx    → Nouvelle feature
fix/xxx     → Correction bug
chore/xxx   → Maintenance
```

### Pull Requests

- Description obligatoire (quoi, pourquoi, comment tester)
- Minimum 1 review pour les changements `core/` ou `docs/`
- CI verte obligatoire avant merge
- Pas de `git push --force` sur `main` ou `develop`

---

## Qualité

- Tests unitaires sur toute logique métier critique (lead scoring, routing)
- Pas de `console.log` en production (ESLint rule)
- Pas de code commenté sans explication (`// TODO: xxx` avec ticket)
- Chaque PR doit passer le linter sans warnings
