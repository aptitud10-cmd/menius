-- ============================================================
-- MIGRATION: Customer Reviews
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_visible_reviews" ON reviews
  FOR SELECT USING (is_visible = true);

CREATE POLICY "anyone_insert_reviews" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "owners_manage_reviews" ON reviews
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(restaurant_id, rating);
