-- Add tip_amount and delivery_fee columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN orders.tip_amount IS 'Customer tip amount';
COMMENT ON COLUMN orders.delivery_fee IS 'Delivery fee charged to customer';
