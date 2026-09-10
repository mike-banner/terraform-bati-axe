---
title: "Dark Mode Implementation Plan (P0)"
date: 2026-09-10
---

# Dark Mode Strategy — P0 Priority

## Status Quo

✓ CSS dark mode **fully defined** (`:root .dark { --color-primary, --color-background, etc. }`)  
✗ **Zero `.dark:` variants in components** — dark mode is 0% implemented  
✗ **Tailwind slate-* classes** break in dark (no token mapping)

## Problem

Classes like `text-slate-500`, `bg-slate-800`, `text-slate-300` are Tailwind defaults, not tied to token system. When user switches to dark mode, these stay the same color (e.g., slate-500 stays `#64748B` which is now unreadable on dark backgrounds).

## Solution Path

### Phase 1: Replace `text-slate-*` with token classes (Immediate)

Current state:
```vue
<p class="text-slate-600">Body text</p>
<span class="text-slate-400">Secondary</span>
<div class="bg-slate-50">Card background</div>
```

Target:
```vue
<p class="text-foreground">Body text</p>
<span class="text-muted-foreground">Secondary</span>
<div class="bg-background">Card background</div>
```

**Why**: Token classes (`text-foreground`, `bg-background`) are wired to CSS variables that change in `.dark` mode. Tailwind slate classes are not.

**Scope**: ~50 instances across:
- index.vue (hero, sections)
- simulateur.vue
- pro/claim.vue
- espace/* pages  
- admin/* pages
- Components (badges, cards, forms)

### Phase 2: Add `.dark:` overrides for "dark-first" styled sections (Advanced)

Some sections intentionally use dark backgrounds (e.g., hero dark card, manifesto banner). These need explicit dark mode variants:

```vue
<!-- bg-slate-800 in light mode → bg-slate-900 in dark mode (darker) -->
<div class="bg-slate-800 dark:bg-slate-900 text-white dark:text-white/95">
```

**Scope**: ~10 intentional dark backgrounds (index.vue, sections)  
✓ Already started (index.vue sections done)

### Phase 3: Verify and test (Final)

1. Visual smoke test at 320/390/1440px (light + dark mode)
2. Contrast check (slate tokens in dark should still hit 4.5:1)
3. Check prefers-color-scheme media queries work

---

## Implementation Order

### Batch 1 (Quick wins — replace token classes)
1. **index.vue** — hero, sections, manifesto
2. **simulateur.vue** — steps, validation messages
3. **espace/premium.vue** — billing recap
4. **espace/dashboard.vue** — form labels
5. **pro/claim.vue** — onboarding form

### Batch 2 (Components)
6. **VerifiedBadge, BadgeDecennale** — already fixed ✓
7. **Form inputs** — label colors
8. **Cards/Bento** — text colors

### Batch 3 (Admin + Edge cases)
9. **admin/** pages — all tabs
10. **Error/empty states** — alert text colors

---

## Quick Audit: Find Remaining Issues

```bash
# Find all slate-* classes (non-token colors)
grep -r "text-slate-\|bg-slate-" app/pages app/components --include="*.vue" | grep -v "text-foreground\|bg-background\|dark:" | wc -l

# Find specific bad patterns
grep -r "bg-\[#\|text-\[#" app --include="*.vue" | grep -v "dark:" | head -10
```

---

## Estimated Effort

| Phase | Files | Edits | Time |
|-------|-------|-------|------|
| 1. Replace token classes | 15-20 | ~80-100 | 1.5h |
| 2. Dark mode overrides | 10-15 | ~40-50 | 0.75h |
| 3. Test + QA | - | - | 0.5h |
| **Total** | | | **2.75h** |

---

## Next Steps

1. `/impeccable polish` — systematic token class replacement (Batch 1)
2. Visual QA in browser (light + dark toggle)
3. `/impeccable audit` re-run → should boost Theming score from 1/4 → 3/4

---

**Status**: Ready to start. Batch 1 can begin immediately after this plan is approved.
