-- =====================================================
-- 05.10 — Espace Partenaires: b2b_requests table
-- =====================================================

-- Enums
CREATE TYPE b2b_apporteur_type AS ENUM ('architecte', 'bet', 'agence_immo', 'syndic', 'autre');
CREATE TYPE b2b_need_type AS ENUM ('projet_immediat', 'partenariat_regulier');
CREATE TYPE b2b_budget_range AS ENUM ('<30k', '30-100k', '100-300k', '>300k');
CREATE TYPE b2b_request_status AS ENUM ('nouveau', 'en_cours', 'rappele', 'qualifie', 'converti', 'perdu');

-- Main table
CREATE TABLE IF NOT EXISTS b2b_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Apporteur profile
    apporteur_type b2b_apporteur_type NOT NULL,
    need_type b2b_need_type NOT NULL DEFAULT 'projet_immediat',

    -- Project details (for projet_immediat)
    project_location TEXT,              -- département or postal code, default 78/IDF
    budget_range b2b_budget_range,
    files JSONB DEFAULT '[]',           -- [{ file_key, filename, content_type, size }]

    -- Contact
    contact_name TEXT NOT NULL,
    contact_company TEXT,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,

    -- GDPR consent
    consent_accepted BOOLEAN NOT NULL DEFAULT false,
    consent_at TIMESTAMPTZ,
    consent_ip TEXT,
    consent_source TEXT DEFAULT 'b2b-prescripteur',

    -- Pipeline
    status b2b_request_status NOT NULL DEFAULT 'nouveau',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_b2b_requests_status ON b2b_requests(status);
CREATE INDEX IF NOT EXISTS idx_b2b_requests_apporteur ON b2b_requests(apporteur_type);
CREATE INDEX IF NOT EXISTS idx_b2b_requests_created ON b2b_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_requests_assigned ON b2b_requests(assigned_to) WHERE assigned_to IS NOT NULL;

-- RLS
ALTER TABLE b2b_requests ENABLE ROW LEVEL SECURITY;

-- Public can insert (anonymous tunnel)
CREATE POLICY "public_insert_b2b_requests" ON b2b_requests
    FOR INSERT
    WITH CHECK (true);

-- Admin can do everything
CREATE POLICY "admin_all_b2b_requests" ON b2b_requests
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_b2b_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_b2b_requests_updated_at
    BEFORE UPDATE ON b2b_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_b2b_requests_updated_at();
