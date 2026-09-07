-- =====================================================
-- Phase 9 — Claim des AO par l'artisan
-- TEND-03 (cap exclusif), TEND-09 (révélation), TEND-12 (clôture auto), TEND-13 (signalement)
-- =====================================================

-- D-05 / TEND-09 : une ligne n'existe qu'au claim (ADR-004, miroir de `leads`).
-- Pas de colonne de statut : le retrait de claim est hors périmètre (D-06).
CREATE TABLE IF NOT EXISTS b2b_tender_claims (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id     UUID NOT NULL REFERENCES b2b_tender_lots(id) ON DELETE CASCADE,
    pro_id     UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (lot_id, pro_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_tender_claims_lot ON b2b_tender_claims (lot_id);
CREATE INDEX IF NOT EXISTS idx_b2b_tender_claims_pro ON b2b_tender_claims (pro_id);

ALTER TABLE b2b_tender_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_b2b_tender_claims" ON b2b_tender_claims;
CREATE POLICY "admin_all_b2b_tender_claims" ON b2b_tender_claims
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin');

-- TEND-12 / D-07 : traçabilité de la clôture automatique (cap atteint ou 14 jours).
ALTER TABLE b2b_tender_lots ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE b2b_tender_lots ADD COLUMN IF NOT EXISTS closed_reason TEXT;

ALTER TABLE b2b_tender_lots DROP CONSTRAINT IF EXISTS b2b_tender_lots_closed_reason_check;
ALTER TABLE b2b_tender_lots
    ADD CONSTRAINT b2b_tender_lots_closed_reason_check
    CHECK (closed_reason IS NULL OR closed_reason IN ('cap', 'expired', 'manual'));

-- TEND-13 / D-09 / D-10 : signalement purement informatif porté par le dossier
-- lui-même (pas de table dédiée, pas d'écran de modération — le badge se lit
-- directement dans AdminB2bTab.vue). Aucun masquage/blocage automatique.
ALTER TABLE b2b_requests ADD COLUMN IF NOT EXISTS reported_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE b2b_requests ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;
ALTER TABLE b2b_requests ADD COLUMN IF NOT EXISTS report_reasons TEXT[] NOT NULL DEFAULT '{}';
