-- Suivi de réconciliation : version appliquée directement dans le dashboard
-- Supabase pendant l'audit sécurité du 2026-08-18 (commit a185893).
-- Fix équivalent : server/api/... promote_to_admin / revoke_admin search_path.
-- SQL idempotent — ré-exécutable sans effet.
ALTER FUNCTION public.promote_to_admin(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.revoke_admin(text) SET search_path = public, pg_temp;
