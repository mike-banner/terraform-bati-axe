-- Phase 05.19-05 : validation admin des Entreprises Générales du Bâtiment (EGB)
-- none = pas EGB / pending = en attente / approved = tous chantiers / rejected = refusé
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS egb_status TEXT NOT NULL DEFAULT 'none'
  CHECK (egb_status IN ('none', 'pending', 'approved', 'rejected'));

COMMENT ON COLUMN public.professionals.egb_status IS
  'Validation admin EGB : un EGB ne reçoit des leads que si approved. Le code NAF n''est qu''un signal.';

-- Action d'audit pour la décision admin
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'egb_decided';
