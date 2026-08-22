-- =====================================================
-- 05.10-08 — Workflow DirCo : qualification des dossiers B2B
-- =====================================================

-- Qualification du besoin par le chargé d'affaires
ALTER TABLE b2b_requests
    ADD COLUMN IF NOT EXISTS qualifications_requises TEXT[] NOT NULL DEFAULT '{}';

-- Planning prévisionnel du chantier
ALTER TABLE b2b_requests
    ADD COLUMN IF NOT EXISTS planning_start DATE,
    ADD COLUMN IF NOT EXISTS planning_end DATE;

-- Sous-traitants recommandés (2-3 pros vérifiés, sélection DirCo)
ALTER TABLE b2b_requests
    ADD COLUMN IF NOT EXISTS recommended_pros UUID[] NOT NULL DEFAULT '{}';
