-- orders.prepared_at — timestamp when the order entered 'preparing' status.
-- Used by cron/auto-complete-pickup to measure time in 'preparing'
-- independently of other updates to the row (e.g. ETA edits, driver assignment)
-- that would reset updated_at and delay the auto-ready transition.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ;
