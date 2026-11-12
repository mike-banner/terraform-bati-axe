-- =====================================================
-- Phase 05.23 — Choix du partenaire, devis déposé par le partenaire, commissions
-- (D-01 flux, D-12 journal des mouvements, D-15 statuts, D-17 avenant de travaux,
-- D-06 bis échéancier, D-25 suivi des appels, D-29 opérateur).
-- Écritures exclusivement par Nitro en service role : RLS activée SANS policy
-- sur toutes les nouvelles tables. Aucun rattrapage de données (aucun partenaire réel).
--
-- BASE CLOUD PARTAGÉE dev/prod : dry-run d'abord + accord explicite de Mike (D-20)
-- avant toute application. Ne PAS appliquer au cloud depuis ce plan.
--
-- Rollback (manuel, après sauvegarde) :
--   DROP TABLE IF EXISTS b2b_installment_validations, b2b_admin_followups, b2b_reminders_sent,
--     b2b_commission_movements, b2b_quote_submissions;
--   DROP FUNCTION IF EXISTS guard_b2b_quote_submission();
--   DROP FUNCTION IF EXISTS guard_b2b_append_only();
--   ALTER TABLE b2b_engagements DROP COLUMN IF EXISTS selected_at, DROP COLUMN IF EXISTS not_awarded_reason,
--     DROP COLUMN IF EXISTS cancelled_at, DROP COLUMN IF EXISTS cancel_case, DROP COLUMN IF EXISTS cancel_reason,
--     DROP COLUMN IF EXISTS partner_share_kept_cents;
--   ALTER TABLE b2b_requests DROP COLUMN IF EXISTS on_behalf_of;
--   puis recréer l'ancienne contrainte de statut et l'ancienne garde (voir 20261030000000).
--   (les valeurs ajoutées à audit_action ne peuvent pas être retirées)
-- =====================================================

-- 1. Valeurs d'audit (la confirmation par l'artisan réutilise 'b2b_quote_confirmed' existant).
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_partner_selected';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_quote_submitted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_quote_contested';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_commission_movement';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_commission_cancelled';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_admin_followup';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_installment_validated';

-- 2. D-14 : « pour le compte de » (le dossier est déposé pour soi-même ou pour un tiers).
ALTER TABLE public.b2b_requests ADD COLUMN IF NOT EXISTS on_behalf_of TEXT;
ALTER TABLE public.b2b_requests DROP CONSTRAINT IF EXISTS b2b_requests_on_behalf_of_check;
ALTER TABLE public.b2b_requests ADD CONSTRAINT b2b_requests_on_behalf_of_check
    CHECK (on_behalf_of IS NULL OR on_behalf_of IN ('self', 'third_party'));

-- 3. Un lot clôturé parce que le partenaire a choisi un artisan.
ALTER TABLE public.b2b_tender_lots DROP CONSTRAINT IF EXISTS b2b_tender_lots_closed_reason_check;
ALTER TABLE public.b2b_tender_lots ADD CONSTRAINT b2b_tender_lots_closed_reason_check
    CHECK (closed_reason IS NULL OR closed_reason IN ('cap', 'expired', 'manual', 'awarded'));

-- 4. Statuts b2b_engagements (D-15). La contrainte inline d'origine porte un nom généré :
--    on supprime toute contrainte CHECK dont la définition mentionne 'quote_declared'.
DO $$
DECLARE c record;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.b2b_engagements'::regclass AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%quote_declared%'
    LOOP
        EXECUTE format('ALTER TABLE public.b2b_engagements DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;
ALTER TABLE public.b2b_engagements ADD CONSTRAINT b2b_engagements_status_check CHECK (status IN (
    'signed', 'selected', 'not_awarded', 'quote_submitted', 'contested', 'quote_confirmed', 'commission_cancelled',
    -- valeurs héritées 05.21, plus jamais écrites par le code (D-15, pas de migration de données)
    'quote_declared', 'deposit_paid', 'invoiced'));

-- 5. Colonnes ajoutées à b2b_engagements (toutes nullables).
ALTER TABLE public.b2b_engagements
    ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS not_awarded_reason TEXT
        CHECK (not_awarded_reason IS NULL OR not_awarded_reason IN ('other_selected', 'outside_platform', 'expired')),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_case TEXT
        CHECK (cancel_case IS NULL OR cancel_case IN ('never_started', 'legal_withdrawal', 'partner_input_error', 'dispute_for_pro', 'commercial_gesture')),
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT
        CHECK (cancel_reason IS NULL OR char_length(cancel_reason) BETWEEN 10 AND 500),
    ADD COLUMN IF NOT EXISTS partner_share_kept_cents BIGINT
        CHECK (partner_share_kept_cents IS NULL OR partner_share_kept_cents >= 0);

-- Un seul artisan retenu par lot (D-01).
CREATE UNIQUE INDEX IF NOT EXISTS uq_b2b_engagements_selected_lot
    ON b2b_engagements (lot_id) WHERE type = 'lot_amendment' AND selected_at IS NOT NULL;

-- 6. Rang des statuts : selected, quote_submitted et contested partagent le rang 1
--    (l'arbitrage « refus » remet contested → selected).
CREATE OR REPLACE FUNCTION b2b_engagement_status_rank(s TEXT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
    SELECT CASE s
        WHEN 'signed' THEN 0
        WHEN 'selected' THEN 1
        WHEN 'not_awarded' THEN 1
        WHEN 'quote_submitted' THEN 1
        WHEN 'contested' THEN 1
        WHEN 'quote_declared' THEN 1
        WHEN 'quote_confirmed' THEN 2
        WHEN 'deposit_paid' THEN 3
        WHEN 'invoiced' THEN 4
        WHEN 'commission_cancelled' THEN 5
    END
$$;

-- 7. Garde mise à jour. Le trigger trg_b2b_engagements_guard (20261030000000) pointe déjà
--    sur cette fonction : il n'est pas recréé.
CREATE OR REPLACE FUNCTION guard_b2b_engagement() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'b2b_engagements est en ajout seul (preuve de signature)' USING ERRCODE = '42501';
    END IF;
    IF NEW.type IS DISTINCT FROM OLD.type
       OR NEW.pro_id IS DISTINCT FROM OLD.pro_id
       OR NEW.request_id IS DISTINCT FROM OLD.request_id
       OR NEW.lot_id IS DISTINCT FROM OLD.lot_id
       OR NEW.signer_email IS DISTINCT FROM OLD.signer_email
       OR NEW.template_version IS DISTINCT FROM OLD.template_version
       OR NEW.content_html IS DISTINCT FROM OLD.content_html
       OR NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256
       OR NEW.otp_challenge_id IS DISTINCT FROM OLD.otp_challenge_id
       OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
       OR NEW.signed_ip IS DISTINCT FROM OLD.signed_ip
       OR NEW.signed_user_agent IS DISTINCT FROM OLD.signed_user_agent THEN
        RAISE EXCEPTION 'Contrat signé immuable' USING ERRCODE = '42501';
    END IF;
    -- Montant déclaré (ancien suivi) figé dès la confirmation.
    IF b2b_engagement_status_rank(OLD.status) >= 2
       AND NEW.declared_amount_cents IS DISTINCT FROM OLD.declared_amount_cents THEN
        RAISE EXCEPTION 'Montant déclaré figé après confirmation' USING ERRCODE = '42501';
    END IF;
    -- D-17 : un avenant de travaux fait croître l'assiette, jamais décroître.
    IF OLD.confirmed_amount_cents IS NOT NULL
       AND (NEW.confirmed_amount_cents IS NULL OR NEW.confirmed_amount_cents < OLD.confirmed_amount_cents) THEN
        RAISE EXCEPTION 'Montant confirmé : ne peut que croître (avenant de travaux D-17)' USING ERRCODE = '42501';
    END IF;
    IF b2b_engagement_status_rank(OLD.status) >= 2 AND OLD.commission_cents IS NOT NULL
       AND (NEW.commission_cents IS NULL OR NEW.commission_cents < OLD.commission_cents) THEN
        RAISE EXCEPTION 'Commission : ne peut que croître' USING ERRCODE = '42501';
    END IF;
    -- Montants figés après annulation.
    IF OLD.status = 'commission_cancelled'
       AND (NEW.confirmed_amount_cents IS DISTINCT FROM OLD.confirmed_amount_cents
            OR NEW.commission_cents IS DISTINCT FROM OLD.commission_cents) THEN
        RAISE EXCEPTION 'Montants figés après annulation' USING ERRCODE = '42501';
    END IF;
    -- Statuts terminaux : aucune sortie.
    IF OLD.status IN ('not_awarded', 'commission_cancelled', 'invoiced') AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Statut terminal (%)', OLD.status USING ERRCODE = '23514';
    END IF;
    IF OLD.selected_at IS NOT NULL AND NEW.selected_at IS DISTINCT FROM OLD.selected_at THEN
        RAISE EXCEPTION 'Sélection immuable' USING ERRCODE = '42501';
    END IF;
    IF OLD.partner_share_bps IS NOT NULL AND NEW.partner_share_bps IS DISTINCT FROM OLD.partner_share_bps THEN
        RAISE EXCEPTION 'Part partenaire figée' USING ERRCODE = '42501';
    END IF;
    IF OLD.cancelled_at IS NOT NULL
       AND (NEW.cancelled_at, NEW.cancel_case, NEW.cancel_reason, NEW.partner_share_kept_cents)
           IS DISTINCT FROM (OLD.cancelled_at, OLD.cancel_case, OLD.cancel_reason, OLD.partner_share_kept_cents) THEN
        RAISE EXCEPTION 'Annulation immuable' USING ERRCODE = '42501';
    END IF;
    IF b2b_engagement_status_rank(NEW.status) < b2b_engagement_status_rank(OLD.status) THEN
        RAISE EXCEPTION 'Transition de statut interdite (% → %)', OLD.status, NEW.status USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- 8. Dépôt du devis signé par le partenaire (D-13, D-14, D-17). Immuable sauf décision.
CREATE TABLE IF NOT EXISTS b2b_quote_submissions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id        UUID NOT NULL REFERENCES b2b_engagements(id) ON DELETE RESTRICT,
    request_id           UUID NOT NULL REFERENCES b2b_requests(id) ON DELETE RESTRICT,
    amount_ht_cents      BIGINT NOT NULL CHECK (amount_ht_cents > 0 AND amount_ht_cents <= 99999999999),
    deposit_due_on       DATE NOT NULL,
    -- D-06 bis : une date prévue par versement ; la première est celle de l'acompte.
    planned_due_dates    DATE[] NOT NULL CHECK (cardinality(planned_due_dates) BETWEEN 2 AND 3 AND array_position(planned_due_dates, NULL) IS NULL),
    file_key             TEXT NOT NULL CHECK (file_key ~ '^b2b-quotes/[0-9a-f-]{36}/[0-9a-f]{32}\.pdf$'),
    file_size            BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 20971520),
    attestation_text     TEXT NOT NULL CHECK (char_length(attestation_text) BETWEEN 20 AND 500),
    attested_at          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    submitted_ip         TEXT,
    submitted_user_agent TEXT,
    status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'contested', 'rejected')),
    decided_at           TIMESTAMPTZ,
    decided_by           TEXT CHECK (decided_by IS NULL OR decided_by IN ('pro', 'admin')),
    contest_reason       TEXT CHECK (contest_reason IS NULL OR char_length(contest_reason) BETWEEN 10 AND 500),
    contested_at         TIMESTAMPTZ,
    arbitration_note     TEXT CHECK (arbitration_note IS NULL OR char_length(arbitration_note) BETWEEN 10 AND 500),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT b2b_quote_submissions_first_date_check CHECK (deposit_due_on = planned_due_dates[1])
);
CREATE INDEX IF NOT EXISTS idx_b2b_quote_submissions_engagement ON b2b_quote_submissions (engagement_id, created_at);
CREATE INDEX IF NOT EXISTS idx_b2b_quote_submissions_request ON b2b_quote_submissions (request_id);
CREATE INDEX IF NOT EXISTS idx_b2b_quote_submissions_status ON b2b_quote_submissions (status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_b2b_quote_submissions_open ON b2b_quote_submissions (engagement_id) WHERE status IN ('pending', 'contested');
ALTER TABLE b2b_quote_submissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION guard_b2b_quote_submission() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Dépôt de devis en ajout seul' USING ERRCODE = '42501';
    END IF;
    IF (NEW.engagement_id, NEW.request_id, NEW.amount_ht_cents, NEW.deposit_due_on, NEW.planned_due_dates,
        NEW.file_key, NEW.file_size, NEW.attestation_text, NEW.attested_at, NEW.submitted_ip,
        NEW.submitted_user_agent, NEW.created_at)
       IS DISTINCT FROM
       (OLD.engagement_id, OLD.request_id, OLD.amount_ht_cents, OLD.deposit_due_on, OLD.planned_due_dates,
        OLD.file_key, OLD.file_size, OLD.attestation_text, OLD.attested_at, OLD.submitted_ip,
        OLD.submitted_user_agent, OLD.created_at) THEN
        RAISE EXCEPTION 'Dépôt de devis immuable' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'contested', 'rejected'))
        OR (OLD.status = 'contested' AND NEW.status IN ('confirmed', 'rejected'))
    ) THEN
        RAISE EXCEPTION 'Transition de dépôt interdite (% → %)', OLD.status, NEW.status USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_b2b_quote_submissions_guard ON b2b_quote_submissions;
CREATE TRIGGER trg_b2b_quote_submissions_guard
    BEFORE UPDATE OR DELETE ON b2b_quote_submissions
    FOR EACH ROW EXECUTE FUNCTION guard_b2b_quote_submission();

-- Garde commune des journaux en ajout seul.
CREATE OR REPLACE FUNCTION guard_b2b_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    RAISE EXCEPTION 'Journal en ajout seul (%)', TG_TABLE_NAME USING ERRCODE = '42501';
END;
$$;

-- 9. Journal des mouvements d'argent (D-12), ajout seul. Le solde se calcule à partir de lui.
CREATE TABLE IF NOT EXISTS b2b_commission_movements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES b2b_engagements(id) ON DELETE RESTRICT,
    type          TEXT NOT NULL CHECK (type IN ('commission_facturee', 'encaissement', 'remboursement', 'retro_commission_versee', 'annulation')),
    amount_cents  BIGINT NOT NULL CHECK (amount_cents >= 0 AND amount_cents <= 99999999999),
    occurred_on   DATE NOT NULL DEFAULT current_date,
    actor_id      UUID NOT NULL,
    operator      TEXT NOT NULL CHECK (char_length(operator) BETWEEN 2 AND 60),
    note          TEXT CHECK (note IS NULL OR char_length(note) <= 500),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_b2b_commission_movements_engagement ON b2b_commission_movements (engagement_id, created_at);
ALTER TABLE b2b_commission_movements ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_b2b_commission_movements_guard ON b2b_commission_movements;
CREATE TRIGGER trg_b2b_commission_movements_guard BEFORE UPDATE OR DELETE ON b2b_commission_movements FOR EACH ROW EXECUTE FUNCTION guard_b2b_append_only();

-- 10. Idempotence des relances (D-16).
CREATE TABLE IF NOT EXISTS b2b_reminders_sent (
    subject_id UUID NOT NULL,
    kind       TEXT NOT NULL CHECK (kind IN ('choice_1', 'choice_2', 'choice_expired', 'quote_1', 'quote_2', 'quote_stale', 'confirm_1', 'confirm_admin', 'installment_1', 'installment_2', 'installment_3')),
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (subject_id, kind)
);
ALTER TABLE b2b_reminders_sent ENABLE ROW LEVEL SECURITY;

-- 10 bis. Suivi des appels admin (D-25), ajout seul, écrit par Nitro pour un admin.
CREATE TABLE IF NOT EXISTS b2b_admin_followups (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id       UUID NOT NULL REFERENCES b2b_requests(id) ON DELETE RESTRICT,
    lot_id           UUID REFERENCES b2b_tender_lots(id) ON DELETE RESTRICT,
    pro_id           UUID REFERENCES professionals(id) ON DELETE RESTRICT,
    party            TEXT NOT NULL CHECK (party IN ('demandeur', 'partenaire', 'artisan')),
    outcome          TEXT NOT NULL CHECK (outcome IN ('joint', 'injoignable', 'rappel_prevu', 'debloque')),
    note             TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
    next_followup_on DATE,
    called_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    actor_id         UUID NOT NULL,
    operator         TEXT NOT NULL CHECK (char_length(operator) BETWEEN 2 AND 60),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT b2b_admin_followups_artisan_check CHECK (party <> 'artisan' OR pro_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_b2b_admin_followups_request ON b2b_admin_followups (request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_admin_followups_next ON b2b_admin_followups (next_followup_on) WHERE next_followup_on IS NOT NULL;
ALTER TABLE b2b_admin_followups ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_b2b_admin_followups_guard ON b2b_admin_followups;
CREATE TRIGGER trg_b2b_admin_followups_guard BEFORE UPDATE OR DELETE ON b2b_admin_followups FOR EACH ROW EXECUTE FUNCTION guard_b2b_append_only();

-- 10 ter. Validation de l'avancement par le partenaire, versement par versement (D-06 bis).
-- Les montants de l'échéancier ne sont PAS stockés : recalculés depuis la commission courante.
CREATE TABLE IF NOT EXISTS b2b_installment_validations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id        UUID NOT NULL REFERENCES b2b_engagements(id) ON DELETE RESTRICT,
    seq                  SMALLINT NOT NULL CHECK (seq BETWEEN 1 AND 3),
    validated_at         TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    validated_ip         TEXT,
    validated_user_agent TEXT,
    CONSTRAINT uq_b2b_installment_validations UNIQUE (engagement_id, seq)
);
ALTER TABLE b2b_installment_validations ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_b2b_installment_validations_guard ON b2b_installment_validations;
CREATE TRIGGER trg_b2b_installment_validations_guard BEFORE UPDATE OR DELETE ON b2b_installment_validations FOR EACH ROW EXECUTE FUNCTION guard_b2b_append_only();

-- 11. TRUNCATE contourne les triggers ligne : retiré aux rôles clients.
REVOKE TRUNCATE ON b2b_quote_submissions, b2b_commission_movements, b2b_reminders_sent, b2b_admin_followups, b2b_installment_validations FROM anon, authenticated;
