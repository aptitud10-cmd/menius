-- Pre-orders / Scheduled Orders support
-- orders that should be activated at a specific time

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Index for cron: quickly find scheduled orders ready to activate
CREATE INDEX IF NOT EXISTS orders_scheduled_for_idx
  ON orders(scheduled_for)
  WHERE status = 'pending' AND scheduled_for IS NOT NULL;
