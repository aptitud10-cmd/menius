-- ============================================================
-- MENIUS — Performance indexes for high-frequency query paths
-- Run in Supabase SQL Editor
-- ============================================================
-- All indexes use IF NOT EXISTS — safe to run multiple times.
-- ============================================================

-- ── orders ───────────────────────────────────────────────────

-- Dashboard order list: restaurant_id + created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
  ON orders(restaurant_id, created_at DESC);

-- Status filtering: dashboard kanban, KDS, cron auto-complete
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
  ON orders(restaurant_id, status);

-- Public tracking page lookup by order_number + restaurant_id
CREATE INDEX IF NOT EXISTS idx_orders_order_number_restaurant
  ON orders(order_number, restaurant_id);

-- Idempotency key dedup on every POST /api/orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Partial index: active delivery orders only (tracking, cron)
CREATE INDEX IF NOT EXISTS idx_orders_delivery_active
  ON orders(restaurant_id, created_at DESC)
  WHERE order_type = 'delivery'
    AND status IN ('confirmed', 'preparing', 'ready');

-- ── order_items ───────────────────────────────────────────────

-- Covering index for fetchFullOrder (avoids heap fetch)
CREATE INDEX IF NOT EXISTS idx_order_items_order_covering
  ON order_items(order_id)
  INCLUDE (qty, unit_price, line_total, product_id, variant_id, notes);

-- ── products ─────────────────────────────────────────────────

-- Menu load: active products sorted
CREATE INDEX IF NOT EXISTS idx_products_restaurant_active_sort
  ON products(restaurant_id, is_active, sort_order);

-- ── categories ───────────────────────────────────────────────

-- Menu load: active categories sorted
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_active_sort
  ON categories(restaurant_id, is_active, sort_order);

-- ── subscriptions ────────────────────────────────────────────

-- Feature gate check on every API call (getEffectivePlanId)
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant_status
  ON subscriptions(restaurant_id, status);

-- ── customers ────────────────────────────────────────────────

-- CRM list, campaigns
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_created
  ON customers(restaurant_id, created_at DESC);

-- Dedup by email on order creation
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_email
  ON customers(restaurant_id, email)
  WHERE email IS NOT NULL;

-- Dedup by phone on order creation
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_phone
  ON customers(restaurant_id, phone)
  WHERE phone IS NOT NULL;

-- ── order_location_latest ────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_order_location_latest_updated_at
  ON order_location_latest(updated_at DESC);
