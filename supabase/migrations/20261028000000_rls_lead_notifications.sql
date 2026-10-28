-- Supabase Migration: activer la RLS sur lead_notifications
-- Date: 2026-10-28
-- Oubli de 20260823000002 : table exposée en lecture/écriture via la clé anon.
-- Aucune policy : seul le serveur (service role, notifyMatchedPros) y accède.
ALTER TABLE lead_notifications ENABLE ROW LEVEL SECURITY;
