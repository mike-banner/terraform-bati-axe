---
plan: 04-05
status: complete
commit: de1a696
---

## What was built

- `server/api/v1/stripe/checkout.post.ts` — POST endpoint, auth-gated, creates Stripe Checkout Session with `mode: 'subscription'`. Reuses `stripe_customer_id` if pro has one (D-15), otherwise uses `customer_email`. Returns `{ url }`. Uses `Stripe.createFetchHttpClient()` (Cloudflare-safe).
- `server/api/v1/stripe/webhook.post.ts` — POST endpoint, Stripe-authenticated via HMAC signature. Uses `readRawBody` (not `readBody`), `constructEventAsync` + `SubtleCryptoProvider` as 5th argument (Cloudflare V8 requirement). Delegates event handling to `handleStripeEvent` utility.
- `server/utils/handleStripeEvent.ts` — extracted D-14 event→DB mapping for testability. Handles `checkout.session.completed` → `active` + `stripe_customer_id`, `customer.subscription.deleted` → `canceled`, `invoice.payment_failed` → `unpaid`.

## Verification

- `readRawBody`: ✓ present in webhook
- `constructEventAsync`: ✓ present (not `constructEvent`)
- `createSubtleCryptoProvider`: ✓ 5th argument
- `createFetchHttpClient`: ✓ both endpoints
- `serverSupabaseUser` in webhook: ✗ absent (correct — webhook is not user-authenticated)
- Tests: 3/3 GREEN (`tests/unit/stripe-webhook.test.ts`)
- TypeScript: clean (exit 0)
