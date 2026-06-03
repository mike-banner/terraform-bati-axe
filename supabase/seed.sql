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

-- Insert a pilot prospect in Carrières-sous-Poissy (78955) for testing the Claim flow
INSERT INTO prospects (id, source, company_name, siret, email, phone, zip_code, zone_id, optin_status)
VALUES (
    '5a900143-8236-4dff-8716-cc3e445a7ec0',
    'import',
    'DUPONT PLOMBERIE',
    '12345678900012',
    'dupont.plomberie@example.com',
    '0611223344',
    '78955',
    '8c900143-8236-4dff-8716-cc3e445a7ec0',
    'accepted'
)
ON CONFLICT (id) DO NOTHING;
