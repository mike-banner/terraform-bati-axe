-- =====================================================
-- Phase 05.21 — Détail des lots d'appel d'offres saisi par le partenaire.
-- Le pro doit comprendre le chantier AVANT de signer l'avenant : description propre à chaque lot,
-- plus trois informations structurées au niveau du dossier. Colonnes nullables (dossiers existants).
-- Aucune nouvelle table : la RLS existante de b2b_tender_lots / b2b_requests est inchangée.
--
-- Rollback (manuel) :
--   ALTER TABLE b2b_tender_lots DROP COLUMN IF EXISTS description;
--   ALTER TABLE b2b_requests DROP COLUMN IF EXISTS nb_logements, DROP COLUMN IF EXISTS surface_m2, DROP COLUMN IF EXISTS calendrier_souhaite;
-- =====================================================

ALTER TABLE public.b2b_tender_lots
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD CONSTRAINT b2b_tender_lots_description_check CHECK (description IS NULL OR char_length(description) BETWEEN 10 AND 1000);

ALTER TABLE public.b2b_requests
  ADD COLUMN IF NOT EXISTS nb_logements SMALLINT,
  ADD COLUMN IF NOT EXISTS surface_m2 INTEGER,
  ADD COLUMN IF NOT EXISTS calendrier_souhaite TEXT,
  ADD CONSTRAINT b2b_requests_nb_logements_check CHECK (nb_logements IS NULL OR nb_logements BETWEEN 1 AND 9999),
  ADD CONSTRAINT b2b_requests_surface_m2_check CHECK (surface_m2 IS NULL OR surface_m2 BETWEEN 1 AND 1000000),
  ADD CONSTRAINT b2b_requests_calendrier_check CHECK (calendrier_souhaite IS NULL OR calendrier_souhaite IN ('urgent','sous_3_mois','3_6_mois','plus_6_mois'));

COMMENT ON COLUMN public.b2b_tender_lots.description IS '05.21 — travaux attendus pour ce lot, saisis par le partenaire (10-1000 car.)';
COMMENT ON COLUMN public.b2b_requests.calendrier_souhaite IS '05.21 — urgent | sous_3_mois | 3_6_mois | plus_6_mois';
