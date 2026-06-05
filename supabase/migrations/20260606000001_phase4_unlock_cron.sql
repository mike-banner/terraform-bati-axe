-- Supabase Migration: Phase 4 — Unlock Cron (pg_cron)
-- Date: 2026-06-06
-- Note: pg_cron may not be available in local Supabase dev (safe to ignore locally)

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Partial index optimizing the hourly cron query (only rows that haven't been unlocked yet)
CREATE INDEX IF NOT EXISTS idx_leads_unlock_check ON leads (unlocked_at, created_at, status) WHERE unlocked_at IS NULL;

-- Auto-unlock leads after 72h: runs hourly, skips claimed leads (D-08)
SELECT cron.schedule(
  'auto-unlock-leads-72h',
  '0 * * * *',
  $$
    UPDATE leads
    SET unlocked_at = created_at + INTERVAL '72 hours'
    WHERE unlocked_at IS NULL
      AND status != 'claimed'
      AND created_at + INTERVAL '72 hours' <= NOW()
  $$
);
