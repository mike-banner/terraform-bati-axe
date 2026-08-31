-- =====================================================
-- 06.3 — Idempotence des alertes d'expiration décennale (J-30 / J-7)
-- =====================================================

ALTER TABLE public.documents_artisan
    ADD COLUMN IF NOT EXISTS alert_j30_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS alert_j7_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.documents_artisan.alert_j30_sent_at IS '06.3 — horodatage de l''alerte e-mail J-30 avant expiration (NULL = jamais envoyée)';
COMMENT ON COLUMN public.documents_artisan.alert_j7_sent_at IS '06.3 — horodatage de l''alerte e-mail J-7 avant expiration (NULL = jamais envoyée)';
