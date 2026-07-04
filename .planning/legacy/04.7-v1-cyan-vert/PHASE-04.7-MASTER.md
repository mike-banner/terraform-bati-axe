---
phase: 04.7
title: "Refonte UI Globale & Application du Design System"
created: "2026-06-23"
status: "planning_complete"
plans_total: 7
waves: 3
---

# Phase 4.7: Refonte UI Globale & Application du Design System

## Overview

Phase 4.7 is a **CSS and layout refactor** across 16 pages of the BÂTI-AXE platform. Zero logic changes (no state, API, or data model modifications). Pure styling transformation from the current Clash Display + Geist Variable (OKLCH Brique & Béton) design system to **Figtree + Noto Sans (Google Fonts) + cyan/green palette** per `design-system/bati-axe/MASTER.md`.

**Scope:** Landing page, pro forms (claim/profile), pro dashboard (leads grid/detail), premium page, public professional profile, admin console, legal pages.

**Success:** All pages apply MASTER.md design rules. WCAG AA accessibility. Responsive at 375px, 768px, 1024px, 1440px. Pre-delivery checklist 100%.

---

## Phase Goal (from ROADMAP.md)

> Apply the global design system (MASTER.md) across the entire platform to prepare for scale and B2B credibility. Harmonize typography (Figtree + Noto Sans) and color theme (cyan + green) on all pages.

**Requirements:** UI-MASTER-01, UI-LANDING-01, UI-FORMS-01, UI-DASHBOARD-01, UI-PREMIUM-01, UI-PROFILE-PUBLIC-01, UI-ADMIN-01, UI-LEGAL-01, UI-AUDIT-01

---

## Wave Structure

### Wave 1 (Prerequisite: CSS Foundation)
- **04.7-01** — CSS tokens, fonts, color palette, spacing, shadows

### Wave 2 (Parallel Page Refactors)
- **04.7-02** — Landing page (index.vue)
- **04.7-03** — Pro forms (/pro/claim, /pro/profile, /espace/profil)
- **04.7-04** — Pro dashboard (/espace/leads/index, /espace/leads/[id])
- **04.7-05** — Premium + public profile (/espace/premium, /pro/{slug})
- **04.7-06** — Admin + legal (/admin/*, /legal/*)

### Wave 3 (Final Audit)
- **04.7-07** — Accessibility audit, responsive testing, pre-delivery checklist

---

## Plan Summary

| Plan | Title | Tasks | Files | Autonomous | Status |
|------|-------|-------|-------|-----------|--------|
| 04.7-01 | CSS Foundation (fonts, colors, tokens) | 2 | `tailwind.css` | ✅ Yes | TBD |
| 04.7-02 | Landing page refactor | 2 | `index.vue` | ✅ Yes | TBD |
| 04.7-03 | Pro forms (claim, profile) | 2 | `pro/*.vue, espace/profil.vue` | ✅ Yes | TBD |
| 04.7-04 | Pro dashboard (leads grid/detail) | 2 | `espace/leads/*.vue` | ✅ Yes | TBD |
| 04.7-05 | Premium + public profile | 2 | `espace/premium.vue, pro/{slug}.vue` | ✅ Yes | TBD |
| 04.7-06 | Admin + legal pages | 2 | `admin/*.vue, legal/*.vue` | ✅ Yes | TBD |
| 04.7-07 | Accessibility audit + responsive test + checklist | 2 | audit docs | ❌ No (checkpoint) | TBD |

---

## Key Design Decisions (Locked from CONTEXT.md)

1. **Intent = Option C:** Zero logic changes. CSS/layout/typography only. Vue component structure and state management remain untouched.

2. **Font Migration:** Clash Display + Geist Variable (self-hosted) → **Figtree + Noto Sans (Google Fonts)**. No local woff2 files for Phase 4.7+ (simpler management, faster delivery).

3. **Color Palette:** OKLCH Brique & Béton (#9C3B22 brique, #FAF7F4 crème, #1A1614 graphite) → **MASTER.md cyan/green (#0891B2 primary, #22C55E CTA, #ECFEFF background, #164E63 text).**

4. **Design Patterns:** Vibrant & Block-based marketplace pattern with large sections (48px+ gaps), smooth transitions (200-300ms), high color contrast (cyan + green on white/light cyan), responsive grid layouts (1→2→3 columns).

5. **Accessibility:** WCAG AA minimum (4.5:1 text contrast). All focus states visible. Keyboard navigation fully supported. No layout-shifting hovers (shadow + translate only, no scale transforms).

6. **Responsive First:** Mobile-first approach. Test at 375px (mobile), 768px (tablet), 1024px (desktop), 1440px (large desktop). No horizontal scroll at any breakpoint.

---

## Effort Estimates (per plan, context budget)

| Plan | Tasks | Context Cost | Effort Category |
|------|-------|--------------|-----------------|
| 04.7-01 | 2 | ~25% | Medium (CSS foundation) |
| 04.7-02 | 2 | ~20% | Light (single page, hero pattern) |
| 04.7-03 | 2 | ~25% | Medium (3 form pages, input styles) |
| 04.7-04 | 2 | ~25% | Medium (dashboard grid, card layout) |
| 04.7-05 | 2 | ~20% | Light (2 pages, premium CTA, profile) |
| 04.7-06 | 2 | ~20% | Light (admin tables, legal text) |
| 04.7-07 | 2 | ~15% | Light (audit only, no code changes) |

**Total Phase 4.7 Context Budget:** ~170% spread across 7 plans = ~24% per plan (sustainable quality).

---

## Critical Assumptions (Coordinator Provided)

1. **CSS Currently Exists:** `app/assets/css/tailwind.css` exists and loads Clash Display + Geist Variable via @font-face.

2. **Google Fonts Available:** Figtree + Noto Sans can be loaded via Google Fonts CDN without CSP violations (already in CSP).

3. **Tailwind Configured:** Tailwind CSS v4 (via @tailwindcss/vite) is set up in nuxt.config.ts. @theme tokens are supported.

4. **Pages Exist:** All 16 pages to be refactored already exist and render (no new page creation).

5. **Logic Unchanged:** No API changes, no database migrations, no component behavior changes. Pure styling.

---

## Risk Register & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Font loading failure (Google CDN) | High | Pre-test Google Fonts in DevTools; fallback to system fonts in tailwind.css |
| Color contrast violations | High | Audit all text colors vs. backgrounds (4.5:1 minimum) in Task 04.7-07 |
| Responsive layout breaks at edge cases | Medium | Test all breakpoints (375, 768, 1024, 1440px) systematically; use DevTools Device Toolbar |
| Focus state visibility missed | Medium | Verify outline/ring on all inputs/buttons in keyboard nav test (Task 04.7-07) |
| Emoji icons left in code | Low | Grep for emoji characters; replace with SVG icons from Heroicons/Lucide |

---

## Dependencies & Sequencing

**Phase 4.7 → Phase 5 (SMS + Acquisition + Messagerie):**
- Phase 5 builds on the new design system. Premium page CTA drives conversions; messaging UI must match design.
- Phase 4.7 must complete BEFORE Phase 5 starts (UI is foundation for new features).

**Within Phase 4.7:**
- Wave 1 (04.7-01) must complete before Wave 2 (all other plans depend on CSS foundation).
- Wave 2 plans (04.7-02 through 04.7-06) can run **in parallel** (no file conflicts, independent pages).
- Wave 3 (04.7-07) runs last (audit after all pages refactored).

---

## Success Criteria (ROADMAP.md)

✅ Phase 4.7 is complete when:

1. **All pages apply MASTER.md design rules:**
   - Color palette: Cyan (#0891B2), green (#22C55E), light cyan (#ECFEFF), dark cyan (#164E63)
   - Typography: Figtree (headings), Noto Sans (body)
   - Spacing: Responsive clamp, --space-* tokens
   - Shadows: sm/md/lg/xl with 200-300ms ease
   - Radius: 8px (buttons), 12px (cards), 16px (modals)

2. **Accessibility (WCAG AA):**
   - All text: 4.5:1 contrast minimum
   - All focus states: visible outline or ring
   - All forms: fully keyboard accessible
   - Lighthouse score: 90+ per page

3. **Responsive (all breakpoints):**
   - 375px: single column, no horizontal scroll
   - 768px: 2-column grids visible
   - 1024px: 3-column grids visible
   - 1440px: max-width container, no stretch

4. **Pre-Delivery Checklist (14 items):**
   - No emoji icons, cursor:pointer on clickables, hover transitions, focus visible
   - Typography consistent, colors matched, spacing systematic
   - No console errors, build succeeds

5. **Zero Data Loss:**
   - No state, API, or database changes
   - All existing functionality works as before
   - No breaking changes to component contracts

---

## Deliverables

### Plan Files (7)
- `.planning/phases/04.7-UI-Refonte/04.7-01-PLAN.md` (CSS foundation)
- `.planning/phases/04.7-UI-Refonte/04.7-02-PLAN.md` (landing)
- `.planning/phases/04.7-UI-Refonte/04.7-03-PLAN.md` (forms)
- `.planning/phases/04.7-UI-Refonte/04.7-04-PLAN.md` (dashboard)
- `.planning/phases/04.7-UI-Refonte/04.7-05-PLAN.md` (premium + profile)
- `.planning/phases/04.7-UI-Refonte/04.7-06-PLAN.md` (admin + legal)
- `.planning/phases/04.7-UI-Refonte/04.7-07-PLAN.md` (audit)

### Execution Outputs (after each plan)
- 6 SUMMARY.md files (one per plan 01–06)
- 3 audit documents (Task 2 of plan 07):
  - `ACCESSIBILITY-AUDIT.md` (WCAG AA + Lighthouse checks)
  - `RESPONSIVE-TEST.md` (375/768/1024/1440px breakpoint tests)
  - `PRE-DELIVERY-CHECKLIST.md` (14-item verification)

---

## Commit Strategy

Each plan creates **one atomic commit** per completion:

```bash
# Example commits
git commit -m "style(04.7-01): add Google Fonts Figtree+Noto, MASTER.md color tokens"
git commit -m "style(04.7-02): refactor landing page to MASTER.md Marketplace pattern"
git commit -m "style(04.7-03): apply MASTER.md form input styles (claim, profile)"
git commit -m "style(04.7-04): apply MASTER.md card grid layout (leads dashboard)"
git commit -m "style(04.7-05): apply MASTER.md CTA + profile styling (premium, public)"
git commit -m "style(04.7-06): apply MASTER.md table + text layouts (admin, legal)"
git commit -m "docs(04.7-07): accessibility, responsive, pre-delivery audit complete"
```

All commits authored by user (no "Claude" / "AI" trailers per NO_AI_FOOTPRINT.md).

---

## Communication to User

**Before Execution:**
> Phase 4.7 plan is ready. 7 atomic plans across 3 waves. Wave 1 (CSS foundation) must complete first; Wave 2 (page refactors) can run in parallel; Wave 3 (audit) validates all. Estimated ~170% context total, ~24% per plan. Execute with `/gsd:execute-phase 04.7`.

**After Execution:**
> Phase 4.7 complete. All pages refactored to MASTER.md design system (Figtree + Noto fonts, cyan/green palette, responsive layouts). WCAG AA accessibility verified. Pre-delivery checklist 100%. Ready to hand off to Phase 5 (SMS + Acquisition + Messagerie).

---

## Next Steps

1. **User confirms plan readiness** (or requests modifications)
2. **Execute Wave 1** (`/gsd:execute-phase 04.7 --plan 01`)
3. **Execute Wave 2 in parallel** (plans 02–06 can run concurrently after 01 completes)
4. **Execute Wave 3** (plan 07, audit and validation)
5. **Deliver to Phase 5** (messaging UI can now be styled with design system)

---

**Phase 4.7 Planning Complete.**
Created: 2026-06-23
Status: Ready for Execution
