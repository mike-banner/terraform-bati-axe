# SPEC.md : Phase 5 (Espace Client & Messagerie Asynchrone)

## Boundaries

**In Scope:**
- Génération d'un `access_token` unique par projet lors de sa soumission.
- Espace Client accessible via un Magic Link URL (`/mon-projet/[token]`).
- Messagerie asynchrone entre le Pro (qui a accès aux coordonnées) et le Particulier.
- Simulation d'envoi d'emails (via console.log en dev) contenant le Magic Link à chaque notification de message.
- Blocage de l'envoi de messages pour les Pros Basic qui n'ont pas débloqué le lead.

**Out of Scope:**
- Intégration SMS (Twilio, etc.). *Repoussé à une phase ultérieure par décision produit.*
- Authentification complexe (OTP, Supabase Auth pour le particulier). *Friction zéro exigée.*
- Messagerie Temps Réel (WebSockets). *La messagerie est asynchrone (HTTP classique).*
- Configuration d'un vrai provider email (Resend/Sendgrid). *Sera fait lors d'une passe d'intégration prod globale.*

## Falsifiable Requirements

### REQ-01: Token d'accès au projet
- **Current State:** Les projets n'ont pas de lien d'accès sécurisé pour le grand public.
- **Target State:** Lors du POST `/api/v1/projects`, un UUID aléatoire `access_token` est généré et stocké dans la table `projects`.
- **Acceptance Criteria:** 
  - [ ] La base de données contient une colonne `access_token` unique sur `projects`.
  - [ ] Un appel POST sur l'API de soumission d'un projet loggue dans la console le lien `/mon-projet/[token]`.

### REQ-02: Accès à l'Espace Client (Magic Link)
- **Current State:** L'URL `/mon-projet/[token]` n'existe pas.
- **Target State:** La visite de `/mon-projet/[token]` charge le détail du projet et l'historique des conversations. Une mauvaise URL renvoie une 404.
- **Acceptance Criteria:**
  - [ ] L'API backend `/api/v1/magic-link/[token]` retourne les infos du projet et les messages.
  - [ ] Une tentative avec un token inexistant renvoie une erreur 404 propre.

### REQ-03: Création de Message (Côté Pro)
- **Current State:** Pas de table `messages` ni de logique de discussion.
- **Target State:** L'UI de la page détaillée d'un lead (côté Pro) permet d'envoyer un message au particulier.
- **Acceptance Criteria:**
  - [ ] L'API `/api/v1/leads/[id]/messages` vérifie que le Pro a bien débloqué le lead (Premium ou free_grant) avant d'insérer le message en base.
  - [ ] La requête échoue (403 Forbidden) si le Pro n'a pas accès aux coordonnées complètes.
  - [ ] Un message inséré par un pro loggue *"MOCK EMAIL ENVOYÉ: Vous avez reçu un message. Répondez ici : /mon-projet/[token]"* dans la console serveur.

### REQ-04: Création de Message (Côté Client)
- **Current State:** Le client ne peut pas discuter avec les professionnels intéressés.
- **Target State:** L'Espace Client affiche un thread pour chaque artisan ayant pris contact. Le client peut y répondre.
- **Acceptance Criteria:**
  - [ ] L'API permet au client (authentifié uniquement via le payload/header de son `access_token`) de poster un message ciblant l'ID du professionnel.
  - [ ] L'insertion d'un message par le client loggue *"MOCK EMAIL ENVOYÉ: [Client] vous a répondu"* à destination du pro concerné.

---

# SPEC — Reste de Phase 5 (post-messagerie)

> Addendum 2026-06-16. La partie « Espace Client & Messagerie » ci-dessus est **livrée** (plan 05-01, validée en prod). Cette section cadre le reste de la Phase 5 ROADMAP : **Acquisition (cold outreach)**, **Feedback loop lead**, **Email onboarding**, et **SMS différencié (différé)**.

## Boundaries (reste)

**In Scope:**
- Acquisition pros par **email gratuit** (Resend) : import de prospects, envoi d'invitation à revendiquer (`/pro/claim?prospect=<id>`), suivi du funnel (envoyé → ouvert → claim).
- Feedback loop côté particulier : bouton « relancer ma recherche » qui remet le projet sur le marché pour 3 nouveaux pros.
- Email onboarding pro (bienvenue post-claim / post-validation), derrière un flag **désactivé par défaut**.

**Out of Scope (différé en fin de Phase 5) :**
- **SMS différencié** (Basic→upgrade / Premium→lead direct). *Décision utilisateur : aucun paiement fournisseur tant que non prêt, même pour tester.* Spec posée (REQ-08), exécution repoussée à la toute fin.
- Scraping automatique de la base prospects. *Source de données à trancher au moment de l'exécution (REQ-05).* 
- Design visuel des emails/pages. *Centralisé dans la phase design finale.*

## Falsifiable Requirements (reste)

### REQ-05: Acquisition — import & cold email pros
- **Current State:** La table `prospects` existe (source, raw_data, email, siret, zip_code, `optin_status`, `optin_email_sent_at`, `converted_professional_id`) mais aucun moyen de l'alimenter ni d'envoyer les invitations. L'endpoint `prospects/[id].get.ts` et le `prospect_id` du claim sont déjà câblés.
- **Target State:** On peut importer une liste de prospects (source à décider : CSV/seed/scrape) et déclencher l'envoi d'emails d'invitation respectant le consentement.
- **Acceptance Criteria:**
  - [ ] Un mécanisme d'import (endpoint admin ou script CLI) insère des prospects dédupliqués sur `siret`, `optin_status='pending'`.
  - [ ] Un déclencheur d'envoi parcourt les prospects `pending` sans `optin_email_sent_at`, envoie l'invitation via `sendEmail`, et horodate `optin_email_sent_at`.
  - [ ] L'email contient un lien `/pro/claim?prospect=<id>` ; le clic pré-remplit le claim et le claim positionne `converted_professional_id`.
  - [ ] Une ligne `consents` (subject_type='prospect') trace l'envoi (LCEN/RGPD).
  - [ ] Aucun envoi vers un prospect `optin_status='unsubscribed'`.

### REQ-06: Feedback loop lead (relancer la recherche)
- **Current State:** Une fois 3 pros ayant débloqué (cap concurrentiel), le particulier n'a aucun moyen de relancer si aucun ne convient.
- **Target State:** Depuis `/mon-projet/[token]`, un bouton « Je n'ai pas trouvé mon bonheur → relancer » réouvre le projet au marché.
- **Acceptance Criteria:**
  - [ ] Un endpoint authentifié par `access_token` réouvre le projet (reset du cap : le projet réapparaît dans `market-local` pour de nouveaux pros).
  - [ ] Les anciens `leads`/conversations ne sont pas détruits (historique conservé).
  - [ ] Le bouton n'est proposé que lorsque le cap de 3 est atteint.

### REQ-07: Email onboarding pro (flag désactivé par défaut)
- **Current State:** Aucun email transactionnel d'accueil au pro.
- **Target State:** Email de bienvenue déclenché au claim et/ou à la validation admin, derrière un flag d'activation.
- **Acceptance Criteria:**
  - [ ] Un flag (env, ex. `ONBOARDING_EMAILS=false` par défaut) gate l'envoi.
  - [ ] Flag off → aucun email ; flag on → email via `sendEmail` au bon moment.

### REQ-08: SMS différencié (DIFFÉRÉ — non exécuté)
- **Current State:** `sms_opt_in` existe déjà sur le claim ; aucun fournisseur câblé.
- **Target State (spec, exécution repoussée):** Notification SMS différenciée — Basic → incitation upgrade, Premium → lead direct — via un fournisseur RGPD appelé en `fetch` (reco **Brevo**, alt **OVH**).
- **Acceptance Criteria (à exécuter en toute fin) :**
  - [ ] Utilitaire `sendSms` symétrique de `sendEmail` (fetch, pas de SDK lourd — contrainte Workers).
  - [ ] Respect de `sms_opt_in` et d'un opt-out.
  - [ ] Aucune dépense fournisseur engagée avant feu vert utilisateur explicite.
