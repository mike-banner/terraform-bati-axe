-- Fix Supabase Advisor WARN "anon/authenticated_security_definer_function_executable"
-- (2026-08-18 audit). st_estimatedextent (stats géométrie, fournie par l'extension
-- PostGIS) était exécutable en RPC public sans jamais être appelée par l'app
-- (grep confirmé sur server/ et app/). Retire l'exposition, aucun impact fonctionnel.
--
-- Note : la table spatial_ref_sys (autre finding lié à PostGIS, RLS désactivé)
-- n'a pas pu être corrigée ici — appartient au rôle propriétaire de l'extension,
-- "must be owner of table spatial_ref_sys". Nécessite le dashboard Supabase ou
-- le support Supabase. Voir .planning/SECURITY-CHECKLIST.md.
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM anon, authenticated;
