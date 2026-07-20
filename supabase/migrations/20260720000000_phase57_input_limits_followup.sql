-- Phase 05.7 (suivi revue de code) : CHECK constraint manquante pour phone,
-- champ découvert hors-audit initial pendant l'exécution de la phase.
-- Même pattern NOT VALID + VALIDATE que 20260719000000_phase57_input_limits.sql.
--
-- Note : verifications.policy_number n'a PAS de miroir ici — la colonne
-- n'existe pas dans le schéma (`\d verifications`), alors que
-- server/api/v1/pro/documents/upload.post.ts l'insère. Bug préexistant,
-- hors scope de cette phase — à traiter séparément.

-- professionals.phone — miroir du .max(20) Zod (server/api/v1/pro/profile/me.patch.ts)
ALTER TABLE professionals
  ADD CONSTRAINT professionals_phone_len CHECK (phone IS NULL OR char_length(phone) <= 20) NOT VALID;

ALTER TABLE professionals VALIDATE CONSTRAINT professionals_phone_len;
