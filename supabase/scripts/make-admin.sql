-- ─────────────────────────────────────────────────────────────────────────────
-- Admin — compte générique admin@batiaxe.com
--
-- 1. Créer l'utilisateur :
--    - soit via Studio : Authentication > Users > "Add user"
--      (email = admin@batiaxe.com + mot de passe + "Auto confirm") ;
--    - soit en lançant le script Node clé-en-main :
--        SUPABASE_URL="https://xxxx.supabase.co" \
--        SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
--        ADMIN_PASSWORD="TonMotDePasse" \
--        node supabase/scripts/reset-admin.mjs
--
-- 2. Puis exécuter ce script pour lui donner le rôle admin.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT promote_to_admin('admin@batiaxe.com');

-- Vérifier :
-- SELECT email, raw_app_meta_data->>'role' AS role FROM auth.users
--  WHERE email = 'admin@batiaxe.com';
