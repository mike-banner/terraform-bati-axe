-- Supabase Migration: Phase 5.5 — Portfolio & Preuve Sociale
-- Date: 2026-07-17

-- =============================================================================
-- completed_projects: galerie de réalisations du pro
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.completed_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    city TEXT,
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    is_showcased BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.completed_projects ENABLE ROW LEVEL SECURITY;

-- SELECT public : la galerie est visible sans auth
CREATE POLICY select_public_completed_projects ON public.completed_projects
    FOR SELECT TO public USING (true);

-- Le pro propriétaire gère ses propres réalisations (is_showcased reste service_role, voir plan 04)
CREATE POLICY manage_own_completed_projects ON public.completed_projects
    FOR ALL TO authenticated USING (auth.uid() = professional_id);

-- =============================================================================
-- likes: compteur anti-spam pour la preuve sociale
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.completed_projects(id) ON DELETE CASCADE,
    ip_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT unique_project_ip_like UNIQUE (project_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_likes_project_id ON public.likes(project_id);

-- Aucune policy : accès public/auth refusé par défaut, seuls les endpoints
-- service_role écrivent/comptent (ip_hash est un SHA-256 opaque, jamais l'IP brute).
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
