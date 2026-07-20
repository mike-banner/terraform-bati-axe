-- Phase 05.8 : colonnes forme juridique + code NAF issues de l'API Recherche Entreprises.
-- Peuplees au claim uniquement, pas de resynchronisation ulterieure (hors scope).

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS siret_legal_form TEXT;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS siret_naf_code TEXT;

ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_siret_legal_form_len CHECK (siret_legal_form IS NULL OR char_length(siret_legal_form) <= 50) NOT VALID;
ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_siret_naf_code_len CHECK (siret_naf_code IS NULL OR char_length(siret_naf_code) <= 20) NOT VALID;

ALTER TABLE public.professionals VALIDATE CONSTRAINT professionals_siret_legal_form_len;
ALTER TABLE public.professionals VALIDATE CONSTRAINT professionals_siret_naf_code_len;
