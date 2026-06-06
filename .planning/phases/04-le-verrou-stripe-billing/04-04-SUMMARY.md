---
plan: 04-04
phase: 04-le-verrou-stripe-billing
status: complete
wave: 3
commit: fad5fff
---

# Plan 04-04 — PATCH /api/v1/leads/[id]/claim

## What was done

**Task 1 — claim.patch.ts**
- `server/api/v1/leads/[id]/claim.patch.ts` created.
- Flow: 401 (no auth) → 400 (no id) → 404 (pro not found) → 403 (not Premium) → 404 (lead not owned) → 409 (already claimed) → UPDATE own row → propagate to siblings → `{ claimed: true, lead_id }`.
- Sibling propagation: `.update({ status: 'claimed' }).eq('project_id', lead.project_id).neq('pro_id', user.id)` — ensures BASIC pros see "Déjà attribué" after a Premium claims the lead (D-10).
- Double ownership check on both SELECT and UPDATE (T-04-10).

## Verification
- `subscription_status !== 'active'` → 403 ✓
- `.eq('pro_id', user.id)` appears twice (SELECT + UPDATE) ✓
- `.neq('pro_id', user.id)` for sibling propagation ✓
- `lead.status === 'claimed'` → 409 idempotence guard ✓
- No new TypeScript errors introduced (pre-existing errors in dashboard.vue and nuxt.config.ts remain)
