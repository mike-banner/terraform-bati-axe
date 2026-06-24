-- Phase 5 : colonnes vérification SIRET via API Recherche Entreprises
-- Stocke le résultat du lookup API d'État au moment du Claim.
-- TEXT + CHECK (pas ENUM) pour éviter ALTER TYPE si de nouveaux statuts émergent.

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS siret_verified_at  TIMESTAMPTZ;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS siret_company_name TEXT;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS siret_address      TEXT;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS siret_status       TEXT CHECK (siret_status IN ('active', 'closed', 'not_found', 'error'));
