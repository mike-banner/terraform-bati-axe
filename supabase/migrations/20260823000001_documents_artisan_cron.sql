-- =====================================================
-- 05.11-03 — Suspension auto à expiration + devoir de vigilance
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Marquer comme expirés les documents dont la date est dépassée
CREATE OR REPLACE FUNCTION expire_artisan_documents()
RETURNS void AS $$
BEGIN
    UPDATE documents_artisan
    SET status = 'expired'
    WHERE status IN ('valid', 'pending')
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. Couper la capacité de sous-traitance si un document requis est expiré/suspendu
CREATE OR REPLACE FUNCTION sync_professional_subcontracting()
RETURNS void AS $$
BEGIN
    UPDATE professionals p
    SET is_available_subcontracting = false
    WHERE p.is_available_subcontracting = true
      AND EXISTS (
        SELECT 1 FROM documents_artisan d
        WHERE d.professional_id = p.id
          AND d.status IN ('expired', 'suspended')
      );
END;
$$ LANGUAGE plpgsql;

-- 3. Cron horaire : expiration + coupe capacité (pattern Phase 4)
SELECT cron.schedule(
  'expire-artisan-documents',
  '0 * * * *',
  $$
    SELECT expire_artisan_documents();
    SELECT sync_professional_subcontracting();
  $$
);
