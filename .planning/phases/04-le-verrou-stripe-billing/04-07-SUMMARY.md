---
plan: 04-07
status: complete (pending human checkpoint)
commit: 5ce6237
---

## What was built

- `app/pages/espace/premium.vue` — Premium subscription page. Auth-guarded (`watchEffect` → `/pro/claim`). Sections: header, amber price card (`border-amber-300 bg-amber-50`) with ★ badge, feature list (3 items, inline SVG coches), `startCheckout` CTA calling `POST /api/v1/stripe/checkout` with loading spinner, comparison table (BASIC vs Premium, 3 rows), native `<details>/<summary>` FAQ (3 items). Shows "Votre abonnement Premium est actif" banner when `subscription_status === 'active'`. Shows success banner on `?upgrade=success` query param, auto-dismisses after 6s. No lucide imports — all icons inline SVG (HeroIcons outline, consistent with existing codebase).
- `server/api/v1/admin/projects.get.ts` — Admin-only endpoint. Replicates `queue.get.ts` auth pattern. Returns `{ projects }` ordered by `created_at DESC`, selecting `id, category, status, description, budget_range, timeline_range, created_at`.
- `app/pages/admin/index.vue` (modified) — Added "Projets" third tab. New state: `projects`, `qualifyLoading`, `qualifyResult`. `fetchProjects()` calls `GET /api/v1/admin/projects`. `qualifyProject(id)` calls `POST /api/v1/admin/qualify`, stores `leads_created` in `qualifyResult`. Projects section shows category badge, status badge (amber/emerald), description, budget/timeline. Qualify button disabled if `project.status === 'qualified'` or loading. Shows "N lead(s) créé(s)" confirmation after qualify. Existing pro management tabs unaffected.

## Verification

- `lucide` imports in premium.vue: ✗ absent (correct — inline SVG only)
- `border-amber-300 bg-amber-50`: ✓ price card styling present
- `stripe/checkout`: ✓ wired in startCheckout handler
- `qualifyProject` + Qualifier button: ✓ in admin panel
- `activeTab === 'projects'`: ✓ tab switch present
- `qualifyResult` display: ✓ "N lead(s) créé(s)" confirmation present
- TypeScript: clean (exit 0)
- Human checkpoint: visit /espace/premium and /admin Projets tab to verify end-to-end flow
