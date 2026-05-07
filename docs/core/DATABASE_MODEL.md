# 🗄️ MODÈLE DE DONNÉES (DRAFT)

## Tables Principales

### `professionals` (Les Artisans/Pros)
- `id` (UUID, PK - lié à auth.users)
- `email` (Unique)
- `company_name`
- `siret` (String, Unique)
- `full_name` (Contact principal)
- `phone`
- `city` / `zip_code`
- `is_verified` (Boolean)
- `is_claimed` (Boolean, pour l'import des 7k)
- `decennal_status` (ENUM: pending, valid, expired, none)
- `labels` (JSONB Array)
- `stripe_customer_id`
- `subscription_status` (ENUM: active, canceled, unpaid)

### `projects` (Le besoin du Particulier - Zéro Friction)
- `id` (UUID, PK)
- `customer_name` (Donnée floutée)
- `customer_email` (Donnée floutée)
- `customer_phone` (Donnée floutée)
- `category` (Rénovation, Extension...)
- `description` (Text)
- `budget_range`
- `location` (PostGIS Point ou Zip)
- `status` (Pending, Qualified, Closed)

### `leads` (Matching Pro <-> Projet)
- `id` (UUID, PK)
- `project_id` (UUID, FK projects)
- `pro_id` (UUID, FK professionals)
- `status` (New, Contacted, Won, Lost)
- `unlocked_at` (Timestamp, NULL si flouté)

### `verifications` (Documents R2)
- `id` (UUID, PK)
- `pro_id` (UUID, FK professionals)
- `document_type` (Decennale, Kbis)
- `file_url` (Path R2)
- `status` (Pending, Approved, Rejected)
- `expiry_date` (Date de fin de validité)

---

## RLS Policies (Exemples)
- **Select on leads** : `USING (pro_id = auth.uid() OR unlocked_at < NOW() - INTERVAL '24 hours')`
- **Insert on projects** : `ALLOW ALL` (pour le simulateur Astro).
