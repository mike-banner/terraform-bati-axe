-- Contrôle rejouable de la qualification RGE (05.19-14). Local uniquement ; tout est annulé en fin de script.
-- docker exec -i supabase_db_bati-axe psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/scripts/check-rge-status.sql
BEGIN;

SELECT id AS pro_id FROM professionals LIMIT 1 \gset

-- a. approuvé non échu -> valid
INSERT INTO verifications (pro_id, document_type, file_key, status, expiry_date)
  VALUES (:'pro_id', 'rge', 'check/rge.pdf', 'approved', current_date + 30);
SELECT (rge_status = 'valid') AS a_ok FROM professionals WHERE id = :'pro_id' \gset
\if :a_ok \else \echo 'ECHEC a' \quit \endif

-- b. échéance dépassée -> expired
UPDATE verifications SET expiry_date = current_date - 1 WHERE pro_id = :'pro_id' AND document_type = 'rge';
SELECT (rge_status = 'expired') AS b_ok FROM professionals WHERE id = :'pro_id' \gset
\if :b_ok \else \echo 'ECHEC b' \quit \endif

-- c. suppression -> none
DELETE FROM verifications WHERE pro_id = :'pro_id' AND document_type = 'rge';
SELECT (rge_status = 'none') AS c_ok FROM professionals WHERE id = :'pro_id' \gset
\if :c_ok \else \echo 'ECHEC c' \quit \endif

-- d. cron : trigger coupé, échéance passée, expire_rge_status() -> expired
INSERT INTO verifications (pro_id, document_type, file_key, status, expiry_date)
  VALUES (:'pro_id', 'rge', 'check/rge.pdf', 'approved', current_date + 30);
ALTER TABLE verifications DISABLE TRIGGER trg_sync_rge_status;
UPDATE verifications SET expiry_date = current_date - 1 WHERE pro_id = :'pro_id' AND document_type = 'rge';
ALTER TABLE verifications ENABLE TRIGGER trg_sync_rge_status;
SELECT expire_rge_status();
SELECT (rge_status = 'expired') AS d_ok FROM professionals WHERE id = :'pro_id' \gset
\if :d_ok \else \echo 'ECHEC d' \quit \endif
DELETE FROM verifications WHERE pro_id = :'pro_id' AND document_type = 'rge';

-- e. rge sans échéance -> check_violation
DO $$ BEGIN
  INSERT INTO verifications (pro_id, document_type, file_key, status)
    VALUES ((SELECT id FROM professionals LIMIT 1), 'rge', 'check/x.pdf', 'pending');
  RAISE EXCEPTION 'ECHEC e : insert sans expiry_date accepté';
EXCEPTION WHEN check_violation THEN NULL;
END $$;

-- f. côté pro (JWT authenticated)
SELECT set_config('request.jwt.claims', json_build_object('role','authenticated','sub', :'pro_id')::text, true);
SET LOCAL ROLE authenticated;
INSERT INTO verifications (pro_id, document_type, file_key, status, expiry_date)
  VALUES (:'pro_id', 'rge', 'check/pro.pdf', 'approved', current_date + 30);
SELECT (status = 'pending') AS f1_ok FROM verifications WHERE file_key = 'check/pro.pdf' \gset
DO $$
DECLARE n int;
BEGIN
  BEGIN
    UPDATE verifications SET expiry_date = current_date + 900 WHERE file_key = 'check/pro.pdf';
    RAISE EXCEPTION 'ECHEC f : update pro accepté';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE professionals SET rge_status = 'valid' WHERE id = (SELECT id FROM professionals WHERE id = auth.uid());
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'ECHEC f : le pro a pu écrire rge_status';
END $$;
RESET ROLE;
\if :f1_ok \else \echo 'ECHEC f1 : insert pro non forcé en pending' \quit \endif
SELECT (rge_status = 'none') AS f2_ok FROM professionals WHERE id = :'pro_id' \gset
\if :f2_ok \else \echo 'ECHEC f2 : rge_status modifié par ligne pending' \quit \endif

-- g. surface RPC
DO $$ BEGIN
  ASSERT NOT has_function_privilege('authenticated','public.expire_rge_status()','EXECUTE');
  ASSERT NOT has_function_privilege('anon','public.expire_rge_status()','EXECUTE');
  ASSERT NOT has_function_privilege('authenticated','public.sync_rge_status(uuid)','EXECUTE');
  ASSERT NOT has_function_privilege('anon','public.sync_rge_status(uuid)','EXECUTE');
END $$;

\echo 'check-rge-status : toutes les assertions a-g passent'
ROLLBACK;
