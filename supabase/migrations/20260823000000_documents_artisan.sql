-- =====================================================
-- 05.11-01 — Coffre-Fort Juridique : documents_artisan
-- =====================================================

-- Enums
CREATE TYPE artisan_doc_type AS ENUM ('kbis', 'urssaf', 'decennale');
CREATE TYPE artisan_doc_status AS ENUM ('pending', 'valid', 'expired', 'suspended');

-- Main table
CREATE TABLE IF NOT EXISTS documents_artisan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,

    doc_type artisan_doc_type NOT NULL,
    status artisan_doc_status NOT NULL DEFAULT 'pending',
    file_key TEXT,
    expires_at TIMESTAMPTZ,
    activities_subscribed TEXT[] NOT NULL DEFAULT '{}',
    validated_by_api BOOLEAN NOT NULL DEFAULT false,
    last_reviewed_at TIMESTAMPTZ,          -- devoir de vigilance 6 mois

    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_artisan_professional ON documents_artisan(professional_id);
CREATE INDEX IF NOT EXISTS idx_documents_artisan_status ON documents_artisan(status);
CREATE INDEX IF NOT EXISTS idx_documents_artisan_expires ON documents_artisan(expires_at) WHERE expires_at IS NOT NULL;

-- Capacité de sous-traitance exposée sur professionals
ALTER TABLE public.professionals
    ADD COLUMN IF NOT EXISTS is_available_subcontracting BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.professionals
    ADD COLUMN IF NOT EXISTS workforce_size INTEGER CHECK (workforce_size IS NULL OR (workforce_size >= 1 AND workforce_size <= 999));

-- RLS
ALTER TABLE documents_artisan ENABLE ROW LEVEL SECURITY;

-- Le pro gère ses propres documents
CREATE POLICY "pro_own_documents_artisan" ON documents_artisan
    FOR ALL
    USING (professional_id = auth.uid())
    WITH CHECK (professional_id = auth.uid());

-- Admin tout
CREATE POLICY "admin_all_documents_artisan" ON documents_artisan
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_documents_artisan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documents_artisan_updated_at
    BEFORE UPDATE ON documents_artisan
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_artisan_updated_at();
