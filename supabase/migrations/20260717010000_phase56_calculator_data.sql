-- Phase 5.6 : stockage structuré des choix du calculateur (Lead Magnet B2C, D-03)

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS calculator_data JSONB;
