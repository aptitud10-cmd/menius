-- Add customer_phone column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
