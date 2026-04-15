-- Migration: Move store overrides to database
-- Date: 2026-04-14
-- Description: Adds config_overrides JSONB column to restaurants for per-store UI config

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS config_overrides JSONB DEFAULT '{}';

-- Seed existing hardcoded override for buccaneer
UPDATE restaurants
SET config_overrides = '{"optimizeImages": true, "showScrollTop": true}'::jsonb
WHERE slug = 'buccaneer';

-- Index for restaurants that have non-empty overrides
CREATE INDEX IF NOT EXISTS idx_restaurants_config_overrides
  ON restaurants(id)
  WHERE config_overrides != '{}';

COMMENT ON COLUMN restaurants.config_overrides IS 
  'Per-store UI configuration. Keys: optimizeImages (bool), showScrollTop (bool), customTheme (object), etc.';
