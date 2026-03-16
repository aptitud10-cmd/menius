-- ============================================================
-- Order security & audit improvements
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Audit trail — every status change is recorded
CREATE TABLE IF NOT EXISTS order_status_history (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status    text,
  to_status      text NOT NULL,
  note           text,
  created_at     timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON order_status_history (order_id);

-- 2. Idempotency key — prevents double-submit
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── VERIFY ──────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('order_status_history');
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'orders' AND column_name = 'idempotency_key';
