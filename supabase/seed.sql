-- Supabase Seed Data
-- Date: 2026-06-03

-- Insert pilot zone Carrières-sous-Poissy (78955)
INSERT INTO zones (id, type, name, postal_codes, is_active)
VALUES (
    '8c900143-8236-4dff-8716-cc3e445a7ec0',
    'city',
    'Carrières-sous-Poissy',
    ARRAY['78955'],
    true
)
ON CONFLICT (id) DO NOTHING;
