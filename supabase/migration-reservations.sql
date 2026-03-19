-- ============================================================
-- RESERVATIONS
-- Basic table reservation system for MENIUS restaurants
-- ============================================================

-- Main reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  
  -- Customer info
  customer_name   text NOT NULL,
  customer_phone  text,
  customer_email  text,
  
  -- Reservation details
  party_size      int  NOT NULL DEFAULT 2,
  reserved_date   date NOT NULL,
  reserved_time   time NOT NULL,
  duration_min    int  NOT NULL DEFAULT 90,
  notes           text,
  
  -- Status: pending → confirmed | cancelled | no_show
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','cancelled','no_show')),
  
  -- Internal
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Restaurant owners can see their own reservations
CREATE POLICY "owners_manage_reservations"
  ON reservations FOR ALL
  USING (
    restaurant_id IN (
      SELECT default_restaurant_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Public can INSERT a reservation (anonymous customers)
CREATE POLICY "public_create_reservation"
  ON reservations FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date       ON reservations(restaurant_id, reserved_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status     ON reservations(restaurant_id, status);

-- Add reservations_enabled flag to restaurants if not already present
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS reservations_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservation_slot_minutes int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS reservation_max_party_size int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS reservation_open_days text[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  ADD COLUMN IF NOT EXISTS reservation_open_time time NOT NULL DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS reservation_close_time time NOT NULL DEFAULT '22:00';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_updated_at ON reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_reservations_updated_at();
