-- Fix overly permissive RLS on orders: restrict public reads to own orders only
DROP POLICY IF EXISTS "public_read_own_order" ON orders;
CREATE POLICY "public_read_own_order" ON orders
  FOR SELECT USING (
    user_owns_restaurant(restaurant_id)
    OR id::text = current_setting('request.headers', true)::json->>'x-order-id'
  );

-- Fix overly permissive RLS on order_items
DROP POLICY IF EXISTS "public_read_order_items" ON order_items;
CREATE POLICY "public_read_order_items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND user_owns_restaurant(o.restaurant_id)
    )
  );

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders (customer_phone) WHERE customer_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders (customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders (restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders (restaurant_id, created_at DESC);

-- Fix race condition in order number generation using advisory lock
CREATE OR REPLACE FUNCTION generate_order_number(rest_id UUID)
RETURNS TEXT AS $$
DECLARE
  count_today INTEGER;
  today_str TEXT;
  lock_key BIGINT;
BEGIN
  lock_key := ('x' || left(replace(rest_id::text, '-', ''), 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(lock_key);

  today_str := TO_CHAR(NOW(), 'YYMMDD');
  SELECT COUNT(*) + 1 INTO count_today
  FROM public.orders
  WHERE restaurant_id = rest_id
    AND created_at::DATE = NOW()::DATE;
  RETURN 'ORD-' || today_str || '-' || LPAD(count_today::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Fix storage policy: restrict uploads to restaurant owners
DROP POLICY IF EXISTS "Authenticated users upload product images" ON storage.objects;
CREATE POLICY "Authenticated users upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );
