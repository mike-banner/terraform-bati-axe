---
phase: 08
slug: diffusion-automatique-confiance
status: planned
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
| 08-01-03 | 01 | 1 | TEND-04 | — | Matching zone×catégorie×vérification exclut un pro sans zone active | unit | `npx vitest run tests/unit/notify-b2b-pros.test.ts` | créé par la tâche (TDD) | ⬜ pending |
| 08-01-03 | 01 | 1 | TEND-06 | T-08-01 | Email envoyé une seule fois par (pro, lot) même si diffusion relancée | unit | `npx vitest run tests/unit/notify-b2b-pros.test.ts::idempotence` | créé par la tâche (TDD) | ⬜ pending |
| 08-01-03 | 01 | 1 | TEND-14 | — | Badge « AO qualifié BÂTI-AXE » présent dans le HTML de l'email généré | unit | `npx vitest run tests/unit/notify-b2b-pros.test.ts::badge` | créé par la tâche (TDD) | ⬜ pending |
| 08-02-02 | 02 | 2 | TEND-10 | T-08-02 | Bouton « Diffuser » actionnable seulement si `decision_status` + `project_postal_code` renseignés | unit/e2e | `npx vitest run tests/unit/b2b-diffuse.test.ts` | créé par la tâche (TDD) | ⬜ pending |
| 08-02-02 | 02 | 2 | TEND-11 | T-08-01 | Plafond AO actifs/partenaire bloque (409), plafond notifs/artisan/jour skip silencieux | unit | `npx vitest run tests/unit/b2b-diffuse.test.ts::rate-limit` | créé par la tâche (TDD) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Pas de plan Wave 0 séparé : les deux fichiers de tests sont créés **avant**
l'implémentation dans leur tâche `tdd="true"` respective (le bloc `<behavior>`
du plan liste les assertions exactes à écrire en premier).
- [ ] `tests/unit/notify-b2b-pros.test.ts` — TEND-04, TEND-06, TEND-14 — plan 08-01, tâche 3 (9 tests)
- [ ] `tests/unit/b2b-diffuse.test.ts` — TEND-10, TEND-11 — plan 08-02, tâche 2 (9 tests)
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
