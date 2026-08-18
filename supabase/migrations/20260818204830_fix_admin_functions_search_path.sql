-- Fix Supabase Advisor WARN "function_search_path_mutable" (2026-08-18 audit).
-- promote_to_admin / revoke_admin sont SECURITY DEFINER sans search_path fixe :
-- un objet malveillant placé plus tôt dans le search_path pourrait shadower une
-- table/fonction utilisée par le definer et escalader ses privilèges.
-- Fix recommandé Supabase : fixer explicitement le search_path. Aucun changement
-- de comportement pour les appelants.
ALTER FUNCTION public.promote_to_admin(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.revoke_admin(text) SET search_path = public, pg_temp;
