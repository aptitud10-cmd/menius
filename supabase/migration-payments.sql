-- ============================================================
-- MIGRATION: Payment Status for Orders
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
