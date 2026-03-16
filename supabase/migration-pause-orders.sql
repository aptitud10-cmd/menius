-- ============================================================
-- Restaurants table — pause orders column
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS orders_paused_until timestamptz;

-- ── VERIFY ──────────────────────────────────────────────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'restaurants'
-- AND column_name = 'orders_paused_until';
