-- Suivi de réconciliation : version appliquée directement dans le dashboard
-- Supabase pendant l'audit sécurité du 2026-08-18 (commit a185893).
-- 2ème tentative (REVOKE FROM PUBLIC) — le droit n'a pas pu être retiré
-- (voir .planning/SECURITY-CHECKLIST.md, ligne 57 : probablement ALTER DEFAULT
-- PRIVILEGES au niveau schéma). SQL idempotent — ré-exécutable sans effet.
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM PUBLIC;
