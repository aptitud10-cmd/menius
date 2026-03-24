-- Add include_utensils column to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS include_utensils boolean DEFAULT true;

COMMENT ON COLUMN orders.include_utensils IS 'Whether the customer requested utensils and napkins';
