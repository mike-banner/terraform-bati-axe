-- Réinitialisation des données de test du flux B2B (phase 05.23, plan 09).
-- Base cloud partagée dev/prod : exécuter la section A (lecture seule), la faire valider, puis seulement la section B.
-- Ne touche PAS : professionals, b2b_requests, b2b_tender_lots, b2b_tender_claims, b2b_admin_followups, audit_logs.

-- ============================================================
-- Section A — DRY-RUN (lecture seule)
-- ============================================================
SELECT type, status, count(*) FROM b2b_engagements GROUP BY 1, 2 ORDER BY 1, 2;

SELECT id, type, status, signer_email, request_id, lot_id, signed_at FROM b2b_engagements ORDER BY signed_at;

SELECT 'b2b_signature_challenges' AS t, count(*) FROM b2b_signature_challenges
UNION ALL SELECT 'b2b_partner_tokens', count(*) FROM b2b_partner_tokens
UNION ALL SELECT 'b2b_quote_submissions', count(*) FROM b2b_quote_submissions
UNION ALL SELECT 'b2b_commission_movements', count(*) FROM b2b_commission_movements
UNION ALL SELECT 'b2b_installment_validations', count(*) FROM b2b_installment_validations
UNION ALL SELECT 'b2b_reminders_sent', count(*) FROM b2b_reminders_sent
-- conservés (contrôle avant/après, doivent rester identiques) :
UNION ALL SELECT 'professionals', count(*) FROM professionals
UNION ALL SELECT 'b2b_requests', count(*) FROM b2b_requests
UNION ALL SELECT 'b2b_tender_lots', count(*) FROM b2b_tender_lots
UNION ALL SELECT 'b2b_tender_claims', count(*) FROM b2b_tender_claims
UNION ALL SELECT 'b2b_admin_followups', count(*) FROM b2b_admin_followups;

-- ============================================================
-- Section B — EXÉCUTION (UNIQUEMENT après accord explicite « GO reset »)
-- Une seule transaction ; garde-fous désactivés le temps de l'opération puis réactivés.
-- ============================================================
BEGIN;
ALTER TABLE b2b_installment_validations DISABLE TRIGGER trg_b2b_installment_validations_guard;
ALTER TABLE b2b_commission_movements    DISABLE TRIGGER trg_b2b_commission_movements_guard;
ALTER TABLE b2b_quote_submissions       DISABLE TRIGGER trg_b2b_quote_submissions_guard;
ALTER TABLE b2b_engagements             DISABLE TRIGGER trg_b2b_engagements_guard;
DELETE FROM b2b_installment_validations;
DELETE FROM b2b_commission_movements;
DELETE FROM b2b_quote_submissions;
DELETE FROM b2b_reminders_sent;
DELETE FROM b2b_engagements;          -- conventions pro, conventions partenaire, avenants de test
DELETE FROM b2b_signature_challenges;
DELETE FROM b2b_partner_tokens;       -- les liens partenaire seront renvoyés par l'admin
ALTER TABLE b2b_engagements             ENABLE TRIGGER trg_b2b_engagements_guard;
ALTER TABLE b2b_quote_submissions       ENABLE TRIGGER trg_b2b_quote_submissions_guard;
ALTER TABLE b2b_commission_movements    ENABLE TRIGGER trg_b2b_commission_movements_guard;
ALTER TABLE b2b_installment_validations ENABLE TRIGGER trg_b2b_installment_validations_guard;
COMMIT;

-- ============================================================
-- Section C — VÉRIFICATION
-- Les 7 premières tables à 0 ; les tables conservées identiques à la section A.
-- ============================================================
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgname IN ('trg_b2b_engagements_guard', 'trg_b2b_quote_submissions_guard', 'trg_b2b_commission_movements_guard',
                 'trg_b2b_installment_validations_guard', 'trg_b2b_admin_followups_guard');
-- attendu : 5 lignes à 'O' (activés)
