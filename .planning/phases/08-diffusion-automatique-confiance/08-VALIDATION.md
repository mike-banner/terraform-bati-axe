---
phase: 08
slug: diffusion-automatique-confiance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-05
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (tests unitaires existants, ex. `handleLeadDecision.test.ts` Phase 05.13) |
| **Config file** | `vitest.config.ts` (racine projet) |
| **Quick run command** | `npx vitest run <fichier>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 secondes |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <fichier concerné>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 secondes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | TEND-04 | — | Matching zone×catégorie×vérification exclut un pro sans zone active | unit | `npx vitest run tests/notifyMatchedB2bPros.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 0 | TEND-06 | T-08-01 | Email envoyé une seule fois par (pro, lot) même si diffusion relancée | unit | `npx vitest run tests/notifyMatchedB2bPros.test.ts::idempotence` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 0 | TEND-14 | — | Badge « AO qualifié BÂTI-AXE » présent dans le HTML de l'email généré | unit | `npx vitest run tests/notifyMatchedB2bPros.test.ts::badge` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 0 | TEND-10 | T-08-02 | Bouton « Diffuser » actionnable seulement si `decision_status` + `project_postal_code` renseignés | unit/e2e | `npx vitest run tests/diffuse.post.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 0 | TEND-11 | T-08-01 | Plafond AO actifs/partenaire bloque (409), plafond notifs/artisan/jour skip silencieux | unit | `npx vitest run tests/diffuse.post.test.ts::rate-limit` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/notifyMatchedB2bPros.test.ts` — stubs pour TEND-04, TEND-06, TEND-14 (matching, idempotence, badge email) — mock Supabase comme dans `handleLeadDecision.test.ts` (05.13)
- [ ] `tests/diffuse.post.test.ts` — stubs pour TEND-10, TEND-11 (gating bouton/endpoint, plafonds)
- Framework déjà installé, aucune installation requise

---

## Manual-Only Verifications

*Aucune — tous les comportements de la phase ont une vérification automatisée (unit + e2e ciblés).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
