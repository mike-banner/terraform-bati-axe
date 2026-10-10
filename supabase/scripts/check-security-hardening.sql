-- Contrôle rejouable du durcissement (consents, completed_projects, expire_decennale_status). Local uniquement ; tout est annulé.
-- docker exec -i supabase_db_bati-axe psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/scripts/check-security-hardening.sql
BEGIN;

SELECT id AS pro_id FROM professionals ORDER BY id LIMIT 1 \gset
SELECT id AS pro2_id FROM professionals WHERE id <> :'pro_id' ORDER BY id LIMIT 1 \gset

-- Données de départ (service role / superuser)
INSERT INTO consents (subject_type, subject_id, channel, status, source)
  VALUES ('professional', :'pro_id', 'email', 'granted', 'check');

-- a. consents côté pro : lecture oui, écriture non
SELECT set_config('request.jwt.claims', json_build_object('role','authenticated','sub', :'pro_id')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int; pid uuid := auth.uid();
BEGIN
  SELECT count(*) INTO n FROM consents WHERE subject_id = pid AND source = 'check';
  ASSERT n = 1, 'ECHEC a1 : le pro ne lit pas sa ligne de consentement';
  BEGIN
    INSERT INTO consents (subject_type, subject_id, channel, status, source) VALUES ('professional', pid, 'email', 'granted', 'x');
    RAISE EXCEPTION 'ECHEC a2 : insert consents accepté';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE consents SET status = 'revoked' WHERE subject_id = pid;
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'ECHEC a3 : update consents accepté';
  DELETE FROM consents WHERE subject_id = pid;
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'ECHEC a4 : delete consents accepté';
END $$;
RESET ROLE;
SELECT (count(*) = 1 AND min(status::text) = 'granted') AS a5_ok FROM consents WHERE subject_id = :'pro_id' AND source = 'check' \gset
\if :a5_ok \else \echo 'ECHEC a5 : la ligne de consentement a été altérée' \quit \endif

-- b. completed_projects côté pro
SELECT set_config('request.jwt.claims', json_build_object('role','authenticated','sub', :'pro_id')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO completed_projects (professional_id, title, is_showcased) VALUES (:'pro_id', 'check réalisation', true);
DO $$
DECLARE n int; v boolean;
BEGIN
  SELECT is_showcased INTO v FROM completed_projects WHERE title = 'check réalisation';
  ASSERT v = false, 'ECHEC b1 : is_showcased non forcé à false à l''insert';
  BEGIN
    UPDATE completed_projects SET is_showcased = true WHERE title = 'check réalisation';
    RAISE EXCEPTION 'ECHEC b2 : update is_showcased par le pro accepté';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- un UPDATE qui ne touche pas is_showcased reste permis
  UPDATE completed_projects SET description = 'ok' WHERE title = 'check réalisation';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'ECHEC b3 : le pro ne peut plus modifier sa réalisation';
END $$;
RESET ROLE;

-- c. admin (jeton) puis service role peuvent changer is_showcased
SELECT set_config('request.jwt.claims', json_build_object('role','authenticated','sub', :'pro2_id', 'app_metadata', json_build_object('role','admin'))::text, true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  -- la RLS limite l'admin navigateur à ses propres lignes : on teste le trigger, donc on passe par une ligne de l'admin
  INSERT INTO completed_projects (professional_id, title, is_showcased) VALUES (auth.uid(), 'check admin', true);
  ASSERT (SELECT is_showcased FROM completed_projects WHERE title = 'check admin'), 'ECHEC c1 : admin forcé à false';
  UPDATE completed_projects SET is_showcased = false WHERE title = 'check admin';
  ASSERT NOT (SELECT is_showcased FROM completed_projects WHERE title = 'check admin'), 'ECHEC c2 : admin ne peut pas modifier';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
UPDATE completed_projects SET is_showcased = true WHERE title = 'check réalisation';
SELECT is_showcased AS c3_ok FROM completed_projects WHERE title = 'check réalisation' \gset
\if :c3_ok \else \echo 'ECHEC c3 : service role bloqué' \quit \endif

-- d. le pro peut supprimer sa réalisation
SELECT set_config('request.jwt.claims', json_build_object('role','authenticated','sub', :'pro_id')::text, true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; BEGIN
  DELETE FROM completed_projects WHERE title = 'check réalisation';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'ECHEC d : le pro ne peut pas supprimer sa réalisation';
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

-- e. expire_decennale_status : 3 pros existants mis à 'valid' (échu / non échu / sans justificatif)
SELECT id AS p_exp FROM professionals ORDER BY id OFFSET 0 LIMIT 1 \gset
SELECT id AS p_ok  FROM professionals ORDER BY id OFFSET 1 LIMIT 1 \gset
SELECT id AS p_non FROM professionals ORDER BY id OFFSET 2 LIMIT 1 \gset
DELETE FROM verifications WHERE pro_id IN (:'p_exp', :'p_ok', :'p_non') AND document_type = 'decennale';
UPDATE professionals SET decennal_status = 'valid', is_verified = true WHERE id IN (:'p_exp', :'p_ok', :'p_non');
INSERT INTO verifications (pro_id, document_type, file_key, status, expiry_date) VALUES
  (:'p_exp', 'decennale', 'check/d1.pdf', 'approved', current_date - 1),
  (:'p_ok',  'decennale', 'check/d2.pdf', 'approved', current_date + 30);
SELECT public.expire_decennale_status();
SELECT (decennal_status = 'expired' AND is_verified) AS e1_ok FROM professionals WHERE id = :'p_exp' \gset
\if :e1_ok \else \echo 'ECHEC e1 : décennale échue non passée à expired (ou is_verified touché)' \quit \endif
SELECT (decennal_status = 'valid') AS e2_ok FROM professionals WHERE id = :'p_ok' \gset
\if :e2_ok \else \echo 'ECHEC e2 : décennale non échue modifiée' \quit \endif
SELECT (decennal_status = 'valid') AS e3_ok FROM professionals WHERE id = :'p_non' \gset
\if :e3_ok \else \echo 'ECHEC e3 : pro sans justificatif modifié' \quit \endif

-- f. redépôt d'une décennale valide (flux upload : insert approuvé + decennal_status = valid) : non ré-expiré
INSERT INTO verifications (pro_id, document_type, file_key, status, expiry_date)
  VALUES (:'p_exp', 'decennale', 'check/d3.pdf', 'approved', current_date + 365);
UPDATE professionals SET decennal_status = 'valid' WHERE id = :'p_exp';
SELECT public.expire_decennale_status();
SELECT (decennal_status = 'valid') AS f_ok FROM professionals WHERE id = :'p_exp' \gset
\if :f_ok \else \echo 'ECHEC f : redépôt valide ré-expiré' \quit \endif

-- g. surface RPC
DO $$ BEGIN
  ASSERT NOT has_function_privilege('authenticated','public.expire_decennale_status()','EXECUTE'), 'ECHEC g1';
  ASSERT NOT has_function_privilege('anon','public.expire_decennale_status()','EXECUTE'), 'ECHEC g2';
  ASSERT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-decennale-status' AND schedule = '0 * * * *'), 'ECHEC g3 : job absent';
END $$;

\echo 'check-security-hardening : toutes les assertions a-g passent'
ROLLBACK;
