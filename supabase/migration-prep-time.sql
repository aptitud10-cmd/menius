-- Add prep_time_minutes to products for dynamic ETA calculation
ALTER TABLE products ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER;

COMMENT ON COLUMN products.prep_time_minutes IS 'Estimated preparation time in minutes for this product';
