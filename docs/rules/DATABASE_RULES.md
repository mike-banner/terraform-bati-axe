# DATABASE RULES

> Ces règles s'appliquent à toute migration, table, index, ou fonction PostgreSQL.
> L'IA vérifie ces règles avant de générer tout SQL.

---

## Naming Conventions

| Élément | Convention | Exemple |
| :--- | :--- | :--- |
| Tables | `snake_case` pluriel | `leads`, `professionals`, `audit_logs` |
| Colonnes | `snake_case` | `created_at`, `insurance_expiry_date` |
| Clés primaires | `id UUID` | `id UUID DEFAULT gen_random_uuid()` |
| Clés étrangères | `{table_singulier}_id` | `professional_id`, `lead_id` |
| Index | `idx_{table}_{colonne}` | `idx_leads_professional_id` |
| Fonctions | `snake_case` verbe | `assign_lead_to_professional()` |
| Triggers | `trg_{table}_{action}` | `trg_leads_audit_insert` |
| Vues | `vw_{nom}` | `vw_active_professionals` |
| Migrations | `YYYYMMDD_HHMMSS_{description}.sql` | `20260507_120000_create_leads.sql` |

---

## Colonnes Obligatoires (toute table métier)

```sql
id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
created_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
updated_at  TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
deleted_at  TIMESTAMPTZ   DEFAULT NULL  -- soft delete
```

---

## Types de Données

| Type Métier | Type SQL | Interdit |
| :--- | :--- | :--- |
| Montants financiers | `BIGINT` (centimes) ou `NUMERIC(20,4)` | `FLOAT`, `REAL`, `DOUBLE PRECISION` |
| Identifiants | `UUID` | `SERIAL`, `BIGSERIAL` |
| Statuts | `TEXT` + `CHECK constraint` ou `ENUM` | Booléens ambigus |
| Coordonnées géo | `POINT` ou `FLOAT lat/lng` | Strings parsées |
| Documents JSON | `JSONB` | `JSON` (pas d'indexation) |
| Timestamps | `TIMESTAMPTZ` | `TIMESTAMP` sans timezone |

---

## Row Level Security (RLS)

- **RLS activé sur 100% des tables sans exception.**
- Politique par défaut : `DENY ALL`
- Politique explicite pour chaque rôle : `authenticated`, `anon`, `service_role`

```sql
-- Pattern standard
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals see their own leads"
  ON leads FOR SELECT
  USING (professional_id = auth.uid());
```

---

## Audit Logs

Toute action critique doit déclencher un enregistrement dans `audit_logs` :

```sql
CREATE TABLE audit_logs (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type  TEXT         NOT NULL, -- 'lead', 'professional', 'payment'
  entity_id    UUID         NOT NULL,
  action       TEXT         NOT NULL, -- 'created', 'updated', 'deleted', 'assigned'
  actor_id     UUID,                  -- auth.uid() ou NULL si système
  actor_role   TEXT,                  -- 'admin', 'professional', 'system'
  metadata     JSONB        DEFAULT '{}',
  created_at   TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);
-- Pas de deleted_at : les logs sont IMMUABLES
-- Pas de UPDATE sur cette table : append-only
```

---

## Indexation Obligatoire

Indexer systématiquement :
- Toutes les clés étrangères
- Les colonnes de filtrage fréquent (`status`, `deleted_at`, `professional_id`)
- Les colonnes de tri (`created_at`)

```sql
CREATE INDEX idx_leads_professional_id ON leads(professional_id);
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
```

---

## Migrations

- Une migration = un changement atomique
- Jamais de `DROP` sans sauvegarde et ADR
- Toujours inclure un rollback commenté
- Migrations versionnées et séquentielles
