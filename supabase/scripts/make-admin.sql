-- Exécuter dans Supabase Studio (SQL Editor) ou via:
-- psql $DATABASE_URL -f supabase/scripts/make-admin.sql
--
-- IMPORTANT : ne committer jamais ce fichier avec un vrai email dedans.
-- Remplacer par votre email avant exécution.

SELECT promote_to_admin('mick.ban@gmail.com');

-- Pour vérifier :
-- SELECT email, raw_app_meta_data->>'role' AS role FROM auth.users WHERE email = 'mick.ban@gmail.com';
