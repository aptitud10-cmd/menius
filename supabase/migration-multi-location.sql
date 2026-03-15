-- Multi-location support: one "business" can have multiple restaurant branches
-- The existing `restaurants` table becomes individual branches.
-- We add a `business_id` to link branches under a single owner account.

-- 1. Business entity (parent, optional — owner can link multiple restaurants)
CREATE TABLE IF NOT EXISTS businesses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  logo_url        text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (owner_user_id, name)
);

-- 2. Link restaurants to a business (nullable — existing restaurants work without it)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_restaurants_business ON restaurants (business_id);

-- 3. Shared product catalog (optional: a product can belong to a business, not just a restaurant)
ALTER TABLE products ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;

-- RLS for businesses
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses_owner" ON businesses
  USING (owner_user_id = auth.uid());

-- Index for fast branch lookup
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_business ON restaurants (owner_user_id, business_id);
