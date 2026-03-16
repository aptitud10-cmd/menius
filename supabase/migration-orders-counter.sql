-- ============================================================
-- Orders table — missing columns for Counter/KDS features
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ETA shown to kitchen and customer
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estimated_ready_minutes integer;

-- Driver assignment (delivery orders)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS driver_assigned_at timestamptz;

-- Rejection/cancellation reason (shown in history)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- ── VERIFY ──────────────────────────────────────────────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
-- AND column_name IN (
--   'estimated_ready_minutes',
--   'driver_name', 'driver_phone', 'driver_assigned_at',
--   'cancellation_reason'
-- );
