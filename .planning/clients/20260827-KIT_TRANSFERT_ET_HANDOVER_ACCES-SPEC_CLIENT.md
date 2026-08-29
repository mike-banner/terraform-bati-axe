# Spec Client : Kit de Transfert de Propriété & Handover des Accès BÂTI-AXE

> 📅 **Date d'émission** : 27 août 2026  
> 📌 **Objet** : Document officiel de transfert de propriété des comptes, services cloud, bases de données, clés d'API et accès administrateur au client pour la plateforme **BÂTI-AXE (`bati-axe.com`)**.

---

## 📋 1. Matrice Récapitulative des Services Cloud & Accès

| Service / Composant | Rôle & Usage | Accès / URL | Identifiant / Clé |
| :--- | :--- | :--- | :--- |
| **Cloudflare** | Hébergement Pages, DNS, Buckets R2 Storage & Email Routing | `dash.cloudflare.com` | Compte Client (`contact@bati-axe.com`) |
| **Supabase Cloud** | Base de données PostgreSQL, Auth & API Backend | `supabase.com/dashboard` | Projet ID: `xpwoczcbyamnjknloxgz` |
| **Resend** | Envoi d'emails transactionnels & notifs leads | `resend.com` | Clé `RESEND_API_KEY` (Expéditeur: `contact@bati-axe.com`) |
| **Stripe** | Monétisation, abonnements pros MRR 78 & Webhooks | `dashboard.stripe.com` | Compte Stripe Prod (`sk_live_...`) |
| **Umami (VPS)** | Analytics de conversion sans cookies (GDPR) | Instance VPS PostgreSQL | `NUXT_PUBLIC_WEBSITE_ID` |

---

## 🌐 2. Configuration Cloudflare (Domaine `bati-axe.com` & Production)

### A. Cloudflare Pages
- **Nom du projet** : `bati-axe-production`
- **Domaine principal** : `https://bati-axe.com`
- **Domaine de staging/dev** : `https://dev.bati-axe.fr`

### B. Buckets de Stockage Cloudflare R2
1. **`batiaxe-public-prod`** (`NUXT_R2_BUCKET_PUBLIC`) : Médias publics (logos des entreprises pros, photos de réalisations).
2. **`batiaxe-vault-prod`** (`NUXT_R2_BUCKET_VAULT`) : Coffre-fort juridique confidentiel (KBIS, Décennales, CNI) avec préfixes `kbis/`, `decennales/`, `cni/`.
3. **`batiaxe-b2b-prod`** (`NUXT_R2_BUCKET_B2B`) : Fichiers d'affaires B2B, CCTP et devis.

### C. Redirection des Emails (Cloudflare Email Routing)
- **Règle Catch-All** : `*@bati-axe.com` ➔ Redirection automatique vers la boîte de réception centrale du client (`contact@bati-axe.com` / Gmail client).
- **Aliases d'utilisation** :
  - `contact@bati-axe.com` (Contact général & support)
  - `partenaires@bati-axe.com` (Apporteurs d'affaires, CCTP, DPE)
  - `pro@bati-axe.com` (Artisans du bâtiment & validation KBIS)
  - `facturation@bati-axe.com` (Stripe, reçus & abonnements)

---

## 🔑 3. Base de Données Supabase Cloud & Console Admin

### A. Connexion Administrateur Plateforme
- **Page de Connexion** : `https://bati-axe.com/pro/claim`
- **Email Admin** : `admin@batiaxe.com`
- **Mot de passe par défaut** : `000=bati`
- **Rôle BDD** : `app_metadata -> {"role": "admin"}` (donne accès à la console `/admin`).

### B. Clés API Supabase (Project ID: `xpwoczcbyamnjknloxgz`)
- **`SUPABASE_URL`** : `https://xpwoczcbyamnjknloxgz.supabase.co`
- **`SUPABASE_ANON_KEY`** : (Clé publique client pour les requêtes frontend)
- **`SUPABASE_SERVICE_ROLE_KEY`** : (Clé secrète d'administration backend - À GARDER CONFIDENTIELLE)

---

## ✉️ 4. Service Emailing Transactionnel (Resend)

- **Domaine d'envoi vérifié** : `bati-axe.com`
- **Expéditeur par défaut** : `BÂTI-AXE <contact@bati-axe.com>`
- **Types d'emails envoyés automatiquement** :
  - Notification pro lors d'un nouveau lead dans sa zone.
  - Confirmation de dépôt de projet pour le particulier.
  - Notification équipe / DirCo lors d'un dépôt de dossier B2B.

---

## 💳 5. Paiement & Monétisation (Stripe)

- **Compte Stripe Prod** : Rattaché au compte bancaire du client.
- **Grille Tarifaire Yvelines (78)** :
  - Pack 1 Zone (Mantes, Rambouillet, Versailles ou St-Germain) : 150 € / mois
  - Pack 2 Zones : 200 € / mois
  - Pack 3 Zones : 250 € / mois
  - Pack 78 Full (4 Zones) : 300 € / mois Max
- **Webhook Endpoint** : `https://bati-axe.com/api/v1/stripe/webhook`

---

## 🛠️ 6. Procédure de Transfert & Passation (Runbook Client)

1. **Invitation aux Comptes** : Le développeur transfère la propriété principale des comptes Cloudflare, Supabase, Resend et Stripe à l'adresse e-mail du client.
2. **Changement du mot de passe Admin** : Le client exécute la commande de réinitialisation du mot de passe admin via le script `node supabase/scripts/reset-admin.mjs` pour définir son mot de passe personnel définitif.
3. **Vérification des Redirections Email** : Le client envoie un e-mail de test à `contact@bati-axe.com` et confirme sa bonne réception sur son application e-mail habituelle.
4. **Configuration de l'Alias d'Envoi Gmail ("Envoyer en tant que contact@bati-axe.com")** :
   - Dans Gmail client > **Paramètres** > **Comptes et importation** > **Envoyer des e-mails en tant que** > **Ajouter `contact@bati-axe.com`**.
   - Serveur SMTP : `smtp.resend.com` (Port `465`), Utilisateur : `resend`, Mot de passe : Clé API Resend (`re_...`).
   - Permet au client de répondre aux emails des utilisateurs directement depuis Gmail sous la signature officielle `contact@bati-axe.com` sans exposer sa boîte Gmail personnelle.
