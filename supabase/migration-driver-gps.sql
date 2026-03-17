-- Driver GPS tracking columns on orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS driver_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS driver_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS driver_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS driver_tracking_token TEXT;

-- Unique index on tracking token (used for public driver page)
CREATE UNIQUE INDEX IF NOT EXISTS orders_driver_tracking_token_idx
  ON orders(driver_tracking_token)
  WHERE driver_tracking_token IS NOT NULL;
