# Deferred Items — Phase 09 Plan 03

- **`npm run build` cassé indépendamment du plan** : `TypeError: trustedFunctions.difference is not a function` dès `nuxt build`, reproduit avec ou sans les fichiers de ce plan (testé en déplaçant temporairement `server/api/v1/tenders/`). Cause probable : `Set.prototype.difference` (ES2024) requiert Node >= 22, environnement local sur Node 20.20.0. Hors périmètre de ce plan — à traiter dans une passe dédiée à l'environnement de build.
