-- Migration to support multiple categories per professional and transition to Dynamic Market
-- Date: 2026-06-11

-- 1. Add categories array column
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- 2. Migrate existing data from category to categories
UPDATE public.professionals
SET categories = ARRAY[category]
WHERE category IS NOT NULL AND category != '' AND (categories IS NULL OR array_length(categories, 1) IS NULL);

-- 3. (Optional) We could drop the old category column later, but we will keep it for now as a fallback or drop it if confident.
-- For safety and cleaner schema, let's keep it until frontend is fully decoupled, or just leave it.

-- 4. In the new Dynamic Market, we don't drop the `leads` table, but it will now strictly represent CLAIMS and UNLOCKS.
-- So we keep `leads` table.

-- To make the new logic work, projects must have a lead_count. Let's add a view or rely on the `leads` table counts.
