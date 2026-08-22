-- Supabase Migration: P4 — Notifications email de nouveaux leads
-- Date: 2026-08-23
-- 1. Opt-in email sur professionals (défaut actif : on veut attirer les pros)
-- 2. Table d'idempotence lead_notifications (pas de double envoi par projet/pro)
-- 3. Déblocage des leads : 72h → 48h (plus laxiste au lancement)

-- ── 1. Opt-in email ───────────────────────────────────────────────────────────
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS lead_alerts_email BOOLEAN NOT NULL DEFAULT true;

-- ── 2. Idempotence des notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (pro_id, project_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_lead_notifications_project ON lead_notifications (project_id);

-- ── 3. Déblocage 72h → 48h (plus laxiste au lancement) ───────────────────────
-- On retire l'ancien job 72h s'il existe, puis on programme le nouveau à 48h.
SELECT cron.unschedule('auto-unlock-leads-72h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-unlock-leads-72h');

SELECT cron.schedule(
  'auto-unlock-leads-48h',
  '0 * * * *',
  $$
    UPDATE leads
    SET unlocked_at = created_at + INTERVAL '48 hours'
    WHERE unlocked_at IS NULL
      AND status != 'claimed'
      AND created_at + INTERVAL '48 hours' <= NOW()
  $$
);
