-- order_location_latest — hot-path GPS write table.
--
-- Separates GPS pings from the orders table to avoid MVCC bloat and
-- write contention at scale. A trigger keeps orders.driver_lat/lng in
-- sync so all existing code that reads from orders continues to work
-- without modification.
--
-- Write path: POST /api/driver/location → upsert order_location_latest
--             → trigger → UPDATE orders.driver_lat/lng (debounced via trigger)
--
-- Read path: order-track API still reads driver_lat/lng from orders (unchanged).

CREATE TABLE IF NOT EXISTS order_location_latest (
  order_id          UUID        PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  lat               DOUBLE PRECISION NOT NULL,
  lng               DOUBLE PRECISION NOT NULL,
  accuracy          DOUBLE PRECISION,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup for cleanup jobs / analytics
CREATE INDEX IF NOT EXISTS order_location_latest_updated_at_idx
  ON order_location_latest(updated_at DESC);

-- Trigger: keep orders.driver_lat/lng in sync after each upsert.
-- This preserves backward compatibility with all existing reads.
CREATE OR REPLACE FUNCTION sync_driver_location_to_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders
  SET
    driver_lat        = NEW.lat,
    driver_lng        = NEW.lng,
    driver_updated_at = NEW.updated_at
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_driver_location ON order_location_latest;
CREATE TRIGGER trg_sync_driver_location
  AFTER INSERT OR UPDATE ON order_location_latest
  FOR EACH ROW EXECUTE FUNCTION sync_driver_location_to_order();
