-- 05.19 (rattrapage) : bandeau « Nouveau métier disponible » + verrou des champs EGB

-- 1. Date à laquelle le pro a passé en revue la liste des métiers.
--    Une catégorie dont CATEGORY_ADDED_AT (app/utils/workTypeMatrix.ts) est plus récente
--    déclenche le bandeau du tableau de bord. Jamais d'ajout automatique (décennale).
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS categories_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Les pros inscrits avant 05.19 n'ont connu que 6 métiers : ils verront
-- carrelage / menuiserie / rénovation énergétique (ajoutés le 2026-10-09).
UPDATE public.professionals SET categories_reviewed_at = '2026-10-08T00:00:00Z';

COMMENT ON COLUMN public.professionals.categories_reviewed_at IS
  'Dernière revue des métiers par le pro (bandeau nouveau métier). Mis à now() par « Pas concerné ».';

-- 2. La policy manage_own_professional (FOR ALL) permet au pro de modifier sa ligne
--    depuis le client : on interdit l'auto-promotion EGB. Seul le service role
--    (claim.post.ts, admin/egb/[id].patch.ts) écrit ces colonnes.
CREATE OR REPLACE FUNCTION public.guard_professional_admin_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.egb_status IS DISTINCT FROM 'none' THEN
        RAISE EXCEPTION 'egb_status est réservé à l''administration' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.egb_status IS DISTINCT FROM OLD.egb_status
       OR NEW.professional_type IS DISTINCT FROM OLD.professional_type THEN
      RAISE EXCEPTION 'egb_status et professional_type sont réservés à l''administration' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_professional_admin_fields ON public.professionals;
CREATE TRIGGER trg_guard_professional_admin_fields
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.guard_professional_admin_fields();
