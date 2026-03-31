-- Add loyalty redemption tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER DEFAULT 0;
