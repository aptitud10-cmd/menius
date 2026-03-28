-- ============================================================
-- MIGRATION: Tax System by Country / State
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS state_code   TEXT DEFAULT NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tax_rate     DECIMAL(5,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tax_included BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tax_label    TEXT DEFAULT 'Tax';

-- tax_amount stored on each order for receipt/reporting
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;

-- Indexes for potential future filtering by country
CREATE INDEX IF NOT EXISTS idx_restaurants_country ON restaurants(country_code);
