-- Phase 5 — Feedback loop : décision du particulier sur chaque artisan engagé.
-- REQ-06 : le particulier peut écarter ("refused") ou retenir ("selected") un pro.
-- Quand TOUS les pros engagés (leads status='claimed') d'un projet sont "refused",
-- le projet repart automatiquement sur le marché (les leads refusés passent en 'lost'
-- côté serveur pour libérer les slots du cap à 3 — voir decision.post.ts).

-- Décision particulier par lead. Colonne SÉPARÉE de lead_status (enum métier).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS customer_decision TEXT NOT NULL DEFAULT 'pending'
  CHECK (customer_decision IN ('pending', 'refused', 'selected'));

-- Compteur anti-spam de remise au marché + horodatage de la dernière relance.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS relaunch_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS last_relaunched_at TIMESTAMPTZ;

-- Accélère le check "tous les leads engagés du projet sont refusés".
CREATE INDEX IF NOT EXISTS idx_leads_project_decision
  ON public.leads (project_id, customer_decision);
