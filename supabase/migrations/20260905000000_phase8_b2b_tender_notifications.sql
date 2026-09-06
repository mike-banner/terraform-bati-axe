-- =====================================================
-- Phase 8 — Diffusion automatique des AO partenaires
-- D-08 (opt-in B2B), D-04 (idempotence par pro/lot)
-- =====================================================

-- D-08 : opt-in email B2B, distinct de lead_alerts_email (l'artisan peut couper
-- les AO partenaires sans couper les leads particuliers). Défaut true, aligné
-- sur lead_alerts_email (migration 20260823000002).
ALTER TABLE professionals
    ADD COLUMN IF NOT EXISTS b2b_alerts_email BOOLEAN NOT NULL DEFAULT true;

-- D-04 : idempotence par (pro, lot, canal) — miroir de lead_notifications.
-- Un second clic « Diffuser » ne renvoie rien aux couples déjà tracés.
CREATE TABLE IF NOT EXISTS b2b_tender_notifications (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_id  UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    lot_id  UUID NOT NULL REFERENCES b2b_tender_lots(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'email',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (pro_id, lot_id, channel)
);

-- Exclusion des déjà-notifiés sur un lot
CREATE INDEX IF NOT EXISTS idx_b2b_tender_notifications_lot
    ON b2b_tender_notifications (lot_id);

-- D-10 : comptage des notifications du jour par artisan
CREATE INDEX IF NOT EXISTS idx_b2b_tender_notifications_pro_sent
    ON b2b_tender_notifications (pro_id, sent_at);

-- RLS : aucun accès anonyme/authentifié, tout passe par le service role
-- (même politique que b2b_tender_lots, migration 20260904000000).
ALTER TABLE b2b_tender_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_b2b_tender_notifications" ON b2b_tender_notifications;
CREATE POLICY "admin_all_b2b_tender_notifications" ON b2b_tender_notifications
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin');
