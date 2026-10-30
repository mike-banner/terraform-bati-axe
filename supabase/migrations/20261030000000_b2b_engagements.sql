-- =====================================================
-- Phase 05.21 — Verrou juridique B2B (anti-contournement)
-- D-04 : signature électronique simple (OTP email + contenu figé + SHA-256 +
-- horodatage + IP/UA). Preuves en ajout seul. Écritures exclusivement par
-- Nitro en service role : RLS activée SANS policy sur les nouvelles tables.
-- D-03 : aucun rattrapage des données existantes (aucun partenaire réel).
--
-- Rollback (manuel, après sauvegarde) :
--   DROP TRIGGER IF EXISTS trg_b2b_engagements_guard ON b2b_engagements;
--   DROP TABLE IF EXISTS b2b_engagements;
--   DROP TABLE IF EXISTS b2b_signature_challenges;
--   DROP FUNCTION IF EXISTS guard_b2b_engagement();
--   DROP FUNCTION IF EXISTS b2b_engagement_status_rank(TEXT);
--   DROP TABLE IF EXISTS b2b_partner_tokens;
--   (les valeurs ajoutées à audit_action ne peuvent pas être retirées)
-- =====================================================

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_engagement_signed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_quote_declared';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_quote_confirmed';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'b2b_engagement_status_changed';

-- Jetons d'accès partenaire (pas de compte partenaire) : seul le hash SHA-256
-- est stocké, donc un jeton en clair n'est pas récupérable. Plusieurs jetons
-- actifs par dossier : un nouvel email ajoute un jeton sans invalider les
-- liens déjà envoyés. Révocation uniquement sur renvoi admin explicite
-- (revoked_at) ou à expiration (30 j).
CREATE TABLE IF NOT EXISTS b2b_partner_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID NOT NULL REFERENCES b2b_requests(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_b2b_partner_tokens_request_id ON b2b_partner_tokens (request_id);
ALTER TABLE b2b_partner_tokens ENABLE ROW LEVEL SECURITY;

-- Défis OTP : code à 6 chiffres haché, 10 min, 5 tentatives, usage unique.
CREATE TABLE IF NOT EXISTS b2b_signature_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_type TEXT NOT NULL CHECK (engagement_type IN ('framework_pro', 'framework_partner', 'lot_amendment')),
    pro_id          UUID REFERENCES professionals(id) ON DELETE CASCADE,
    request_id      UUID REFERENCES b2b_requests(id) ON DELETE CASCADE,
    lot_id          UUID REFERENCES b2b_tender_lots(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    code_hash       TEXT NOT NULL CHECK (code_hash ~ '^[0-9a-f]{64}$'),
    content_sha256  TEXT NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
    attempts        INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    expires_at      TIMESTAMPTZ NOT NULL,
    consumed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_b2b_signature_challenges_pro ON b2b_signature_challenges (pro_id, engagement_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_signature_challenges_request ON b2b_signature_challenges (request_id, engagement_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_signature_challenges_lot ON b2b_signature_challenges (lot_id);
ALTER TABLE b2b_signature_challenges ENABLE ROW LEVEL SECURITY;

-- Preuves de signature + suivi du devis (avenants). ON DELETE RESTRICT : une
-- preuve contractuelle ne disparaît pas avec le dossier ou le compte.
CREATE TABLE IF NOT EXISTS b2b_engagements (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type                   TEXT NOT NULL CHECK (type IN ('framework_pro', 'framework_partner', 'lot_amendment')),
    pro_id                 UUID REFERENCES professionals(id) ON DELETE RESTRICT,
    request_id             UUID REFERENCES b2b_requests(id) ON DELETE RESTRICT,
    lot_id                 UUID REFERENCES b2b_tender_lots(id) ON DELETE RESTRICT,
    signer_email           TEXT NOT NULL CHECK (signer_email = lower(signer_email)),
    template_version       TEXT NOT NULL,
    content_html           TEXT NOT NULL,
    content_sha256         TEXT NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
    otp_challenge_id       UUID NOT NULL,
    signed_at              TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    signed_ip              TEXT,
    signed_user_agent      TEXT,
    status                 TEXT NOT NULL DEFAULT 'signed'
                           CHECK (status IN ('signed', 'not_awarded', 'quote_declared', 'quote_confirmed', 'deposit_paid', 'invoiced')),
    declared_amount_cents  BIGINT CHECK (declared_amount_cents IS NULL OR declared_amount_cents > 0),
    declared_at            TIMESTAMPTZ,
    confirmed_amount_cents BIGINT CHECK (confirmed_amount_cents IS NULL OR confirmed_amount_cents > 0),
    confirmed_at           TIMESTAMPTZ,
    confirmed_ip           TEXT,
    commission_cents       BIGINT CHECK (commission_cents IS NULL OR commission_cents >= 0),
    -- Répartition partenaire / plateforme non tranchée (CONTEXT, hors périmètre) : paramètre nullable.
    partner_share_bps      INTEGER CHECK (partner_share_bps IS NULL OR partner_share_bps BETWEEN 0 AND 10000),
    -- D-06 / revue : plafond de redéclarations (3) et 1 email partenaire / 24 h, comptés en base.
    declare_count          INTEGER NOT NULL DEFAULT 0 CHECK (declare_count BETWEEN 0 AND 3),
    partner_notified_at    TIMESTAMPTZ,
    reminder_30_sent_at    TIMESTAMPTZ,
    reminder_60_sent_at    TIMESTAMPTZ,
    deposit_paid_at        TIMESTAMPTZ,
    invoiced_at            TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT b2b_engagements_subject_check CHECK (
        (type = 'framework_pro' AND pro_id IS NOT NULL AND lot_id IS NULL)
        OR (type = 'framework_partner' AND request_id IS NOT NULL AND pro_id IS NULL AND lot_id IS NULL)
        OR (type = 'lot_amendment' AND pro_id IS NOT NULL AND lot_id IS NOT NULL AND request_id IS NOT NULL)
    ),
    CONSTRAINT b2b_engagements_framework_status_check CHECK (type = 'lot_amendment' OR status = 'signed')
);
-- ponytail: pas de deleted_at — une preuve est en ajout seul (DELETE interdit par trigger).
CREATE UNIQUE INDEX IF NOT EXISTS uq_b2b_engagements_framework_pro ON b2b_engagements (pro_id, template_version) WHERE type = 'framework_pro';
CREATE UNIQUE INDEX IF NOT EXISTS uq_b2b_engagements_framework_partner ON b2b_engagements (signer_email, template_version) WHERE type = 'framework_partner';
CREATE UNIQUE INDEX IF NOT EXISTS uq_b2b_engagements_lot_amendment ON b2b_engagements (lot_id, pro_id) WHERE type = 'lot_amendment';
CREATE INDEX IF NOT EXISTS idx_b2b_engagements_request_id ON b2b_engagements (request_id);
CREATE INDEX IF NOT EXISTS idx_b2b_engagements_pro_id ON b2b_engagements (pro_id);
CREATE INDEX IF NOT EXISTS idx_b2b_engagements_status ON b2b_engagements (status, signed_at) WHERE type = 'lot_amendment';
ALTER TABLE b2b_engagements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION b2b_engagement_status_rank(s TEXT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
    SELECT CASE s
        WHEN 'signed' THEN 0
        WHEN 'not_awarded' THEN 1
        WHEN 'quote_declared' THEN 1
        WHEN 'quote_confirmed' THEN 2
        WHEN 'deposit_paid' THEN 3
        WHEN 'invoiced' THEN 4
    END
$$;

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
    -- Montants figés une fois confirmés (revue 05.21) : le montant déclaré ne bouge plus
    -- dès quote_confirmed ; montant confirmé et commission ne passent que de NULL à
    -- une valeur après confirmation. La commission reste recalculable tant que le
    -- devis est seulement déclaré (redéclaration, confirmation). Le forçage admin
    -- de deposit_paid (D-07) ne touche à aucun montant.
    IF b2b_engagement_status_rank(OLD.status) >= 2
       AND NEW.declared_amount_cents IS DISTINCT FROM OLD.declared_amount_cents THEN
        RAISE EXCEPTION 'Montant déclaré figé après confirmation' USING ERRCODE = '42501';
    END IF;
    IF OLD.confirmed_amount_cents IS NOT NULL
       AND NEW.confirmed_amount_cents IS DISTINCT FROM OLD.confirmed_amount_cents THEN
        RAISE EXCEPTION 'Montant confirmé figé' USING ERRCODE = '42501';
    END IF;
    IF b2b_engagement_status_rank(OLD.status) >= 2 AND OLD.commission_cents IS NOT NULL
       AND NEW.commission_cents IS DISTINCT FROM OLD.commission_cents THEN
        RAISE EXCEPTION 'Commission figée après confirmation' USING ERRCODE = '42501';
    END IF;
    IF b2b_engagement_status_rank(NEW.status) < b2b_engagement_status_rank(OLD.status) THEN
        RAISE EXCEPTION 'Transition de statut interdite (% → %)', OLD.status, NEW.status USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_engagements_guard ON b2b_engagements;
CREATE TRIGGER trg_b2b_engagements_guard
    BEFORE UPDATE OR DELETE ON b2b_engagements
    FOR EACH ROW EXECUTE FUNCTION guard_b2b_engagement();

-- TRUNCATE contourne les triggers ligne : retiré aux rôles clients.
REVOKE TRUNCATE ON b2b_engagements, b2b_signature_challenges, b2b_partner_tokens FROM anon, authenticated;
