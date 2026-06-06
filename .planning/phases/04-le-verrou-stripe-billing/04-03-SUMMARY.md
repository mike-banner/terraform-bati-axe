---
plan: 04-03
phase: 04-le-verrou-stripe-billing
status: complete
wave: 2
commit: 23e33ca
---

# Plan 04-03 — maskLead, qualify endpoint, leads API, timeline step

## What was done

**Task 1 — maskLead helper**
- `server/utils/maskLead.ts`: pure function, no DB dependency.
- 3 branches: claimed+!premium → minimal `{id, status, projects:{category,budget_range}}`; locked → masked customer fields; unlocked (premium or 72h) → full data.
- All 4 RED tests from Plan 02 now pass GREEN (LCK-01 Nyquist coverage met).

**Task 2 — API endpoints**
- `server/api/v1/admin/qualify.post.ts`: admin auth → 403, Zod UUID validation, UPDATE projects SET status='qualified', SELECT matching verified pros by category, UPSERT leads with onConflict:'project_id,pro_id' (idempotent).
- `server/api/v1/leads/index.get.ts`: pro auth → 401, service role, isPremium check, full join select, maskLead applied per lead.
- `server/api/v1/leads/[id].get.ts`: ownership enforced via `.eq('pro_id', user.id)` → 404 if cross-pro access attempted.

**Task 3 — timeline_range wiring**
- `server/api/v1/projects.post.ts`: added `timeline_range: z.enum([...]).optional()` and `timeline_range: data.timeline_range ?? null` to INSERT.
- `app/pages/simulateur.vue`: totalSteps 6→7, new step 4 "Délai souhaité" with 5 options (auto-advance on click), steps 4–7 renumbered correctly, success at step 8, timeline shown in recap.

## Verification
- `npm run test -- tests/unit/leads-masking.test.ts` → 4/4 passed ✓
- `serverSupabaseUser` is first statement in both leads endpoints ✓
- `.eq('pro_id', user.id)` ownership check in `[id].get.ts` ✓
- `onConflict: 'project_id,pro_id'` in qualify.post.ts ✓
- `timeline_range` present in projects.post.ts (2 hits) and simulateur.vue (7 hits) ✓
- No new TypeScript errors introduced (pre-existing errors in projects.post.ts and nuxt.config.ts remain)
