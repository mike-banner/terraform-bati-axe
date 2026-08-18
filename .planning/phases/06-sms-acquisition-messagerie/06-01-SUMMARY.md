---
phase: 06-sms-acquisition-messagerie
plan: 01
subsystem: espace-client-messagerie
tags: [magic-link, messagerie-async, resend, verrou-deblocage]

dependency-graph:
  requires:
    - "server/utils/maskLead.ts (ADR-004) — logique isUnlocked répliquée pour le verrou messagerie"
    - "table professionals.subscription_status, leads.unlocked_at, free_lead_grants"
  provides:
    - "projects.access_token — lien magique par projet"
    - "table messages — thread async pro↔particulier"
    - "server/api/v1/magic-link/[token].get.ts — API publique Espace Client"
    - "app/pages/mon-projet/[token].vue — UI particulier"
    - "server/api/v1/messages/index.post.ts (pro) et /messages/client.post.ts (particulier)"
    - "server/utils/email.ts — mode hybride console.log (dev) / Resend (prod)"
  affects:
    - "app/pages/espace/leads/[id].vue et app/pages/espace/messages/index.vue (interface pro)"

tech-stack:
  added: []
  patterns:
    - "Verrou de déblocage messagerie = réplication exacte de maskLead.isUnlocked (Premium OU free_grant OU unlocked_at≤now), pas de nouveau modèle d'autorisation"
    - "Email mode hybride : import.meta.dev → console.log, sinon appel Resend réel"

key-files:
  created:
    - server/api/v1/magic-link/[token].get.ts
    - app/pages/mon-projet/[token].vue
    - server/api/v1/messages/index.post.ts
    - server/api/v1/messages/client.post.ts
    - server/utils/email.ts
    - app/pages/espace/messages/index.vue
  modified:
    - server/api/v1/leads/[id]/claim.patch.ts
    - app/pages/espace/leads/[id].vue

decisions:
  - "Plan codé et vérifié hors flux GSD standard (pas de SUMMARY.md au moment de la livraison) ; ce document est rédigé rétroactivement à partir de 06-UAT.md (status: complete) et de l'historique git, pour resynchroniser le comptage de phase."
  - "Bug majeur trouvé en vérification (REQ-03) : messages/index.post.ts vérifiait la propriété du lead mais pas le déblocage — un pro Basic non débloqué pouvait écrire au client, violation ADR-004. Corrigé sur branche fix/messaging-unlock-guard, mergée dans dev."
  - "SMS/Twilio, cold outreach et vrai provider email restent explicitement hors périmètre de ce plan (voir 06-SPEC.md Out of Scope) — couverts par les plans 06-02/06-03/06-04."

metrics:
  duration: "N/A (rédigé rétroactivement)"
  completed: 2026-06-15
---

# Phase 06 Plan 01: Magic Link & Messagerie In-App Summary

**Espace Client accessible sans compte via lien magique (`/mon-projet/[token]`), messagerie asynchrone pro↔particulier avec verrou de déblocage aligné sur ADR-004, et intégration Resend en mode hybride (mock dev / envoi réel prod).**

## Accomplissements

- **Verrou concurrentiel (cap à 3)** : `leads/[id]/claim.patch.ts` rejette le déblocage au-delà de 3 pros sur un même projet (403).
- **Espace Client** : `magic-link/[token].get.ts` retourne projet + pros débloqués + historique messages ; token inexistant → 404 propre (pas de 500/stack trace, y compris en prod).
- **Messagerie** : table `messages`, insertion côté pro (`messages/index.post.ts`) et côté client (`messages/client.post.ts`), thread par artisan dans `mon-projet/[token].vue`, intégration chat sur `espace/leads/[id].vue` et page dédiée `espace/messages/index.vue`.
- **Resend** : `server/utils/email.ts` en mode hybride, `console.log` en dev / appel API réel en prod (bascule `EMAIL_LIVE`), email réel testé via Resend vers une adresse de test (id `9d811364`).
- **Fix REQ-03 (bug majeur)** : le verrou de déblocage manquait côté pro — un Basic non débloqué pouvait envoyer un message au client. Corrigé en répliquant `maskLead.isUnlocked` (Premium OU `free_lead_grants` OU `unlocked_at≤now`) avant insertion → 403 sinon.

## Task Commits

1. `1700a83` — fix(messagerie): exiger le déblocage du lead avant qu'un pro contacte le client
2. `883fc18` — feat(email): bascule opt-in EMAIL_LIVE pour envoyer de vrais e-mails en dev
3. `5509878` — merge: fermer fix/messaging-unlock-guard (REQ-03 garde déblocage + toggle EMAIL_LIVE) → `dev`

## Vérification

Voir `06-UAT.md` : 5 tests, 4 PASS directs + 1 fixed (REQ-03). Vérifié en local (HTTP/DB direct, gotrue local bloquant la création d'un user de test pour un run end-to-end authentifié) et smoke-testé en prod (`bati-axe.pages.dev`) pour REQ-02 (404 propre).

## Known Stubs / Gaps reportés

- Passe visuelle Playwright jamais faite (MCP bloqué sur le channel Chrome système, fix identifié : `--browser chromium`, nécessite un restart de session — non bloquant pour la validité fonctionnelle, prouvée côté backend).
- Notification mock-email client→pro : angle mort d'observabilité si le pro destinataire n'existe pas dans `auth.users` (saut silencieux, sans log) — amélioration mineure suggérée, non corrigée.
- Dette typecheck préexistante : 10 erreurs dans `server/api/v1/leads/index.get.ts` (typage Supabase), hors périmètre de ce plan, non résolues.

## Threat Flags

Faille ADR-004 trouvée et corrigée dans ce plan (voir Fix REQ-03 ci-dessus) : c'était une vraie fuite potentielle de canal de contact avant déblocage, maintenant alignée sur le même contrôle que `maskLead.ts`.

---
*Phase: 06-sms-acquisition-messagerie*
*Completed: 2026-06-15 (documenté rétroactivement le 2026-08-06)*

## Self-Check: N/A — rédaction rétroactive à partir de 06-UAT.md (vérification déjà faite au moment de la livraison réelle)
