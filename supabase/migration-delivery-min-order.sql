-- Delivery minimum order amount per restaurant.
-- 0 / NULL = no minimum. Enforced server-side in /api/orders for order_type = 'delivery'.
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS delivery_min_order NUMERIC DEFAULT 0;

COMMENT ON COLUMN restaurants.delivery_min_order IS 'Minimum subtotal required for delivery orders. 0 or NULL disables the check.';
