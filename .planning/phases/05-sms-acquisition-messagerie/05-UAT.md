---
status: complete
phase: 05-sms-acquisition-messagerie
source: [05-SPEC.md, 05-01-PLAN.md]
started: "2026-06-15T11:15:00.000Z"
updated: "2026-06-15T11:30:00.000Z"
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Redémarrer le serveur dev à froid. Le serveur boote sans erreur, les migrations (dont phase5_messaging_schema) sont appliquées, et la home publique répond.
result: pass
note: Serveur relancé sur :3000, health 200, aucune erreur de boot. Migrations OK (table `messages` + colonne `projects.access_token` présentes). Un serveur orphelin sur :3000 (non attrapé par `pkill -f "nuxt dev"`) a dû être tué manuellement — hygiène dev, pas un bug produit.

### 2. REQ-01 — Token d'accès généré à la soumission
expected: POST /api/v1/projects → projet enregistré avec access_token UUID unique + console loggue le lien /mon-projet/[token].
result: pass
note: HTTP 201, accessToken renvoyé (dev only). Log serveur confirmé : "Lien magique (Espace Client): http://localhost:3000/mon-projet/<token>". 18/18 projets en base ont un access_token.

### 3. REQ-02 — Espace Client via Magic Link (+ 404)
expected: Token valide → projet + historique messages ; token inexistant → 404 propre.
result: pass
note: Local — token valide HTTP 200 (project + messages[]); token bidon HTTP 404 "Projet introuvable ou lien expiré". Prod (bati-axe.pages.dev) — idem, 404 propre sans stack trace.

### 4. REQ-03 — Message côté Pro (verrou de déblocage)
expected: Le pro envoie un message seulement s'il a débloqué le lead (Premium/free_grant) ; sinon 403 Forbidden.
result: fixed
reported: "Le verrou de déblocage n'était PAS implémenté. messages/index.post.ts vérifiait seulement la propriété du lead (pro_id === user.id) puis assumait l'accès — un pro Basic au paywall pouvait écrire au client. Contredit REQ-03 + ADR-004."
severity: major
fix: "Branche fix/messaging-unlock-guard — ajout du contrôle isUnlocked (isPremium OU unlocked_at≤now OU free_lead_grants pour ce lead) avant insertion côté pro → 403 'Débloquez ce lead avant de contacter le client.' sinon. Réplique exactement maskLead.ts l.18 (déjà couvert par tests/unit/leads-masking.test.ts). Bonus : ajout de `category` au select projects (utilisé l.97 sans être chargé — bug latent). Typecheck : aucune nouvelle erreur (10 erreurs préexistantes dans leads/index.get.ts, hors périmètre). Régression client OK (200) + 401 inchangé."
note: La branche pro authentifié n'a pas pu être exercée en live — gotrue local rejette la création/connexion d'un user de test (bad_jwt HS256), même blocage d'auth/session que celui contourné en E2E par cookie mocké. La preuve repose sur : logique identique à maskLead (unit-testée) + revue de code + compilation propre.

### 5. REQ-04 — Réponse côté Client
expected: Thread par artisan dans l'espace client + le client peut répondre ; insertion loggue un mock email vers le pro.
result: pass
note: Message client inséré (HTTP 200, is_pro_sender=false, vérifié en base). 403 si access_token ne correspond pas au projet, 401 sans identifiant. RÉSERVE : la notification mock-email client→pro n'a pas pu être observée — le pro du seed (1111...) n'existe pas dans auth.users, donc supabase.auth.admin.getUserById échoue et le code saute l'envoi SANS log ni erreur (l.90-91). Léger angle mort d'observabilité ; le mock email pro→client est prouvé via REQ-01 (même util sendEmail).

## Summary

total: 5
passed: 4
issues: 0
fixed: 1
pending: 0
skipped: 0

## Gaps

- truth: "Un pro qui n'a pas débloqué le lead (Basic, pas de free_grant) ne doit pas pouvoir envoyer de message — 403 Forbidden attendu."
  status: fixed
  reason: "messages/index.post.ts ne répliquait pas le contrôle isUnlocked de maskLead. Corrigé sur fix/messaging-unlock-guard."
  severity: major
  test: 4
  artifacts: ["server/api/v1/messages/index.post.ts", "server/utils/maskLead.ts"]
  resolution: "Contrôle isUnlocked (Premium OR free_grant OR unlocked_at≤now) ajouté avant insertion côté pro → 403 sinon."

## Notes hors périmètre

- Playwright (test visuel) BLOQUÉ : le MCP est configuré sur le channel `chrome` (Google Chrome système, absent — install nécessite sudo). Chromium est pourtant présent (~/.cache/ms-playwright/chromium-1223). Fix : ajouter `--browser chromium` aux args du MCP playwright dans ~/.claude.json + redémarrer la session. Vérification effectuée via HTTP/DB (le fond de la Phase 5 est backend et entièrement falsifiable par ce biais).
- SPEC Phase 5 a restreint le périmètre à "Espace Client & Messagerie". SMS/Twilio, cold outreach et vrai provider email sont explicitement repoussés (Out of Scope du SPEC) — non testés ici car non livrés.
- Observabilité notification client→pro : envisager un console.warn quand le pro destinataire est introuvable, au lieu d'un saut silencieux.
