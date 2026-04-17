-- ============================================================
-- MENIUS — Performance indexes for high-frequency query paths
-- Run in Supabase SQL Editor
-- ============================================================
-- All indexes use IF NOT EXISTS — safe to run multiple times.
-- Each index targets a real query pattern found in the codebase.
-- ============================================================

-- ── orders ───────────────────────────────────────────────────

-- Dashboard order list: restaurant_id + created_at DESC (most common query)
-- Covers: tenant orders page, AI chat recent orders, email automations
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
  ON orders(restaurant_id, created_at DESC);

-- Order status filtering: restaurant + status (dashboard kanban/list filters)
-- Covers: use-realtime-orders, KDS, cron auto-complete
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
  ON orders(restaurant_id, status);

-- Order tracking by order_number + restaurant_id (public tracking page)
-- Covers: /api/public/order-track
CREATE INDEX IF NOT EXISTS idx_orders_order_number_restaurant
  ON orders(order_number, restaurant_id);

-- Delivery orders with active driver (tracking map, cron auto-complete)
-- Partial index — only delivery orders that are in active states
CREATE INDEX IF NOT EXISTS idx_orders_delivery_active
  ON orders(restaurant_id, created_at DESC)
  WHERE order_type = 'delivery'
    AND status IN ('confirmed', 'preparing', 'ready');

-- Idempotency key lookup (order creation dedup — called on every POST /api/orders)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── order_items ───────────────────────────────────────────────

-- Join from orders → order_items (fetchFullOrder in use-realtime-orders)
-- Already exists as idx_order_items_order but adding covering columns
CREATE INDEX IF NOT EXISTS idx_order_items_order_covering
  ON order_items(order_id)
  INCLUDE (qty, unit_price, line_total, product_id, variant_id, notes);

-- ── customers ────────────────────────────────────────────────

-- CRM queries: restaurant_id + created_at (customer list, campaigns)
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_created
  ON customers(restaurant_id, created_at DESC);

-- Customer lookup by email (dedup on order creation, loyalty lookup)
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_email
  ON customers(restaurant_id, email)
  WHERE email IS NOT NULL;

-- Customer lookup by phone (order creation, CRM search)
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_phone
  ON customers(restaurant_id, phone)
  WHERE phone IS NOT NULL;

-- ── subscriptions ────────────────────────────────────────────

-- Plan check on every API call that gates features
-- Covers: getEffectivePlanId(), billing reconciliation cron
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant_status
  ON subscriptions(restaurant_id, status);

-- ── products ─────────────────────────────────────────────────

-- Menu load: restaurant + active + sort_order (fetchMenuDataFromDB)
CREATE INDEX IF NOT EXISTS idx_products_restaurant_active_sort
  ON products(restaurant_id, is_active, sort_order);

-- ── categories ───────────────────────────────────────────────

-- Menu load: restaurant + active + sort_order
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_active_sort
  ON categories(restaurant_id, is_active, sort_order);

-- ── order_status_history ─────────────────────────────────────

-- Order history timeline (dashboard order detail view)
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_created
  ON order_status_history(order_id, created_at DESC);

-- ── order_notification_log ───────────────────────────────────

-- Notification dedup check on every order status change
CREATE INDEX IF NOT EXISTS idx_order_notification_log_order_event
  ON order_notification_log(order_id, event);

-- ── loyalty_accounts ─────────────────────────────────────────

-- Loyalty lookup by customer (loyalty page, order creation)
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_restaurant_customer
  ON loyalty_accounts(restaurant_id, customer_id);

-- ── dashboard_notifications ──────────────────────────────────

-- Unread notifications badge (polled every few seconds by NotificationBell)
CREATE INDEX IF NOT EXISTS idx_dashboard_notifications_restaurant_read
  ON dashboard_notifications(restaurant_id, is_read, created_at DESC);

-- ── order_location_latest ────────────────────────────────────

-- Already has primary key on order_id. Add updated_at for cleanup jobs.
-- (created in migration-order-location-latest.sql — already exists,
--  this is a no-op if already applied)
CREATE INDEX IF NOT EXISTS idx_order_location_latest_updated_at
  ON order_location_latest(updated_at DESC);
