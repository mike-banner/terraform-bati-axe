---
plan: 04-06
phase: 04-le-verrou-stripe-billing
status: complete
wave: 4
commit: aa4a097
---

# Plan 04-06 — Leads Dashboard + Detail Page

## What was done

**LeadCountdown.vue** — `app/components/LeadCountdown.vue`
- Props: `unlockedAt: string`. Computed hours/minutes from remaining ms. 60s interval, cleared on unmount. SVG horloge inline. No lucide.

**leads/index.vue** — `app/pages/espace/leads/index.vue`
- Auth guard via `watchEffect`. `useAsyncData` + `$fetch('/api/v1/leads')`.
- 3 card variants: locked (amber badge + masked mono fields + countdown + Premium CTA), unlocked (foreground/30 badge + real data + "Voir le contact"), claimed (muted badge + masked + no CTA).
- Premium banner when `hasLockedLeads`. Skeleton (3 cards). Empty state. `?upgrade=success` banner auto-dismissed after 6s.
- No lucide, no emerald/sky/slate, `divide-border` card pattern.

**leads/[id].vue** — `app/pages/espace/leads/[id].vue`
- Dynamic `useAsyncData` key. Auth guard. Back link to `/espace/leads`.
- Project info section always visible (budget, timeline, description masked if locked).
- Contact section: unlocked → real data with tel:/mailto: links + Appeler/Email buttons; locked → amber panel + LeadCountdown + Premium CTA; claimed → attribution message.

**Import path fix** — `~/server/utils/maskLead` alias doesn't resolve in server files; changed to relative paths (`../../../utils/maskLead`).

## Verification
- No lucide imports ✓ | No off-system colors ✓ | divide-border present ✓
- `$fetch('/api/v1/leads')` wired ✓ | watchEffect auth guards in both pages ✓
- `upgrade=success` banner condition ✓ | stroke-linecap in countdown ✓
- TypeScript: no new errors from this plan's files ✓
