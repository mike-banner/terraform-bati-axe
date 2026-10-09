-- Phase 05.19 : type de professionnel + sélection d'arborescence B2C

-- Type de pro : spécialiste (reçoit selon recouvrement de catégories) ou
-- Entreprise Générale du Bâtiment (EGB, reçoit tous les chantiers)
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS professional_type TEXT NOT NULL DEFAULT 'specialiste'
  CHECK (professional_type IN ('specialiste', 'entreprise_generale'));

-- Sélection du particulier dans le simulateur (utilisée pour le matching)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS selected_category TEXT,
  ADD COLUMN IF NOT EXISTS selected_sub_category TEXT,
  ADD COLUMN IF NOT EXISTS selected_items TEXT[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.professionals.professional_type IS
  'Type de pro : specialiste (catégories cochées) ou entreprise_generale (EGB, tous les chantiers)';
COMMENT ON COLUMN public.projects.selected_category IS
  'Catégorie principale : renovation_globale, renovation_energetique ou prestations_ciblees';
COMMENT ON COLUMN public.projects.selected_sub_category IS
  'Sous-bloc (rénovation globale uniquement) : gros_oeuvre ou second_oeuvre';
COMMENT ON COLUMN public.projects.selected_items IS
  'Slugs des postes de travaux choisis (ex. {pac,isolation_ite_iti}), voir app/utils/workTypeMatrix.ts';
