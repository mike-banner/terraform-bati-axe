-- ============================================================
-- 05.16 — Ajouter le type 'area' à l'enum zone_type
-- ============================================================
ALTER TYPE zone_type ADD VALUE IF NOT EXISTS 'area' AFTER 'city';
