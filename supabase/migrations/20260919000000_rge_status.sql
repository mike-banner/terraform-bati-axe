-- Qualification RGE (05.19-14) : statut dérivé des justificatifs, expiration automatique, verrou durci.

-- 1. Document « rge » dans le coffre-fort existant ; une attestation RGE a toujours une échéance
ALTER TABLE public.verifications DROP CONSTRAINT IF EXISTS verifications_document_type_check;
ALTER TABLE public.verifications
  ADD CONSTRAINT verifications_document_type_check CHECK (document_type IN ('decennale','kbis','rge'));
ALTER TABLE public.verifications DROP CONSTRAINT IF EXISTS verifications_rge_expiry_required;
ALTER TABLE public.verifications
  ADD CONSTRAINT verifications_rge_expiry_required CHECK (document_type <> 'rge' OR expiry_date IS NOT NULL);

-- 2. Statut unique (aucune reprise de données existantes)
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS rge_status TEXT NOT NULL DEFAULT 'none' CHECK (rge_status IN ('none','valid','expired'));
COMMENT ON COLUMN public.professionals.rge_status IS
  'Qualification RGE dérivée de verifications (document_type=rge, approuvé, non échu). Jamais écrite par le client.';

-- 3. Dérivation unique en SQL (couvre aussi les dépôts admin faits depuis le navigateur)
CREATE OR REPLACE FUNCTION public.sync_rge_status(p_pro uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE professionals SET rge_status = CASE
    WHEN EXISTS (SELECT 1 FROM verifications v WHERE v.pro_id = p_pro AND v.document_type = 'rge'
                   AND v.status = 'approved' AND v.expiry_date >= current_date) THEN 'valid'
    WHEN EXISTS (SELECT 1 FROM verifications v WHERE v.pro_id = p_pro AND v.document_type = 'rge'
                   AND v.status = 'approved') THEN 'expired'
    ELSE 'none' END
  WHERE id = p_pro;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_rge_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.document_type = 'rge' THEN PERFORM sync_rge_status(OLD.pro_id); END IF;
    RETURN OLD;
  END IF;
  IF NEW.document_type = 'rge' OR (TG_OP = 'UPDATE' AND OLD.document_type = 'rge') THEN
    PERFORM sync_rge_status(NEW.pro_id);
    IF TG_OP = 'UPDATE' AND OLD.pro_id <> NEW.pro_id THEN PERFORM sync_rge_status(OLD.pro_id); END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_rge_status ON public.verifications;
CREATE TRIGGER trg_sync_rge_status
  AFTER INSERT OR UPDATE OR DELETE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_rge_status();

-- 4. Expiration automatique (cron horaire distinct de 'expire-artisan-documents')
CREATE OR REPLACE FUNCTION public.expire_rge_status()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE professionals p SET rge_status = 'expired'
  WHERE p.rge_status = 'valid'
    AND NOT EXISTS (SELECT 1 FROM verifications v WHERE v.pro_id = p.id AND v.document_type = 'rge'
                      AND v.status = 'approved' AND v.expiry_date >= current_date);
$$;

SELECT cron.schedule('expire-rge-status', '0 * * * *', $$SELECT public.expire_rge_status();$$);

-- 5. Ces fonctions SECURITY DEFINER ne doivent pas être appelables via PostgREST /rpc
REVOKE ALL ON FUNCTION public.sync_rge_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_rge_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_sync_rge_status() FROM PUBLIC, anon, authenticated;

-- 6. Verrou durci : un pro ne peut plus modifier un justificatif déposé (expiry_date, type, fichier…)
-- INSERT : forcé en « pending » (inchangé). UPDATE non admin : refusé.
CREATE OR REPLACE FUNCTION public.guard_verification_review_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    ELSE
      RAISE EXCEPTION 'Les justificatifs déposés ne sont modifiables que par l''administration' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
