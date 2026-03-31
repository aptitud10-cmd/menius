-- KDS Station Routing
-- Each restaurant can define stations (Cocina, Barra, Plancha, etc.)
-- Products are assigned to a station; KDS shows per-station views

CREATE TABLE IF NOT EXISTS kds_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#06c167',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kds_stations_restaurant_id_idx ON kds_stations(restaurant_id);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES kds_stations(id) ON DELETE SET NULL;

-- RLS: only authenticated users who own the restaurant can manage stations
ALTER TABLE kds_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "kds_stations_owner" ON kds_stations
  USING (
    restaurant_id IN (
      SELECT r.id FROM restaurants r
      JOIN profiles p ON p.default_restaurant_id = r.id
      WHERE p.user_id = auth.uid()
    )
  );
