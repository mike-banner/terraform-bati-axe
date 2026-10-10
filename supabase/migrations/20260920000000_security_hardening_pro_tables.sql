-- Durcissement RLS / métier : consents, completed_projects, expiration de la décennale.

-- 1. consents : le journal de consentement (RGPD) ne doit pas être modifiable par son sujet.
-- Avant : manage_own_consent (FOR ALL) permettait de supprimer ou modifier ses propres lignes.
-- Toutes les écritures applicatives passent par le service role (claim, projects, b2b/requests) :
-- on ne garde que la lecture de ses propres lignes.
DROP POLICY IF EXISTS manage_own_consent ON public.consents;
DROP POLICY IF EXISTS select_own_consent ON public.consents;
CREATE POLICY select_own_consent ON public.consents
  FOR SELECT TO authenticated USING (auth.uid() = subject_id);

-- 2. completed_projects : le pro écrit ses réalisations avec son jeton (manage_own_completed_projects
-- est conservée), mais « is_showcased » (mis en avant) est une décision de l'administration.
-- INSERT par un non-admin : forcé à false. UPDATE par un non-admin : tout changement refusé (42501).
-- Le service role (pas de rôle « authenticated ») et l'admin passent.
CREATE OR REPLACE FUNCTION public.guard_completed_project_showcase()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_showcased := false;
    ELSIF NEW.is_showcased IS DISTINCT FROM OLD.is_showcased THEN
      RAISE EXCEPTION 'is_showcased est réservé à l''administration' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_completed_project_showcase ON public.completed_projects;
CREATE TRIGGER trg_guard_completed_project_showcase
  BEFORE INSERT OR UPDATE ON public.completed_projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_completed_project_showcase();

-- 3. Expiration automatique de la décennale.
-- Alimentation actuelle de professionals.decennal_status : upload.post.ts (dépôt pro) et
-- admin/verify.post.ts (approbation) le passent à 'valid', approve-pro.post.ts aussi ; rien ne le
-- faisait jamais passer à 'expired'. Les gardes 05.15 (leads/[id]/claim.patch.ts, tenders/[id]/claim.post.ts)
-- et canDoEnergy exigent decennal_status = 'valid' : une décennale échue continuait donc d'ouvrir ces droits.
-- Règle : on se base sur le DERNIER justificatif « decennale » approuvé ; s'il a une échéance dépassée,
-- le pro passe à 'expired'. Un pro sans justificatif daté (ex. approve-pro, saisie admin sans date)
-- n'est jamais touché. is_verified et l'abonnement ne sont pas modifiés.
-- Si le pro redépose une décennale valide : upload.post.ts insère un justificatif approuvé puis met
-- decennal_status = 'valid' (idem approbation admin via verify.post.ts) ; ce justificatif devient le dernier,
-- la fonction ne le ré-expire donc pas. Le retour à 'valid' passe par le flux existant, rien de nouveau ici.
CREATE OR REPLACE FUNCTION public.expire_decennale_status()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE professionals p SET decennal_status = 'expired'
  WHERE p.decennal_status = 'valid'
    AND (
      SELECT v.expiry_date FROM verifications v
      WHERE v.pro_id = p.id AND v.document_type = 'decennale' AND v.status = 'approved'
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT 1
    ) < current_date;
$$;

REVOKE ALL ON FUNCTION public.expire_decennale_status() FROM PUBLIC, anon, authenticated;

-- Planification horaire, idempotente (déplanifie l'éventuel job existant avant de le recréer)
DO $$ BEGIN
  PERFORM cron.unschedule('expire-decennale-status')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-decennale-status');
END $$;
SELECT cron.schedule('expire-decennale-status', '0 * * * *', $$SELECT public.expire_decennale_status();$$);
