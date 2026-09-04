# Feature Research

**Domain:** B2B tender/RFP broadcast marketplace (appel d'offres partenaires → artisans), construction/copropriété vertical, France
**Researched:** 2026-09-04
**Confidence:** MEDIUM (generic B2B lead-broadcast patterns are well-established and cross-verified; syndic/copropriété legal specifics verified against French legal sources; no direct access to internal product docs of BTP Direct/Hello Artisan/Matera — inferred from public descriptions and domain knowledge)

## Feature Landscape

### Table Stakes (Users Expect These)

Every "poster posts a tender → matching suppliers respond" marketplace (BTP Direct, Hello Artisan, Homejob, travaux.com-style lead platforms, and generic B2B RFP tools like Sourcing Force) converges on the same skeleton:

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Tender creation form scoped to persona | Each partner type has different context (architecte = client project, syndic = building works, diagnostiqueur = post-DPE referral, agent immo = pre-sale reno) | LOW | `b2b_requests` already has `apporteur_type`; extend with conditional fields, don't fork into 4 tables |
| Zone + catégorie matching | This is the entire value prop — reuses existing `professionals.categories TEXT[]` + zone subscription logic already built for particulier leads | LOW | Same matching engine as B2C leads (Phase 4.6), just a new source table |
| Notification to matched artisans (email) | Artisans won't poll a dashboard; they expect a push the moment a tender matches their zone/category | LOW | Email infra already shipped (06.3 notifications transactionnelles) — reuse template pattern |
| Artisan-side list of open tenders (dashboard) | Artisans expect a persistent place to see what's live, not just a one-shot email | LOW-MEDIUM | New page in `/pro/espace/`, filtered by artisan's own zone/categories |
| Claim / "je suis intéressé" action | Simplest possible response mechanism — one click, no negotiation UI | LOW | Mirrors existing lead-unlock claim pattern already built for B2C |
| Contact reveal on claim | Once claimed, artisan needs partner's coordinates to call — same masking-then-reveal pattern as ADR-004 | LOW | Reuse `maskLead.ts` pattern, do not re-invent |
| Tender status lifecycle (ouvert / en cours / clos) | Partner needs to know if their tender got traction, admin needs to track pipeline | LOW | `b2b_request_status` enum already exists, extend rather than replace |
| Expiration / auto-close after N days | Prevents stale tenders lingering forever, matches existing auto-unlock timing pattern | LOW | Reuse existing timed-unlock cron infra |
| Multiple artisans can see + claim the same tender | Unlike current DirCo flow (2-3 hand-picked pros), self-service broadcast means several matched artisans see it simultaneously | LOW | This IS the core change from v1 — no new mechanism needed, just remove the manual DirCo gate |

### Differentiators (Competitive Advantage)

Not required for a functioning tender flow, but where BÂTI-AXE's existing trust layer (décennale verification, zone exclusivity) gives it an edge over generic lead-gen marketplaces:

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Décennale-verified-only matching | Partners (esp. syndics, legally exposed under mise-en-concurrence rules) get pre-vetted artisans, not a random directory — this is BÂTI-AXE's whole thesis applied to B2B | LOW | Already enforced at signup for `professionals` table — just don't bypass it for tender matching |
| "Qualifications requises" tag-matching beyond raw category | DirCo already qualifies dossiers with `qualifications_requises TEXT[]` (labels like RGE, amiante) — surfacing this as a hard/soft filter in auto-matching is a genuine differentiator vs. category-only competitors | MEDIUM | Requires artisan profile to expose comparable qualification tags to match against; if that data doesn't exist yet on `professionals`, this degrades gracefully to category-only matching |
| Syndic multi-lot tender (one AG project → several trade categories) | Syndic works often bundle several corps de métier (toiture + façade + électricité) voted together — letting a syndic post one tender that fans out matching per sub-lot to the right specialist per trade is genuinely differentiated vs. a single-category form | MEDIUM | See Feature Dependencies below — this is the one real structural difference for the syndic persona |
| "Devis multiples" tracking for mise en concurrence compliance | French law requires syndics to solicit 2-3 devis before AG vote (village-justice.com, coproconseils.fr) — a lightweight status view showing "3 artisans claimed, 2 devis reçus" helps the syndic build their AG dossier and is a legit persona-specific value-add | MEDIUM | Track claims + optional "devis déposé" checkbox per claim; do NOT build a bidding/quote-comparison engine (see anti-features) |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Multi-artisan bidding war / reverse auction (lowest quote wins, in-platform) | "Let artisans compete on price, partner picks the best" feels natural for a "tender" | Turns BÂTI-AXE into a price-comparison engine, undermines the decennale-trust positioning, and at "handful of partners / dozens of artisans" scale there's no volume to make an auction meaningful — it's solving a problem the pilot doesn't have | Claim-based interest list; partner calls the claimants directly and negotiates off-platform, exactly like current DirCo phone/email flow but self-service |
| In-platform quote upload/comparison UI | Feels like the "complete" version of a tender flow | Real quotes have line items, VAT, revision cycles — building a document/negotiation workflow is a multi-week feature for a volume nobody has proven yet | Artisans send devis directly to partner's email/phone (already captured); optionally a boolean "devis envoyé" flag for tracking |
| Escrow / payment holding on tender award | Sounds like it "closes the loop" | Explicitly out of scope for this milestone per PROJECT.md — no Stripe Connect, no commission rail proven yet | None needed — payment stays fully outside the platform, as today |
| Dispute resolution / rating system between partner and artisan | Common in generic marketplaces (Upwork-style) | No volume to justify moderation tooling; decennale verification already does the trust job upstream | None — if disputes arise at pilot scale, handle manually via admin/DirCo like today |
| Full public directory/vitrine per partner | Feels like parity with the artisan-facing marketplace | Explicitly decided out of scope 2026-09-04 (PROJECT.md) — partners are demand-side, not supply-side | None — partner identity stays private, visible only to matched artisans post-claim |
| Real-time bid notifications / live "X artisans viewing" | Common UX flourish on gig platforms | Pure vanity feature at dozens-of-artisans scale, adds infra complexity (websockets/polling) for zero decision value | Static claim count on the tender + email notification is enough |
| Separate tender tables per persona (architecte_tenders, syndic_tenders, etc.) | Each persona genuinely has different fields, tempting to model as separate entities | Fragments matching logic 4 ways, duplicates RLS/admin tooling, makes cross-persona reporting painful — the existing `b2b_requests` single-table-with-nullable-columns pattern already proved itself for the intake form | One `b2b_requests`-derived table (or the same table, extended) with persona-conditional nullable columns, exactly like the existing `certification_number`/`travaux_suggeres` diagnostiqueur-only columns added in 05.17 |

## Feature Dependencies

```
[Zone + catégorie matching engine]
    └──requires──> [existing professionals.categories / zone subscription] (already built, B2C)

[Notify matched artisans]
    └──requires──> [Zone + catégorie matching engine]
    └──requires──> [existing email transactional infra] (already built, 06.3)

[Artisan claim action]
    └──requires──> [Notify matched artisans] (artisan needs to know tender exists first, via email or dashboard)
    └──requires──> [Contact reveal on claim] (masking pattern, ADR-004)

[Tender status lifecycle]
    └──requires──> [Artisan claim action] (status transitions driven by claim events)

[Syndic multi-lot tender]
    └──requires──> [Zone + catégorie matching engine] (fans out per sub-lot/category, not a new matcher)
    └──enhances──> [Tender creation form] (adds a "plusieurs corps de métier" sub-form, syndic-only)

[Devis-tracking for mise en concurrence]
    └──requires──> [Artisan claim action] (claims are the substrate for the "N devis reçus" counter)
    └──enhances──> [Syndic multi-lot tender] (most relevant to syndic persona, but works for any tender)

[Multi-artisan bidding war] ──conflicts──> [Décennale-verified trust positioning]
[In-platform quote comparison] ──conflicts──> [Pilot scale / no proven volume]
```

### Dependency Notes

- **Everything downstream of matching+notification is a thin layer on infrastructure BÂTI-AXE already built for B2C leads** (zone/category matching, masking-then-reveal, timed auto-unlock, transactional email). The genuinely new build surface is narrow: the tender-side form, the "who matched" fan-out query, and the claim/status UI on both partner and artisan sides.
- **Syndic multi-lot is the one true structural divergence** between personas. Architecte/agent immo/diagnostiqueur tenders map 1:1 onto the existing single-category `b2b_requests` shape (a project needing one type of trade). A syndic AG-voted building project can legitimately need façade + toiture + électricité simultaneously, each going to a different specialist. Modeling this as N single-category tenders sharing a parent (rather than inventing a bidding/lot-management system) keeps it inside the existing matching engine.
- **Mise-en-concurrence compliance is a legal fact for syndics** (2-3 devis required before AG vote per French copropriété law, and urgent works can bypass the vote but must be ratified after the fact — village-justice.com, coproconseils.fr). This doesn't require new tech, just makes the "count of claims/devis received" surfacing genuinely useful to that one persona rather than cosmetic.

## MVP Definition

### Launch With (v1 of this milestone)

- [ ] Extend `b2b_requests` (or a thin sibling table) with tender fields per persona (conditional nullable columns, following the existing 05.17 pattern) — essential, avoids re-architecting intake
- [ ] Zone + catégorie matching against `professionals` on tender submission — essential, this IS the feature (replaces manual DirCo triage)
- [ ] Email notification to matched artisans — essential, artisans won't check a dashboard proactively
- [ ] Artisan dashboard list of open matched tenders — essential, persistent access point beyond the one-shot email
- [ ] Claim action + masked-then-revealed partner contact — essential, this is the entire "response" mechanism for v1
- [ ] Tender status (ouvert/clos) driven by claims + expiration — essential for partner/admin visibility
- [ ] Syndic multi-lot sub-form (post one AG project, fan out per corps de métier) — essential per milestone scope, this is the one persona-specific structural need

### Add After Validation (v1.x)

- [ ] "Devis déposé" boolean per claim, surfaced as a count to the partner — trigger: syndic partners ask how to build their AG mise-en-concurrence dossier from the platform
- [ ] Qualification-tag soft-matching (RGE, amiante, etc.) beyond raw category — trigger: false-positive matches reported by artisans/partners once volume exists to notice the pattern
- [ ] Admin override/manual re-route (fallback to today's DirCo pick) for edge-case tenders — trigger: a tender genuinely doesn't fit auto-matching (e.g. ambiguous catégorie)

### Future Consideration (v2+)

- [ ] In-platform devis upload/comparison — defer until pilot proves partners want to compare inside the tool rather than by phone/email
- [ ] Commission / Stripe Connect on B2B — already explicitly deferred in PROJECT.md, no volume yet
- [ ] Public partner directory/vitrine — already explicitly deferred in PROJECT.md, partner stays demand-side only

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Zone/catégorie auto-matching on tender submit | HIGH | LOW | P1 |
| Email notification to matched artisans | HIGH | LOW | P1 |
| Artisan claim + contact reveal | HIGH | LOW | P1 |
| Artisan dashboard (open tenders list) | HIGH | LOW-MEDIUM | P1 |
| Syndic multi-lot tender form | MEDIUM-HIGH (only for syndic persona, but explicitly in milestone scope) | MEDIUM | P1 |
| Tender status lifecycle + auto-expiration | MEDIUM | LOW | P1 |
| Devis-tracking counter for syndic dossier | MEDIUM | MEDIUM | P2 |
| Qualification-tag soft-matching | MEDIUM | MEDIUM | P2 |
| In-platform quote comparison | LOW at this scale | HIGH | P3 |
| Multi-artisan bidding/reverse auction | LOW at this scale, conflicts with positioning | HIGH | Not planned |

## Competitor Feature Analysis

Direct feature-by-feature documentation from BTP Direct, Hello Artisan, Homejob, Syneval, Matera was not accessible via public search — French B2B tender marketplaces of this size generally don't publish detailed product docs. Findings below are inferred from public marketing pages, aggregator descriptions (obat.fr, onceforall.fr), and French copropriété legal sources, not verified against internal product documentation. Treat as directional, not authoritative.

| Feature | Generic BTP lead/tender aggregators (France Marchés-style) | Copropriété legal requirement (verified) | Our Approach |
|---------|--------------------------------------------------------------|-------------------------------------------|--------------|
| Matching mechanism | Keyword/sector + geography alert subscriptions, artisan opts in to alerts | N/A | Push-based auto-match on submission (no artisan alert-config step needed, matching already derived from existing subscription zone/category) |
| Response mechanism | Artisan downloads DCE (dossier de consultation) and submits a formal response outside platform | N/A | One-click claim, contact reveal, negotiation happens by phone — much lighter than public-market DCE process, appropriate for private/pilot scale |
| Number of devis required | N/A (public procurement has its own formal rules) | Copropriété AG must set a threshold above which syndic solicits multiple devis (typically 2-3) before vote (village-justice.com) | Claim counter doubles as informal devis-count tracking for syndic, no enforcement, just visibility |
| Urgency bypass | N/A | Syndic can commission urgent works without prior AG vote, must ratify after the fact (coproconseils.fr) | Not modeled in v1 — urgent syndic works can just be posted as a normal tender with fast expiration; formal ratification is the syndic's own paperwork, out of platform scope |

## Sources

- [6 plateformes pour trouver des appels d'offres BTP en 2026 — obat.fr](https://www.obat.fr/blog/appels-d-offres-batiment/) — MEDIUM confidence, generic BTP aggregator landscape
- [Trouver appels d'offres BTP — onceforall.fr](https://onceforall.fr/trouver-appels-doffres-btp/) — MEDIUM confidence, same landscape
- [Copropriété : faut-il deux ou trois devis avant de voter des travaux ? — village-justice.com](https://www.village-justice.com/articles/copropriete-faut-deux-trois-devis-avant-voter-des-travaux,30958.html) — HIGH confidence, legal source, cites mise-en-concurrence obligation
- [Travaux sur les parties communes — coproconseils.fr](https://www.coproconseils.fr/travaux-sur-les-parties-communes-en-copropriete/) — MEDIUM confidence, corroborates AG vote + urgency-bypass rule
- Internal: `supabase/migrations/20260822000002_b2b_requests.sql`, `20260822000003_b2b_dirco.sql`, `20260830000001_diagnostiqueur_apporteur.sql` — existing schema this milestone extends
- Internal: `.planning/PROJECT.md` v2.0 milestone scope — explicit out-of-scope decisions (vitrine, Stripe Connect)

---
*Feature research for: B2B tender broadcast (BÂTI-AXE v2.0 "Partenaires en scène")*
*Researched: 2026-09-04*
