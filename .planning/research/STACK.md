# Stack Research

**Domain:** B2B tender broadcast/matching (appel d'offres partenaires → artisans) for a Nuxt 4 + Supabase pilot marketplace
**Researched:** 2026-09-04
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

No new core technology is needed. This feature is a direct clone of the pattern already shipped and running in production code for particulier leads (`server/utils/zoneMatcher.ts`, `server/utils/notifyProLead.ts`, `lead_notifications` table, `pg_cron` job in `20260823000002_p4_lead_notifications.sql`). The existing stack already solves fan-out at this scale.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Nitro server route (existing) | Nuxt 4.5.2 | Runs the matching + fan-out synchronously after `POST /b2b/requests` (or an admin "publier" action) | Same place `notifyMatchedPros()` already runs today for particulier projects — zero new deployment surface |
| Supabase Postgres (existing) | current project version | Source of truth for matching (`professionals.categories`, `pro_zones`, `zones.postal_codes`) and idempotence (`*_notifications` table with `UNIQUE` constraint) | Already does this exact job for `lead_notifications`; RLS + `service_role` client pattern is proven |
| Resend (existing) | `resend@^6.12.4` (installed) | Email delivery to matched artisans | Already wired via `server/utils/email.ts` / `emailLayout.ts`, per-sender templates exist |

### Supporting Libraries

None to add. Reuse:

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.4.3` (installed) | Validate the tender payload / matching input server-side | Same as every other API route (API_RULES.md) |
| `stripe` | `^22.2.0` (installed) | **Not touched this milestone** — access stays gated by existing `pro_zones` subscription status, no commission rail | Only if v3 revisits Stripe Connect (explicitly out of scope for v2) |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI (existing) | Migration for new columns/table (`b2b_requests.category`, `b2b_tender_notifications` or reuse `lead_notifications` with a `kind` discriminator) | Standard migration workflow already in use |
| `pg_cron` (existing extension, already enabled) | Not required for real-time broadcast (fan-out happens synchronously on submit), but usable if a "re-notify unopened tenders after 24h" nudge is wanted later | Optional, not part of MVP |

## Installation

```bash
# Nothing to install — every library needed is already a dependency.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Synchronous Nitro handler loop (sequential `sendEmail` in a `for` loop, same as `notifyMatchedPros`) | Background job queue (BullMQ + Redis, Cloudflare Queues, Supabase Edge Functions + `pg_boss`) | Only past ~hundreds of recipients per event or if email provider latency starts blocking the request past a few seconds. At "dozens of artisans in one département," a sequential loop of `sendEmail` calls completes in well under Nitro's request timeout. |
| Postgres `UNIQUE` constraint table for idempotence (`lead_notifications` pattern) | Dedicated outbox/event-sourcing table with a separate dispatcher worker | Only if notifications need to fan out to multiple channels (SMS, push, webhook) with independent retry policies. Today it's email-only, exactly like the existing lead flow. |
| Reuse `zones`/`pro_zones`/`professionals.categories` matching (`matchZone` + `.contains('categories', [cat])`) | A generalized "subscription/topic" matching engine (e.g. a rules engine, Postgres `LISTEN/NOTIFY` fan-out service) | Only if matching criteria grow far beyond zone+category (e.g. artisan-defined complex filters, real-time bidding). Not the case here — same 2 dimensions as leads. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Redis / BullMQ / any message queue | Massive over-engineering for "dozens of matched artisans per tender" in one pilot département — adds an infra component, a new failure mode, and a bill, to solve a fan-out problem the current sequential-loop-plus-idempotence-table pattern already handles today at production scale (particulier leads) | `notifyMatchedPros`-style loop, already proven |
| Cloudflare Queues / Durable Objects | Same reasoning — real async fan-out infra for a volume that fits in one HTTP request. Nuxt on Cloudflare Pages/Workers already has a request time budget the current pattern stays well inside of | Synchronous Nitro handler |
| Supabase Realtime / WebSocket push to artisan dashboards | Product requirement is "artisan sees the tender when they check their dashboard" (same UX as leads today, no chat), not live push. Adding Realtime here duplicates the existing email-alert UX for no stated need | Email notification + tender appears in a Postgres-backed list query on the existing "espace pro" dashboard, same as leads |
| A new `b2b_apporteur_id`-scoped Stripe product/commission rail | Explicitly out of scope for this milestone (confirmed in PROJECT.md: "pas de nouveau rail de paiement") | Existing `pro_zones` active-subscription check as the access gate |
| New ORM or query builder | Every matching query in this codebase is a plain `supabase-js` `.from().select()` chain; introducing Prisma/Drizzle here would fork query patterns mid-project | `useSupabaseServiceRole()` client, same as `zoneMatcher.ts` / `notifyProLead.ts` |

## Stack Patterns by Variant

**If a tender needs to match multiple categories at once (e.g. an architecte's project spans maçonnerie + électricité):**
- Store `category TEXT[]` on `b2b_requests` (mirrors `professionals.categories TEXT[]`)
- Match with `professionals.categories && b2b_requests.category` (array overlap `&&`, not `.contains`) since either side can have multiple values
- Because `notifyMatchedPros` today only needs `.contains` since a particulier project has exactly one category — this is the one real schema delta from the existing pattern, not a new library

**If the client later wants "re-nudge artisans who haven't opened a tender after 24h":**
- Use the already-enabled `pg_cron` extension with a scheduled query (same style as `auto-unlock-leads-48h`), not a new scheduler dependency

**If volume ever grows past ~1-2k matched pros per event (multi-département rollout):**
- Move the `for` loop to Resend's batch send endpoint (`resend.batch.send`, already in SDK v6) before reaching for a queue — cuts N HTTP round-trips to ceil(N/100) without adding infrastructure

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `resend@^6.12.4` | Nitro on Cloudflare Workers runtime | Already working in production for `notifyProLead.ts` — no compatibility risk since nothing changes here |
| `supabase-js` (via `useSupabaseServiceRole()`) | Postgres array operators (`@>`/`.contains`, `&&`/overlap) | `.contains` used today for single-category match; array-overlap (`&&`) needed only if tender categories become multi-value (see variant above) — both are native `supabase-js` `.filter()`/`.overlaps()` methods, no new library |

## Sources

- Direct inspection of existing codebase (HIGH confidence — this is the actual proven pattern, not external research): `server/utils/zoneMatcher.ts`, `server/utils/notifyProLead.ts`, `server/utils/maskLead.ts`, `supabase/migrations/20260823000002_p4_lead_notifications.sql`, `supabase/migrations/20260828000002_zones_78_packs.sql`, `supabase/migrations/20260822000002_b2b_requests.sql`, `package.json`
- `.planning/PROJECT.md` — v2.0 milestone scope, explicit "no new payment rail" and "no public vitrine" constraints

---
*Stack research for: B2B tender broadcast/matching*
*Researched: 2026-09-04*
