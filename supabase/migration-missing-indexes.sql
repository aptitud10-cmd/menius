-- Missing production indexes identified in performance audit

-- Cron: monitor stuck orders scans all pending orders without a restaurant filter
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC);

-- Cron: activate-scheduled queries pending orders by scheduled_for date
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_scheduled
  ON orders(restaurant_id, scheduled_for)
  WHERE scheduled_for IS NOT NULL AND status = 'pending';

-- Cron: monitor-orders queries subscriptions by status across all restaurants
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions(status);

-- Dashboard kanban: filter orders by restaurant + status + date (most common dashboard query)
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status_created
  ON orders(restaurant_id, status, created_at DESC);

-- Cron: auto-complete pickup — filters by order_type within a restaurant
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_type_status
  ON orders(restaurant_id, order_type, status);
