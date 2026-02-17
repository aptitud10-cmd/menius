-- ============================================================
-- MENIUS — Locale, Order Types & Payment Methods
-- ============================================================

-- Restaurant settings: locale, order types, payment methods
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS order_types_enabled JSONB DEFAULT '["dine_in","pickup"]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_methods_enabled JSONB DEFAULT '["cash"]'::jsonb;

COMMENT ON COLUMN restaurants.locale IS 'Public menu language: es or en';
COMMENT ON COLUMN restaurants.order_types_enabled IS 'Enabled order types: dine_in, pickup, delivery';
COMMENT ON COLUMN restaurants.payment_methods_enabled IS 'Enabled payment methods: cash, online';

-- Order fields: order_type, payment_method, delivery_address, customer_email
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine_in',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT NULL;

COMMENT ON COLUMN orders.order_type IS 'dine_in, pickup, or delivery';
COMMENT ON COLUMN orders.payment_method IS 'cash or online';
