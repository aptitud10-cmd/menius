-- Cash register shifts (Cierre de Caja / Turno)
-- Records opening/closing cash amounts and aggregated revenue per shift

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  opened_by UUID REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(10,2),
  expected_cash NUMERIC(10,2),
  cash_difference NUMERIC(10,2),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_card NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shifts_restaurant_id_idx ON shifts(restaurant_id);
CREATE INDEX IF NOT EXISTS shifts_opened_at_idx ON shifts(restaurant_id, opened_at DESC);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "shifts_owner" ON shifts
  USING (
    restaurant_id IN (
      SELECT r.id FROM restaurants r
      JOIN profiles p ON p.default_restaurant_id = r.id
      WHERE p.user_id = auth.uid()
    )
  );
