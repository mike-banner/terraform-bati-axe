-- Corrige le bug préexistant documenté dans 20260720000000_phase57_input_limits_followup.sql :
-- server/api/v1/pro/documents/upload.post.ts insère policy_number sur upload décennale,
-- mais la colonne n'a jamais été créée -> tout upload de décennale échoue en 500.

ALTER TABLE verifications
  ADD COLUMN policy_number TEXT;

ALTER TABLE verifications
  ADD CONSTRAINT verifications_policy_number_len CHECK (policy_number IS NULL OR char_length(policy_number) <= 50);
