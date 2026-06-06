---
plan: 04-01
phase: 04-le-verrou-stripe-billing
status: complete
wave: 1
commit: 400a578
---

# Plan 04-01 — Schema Gaps, Cron, Stripe Config

## What was done

**Task 0 — Stripe SDK**
- `stripe@^22.2.0` was already present in `package.json`. Verified with `node -e "require('./node_modules/stripe/package.json').version"`.

**Task 1 — Migration files**
- `supabase/migrations/20260606000000_phase4_schema_gaps.sql`: adds `lead_status` ENUM value `'claimed'` and `projects.timeline_range TEXT` column.
- `supabase/migrations/20260606000001_phase4_unlock_cron.sql`: enables `pg_cron`, creates `idx_leads_unlock_check` partial index, and schedules hourly `auto-unlock-leads-72h` cron job that transitions leads to `unlocked_at` after 72h (skips `claimed` leads per D-08).

**Task 2 — runtimeConfig + .env.example**
- `nuxt.config.ts`: added `runtimeConfig` block with `stripeSecretKey`, `stripePriceId`, `stripeWebhookSecret` at server-only root level, and `public.siteUrl` for client-side checkout URL construction.
- `.env.example`: documented all 4 new Phase 4 variables with placeholder values.

## Verification

- All `grep` checks pass: `claimed`, `timeline_range`, `cron.schedule`, `idx_leads_unlock_check`, `stripeSecretKey`, all 4 env vars.
- Type errors in typecheck output are pre-existing (projects.post.ts L137/L145/L146, nuxt.config.ts L32 `compatibilityFlags`). No new errors introduced.
- Security: `stripeSecretKey` is under `runtimeConfig` root (server-only), not under `runtimeConfig.public`.
