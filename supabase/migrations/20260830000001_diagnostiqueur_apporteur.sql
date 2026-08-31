-- =====================================================
-- 05.17 — Diagnostiqueurs Immobiliers : nouveau profil apporteur B2B
-- =====================================================

ALTER TYPE b2b_apporteur_type ADD VALUE IF NOT EXISTS 'diagnostiqueur';

ALTER TABLE b2b_requests ADD COLUMN IF NOT EXISTS certification_number TEXT;
ALTER TABLE b2b_requests ADD COLUMN IF NOT EXISTS travaux_suggeres TEXT[];
