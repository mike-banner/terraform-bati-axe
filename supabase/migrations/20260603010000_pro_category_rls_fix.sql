-- Add category column to professionals
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS category TEXT;

-- Fix RLS: non-verified pros must NOT be publicly visible
-- Previously: is_claimed = true OR is_verified = true (exposed all claimed pros)
-- Now: only verified pros are public; pros can still read their own profile via manage_own_professional
DROP POLICY IF EXISTS select_public_professionals ON professionals;
CREATE POLICY select_public_professionals ON professionals
  FOR SELECT TO public USING (is_verified = true);

DROP POLICY IF EXISTS manage_own_professional ON professionals;
CREATE POLICY manage_own_professional ON professionals
  FOR ALL TO authenticated USING (auth.uid() = id);
