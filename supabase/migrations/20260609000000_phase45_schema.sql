-- Supabase Migration: Phase 4.5 — Conversion & Qualification
-- Date: 2026-06-09

-- =============================================================================
-- Section A: Free leads tracking (D-01, D-02, D-03)
-- =============================================================================

-- Counter for cumulative free leads used by a Basic professional
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS free_leads_used INTEGER NOT NULL DEFAULT 0;

-- Junction table tracking which leads were granted as free to which professional
CREATE TABLE IF NOT EXISTS free_lead_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_pro_lead_grant UNIQUE (pro_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_free_lead_grants_pro_id ON free_lead_grants(pro_id);

-- Service-role-only access (no policies = denied to public/auth users)
ALTER TABLE free_lead_grants ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Section B: Qualification score (D-10, D-11)
-- =============================================================================

-- Aggregate score 0-4 computed server-side at project submission (Plan 03)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS qualify_score INTEGER NOT NULL DEFAULT 0
    CHECK (qualify_score BETWEEN 0 AND 4);

-- Individual criterion flags (computed alongside qualify_score)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS qualify_budget BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS qualify_phone BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS qualify_description BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS qualify_returning BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- Section C: Editable profile fields (D-14, D-17)
-- =============================================================================

-- Free-form bio/presentation text (Zod max 500 chars enforced at API layer)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS bio TEXT;

-- Intervention zone description (Zod max 200 chars enforced at API layer)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS zone TEXT;

-- R2 public URL for company logo after presigned PUT upload (D-17, 5 MB max)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- =============================================================================
-- Section D: Paywall analytics (CNV-07)
-- =============================================================================

CREATE TABLE IF NOT EXISTS paywall_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    qualify_score INTEGER,
    event_type TEXT NOT NULL CHECK (event_type IN ('paywall_view', 'checkout_started', 'checkout_completed')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_paywall_events_pro_id ON paywall_events(pro_id);
CREATE INDEX IF NOT EXISTS idx_paywall_events_occurred_at ON paywall_events(occurred_at DESC);

-- Service-role-only access (no policies = denied to public/auth users)
ALTER TABLE paywall_events ENABLE ROW LEVEL SECURITY;
