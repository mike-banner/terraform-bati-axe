---
phase: 08-diffusion-automatique-confiance
plan: 03
subsystem: ui
tags: [vue, nuxt, admin, b2b]

requires:
  - phase: 08-diffusion-automatique-confiance (08-02)
    provides: "Endpoint POST /api/v1/admin/b2b-requests/[id]/diffuse"
provides:
  - "Bouton « Diffuser aux artisans » dans AdminB2bTab.vue, gating décision + code postal"
  - "Fix root-cause : matchZone() appelait une fonction inexistante (useSupabaseServiceRole), cassait aussi le tunnel public /api/v1/projects.post.ts"
affects: []

tech-stack:
  added: []
  patterns:
    - "Gate d'activation UI sur les données persistées (pas le brouillon local non sauvegardé), avec auto-save avant l'action serveur si le brouillon diverge"

key-files:
  created: []
  modified:
    - app/components/admin/AdminB2bTab.vue
    - server/utils/zoneMatcher.ts
    - server/api/v1/projects.post.ts
    - server/api/v1/admin/b2b-requests/[id]/diffuse.post.ts

key-decisions:
  - "canDiffuse() (gate serveur) et canDiffuseDraft() (gate d'affichage) séparés — évite le faux positif où le bouton s'active avant l'enregistrement réel"
  - "matchZone(supabase, postalCode) : le client Supabase est injecté par l'appelant, comme notifyMatchedB2bPros, plutôt que résolu en interne par une fonction inexistante"

patterns-established:
  - "Auto-save du brouillon avant une action serveur qui dépend de champs éditables, pour éviter un clic 'Enregistrer' séparé et le désync brouillon/base"

requirements-completed: [TEND-04, TEND-06, TEND-10, TEND-11, TEND-14]

duration: ~2h30 (incluant checkpoint humain + 2 bugs pré-existants découverts et corrigés)
completed: 2026-09-06
---

# Phase 08: Diffusion automatique et confiance — Plan 03 Summary

**Bouton « Diffuser aux artisans » dans l'admin B2B, avec correction de deux bugs pré-existants découverts pendant la vérification humaine : `matchZone()` appelait une fonction inexistante, et le gating du bouton se basait sur le brouillon non sauvegardé**

## Performance

- **Tasks:** 2/2 (Task 1 bouton, Task 2 checkpoint humain de bout en bout)
- **Files modified:** 4

## Accomplissements
- Bouton « Diffuser aux artisans » dans `AdminB2bTab.vue`, actif uniquement quand statut de décision + code postal (5 chiffres) sont valides
- Vérification humaine complète menée en conversation : dossier avec 2 lots ouverts (peinture, électricité) diffusé sur la zone St-Germain-en-Laye, artisan de test créé pour valider l'envoi réel via Resend (1 notifié, idempotence tracée en base)
- Deux bugs pré-existants corrigés à la racine pendant la vérification :
  1. `matchZone()` appelait `useSupabaseServiceRole()`, une fonction qui n'existe nulle part dans le repo — cassait silencieusement le tunnel public `/api/v1/projects.post.ts` en plus de l'endpoint diffusion B2B
  2. Le bouton lisait le brouillon de saisie non sauvegardé au lieu des données persistées, s'activant avant l'enregistrement réel et provoquant un 422 côté serveur

## Task Commits

1. **Task 1: Bouton diffuser aux artisans** - `69384df` (feat)
2. **Fix root-cause matchZone()** - `06872a6` (fix) — découvert pendant Task 2
3. **Fix gating bouton (persisté vs brouillon)** - `e9e9185` (fix) — découvert pendant Task 2

## Files Created/Modified
- `app/components/admin/AdminB2bTab.vue` - Bouton, gating persisté/brouillon avec auto-save, bandeau d'aide
- `server/utils/zoneMatcher.ts` - `matchZone(supabase, postalCode)` — client injecté par l'appelant
- `server/api/v1/projects.post.ts` - Appel `matchZone` corrigé (tunnel public particuliers)
- `server/api/v1/admin/b2b-requests/[id]/diffuse.post.ts` - Appel `matchZone` corrigé

## Decisions Made
- `matchZone` prend le client Supabase en paramètre (comme `notifyMatchedB2bPros`) plutôt que de le résoudre lui-même — cohérent avec le pattern déjà établi en 08-01, et évite de dupliquer la résolution du client service-role
- Deux fonctions de gate distinctes (`canDiffuse` sur les données persistées, `canDiffuseDraft` sur le brouillon) : la première protège contre un état UI incohérent avec le serveur, la seconde donne un retour visuel immédiat pendant la saisie

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `matchZone()` appelait une fonction inexistante**
- **Trouvé pendant :** Task 2 (vérification humaine — clic « Diffuser » → 500)
- **Problème :** `useSupabaseServiceRole()` n'est défini nulle part dans le repo (bug de la Phase 05.16, jamais déclenché car `matchZone()` n'était pas exercé en pratique) ; cassait aussi `/api/v1/projects.post.ts`, le tunnel public particuliers
- **Fix :** `matchZone(supabase, postalCode)` — client injecté par chaque appelant
- **Fichiers modifiés :** `server/utils/zoneMatcher.ts`, `server/api/v1/projects.post.ts`, `server/api/v1/admin/b2b-requests/[id]/diffuse.post.ts`
- **Vérification :** `npx vitest run` (128/128), test manuel de diffusion réussi (2 lots, 1 artisan notifié)
- **Committed in :** `06872a6`

**2. [Rule 2 - Missing Critical] Bouton actif avant l'enregistrement réel (422)**
- **Trouvé pendant :** Task 2 (vérification humaine — bouton actif malgré code postal non persisté)
- **Problème :** `canDiffuse()` lisait le brouillon local (`draft`), pas la demande persistée (`r`) — le bouton s'activait dès la frappe, avant tout clic sur « Enregistrer », et le serveur (qui vérifie l'état réel en base) renvoyait 422
- **Fix :** gate serveur sur `r` (persisté), gate d'affichage sur `draft` (`canDiffuseDraft`), auto-save du brouillon dans `diffuse()` si divergent avant l'appel API
- **Fichiers modifiés :** `app/components/admin/AdminB2bTab.vue`
- **Vérification :** test manuel — diffusion réussie sans 422 après le fix
- **Committed in :** `e9e9185`

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Les deux corrections étaient nécessaires pour que le checkpoint humain (Task 2) puisse aboutir — sans elles, la diffusion échouait systématiquement. Aucun périmètre ajouté au-delà de ce qui bloquait la vérification.

## Issues Encountered
- Config locale : `.env` avait `EMAIL_LIVE=true` avec une clé Resend sans domaine vérifié (compte différent de la prod où `bati-axe.com` est vérifié) — envois réels temporairement impossibles en local. Basculé en mock (`EMAIL_LIVE=false`) le temps du test, puis restauré à `true` après validation. Aucun changement de code, uniquement un aller-retour de config locale.
- Logs `console.log`/`console.error` invisibles côté Nitro/workerd (émulation Cloudflare Pages en dev) — diagnostic mené via appels directs à l'API Resend hors du serveur.
- Un artisan de test a été créé en base locale (`professionals` id `a761b721-e2ad-4209-8fed-3ea65a75622f`, catégorie électricité, zone St-Germain-en-Laye) pour valider l'envoi réel — données locales uniquement, non versionnées.

## User Setup Required
None - aucune configuration externe manuelle requise pour le code livré. (La vérification du domaine Resend en local reste un sujet d'environnement de dev, hors périmètre de ce plan.)

## Next Phase Readiness
La Phase 8 (diffusion automatique et confiance) est fonctionnellement complète : moteur de matching, endpoint de diffusion, déclencheur UI, gating correct, idempotence vérifiée de bout en bout. Le bug `matchZone()` corrigé bénéficie aussi au tunnel public existant (Phase 4), sans lien direct avec la Phase 8 mais capturé ici car découvert à cette occasion.

---
*Phase: 08-diffusion-automatique-confiance*
*Completed: 2026-09-06*
