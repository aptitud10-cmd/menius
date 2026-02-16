-- ============================================================
-- MIGRATION: Promotions / Coupons
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, code)
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_promotions" ON promotions
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

CREATE POLICY "public_read_active_promotions" ON promotions
  FOR SELECT USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_promotions_restaurant ON promotions(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(restaurant_id, code);

-- Add promo fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Function to increment promo usage
CREATE OR REPLACE FUNCTION increment_promo_usage(p_code TEXT, p_restaurant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promotions
  SET current_uses = current_uses + 1
  WHERE code = p_code AND restaurant_id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
