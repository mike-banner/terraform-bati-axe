-- Suivi de réconciliation : version appliquée directement dans le dashboard
-- Supabase pendant l'audit sécurité du 2026-08-18 (commit a185893).
-- 1ère tentative de retrait de l'exécution publique de st_estimatedextent.
-- SQL idempotent — ré-exécutable sans effet.
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM anon, authenticated;
