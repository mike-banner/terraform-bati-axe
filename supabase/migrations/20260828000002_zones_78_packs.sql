-- ============================================================
-- 05.16 — Zones 78 & Packs Zonés (Pricing Dégressif)
-- ============================================================

-- 2. Créer les 4 zones agglomération 78
INSERT INTO zones (type, name, postal_codes, is_active) VALUES
  ('area', 'Mantes-la-Jolie',       ARRAY['78200','78520','78711','78440','78270','78930','78250','78680','78410','78580'], true),
  ('area', 'Rambouillet',           ARRAY['78120','78610','78730','78125','78660','78690','78550','78310','78990'], true),
  ('area', 'Versailles',            ARRAY['78000','78150','78220','78350','78140','78960','78180','78190'], true),
  ('area', 'St-Germain-en-Laye',    ARRAY['78100','78300','78955','78500','78800','78700','78510','78400','78600','78230'], true);

-- 3. Table pro_zones : quel pro est abonné à quelle zone
CREATE TABLE IF NOT EXISTS pro_zones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id      uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  zone_id     uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  billing     text NOT NULL CHECK (billing IN ('monthly', 'annual')),
  price_cents integer NOT NULL CHECK (price_cents > 0),
  stripe_subscription_id text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  created_at  timestamptz DEFAULT clock_timestamp(),
  updated_at  timestamptz DEFAULT clock_timestamp(),
  UNIQUE (pro_id, zone_id)
);

-- 4. Index pour le matching rapide
CREATE INDEX IF NOT EXISTS idx_pro_zones_pro_id ON pro_zones(pro_id);
CREATE INDEX IF NOT EXISTS idx_pro_zones_zone_id ON pro_zones(zone_id);
CREATE INDEX IF NOT EXISTS idx_pro_zones_status ON pro_zones(status);

-- 5. RLS : un pro ne voit que ses propres zones
ALTER TABLE pro_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prozones_select_own" ON pro_zones
  FOR SELECT USING (auth.uid() = pro_id);

CREATE POLICY "prozones_insert_own" ON pro_zones
  FOR INSERT WITH CHECK (auth.uid() = pro_id);

CREATE POLICY "prozones_update_own" ON pro_zones
  FOR UPDATE USING (auth.uid() = pro_id);

-- 6. Vue : zones actives avec nombre de pros abonnés
CREATE OR REPLACE VIEW view_zone_stats AS
SELECT
  z.id AS zone_id,
  z.name AS zone_name,
  z.postal_codes,
  COUNT(pz.id) FILTER (WHERE pz.status = 'active') AS active_pros,
  COUNT(pz.id) FILTER (WHERE pz.status = 'active' AND pz.billing = 'annual') AS annual_pros,
  COUNT(pz.id) FILTER (WHERE pz.status = 'active' AND pz.billing = 'monthly') AS monthly_pros
FROM zones z
LEFT JOIN pro_zones pz ON pz.zone_id = z.id
WHERE z.type = 'area' AND z.is_active = true
GROUP BY z.id, z.name, z.postal_codes;
