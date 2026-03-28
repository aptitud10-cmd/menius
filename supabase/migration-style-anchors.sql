-- ============================================================
-- Style Anchors — visual reference images per category per restaurant
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS style_anchors (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  anchor_url    TEXT NOT NULL,
  style         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (restaurant_id, category_name)
);

CREATE INDEX IF NOT EXISTS idx_style_anchors_restaurant
  ON style_anchors (restaurant_id);

ALTER TABLE style_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their style anchors"
  ON style_anchors
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
  );

-- ── VERIFY ──────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'style_anchors';
