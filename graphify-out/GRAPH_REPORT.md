# Graph Report - bati-axe  (2026-06-06)

## Corpus Check
- 132 files · ~58,987 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 282 nodes · 245 edges · 42 communities (27 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73e38685`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]

## God Nodes (most connected - your core abstractions)
1. `Phase 4: Le Verrou & Stripe Billing — Research` - 20 edges
2. `Pattern Assignments` - 11 edges
3. `Shared Patterns` - 10 edges
4. `UI-SPEC — Phase 4: Le Verrou & Stripe Billing` - 10 edges
5. `Architecture Patterns` - 9 edges
6. `Common Pitfalls` - 8 edges
7. `scripts` - 7 edges
8. `Phase 4: Le Verrou & Stripe Billing - Context` - 7 edges
9. `Phase 4: Le Verrou & Stripe Billing - Discussion Log` - 7 edges
10. `Phase 4: Le Verrou & Stripe Billing - Pattern Map` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (42 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.18
Nodes (10): Overview, Phase 1: Foundations & Compliance, Phase 2: Data Foundation & Capture mono-ville, Phase 3: Onboarding Pro & Vérification manuelle, Phase 4: Le Verrou & Stripe Billing, Phase 5: SMS Teasing avec opt-in vérifié, Phase Details, Phases (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (35): Alternatives écartées (décisions verrouillées), Applicable ASVS Categories, Architectural Responsibility Map, Assumptions Log, Aucune dépendance supplémentaire requise, Claude's Discretion, Core, Deferred Ideas (OUT OF SCOPE) (+27 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (28): Accessibilité, Anti-Patterns à éviter, Badges statut (réutilisables), Card "Contact prospect" — 2 variantes, Card "Infos projet" (toujours visible), Card Prix — détail styling, Checklist pré-implémentation, Countdown composant (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): Architecture & Contraintes, Base de données, Canonical References, Claude's Discretion, Code existant (patterns à suivre), Dashboard leads — `/espace/leads`, Deferred Ideas, Established Patterns (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (15): Admin Authorization, Auth Guard (Vue pages), Authentication (all server endpoints), Badge/Status Indicator, Error Wrapping (try/catch), File Classification, Metadata, No Analog Found (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (11): `app/pages/espace/leads/[id].vue` (component, request-response), `app/pages/espace/leads/index.vue` (component, request-response), `app/pages/espace/premium.vue` (component, request-response), `nuxt.config.ts` (config, modify), Pattern Assignments, `server/api/v1/admin/qualify.post.ts` (controller, request-response), `server/api/v1/leads/[id].get.ts` (controller, request-response), `server/api/v1/leads/index.get.ts` (controller, request-response) (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (10): Accumulated Context, Blockers/Concerns, Current Position, Decisions, Known Patterns (à appliquer dans les prochaines phases), Pending Todos, Performance Metrics, Project Reference (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (9): Anti-Patterns à éviter, Architecture Patterns, Diagramme de flux — Phase 4, Pattern 1 : Logique de masquage côté serveur (Le Verrou), Pattern 2 : Stripe Checkout Session (Nitro, Cloudflare Pages), Pattern 3 : Webhook Stripe — constructEventAsync (CRITIQUE pour Cloudflare), Pattern 4 : pg_cron — déblocage automatique à T+72h, Pattern 5 : Admin qualify endpoint (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (9): Banner Premium contextuel (BASIC avec leads floutés), Composant LeadCard — 3 variantes, Layout, Objectif UX, Page 1 — `/espace/leads` (Dashboard Leads), Variante A : Lead flouté (BASIC, <72h, non pris), Variante B : Lead débloqué (Premium actif OU BASIC + 72h passées), Variante C : Lead pris (Premium a pris le lead) (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (7): Checkout Stripe, Claude's Discretion, Dashboard leads, Deferred Ideas, Logique de déblocage, Matching leads → pros, Phase 4: Le Verrou & Stripe Billing - Discussion Log

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (8): Common Pitfalls, Pitfall 1 : `constructEvent()` synchrone crash sur Cloudflare Workers, Pitfall 2 : `readBody()` invalide la signature webhook, Pitfall 3 : `stripe_customer_id` NULL sur `customer.subscription.deleted`, Pitfall 4 : pg_cron non disponible en local dev, Pitfall 5 : ENUM PostgreSQL — pas de rollback de valeur, Pitfall 6 : Stripe Price ID hardcodé, Pitfall 7 : Données sensibles dans les logs Nitro

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (7): Manual-Only Verifications, Per-Task Verification Map, Phase 4 — Validation Strategy, Sampling Rate, Test Infrastructure, Validation Sign-Off, Wave 0 Requirements

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (12): Agreed Concerns, Agreed Strengths, Concerns, Consensus Summary, Cross-AI Plan Review — Phase 4, Divergent Views, Phase 4 Plan Review — Le Verrou & Stripe Billing, Risk Assessment: **MEDIUM** (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (21): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @lucide/vue, nuxt, reka-ui, shadcn-vue, stripe (+13 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (16): devDependencies, class-variance-authority, clsx, lucide-vue-next, @nuxtjs/supabase, pinia, @pinia/nuxt, radix-vue (+8 more)

## Knowledge Gaps
- **204 isolated node(s):** `hours`, `isLocked`, `route`, `showSuccessBanner`, `schema` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Phase 4: Le Verrou & Stripe Billing — Research` connect `Community 1` to `Community 17`, `Community 14`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `UI-SPEC — Phase 4: Le Verrou & Stripe Billing` connect `Community 9` to `Community 15`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Community 21` to `Community 20`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `hours`, `isLocked`, `route` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Community 9` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Community 10` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._