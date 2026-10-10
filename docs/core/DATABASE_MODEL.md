# 🗄️ MODÈLE DE DONNÉES (DRAFT)

## Tables Principales

### `zones` (Granularité géographique scalable)
- `id` (UUID, PK)
- `type` (ENUM: city, department, region)
- `name` (Carrières-sous-Poissy, Yvelines, Île-de-France)
- `parent_id` (UUID, FK zones, NULL pour region)
- `postal_codes` (Text[]) — pour les villes
- `is_active` (Boolean) — l'activation est progressive (prototype-first)

### `prospects` (Base brute non publiée — RGPD)
- `id` (UUID, PK)
- `source` (Text — sirene, partenaire, scraping_legal)
- `raw_data` (JSONB — snapshot original)
- `company_name`, `siret`, `email`, `phone`, `zip_code`
- `zone_id` (UUID, FK zones)
- `optin_email_sent_at` (Timestamp, NULL)
- `optin_status` (ENUM: pending, sent, accepted, refused, bounced)
- `converted_professional_id` (UUID, FK professionals, NULL tant que pas opt-in)
- `created_at`

### `professionals` (Les Artisans/Pros publiables)
- `id` (UUID, PK — lié à `auth.users` après claim)
- `short_id` (Text, Unique, NOT NULL — nanoid(8), utilisé dans les URLs, voir ADR-009)
- `canonical_slug` (Text — `{metier}-{ville}-{nom}-{short_id}`, régénéré si nom/ville change)
- `email` (Unique)
- `company_name`
- `siret` (String, Unique)
- `full_name` (Contact principal)
- `phone`
- `zone_id` (UUID, FK zones)
- `is_verified` (Boolean — décennale validée admin)
- `is_claimed` (Boolean — compte créé)
- `decennal_status` (ENUM: pending, valid, expired, none)
- `labels` (JSONB Array)
- `stripe_customer_id`
- `subscription_status` (ENUM: active, canceled, unpaid, none)
- `created_at`
- `categories` (TEXT[] — métiers déclarés ; spécialiste 1-2, EGB 1-9, source unique `PROFESSIONAL_CATEGORIES`)
- `professional_type` (TEXT, CHECK : `specialiste` | `entreprise_generale`, défaut `specialiste`) — voir ADR-011
- `egb_status` (TEXT, CHECK : `none` | `pending` | `approved` | `rejected`) — validation admin d'une EGB
- `categories_reviewed_at` (TIMESTAMPTZ — dernière revue des métiers, bandeau « Nouveau métier »)
- `rge_status` (TEXT, CHECK : `none` | `valid` | `expired`) — **dérivé par trigger** depuis `verifications` (jamais écrit par le code applicatif)
- `siret_status`, `siret_naf_code`, … (réponse API Recherche Entreprises au claim)

### `consents` (Journal RGPD / LCEN — voir ADR-007)
- `id` (UUID, PK)
- `subject_type` (ENUM: prospect, professional, customer)
- `subject_id` (UUID)
- `channel` (ENUM: email, sms, cgu, cookies)
- `status` (ENUM: granted, revoked)
- `granted_at` / `revoked_at`
- `source` (Text — email-optin, signup, claim, cookie-banner)
- `ip` / `user_agent`
- `cgu_version` (Text, NULL si non applicable)

### `projects` (Le besoin du Particulier — Zéro Friction)
- `id` (UUID, PK)
- `customer_name` (Donnée floutée à l'API)
- `customer_email` (Donnée floutée à l'API)
- `customer_phone` (Donnée floutée à l'API)
- `category` (Rénovation, Extension...)
- `description` (Text)
- `budget_range`
- `zone_id` (UUID, FK zones)
- `location` (PostGIS Point ou Zip)
- `status` (Pending, Qualified, Closed)
- `retention_until` (Timestamp — purge auto après 90j)
- `created_at`

### `leads` (Matching Pro <-> Projet)
- `id` (UUID, PK)
- `project_id` (UUID, FK projects)
- `pro_id` (UUID, FK professionals)
- `status` (New, Contacted, Won, Lost)
- `unlocked_at` (Timestamp, NULL si flouté)
- `created_at`

### `verifications` (Documents R2)
- `id` (UUID, PK)
- `pro_id` (UUID, FK professionals)
- `document_type` (`decennale`, `kbis`, `rge` — un justificatif `rge` exige `expiry_date`)
- `file_key` (R2 object key — pas d'URL publique)
- `status` (Pending, Approved, Rejected)
- `expiry_date` (Date de fin de validité)
- `reviewed_by` (UUID, FK admin)
- `reviewed_at`

### `sms_logs` (Audit Twilio)
- `id` (UUID, PK)
- `pro_id` (UUID, FK professionals)
- `lead_id` (UUID, FK leads, NULL)
- `twilio_sid` (Text)
- `payload` (JSONB)
- `status` (queued, sent, delivered, failed)
- `sent_at`

### `audit_logs` (Sécurité)
- `id` (UUID, PK)
- `actor_id` (UUID — pro, admin, ou NULL si anonyme)
- `action` (Text — lead_unlocked, doc_validated, prospect_converted, etc.)
- `target_table` (Text)
- `target_id` (UUID)
- `metadata` (JSONB)
- `created_at`

---

## RLS Policies (Exemples)
- **Select on leads** : restriction côté API (Nitro), pas via RLS binaire, car on veut que le lead soit *visible* mais flouté (voir ADR-004).
- **Select on professionals** : `USING (is_claimed = true OR is_verified = true)` — les prospects bruts ne sortent jamais.
- **Insert on projects** : `ALLOW` via Service Role uniquement (jamais depuis le navigateur).
- **Select on consents** : restreint à l'admin et au subject (`auth.uid() = subject_id`).
- **Select on prospects** : interdit côté client (`USING (false)`), accessible uniquement via Service Role pour les opérations d'opt-in.

---

- **professionals (depuis `20260918`)** : le jeton d'un pro n'a que `SELECT` sur sa propre ligne (`select_own_professional`) ; toute écriture passe par le serveur en service role (ADR-012). Triggers de garde : `trg_guard_professional_admin_fields` (`professional_type`, `egb_status`) et `trg_guard_verification_review_fields` (un non-admin ne modifie ni `status`, ni dates, ni type d'un justificatif ; ses dépôts sont forcés en `pending`).
- **rge_status** : calculé par `sync_rge_status(pro)` (trigger sur `verifications`) et `expire_rge_status()` (pg_cron `expire-rge-status`, toutes les heures) ; fonctions `SECURITY DEFINER` non exécutables par `anon`/`authenticated`.
- **Durcissement (migration `20260920`)** : `consents` en lecture seule pour l'utilisateur ; trigger sur `completed_projects` (un non-admin ne peut ni activer ni modifier `is_showcased`) ; `expire_decennale_status()` + job pg_cron `expire-decennale-status` (décennale échue → `decennal_status = expired`, sans toucher `is_verified` ni l'abonnement).
- **projects** : `selected_category`, `selected_sub_category`, `selected_items` (TEXT[]) alimentent le matching.

## Notes Migration
- Toutes les migrations versionnées via Supabase CLI (`supabase/migrations/`).
- Activation des zones gérée par seed scripts incrémentaux (`seeds/zones/01_carrieres_78.sql`, `seeds/zones/02_yvelines_78.sql`...).
