-- =====================================================
-- Phase 05.11-05 — Fusion documents_artisan → verifications + verrou sous-traitance
-- ADR-013. documents_artisan n'a jamais été alimentée (aucun code n'y écrit) ; verifications
-- (flux d'upload réel, RLS lecture seule ADR-012) devient l'unique modèle de justificatifs.
-- Écritures toujours côté Nitro en service role : aucune nouvelle table, aucune nouvelle policy.
--
-- Rollback (manuel, après sauvegarde) :
--   ALTER TABLE verifications DROP CONSTRAINT IF EXISTS verifications_urssaf_expiry_required;
--   ALTER TABLE verifications DROP COLUMN IF EXISTS issued_on, DROP COLUMN IF EXISTS alert_j30_sent_at, DROP COLUMN IF EXISTS alert_j7_sent_at;
--   (documents_artisan, ses enums et expire_artisan_documents() sont à recréer depuis
--    20260823000000 et 20260823000001 ; la table était vide au moment du DROP)
-- =====================================================

-- Garde-fou : on ne supprime que la table vide.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.documents_artisan) THEN
    RAISE EXCEPTION 'documents_artisan contient des lignes : migration refusée (fusion à faire à la main)';
  END IF;
END $$;

-- 1. verifications : type URSSAF, date d'édition (Kbis), idempotence des alertes d'expiration
ALTER TABLE public.verifications DROP CONSTRAINT IF EXISTS verifications_document_type_check;
ALTER TABLE public.verifications
  ADD CONSTRAINT verifications_document_type_check CHECK (document_type IN ('decennale','kbis','rge','urssaf'));

ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS issued_on DATE,
  ADD COLUMN IF NOT EXISTS alert_j30_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS alert_j7_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.verifications.issued_on IS '05.11-05 — date d''édition de l''extrait Kbis (règle « moins de 3 mois » évaluée par le verrou sous-traitance uniquement)';

ALTER TABLE public.verifications DROP CONSTRAINT IF EXISTS verifications_urssaf_expiry_required;
ALTER TABLE public.verifications
  ADD CONSTRAINT verifications_urssaf_expiry_required CHECK (document_type <> 'urssaf' OR expiry_date IS NOT NULL);

-- 2. Désactivation différée de la capacité sous-traitance (miroir SQL de app/utils/subcontractingGate.ts)
-- ponytail: règle dupliquée TS/SQL ; le contrôle serveur à l'activation reste la référence.
CREATE OR REPLACE FUNCTION public.sync_professional_subcontracting()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE professionals p SET is_available_subcontracting = false
  WHERE p.is_available_subcontracting = true
    AND (
      NOT EXISTS (
        SELECT 1 FROM verifications v
        WHERE v.pro_id = p.id AND v.document_type = 'kbis' AND v.status = 'approved'
          AND v.issued_on >= current_date - interval '3 months'
      )
      OR NOT EXISTS (
        SELECT 1 FROM verifications v
        WHERE v.pro_id = p.id AND v.document_type = 'decennale' AND v.status = 'approved'
          AND v.expiry_date >= current_date
      )
      OR NOT EXISTS (
        SELECT 1 FROM verifications v
        WHERE v.pro_id = p.id AND v.document_type = 'urssaf' AND v.status = 'approved'
          AND v.expiry_date >= current_date
      )
      OR ('renovation_energetique' = ANY (p.categories) AND p.rge_status <> 'valid')
    );
$$;
REVOKE ALL ON FUNCTION public.sync_professional_subcontracting() FROM PUBLIC, anon, authenticated;

-- 3. Cron : l'ancien job lisait documents_artisan ; un seul job horaire sur verifications
DO $$ BEGIN
  PERFORM cron.unschedule('expire-artisan-documents')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-artisan-documents');
  PERFORM cron.unschedule('sync-subcontracting')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-subcontracting');
END $$;
SELECT cron.schedule('sync-subcontracting', '5 * * * *', $$SELECT public.sync_professional_subcontracting();$$);

-- 4. Suppression du modèle en double
DROP TABLE IF EXISTS public.documents_artisan;
DROP FUNCTION IF EXISTS public.expire_artisan_documents();
DROP FUNCTION IF EXISTS public.update_documents_artisan_updated_at();
DROP TYPE IF EXISTS public.artisan_doc_status;
DROP TYPE IF EXISTS public.artisan_doc_type;
