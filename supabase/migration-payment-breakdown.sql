-- Add payment_breakdown to orders to support split/mixed payments
-- Example: { "cash": 10.00, "card": 5.00 }
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_breakdown JSONB DEFAULT NULL;
