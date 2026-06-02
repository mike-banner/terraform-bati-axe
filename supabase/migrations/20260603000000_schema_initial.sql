-- Supabase Migration: Initial Schema
-- Date: 2026-06-03
-- Author: Antigravity

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Custom ENUM Types
CREATE TYPE zone_type AS ENUM ('city', 'department', 'region');
CREATE TYPE optin_status AS ENUM ('pending', 'sent', 'accepted', 'refused', 'bounced');
CREATE TYPE decennal_status AS ENUM ('pending', 'valid', 'expired', 'none');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'unpaid', 'none');
CREATE TYPE consent_channel AS ENUM ('email', 'sms', 'cgu', 'cookies');
CREATE TYPE consent_status AS ENUM ('granted', 'revoked');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'won', 'lost');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE sms_status AS ENUM ('queued', 'sent', 'delivered', 'failed');
CREATE TYPE audit_action AS ENUM ('lead_unlocked', 'doc_validated', 'prospect_converted', 'project_created', 'consent_updated');

-- 1. zones Table
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type zone_type NOT NULL,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    postal_codes TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 2. professionals Table
CREATE TABLE professionals (
    id UUID PRIMARY KEY, -- Links directly to auth.users.id
    short_id TEXT UNIQUE NOT NULL,
    canonical_slug TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    siret TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    decennal_status decennal_status DEFAULT 'none',
    labels JSONB DEFAULT '[]',
    stripe_customer_id TEXT,
    subscription_status subscription_status DEFAULT 'none',
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 3. prospects Table
CREATE TABLE prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    raw_data JSONB DEFAULT '{}',
    company_name TEXT NOT NULL,
    siret TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    zip_code TEXT,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    optin_email_sent_at TIMESTAMPTZ,
    optin_status optin_status DEFAULT 'pending',
    converted_professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 4. consents Table
CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type TEXT NOT NULL CHECK (subject_type IN ('prospect', 'professional', 'customer')),
    subject_id UUID NOT NULL,
    channel consent_channel NOT NULL,
    status consent_status NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    revoked_at TIMESTAMPTZ,
    source TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    cgu_version TEXT
);

-- 5. projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    budget_range TEXT NOT NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    postal_code TEXT NOT NULL,
    location GEOMETRY(POINT, 4326),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'closed')),
    retention_until TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + INTERVAL '90 days'),
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 6. leads Table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pro_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    status lead_status DEFAULT 'new',
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp(),
    CONSTRAINT unique_project_pro UNIQUE (project_id, pro_id)
);

-- 7. verifications Table
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('decennale', 'kbis')),
    file_key TEXT NOT NULL,
    status verification_status DEFAULT 'pending',
    expiry_date DATE,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 8. sms_logs Table
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    twilio_sid TEXT,
    payload JSONB DEFAULT '{}',
    status sms_status DEFAULT 'queued',
    sent_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- 9. audit_logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    action audit_action NOT NULL,
    target_table TEXT NOT NULL,
    target_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- Indexes for performance
CREATE INDEX idx_zones_postal_codes ON zones USING gin (postal_codes);
CREATE INDEX idx_projects_location ON projects USING gist (location);
CREATE INDEX idx_projects_zone_id ON projects(zone_id);
CREATE INDEX idx_leads_pro_id ON leads(pro_id);
CREATE INDEX idx_leads_project_id ON leads(project_id);
CREATE INDEX idx_professionals_zone_id ON professionals(zone_id);
CREATE INDEX idx_prospects_zone_id ON prospects(zone_id);
CREATE INDEX idx_consents_subject_id ON consents(subject_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- zones: SELECT is public
CREATE POLICY select_public_zones ON zones
    FOR SELECT TO public USING (true);

-- professionals: SELECT public for claimed/verified, full access for self
CREATE POLICY select_public_professionals ON professionals
    FOR SELECT TO public USING (is_claimed = true OR is_verified = true);

CREATE POLICY manage_own_professional ON professionals
    FOR ALL TO authenticated USING (auth.uid() = id);

-- prospects: Restricted to service_role only (no policies mean denied to public/auth users)

-- consents: Restricted to service_role, plus self-access
CREATE POLICY manage_own_consent ON consents
    FOR ALL TO authenticated USING (auth.uid() = subject_id);

-- projects: Restricted to service_role only (submitted via server-side Nitro API)

-- leads: Pros can view their own matched leads
CREATE POLICY select_own_leads ON leads
    FOR SELECT TO authenticated USING (auth.uid() = pro_id);

-- verifications: Pros can manage their own verification documents
CREATE POLICY manage_own_verifications ON verifications
    FOR ALL TO authenticated USING (auth.uid() = pro_id);

-- sms_logs: Restricted to service_role only

-- audit_logs: Restricted to service_role only
