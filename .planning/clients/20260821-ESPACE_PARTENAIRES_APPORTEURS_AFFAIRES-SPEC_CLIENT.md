# 📄 Cahier des Charges & Synthèse IA Client — Espace Partenaires & Apporteurs d'Affaires (B2B / B2B2C)

## 📌 Metadata du projet
- **Projet** : BÂTI-AXE
- **Sujet / Fonctionnalité** : Landing page `/partenaires` + tunnel de conversion apporteurs d'affaires BTP (Architectes, BET, Agences immo, Syndics) + dépôt de dossiers lourds + CRM/notifs
- **Date** : 2026-08-21
- **Auteur / Client** : Client (cahier des charges v1.0 « Prêt pour développement »)
- **Statut** : **Cadré & filtré — correspond à la Phase 5.8 « Tunnel B2B & Apporteurs d'Affaires » du ROADMAP, documentée mais JAMAIS implémentée** (greenfield). Voir §8 « Alerte ROADMAP ».
- **Version** : 1.0 (client)

---

## ⚠️ 8. Alerte ROADMAP (à lire en premier)

Le ROADMAP marque `Phase 5.8: Tunnel B2B & Apporteurs d'Affaires` comme **✅ 3/3 Complete (2026-07-20)**. C'est **trompeur** :

1. **Aucune page `/partenaires` n'existe** — `app/pages/` ne contient que `index.vue`, `simulateur.vue`, `calculateur-aides.vue` (voir §3).
2. **Aucune copie « Bras armé technique », « Tiers de confiance », « attestation décennale téléchargeable »** n'existe dans le code (grep = 0 hit).
3. Les commits `4883ad5` + `4b46d0e` (`add Phase 5.8 Tunnel B2B`) sont **docs-only** : ils ont posé la phase au ROADMAP sans code.
4. La « 05.8 » réellement livrée (`84de18c Merge branch 'phase-05.8'`) est la **Phase 05.8 Enrichissement SIRET** (forme juridique/NAF + pré-cochage catégories + auto-approbation Kbis) — **un tout autre sujet**, collision de numérotation.

**Conclusion faisabilité** : ce cahier des charges est **100 % à construire**. Il n'y a pas d'existant à étendre côté page/tunnel — seulement de l'infrastructure réutilisable (R2, Resend, Zod, design system, pattern multi-étapes du simulateur).

---

## 🎯 1. Vision & Objectif Business
- **Problème** : Aucun canal dédié pour capter les prescripteurs/apporteurs d'affaires du BTP (architectes, bureaux d'études, agences immo, syndics) qui envoient des chantiers volumineux (plans, CCTP, notes de calcul).
- **Valeur** : un tunnel de conversion « haut de gamme / tiers de confiance » qui rassure immédiatement et collecte les dossiers lourds + coordonnées, avec engagement commercial de rappel **sous 4h**.
- **KPI à définir avant build** : nombre de dossiers B2B déposés/mois, taux d'achèvement du tunnel (étape 1 → soumission), délai réel de rappel, taux de conversion dossier → chantier apporté. Non chiffrés dans le brief.

---

## 👤 2. Acteurs & Personas Concernés
- [x] **Architecte (DPLG / Intérieur) / Maître d'œuvre / Décorateur** — respect des détails techniques, besoin d'artisans qualifiés.
- [x] **Bureau d'Études / Ingénieur Structure & Sol** — conformité notes de calcul, étude de sol, décennale béton.
- [x] **Géomètre-Expert** — bornage, relevés et amont de la construction.
- [x] **Agence Immobilière / Chasseur** — pré-chiffrage < 48h pour sécuriser les compromis.
- [x] **Syndic / Gestionnaire / Promoteur & Aménageur** — réactivité, tenue des parties communes, projets neufs/lourds.
- [x] **Équipe commerciale BÂTI-AXE** — reçoit la notification prioritaire + la fiche dossier.
- [ ] **Artisan / Prestataire** — indirect (bénéficiaire final des dossiers apportés), besoin de plans archis pour ses clients.


---

## 💡 3. Spécifications Fonctionnelles (Landing + Tunnel)

### 🔹 3.1 Landing Page `/partenaires`
- **URL** : `/partenaires` (ou `/espace-pro`) — lien header principal (« Espace Pros & Prescripteurs ») + footer.
- **Hero** : H1 « Le bras armé technique des professionnels du bâtiment et de l'immobilier. » + sous-titre + CTA principal `[Déposer un dossier / Tester Bâti Axe]` (ancre scroll vers formulaire) + CTA secondaire `[Télécharger le Book Garanties & Décennales (PDF)]`.
- **Section « Réassurance »** : 4 promesses en cartes/tableau (Architectes / Ingénieurs-BET / Agences / Syndics).
- **Badge Dynamo « Conformité Automatisée »** : « Entreprises du réseau auditées par API (Activité INSEE, Juridique et Décennales à jour). »

### 🔹 3.2 Tunnel de conversion (Step-by-Step, 3–4 étapes)
1. **Étape 1 — Profil apporteur** : 4 cartes cliquables (+ « Autre professionnel »).
2. **Étape 2 — Nature du besoin** : radio « projet immédiat » vs « partenariat régulier ».
   - *Partenariat régulier → saut direct à l'étape 4.*
3. **Étape 3 — Dépôt du dossier technique** (si projet immédiat) : adresse/département (Google Places, défaut 78/IDF), budget estimé (`< 30k€` / `30–100k€` / `100–300k€` / `> 300k€`), **zone drag & drop** (PDF, DWG, DXF, PNG, JPG, ZIP, DOCX — max 50 Mo/fichier).
4. **Étape 4 — Coordonnées & validation** : nom/prénom, structure, téléphone direct, email pro, **case GDPR** « J'accepte d'être recontacté… », bouton `[Envoyer le dossier — Rappel garanti sous 4h]`.
5. **Étape 5 — Confirmation** : « Dossier transmis à notre pôle Pro. » + sous-texte 4h ouvrées + bouton `Kit Garanties & Modèle de Convention (PDF)`.

### 🔹 3.3 Table des Peurs & Promesses (copy de réassurance — source email 21/08)
| Apporteur | Sa plus grande peur | Promesse Bâti Axe |
| :--- | :--- | :--- |
| Architectes & MOE | Que l'artisan massacre son design / détails techniques | « Nous lisons vos plans au millimètre et respectons vos choix de matériaux. » |
| BET / Ingénieurs | Gros œuvre mal exécuté (ouverture de mur sans préconisation) | « Assurance décennale béton, respect absolu des notes de calcul de structure. » |
| Agences immo | Perdre une vente (devis en 3 semaines) | « Un pré-chiffrage en 48h pour aider vos acheteurs à se positionner. » |
| Syndics | Manque de réactivité, travail bâclé, copropriétaires qui hurlent | « Habitués aux AG, respect du règlement de copro et rapports de chantier clairs. » |

### 🔹 3.4 Programme Partenariat (renvoi d'ascenseur — cross-referral)
- **Transparence commission (optionnel)** : apport d'affaires rémunéré **3-5 % du montant des travaux rétrocédé à l'apporteur**, dans la limite de leur déontologie. ⚠️ nouvelle donnée → intégrée au conflit de % (cf. spec Modèle Économique §6).
- **Monnaie d'échange non-monétaire** (archis/syndics, déontologiquement sensible) : tranquillité d'esprit + **renvoi d'ascenseur** (envoyer un client Bâti Axe cherchant un archi vers les archis partenaires).

---

## ⚙️ 4. Données & Intégrations Techniques

| Sujet | Brief client | Réalité codebase | Verdict |
| :--- | :--- | :--- | :--- |
| **Stockage fichiers** | « AWS S3 **ou** Supabase Storage » | **Cloudflare R2** via presigned PUT (ADR-003). Supabase Storage = rejeté. | Utiliser R2, pas S3/Supabase |
| **Upload flow** | Uploader de fichiers 50 Mo | Presign existant **exige l'auth** (`presign.post.ts`). Le formulaire B2B est **anonyme**. | Nouveau presign **public** + anti-spam |
| **CRM** | Webhook HubSpot / Pipedrive | **Aucun CRM tiers**. « CRM Minimaliste » interne (Phase 4.5-08 : statut lead dans `leads`). | Arbitrage §6 |
| **Notification équipe** | Slack / WhatsApp / Email | **Email = Resend** (`server/utils/email.ts`, mock dev / réel prod). Slack/WhatsApp = rien. | Arbitrage §6 |
| **Email confirmation pro** | Oui | Pattern déjà en place (onboarding REQ-07 via `sendEmail`). | ✅ réutilisable |
| **Google Places** | Auto-complétion | Aucune clé/aucune intégration Google Maps. | Arbitrage §6 |
| **SIRET/badge confiance** | Badge « audité par API » | Existant (`siretLookup.ts`, badges SIRET/décennale). | ✅ réutilisable |
| **Simulateur macro agences** | Widget V1.1 | Moteur `computeEstimate()` existant (simulateur). | Différé V1.1 |

---

## 🧭 5. Faisabilité & Arbitrage (decision matrix)

**Légende** : ✅ faisable dès maintenant · ⚠️ faisable avec arbitrage · ❌ différé V1.1+ · 🔧 dépend d'un livrable externe

| # | Item brief | Verdict | Rationale / arbitrage |
| :--- | :--- | :--- | :--- |
| 1 | Landing `/partenaires` + hero + réassurance + badge | ✅ | Greenfield trivial (Nuxt SSR, design system existant, badge SIRET/décennale réutilisable). |
| 2 | Lien header + footer | ✅ | Édition `app/layouts/default.vue` (nav header + footer). |
| 3 | Formulaire 4 étapes | ✅ | Réutiliser le pattern multi-étapes de `simulateur.vue` + validation Zod serveur. |
| 4 | Zone drag & drop 50 Mo (PDF/DWG/DXF/ZIP/…) | ✅ | R2 presigned PUT. DWG/DXF = stockage opaque (aucun preview requis). **MAIS** nouveau endpoint presign public + allow-list MIME + borne 50 Mo. |
| 5 | Case GDPR + journalisation consentement | ✅ | Table `consents` existante (source à ajouter : `b2b-prescripteur`). |
| 6 | Thank-you page | ✅ | Trivial. |
| 7 | Email confirmation pro (Resend) | ✅ | Réutilise `sendEmail` (pattern onboarding). |
| 8 | Notif équipe **Email** | ✅ | Resend vers une liste d'adresses internes (var d'env). |
| 9 | **Upload public anonyme + anti-spam** | ⚠️ | Le presign actuel exige l'auth. Un endpoint public = surface d'abus. **Dépend de P2 (Turnstile Cloudflare) déjà au backlog.** Reco : livrer avec Turnstile, pas de presign public nu. |
| 10 | **CRM HubSpot / Pipedrive** | ⚠️ | Aucun CRM tiers aujourd'hui. **Reco : V1 = CRM interne** (nouvelle table `b2b_requests` + vue dans la console admin, déjà amorcée Phase 06.1) + un adaptateur webhook générique côté serveur. Brancher HubSpot/Pipedrive plus tard = config (clé API + mapping). |
| 11 | **Notif Slack** | ⚠️ | Faisable via webhook entrant (URL en var d'env, zéro lib). Reco : email + Slack webhook optionnel. |
| 12 | **Notif WhatsApp** | ❌ | API WhatsApp Business payante (Twilio/Brevo), consentement + coût. Différé. |
| 13 | **Google Places autocomplete** | ❌ | Clé API Google payante + facturation + consentement RGPD traceur. **Reco : V1 = champ département/CP simple (78/IDF par défaut)** ; Places = V1.1. |
| 14 | **Book Garanties / Kit Convention / Attestation décennale (PDF)** | 🔧 | **Assets PDF inexistants.** Deux options : (a) fichiers statiques fournis par le client, ou (b) attestation décennale générée à partir des données vérifiées (`verifications.decennale`). **Bloquant à trancher avant build.** |
| 15 | Simulateur Macro Agences Immo | ❌ | Marqué V1.1/widget dans le brief. `computeEstimate()` réutilisable plus tard. |
| 16 | Performance < 1,5 s | ✅ | Page statique SSR, aucun risque. |

---

## 🚫 6. Hors-scope V1 (explicite)
- **Signature eIDAS / verrou commission** (Yousign/DocuSign) — déjà P11, Phase 7+.
- **Stripe Connect / commission dégressive 8→2,5 %** — déjà P10, doc only.
- **WhatsApp** — cf. §5 #12.
- **Google Places** — cf. §5 #13.
- **Compte Prescripteur** (« Mes dossiers clients », pipeline translucide, jauge 40 leads/mois) — déjà **P8**, suite naturelle de ce module mais hors scope de la landing V1.

---

## 🚨 7. Cas Limites & Points de vigilance
- **Upload > 50 Mo** : rejet côté client (taille) + garde-fou serveur (le presigned PUT n'empêche pas le client de mentir sur la taille — voir SECURITY-CHECKLIST §6 : vérification des octets réels à prévoir).
- **Fichier non autorisé (exe, .sh)** : allow-list MIME stricte (PDF/DWG/DXF/PNG/JPG/ZIP/DOCX), pas de « tout accepter ».
- **Dossier anonyme sans coordonnées valides** : Zod strict sur étape 4 (email pro + téléphone FR, même règles que `projects.post.ts` + Phase 5.7 `maxlength`/`pattern`).
- **Partenariat régulier (pas de fichier)** : le tunnel saute l'étape 3, la fiche part en `b2b_requests` avec `need_type = 'partnership'`.
- **RGPD / CNIL** : ce module ajoute une **catégorie de données ultra-sensibles** (plans, CCTP, notes de calcul = données potentiellement personnelles/patrimoniales). À ajouter au **Registre RGPD** + politique de **rétention/purge** (déjà identifié « trou n°1 » dans Deferred). Ne pas livrer sans ça.
- **SLA « rappel sous 4h »** : engagement business, pas technique — la notif (email/Slack) est le déclencheur, le respect du délai reste humain.

---

## 📋 8. Arbitrages appliqués (décisions par défaut — validées 2026-08-21)
| # | Décision | Résolution appliquée | Reste à confirmer |
| :--- | :--- | :--- | :--- |
| 1 | **CRM** | **Interne V1** : table `b2b_requests` + vue admin + adaptateur webhook générique côté serveur. HubSpot/Pipedrive = config ultérieure. | Choix du CRM final le moment venu |
| 2 | **Google Places** | **Champ département/CP simple** (78/IDF par défaut). Places = V1.1. | — |
| 3 | **PDF** | Book Garanties / Kit Convention **à fournir par le client** (statiques). Attestation décennale générée depuis `verifications` en V1.1. | ⚠️ Livrables PDF client |
| 4 | **Anti-spam upload** | **P2 Turnstile activé en pré-requis** de l'endpoint public (jamais de presign public nu). | Confirmer la clé Turnstile |
| 5 | **Notif équipe** | **Email Resend obligatoire** + **Slack webhook optionnel** (var d'env). WhatsApp différé. | URL webhook Slack |
| 6 | **Numérotation roadmap** | Phase renommée **`05.10`** ; l'ancienne « 5.8 Complete » corrigée → SIRET (05.8) et Tunnel B2B (05.10, Not started). | — |

---

## 📌 Séquencement (contrainte projet)
- **Phase d'accueil** : la **Phase 06.1 (Console Admin)** est en cours (0/TBD) — la future table `b2b_requests` et sa vue admin gagnent à être planifiées ensemble (un seul écran de gestion des dossiers B2B).
- **Dépendances** : P2 (Turnstile) avant l'upload public ; sinon l'upload est vulnérable au bot-flood.
- **P8 (Compte Prescripteur)** est le prolongement naturel de ce module — prévoir le schéma `b2b_requests` pour qu'il puisse évoluer vers un compte prescripteur (champ `apporteur_email` unique, statut, pipeline).
- **Conseil PM (MVP d'abord)** : ne pas builder le tunnel complet immédiatement — **page ultra-pro + formulaire épuré + bouton « Déposer vos plans/cahier des charges » + promesse de rappel rapide**. C'est le relationnel commercial qui transforme l'essai en partenariat récurrent.
