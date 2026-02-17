-- Add custom_domain column to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Index for fast lookup by domain in middleware
CREATE INDEX IF NOT EXISTS idx_restaurants_custom_domain ON restaurants(custom_domain) WHERE custom_domain IS NOT NULL;
