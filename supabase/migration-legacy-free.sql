-- Migration: legacy free flag for restaurants created before plan limits change (2026-04-29)
-- These 17 restaurants were on "Free generoso" (5 tables / unlimited products / unlimited orders).
-- After this date, new signups get a tighter Free (1 table / 15 products / 50 orders/mo).
-- Existing customers are grandfathered to keep their data accessible.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS is_legacy_free boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN restaurants.is_legacy_free IS
  'When true, this restaurant uses the legacy generous Free plan limits (5 tables, unlimited products/orders). Set to true for accounts created before 2026-04-29.';

-- Grandfather all restaurants created before the change date
UPDATE restaurants
SET is_legacy_free = true
WHERE created_at < '2026-04-29T19:00:00Z';

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_legacy_free
  ON restaurants(is_legacy_free)
  WHERE is_legacy_free = true;
