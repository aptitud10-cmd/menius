-- Add table_name column to orders to store the QR table name at order time
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_name TEXT;
CREATE INDEX IF NOT EXISTS orders_table_name_idx ON orders(restaurant_id, table_name) WHERE table_name IS NOT NULL;
