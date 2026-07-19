
## 2026-07-17 — 05.5-02

- `tests/badges.test.ts` (BadgeEntrepriseVerifiee / BadgeDecennaleCertifiee) échoue en pré-existant : les composants utilisent maintenant `bg-[#F8FAFC]` (nouvelle charte) au lieu de `bg-cyan-100/80` / `bg-green-100/80` attendus par le test. Hors scope du plan 05.5-02 (pas dans `files_modified`), non touché.
