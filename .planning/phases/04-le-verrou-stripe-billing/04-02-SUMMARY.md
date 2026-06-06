---
plan: 04-02
phase: 04-le-verrou-stripe-billing
status: complete
wave: 2
commit: 063e273
---

# Plan 04-02 — Schema Push, vitest, RED Test Stubs

## What was done

**Task 1 — vitest**
- `vitest@^4.1.8` installed as devDependency.
- `vitest.config.ts` created at project root: `globals: true`, `environment: node`, `include: tests/**/*.test.ts`, `reporters: verbose`.
- `"test": "vitest run"` added to package.json scripts (no watch mode).

**Task 2 — Schema push (human checkpoint)**
- User confirmed `supabase db push` completed successfully.
- `leads.status` ENUM now contains `'claimed'`; `projects.timeline_range` column exists.
- pg_cron `auto-unlock-leads-72h` job registered.

**Task 3 — RED test stubs**
- `tests/unit/leads-masking.test.ts`: 4 tests covering D-05/D-06/D-07/D-10 masking behaviors, importing `maskLead` from `server/utils/maskLead.ts` (created in Plan 03).
- `tests/unit/stripe-webhook.test.ts`: 3 tests covering D-14 event types (`checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`), importing `handleStripeEvent` from `server/utils/handleStripeEvent.ts` (created in Plan 05). Uses `vi.fn()` mock chain — no Stripe signature infrastructure needed.
- `npm run test` exits with 2 failed files (ERR_MODULE_NOT_FOUND) — correct RED state.

## Verification
- `grep maskLead tests/unit/leads-masking.test.ts` ✓
- `grep handleStripeEvent tests/unit/stripe-webhook.test.ts` ✓
- `npm run test` reports 2 failed (module not found) — not a config failure ✓
