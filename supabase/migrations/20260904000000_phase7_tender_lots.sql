-- =====================================================
-- Phase 7 — Formulaire AO & Modèle Multi-Lots
-- TEND-01 (description), TEND-02 (statut décision), TEND-05 (lots)
-- =====================================================

-- TEND-01 : description obligatoire du besoin (contrainte min 20 caractères
-- appliquée côté serveur/Zod, pas en CHECK SQL : les lignes b2b_requests
-- existantes n'ont pas de description et un CHECK les invaliderait).
ALTER TABLE b2b_requests ADD COLUMN IF NOT EXISTS description TEXT;

-- TEND-02 : statut de la décision, saisi par le DirCo à la qualification.
-- TEXT + CHECK plutôt qu'un ENUM : un ENUM Postgres ne peut pas voir ses
-- valeurs retirées/renommées sans recréer le type (cf. friction rencontrée en
-- 05.17 avec b2b_apporteur_type).
ALTER TABLE b2b_requests
    ADD COLUMN IF NOT EXISTS decision_status TEXT NOT NULL DEFAULT 'en_attente';

ALTER TABLE b2b_requests DROP CONSTRAINT IF EXISTS b2b_requests_decision_status_check;
ALTER TABLE b2b_requests
    ADD CONSTRAINT b2b_requests_decision_status_check
    CHECK (decision_status IN ('confirme', 'en_attente'));

-- Support TEND-04 (Phase 8) : code postal structuré exploitable par matchZone().
ALTER TABLE b2b_requests ADD COLUMN IF NOT EXISTS project_postal_code TEXT;

ALTER TABLE b2b_requests DROP CONSTRAINT IF EXISTS b2b_requests_project_postal_code_check;
ALTER TABLE b2b_requests
    ADD CONSTRAINT b2b_requests_project_postal_code_check
    CHECK (project_postal_code IS NULL OR project_postal_code ~ '^\d{5}$');

-- TEND-05 : 1 ligne par corps de métier requis sur un AO.
CREATE TABLE IF NOT EXISTS b2b_tender_lots (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES b2b_requests(id) ON DELETE CASCADE,
    category   TEXT NOT NULL,               -- vocabulaire professionals.categories
    zone_id    UUID REFERENCES zones(id),   -- résolu via matchZone() en Phase 8
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    CONSTRAINT b2b_tender_lots_category_check
        CHECK (category IN ('maconnerie', 'toiture', 'electricite', 'plomberie', 'peinture', 'isolation')),
    CONSTRAINT b2b_tender_lots_status_check
        CHECK (status IN ('open', 'claimed', 'closed')),
    CONSTRAINT b2b_tender_lots_request_category_key UNIQUE (request_id, category)
);

CREATE INDEX IF NOT EXISTS idx_b2b_tender_lots_zone_category
    ON b2b_tender_lots(zone_id, category) WHERE status = 'open';

-- RLS : même politique que b2b_requests — aucun accès anonyme/authentifié,
-- tout passe par le service role (intake public + endpoints admin).
ALTER TABLE b2b_tender_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_b2b_tender_lots" ON b2b_tender_lots;
CREATE POLICY "admin_all_b2b_tender_lots" ON b2b_tender_lots
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin');
