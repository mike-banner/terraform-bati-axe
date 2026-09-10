---
title: "Audit Mobile P2 Backlog — À faire après les P0/P1"
date: 2026-09-10
---

# P2 — Minor Issues (After P0/P1 Fixes)

## [P2] Images sans lazy loading
- **Scope**: app/components/RealisationCard.vue, BeforeAfterSlider.vue
- **Fix**: Ajouter `loading="lazy"` + `fetchpriority="low"`
- **Impact**: Accélère First Contentful Paint (FCP)
- **Command**: `/impeccable optimize`

## [P2] Nested bento cards (monotonie visuelle)
- **Locations**:
  - app/pages/index.vue (8 cards) 
  - app/pages/simulateur.vue (5 cards)
  - app/pages/espace/profil.vue (4 cards)
- **Fix**: Asymétric grid layout OU réduire à 3-4 cartes max
- **Impact**: Rompre le bruit visuel, améliorer hiérarchie
- **Command**: `/impeccable bolder`

## [P2] Fixed-width text truncation mobile
- **Location**: app/pages/espace/dashboard.vue:373-374 (`max-w-[180px]`)
- **Fix**: Stack vertically sur mobile (grid-cols-1 sm:grid-cols-2) OU `overflow-x-auto` parent
- **Impact**: Noms de fichiers lisibles à 320px
- **Command**: `/impeccable adapt`

## [P2] Uppercase tracked labels ubiquitaire (80 instances)
- **Impact**: AI-scaffold feel, voice non distinctive
- **Fix**: Garder form labels requis, réduire section eyebrows → min-case ou petite caps
- **Command**: `/impeccable quieter`

---

**Status**: À commencer après que P0/P1 soient mergés et testés.
**Estimated time**: ~2h pour les 4 commandes polish/optimize/adapt/quieter
