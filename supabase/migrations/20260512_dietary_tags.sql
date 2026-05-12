-- ============================================================
-- Sprint 1.3: Dietary tags filter — products.dietary_tags column
-- (Already applied to prod — file kept here for tracking only)
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS dietary_tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_products_dietary_tags ON products USING GIN(dietary_tags);
