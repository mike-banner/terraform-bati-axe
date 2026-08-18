-- Phase 6 (REQ-07) : email d'onboarding pro — marqueur d'idempotence.
-- Un seul email de bienvenue par pro, même en cas de re-claim.
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS onboarding_email_sent_at TIMESTAMPTZ;
