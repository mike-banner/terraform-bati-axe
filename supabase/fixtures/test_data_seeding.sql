-- Supabase Migration: Test Data Seeding - 3 Leads per Category
-- Date: 2026-06-13
-- Purpose: Create comprehensive test data for all categories with RLS verification

-- ============================================================================
-- 1. CREATE TEST PROFESSIONALS (one per category)
-- ============================================================================

-- Maçonnerie
INSERT INTO professionals (
  id, short_id, canonical_slug, email, company_name, siret, full_name, phone,
  postal_code, categories, is_verified, is_claimed, decennal_status, subscription_status, created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid, 'MACON1', 'maconnerie-dupont-MACON1',
  'maconnerie@test.fr', 'Maçonnerie Dupont SARL', '12345678901111', 'Pierre Dupont', '06 11 11 11 11',
  '78955', ARRAY['maconnerie'], true, true, 'valid', 'active', NOW()
) ON CONFLICT (id) DO NOTHING;

-- Toiture
INSERT INTO professionals (
  id, short_id, canonical_slug, email, company_name, siret, full_name, phone,
  postal_code, categories, is_verified, is_claimed, decennal_status, subscription_status, created_at
) VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid, 'TOIT01', 'toiture-martin-TOIT01',
  'toiture@test.fr', 'Couverture Martin', '12345678902222', 'Luc Martin', '06 22 22 22 22',
  '78955', ARRAY['toiture'], true, true, 'valid', 'active', NOW()
) ON CONFLICT (id) DO NOTHING;

-- Électricité
INSERT INTO professionals (
  id, short_id, canonical_slug, email, company_name, siret, full_name, phone,
  postal_code, categories, is_verified, is_claimed, decennal_status, subscription_status, created_at
) VALUES (
  '33333333-3333-3333-3333-333333333333'::uuid, 'ELEC01', 'electricite-bernard-ELEC01',
  'electricite@test.fr', 'Électricité Bernard', '12345678903333', 'Jean Bernard', '06 33 33 33 33',
  '78955', ARRAY['electricite'], true, true, 'valid', 'active', NOW()
) ON CONFLICT (id) DO NOTHING;

-- Plomberie
INSERT INTO professionals (
  id, short_id, canonical_slug, email, company_name, siret, full_name, phone,
  postal_code, categories, is_verified, is_claimed, decennal_status, subscription_status, created_at
) VALUES (
  '44444444-4444-4444-4444-444444444444'::uuid, 'PLOMB1', 'plomberie-thomas-PLOMB1',
  'plomberie@test.fr', 'Plomberie Thomas', '12345678904444', 'Michel Thomas', '06 44 44 44 44',
  '78955', ARRAY['plomberie'], true, true, 'valid', 'active', NOW()
) ON CONFLICT (id) DO NOTHING;

-- Peinture
INSERT INTO professionals (
  id, short_id, canonical_slug, email, company_name, siret, full_name, phone,
  postal_code, categories, is_verified, is_claimed, decennal_status, subscription_status, created_at
) VALUES (
  '55555555-5555-5555-5555-555555555555'::uuid, 'PEIN01', 'peinture-robert-PEIN01',
  'peinture@test.fr', 'Peinture Robert', '12345678905555', 'Claude Robert', '06 55 55 55 55',
  '78955', ARRAY['peinture'], true, true, 'valid', 'active', NOW()
) ON CONFLICT (id) DO NOTHING;

-- Isolation
INSERT INTO professionals (
  id, short_id, canonical_slug, email, company_name, siret, full_name, phone,
  postal_code, categories, is_verified, is_claimed, decennal_status, subscription_status, created_at
) VALUES (
  '66666666-6666-6666-6666-666666666666'::uuid, 'ISOL01', 'isolation-laurent-ISOL01',
  'isolation@test.fr', 'Isolation Laurent', '12345678906666', 'Alain Laurent', '06 66 66 66 66',
  '78955', ARRAY['isolation'], true, true, 'valid', 'active', NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ENSURE TEST ZONE EXISTS
-- ============================================================================

INSERT INTO zones (id, type, name, postal_codes, is_active)
VALUES (
  '8c900143-8236-4dff-8716-cc3e445a7ec0'::uuid,
  'city', 'Carrières-sous-Poissy', ARRAY['78955'], true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. CREATE TEST PROJECTS (3 per category)
-- ============================================================================

-- Maçonnerie Projects
INSERT INTO projects (
  id, customer_name, customer_email, customer_phone, category, description,
  budget_range, postal_code, zone_id, status, created_at
) VALUES
  (gen_random_uuid(), 'Client Macon 1', 'client1@example.com', '06 11 11 11 01',
   'maconnerie', 'Réparation façade', '5000-10000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Macon 2', 'client2@example.com', '06 11 11 11 02',
   'maconnerie', 'Extension garage', '15000-25000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Macon 3', 'client3@example.com', '06 11 11 11 03',
   'maconnerie', 'Murs intérieurs', '3000-6000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW());

-- Toiture Projects
INSERT INTO projects (
  id, customer_name, customer_email, customer_phone, category, description,
  budget_range, postal_code, zone_id, status, created_at
) VALUES
  (gen_random_uuid(), 'Client Toit 1', 'client1@toit.com', '06 22 22 22 01',
   'toiture', 'Remplacement tuiles', '8000-15000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Toit 2', 'client2@toit.com', '06 22 22 22 02',
   'toiture', 'Isolation combles', '12000-20000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Toit 3', 'client3@toit.com', '06 22 22 22 03',
   'toiture', 'Gouttières neuves', '2000-4000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW());

-- Électricité Projects
INSERT INTO projects (
  id, customer_name, customer_email, customer_phone, category, description,
  budget_range, postal_code, zone_id, status, created_at
) VALUES
  (gen_random_uuid(), 'Client Elec 1', 'client1@elec.com', '06 33 33 33 01',
   'electricite', 'Remplacement tableau électrique', '2000-4000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Elec 2', 'client2@elec.com', '06 33 33 33 02',
   'electricite', 'Installation prises supplémentaires', '800-1500', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Elec 3', 'client3@elec.com', '06 33 33 33 03',
   'electricite', 'Domotique complète', '5000-10000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW());

-- Plomberie Projects
INSERT INTO projects (
  id, customer_name, customer_email, customer_phone, category, description,
  budget_range, postal_code, zone_id, status, created_at
) VALUES
  (gen_random_uuid(), 'Client Plomb 1', 'client1@plomb.com', '06 44 44 44 01',
   'plomberie', 'Rénovation salle de bain', '5000-10000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Plomb 2', 'client2@plomb.com', '06 44 44 44 02',
   'plomberie', 'Chauffage eau chaude', '3000-6000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Plomb 3', 'client3@plomb.com', '06 44 44 44 03',
   'plomberie', 'Tuyauterie neuve', '2000-4000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW());

-- Peinture Projects
INSERT INTO projects (
  id, customer_name, customer_email, customer_phone, category, description,
  budget_range, postal_code, zone_id, status, created_at
) VALUES
  (gen_random_uuid(), 'Client Pein 1', 'client1@pein.com', '06 55 55 55 01',
   'peinture', 'Peinture intérieure appartement', '1000-2000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Pein 2', 'client2@pein.com', '06 55 55 55 02',
   'peinture', 'Façade complète', '3000-6000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Pein 3', 'client3@pein.com', '06 55 55 55 03',
   'peinture', 'Portes et fenêtres', '800-1500', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW());

-- Isolation Projects
INSERT INTO projects (
  id, customer_name, customer_email, customer_phone, category, description,
  budget_range, postal_code, zone_id, status, created_at
) VALUES
  (gen_random_uuid(), 'Client Isol 1', 'client1@isol.com', '06 66 66 66 01',
   'isolation', 'Isolation combles perdus', '2000-4000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Isol 2', 'client2@isol.com', '06 66 66 66 02',
   'isolation', 'Isolation murs intérieurs', '8000-15000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW()),
  (gen_random_uuid(), 'Client Isol 3', 'client3@isol.com', '06 66 66 66 03',
   'isolation', 'Double vitrage complet', '5000-10000', '78955',
   '8c900143-8236-4dff-8716-cc3e445a7ec0', 'pending', NOW());

-- ============================================================================
-- 4. CREATE LEADS (associate projects with professionals)
-- ============================================================================

-- Maçonnerie leads
INSERT INTO leads (project_id, pro_id, status, unlocked_at)
SELECT p.id, '11111111-1111-1111-1111-111111111111'::uuid, 'new', NOW()
FROM projects p WHERE p.category = 'maconnerie' LIMIT 3;

-- Toiture leads
INSERT INTO leads (project_id, pro_id, status, unlocked_at)
SELECT p.id, '22222222-2222-2222-2222-222222222222'::uuid, 'new', NOW()
FROM projects p WHERE p.category = 'toiture' LIMIT 3;

-- Électricité leads
INSERT INTO leads (project_id, pro_id, status, unlocked_at)
SELECT p.id, '33333333-3333-3333-3333-333333333333'::uuid, 'new', NOW()
FROM projects p WHERE p.category = 'electricite' LIMIT 3;

-- Plomberie leads
INSERT INTO leads (project_id, pro_id, status, unlocked_at)
SELECT p.id, '44444444-4444-4444-4444-444444444444'::uuid, 'new', NOW()
FROM projects p WHERE p.category = 'plomberie' LIMIT 3;

-- Peinture leads
INSERT INTO leads (project_id, pro_id, status, unlocked_at)
SELECT p.id, '55555555-5555-5555-5555-555555555555'::uuid, 'new', NOW()
FROM projects p WHERE p.category = 'peinture' LIMIT 3;

-- Isolation leads
INSERT INTO leads (project_id, pro_id, status, unlocked_at)
SELECT p.id, '66666666-6666-6666-6666-666666666666'::uuid, 'new', NOW()
FROM projects p WHERE p.category = 'isolation' LIMIT 3;

-- ============================================================================
-- 5. CREATE TEST VERIFICATIONS (KBIS & Décennale)
-- ============================================================================

-- Add verifications for all test professionals
INSERT INTO verifications (pro_id, document_type, file_key, status, expiry_date, created_at)
SELECT id, 'kbis', 'test-kbis-' || short_id, 'approved', NOW()::date + INTERVAL '6 months', NOW()
FROM professionals WHERE id = ANY(ARRAY[
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555555'::uuid,
  '66666666-6666-6666-6666-666666666666'::uuid
]);

INSERT INTO verifications (pro_id, document_type, file_key, status, expiry_date, created_at)
SELECT id, 'decennale', 'test-decennale-' || short_id, 'approved', NOW()::date + INTERVAL '1 year', NOW()
FROM professionals WHERE id = ANY(ARRAY[
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  '44444444-4444-4444-4444-444444444444'::uuid,
  '55555555-5555-5555-5555-555555555555'::uuid,
  '66666666-6666-6666-6666-666666666666'::uuid
]);

-- ============================================================================
-- 6. VERIFY RLS POLICIES (Document what's protected)
-- ============================================================================

-- Summary: All test data is secured by RLS policies:
-- - professionals: public can SELECT if is_verified=true, authenticated users full access to own record
-- - leads: controlled by project relationships, RLS prevents unauthorized access
-- - projects: service-role only (no client-side access)
-- - prospects: service-role only (masked data)
-- - All test professionals are is_verified=true and is_claimed=true for testing

SELECT
  COUNT(*) as total_professionals,
  COUNT(DISTINCT category) as categories
FROM (
  SELECT DISTINCT unnest(categories) as category FROM professionals
  WHERE id = ANY(ARRAY[
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    '44444444-4444-4444-4444-444444444444'::uuid,
    '55555555-5555-5555-5555-555555555555'::uuid,
    '66666666-6666-6666-6666-666666666666'::uuid
  ])
) as cats;
