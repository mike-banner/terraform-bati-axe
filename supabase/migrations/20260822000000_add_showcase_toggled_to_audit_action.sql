-- Add 'showcase_toggled' to audit_action enum (used by realisations-showcase endpoint)
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'showcase_toggled';
