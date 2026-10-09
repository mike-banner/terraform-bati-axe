-- Sécurité : un pro ne doit pas pouvoir s'auto-valider depuis le navigateur.
-- Avant : manage_own_professional (FOR ALL) laissait un pro modifier sa propre ligne
-- (is_verified, subscription_status, decennal_status, stripe_customer_id…) avec son JWT.
-- Aucune écriture sur professionals ne part du client (tout passe par le serveur en service_role,
-- qui contourne la RLS) : on ne garde donc que la lecture de sa propre ligne.

DROP POLICY IF EXISTS manage_own_professional ON public.professionals;
DROP POLICY IF EXISTS select_own_professional ON public.professionals;
CREATE POLICY select_own_professional ON public.professionals
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Même classe de faille sur verifications : le pro peut écrire sa ligne (manage_own_verifications),
-- donc se mettre status = 'approved'. Un non-admin ne peut plus que déposer une ligne « pending ».
-- (La console admin écrit depuis le navigateur avec un JWT app_metadata.role = 'admin' : autorisée.)
CREATE OR REPLACE FUNCTION public.guard_verification_review_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'status et reviewed_* sont réservés à l''administration' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_verification_review_fields ON public.verifications;
CREATE TRIGGER trg_guard_verification_review_fields
  BEFORE INSERT OR UPDATE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_verification_review_fields();
