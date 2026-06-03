-- ─────────────────────────────────────────────────────────────────────────────
-- Admin role management
-- Role stored in app_metadata (JWT claim) — only writable via service_role.
-- Usage: SELECT promote_to_admin('email@example.com');
--        SELECT revoke_admin('email@example.com');
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION promote_to_admin(target_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
  WHERE email = target_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable : %', target_email;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION revoke_admin(target_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data - 'role'
  WHERE email = target_email;
END;
$$;

-- Grant execution only to service_role (never to anon/authenticated)
REVOKE ALL ON FUNCTION promote_to_admin(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION revoke_admin(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION revoke_admin(TEXT) TO service_role;
