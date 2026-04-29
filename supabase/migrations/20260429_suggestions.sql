-- Smart Suggestions: product_pairings table + co-occurrence RPC
-- Table and policies already exist in prod (applied via MCP 2026-04-29)
-- This file is for tracking purposes only.

CREATE TABLE IF NOT EXISTS product_pairings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  paired_id     UUID NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, paired_id)
);

CREATE INDEX IF NOT EXISTS idx_product_pairings_product ON product_pairings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pairings_restaurant ON product_pairings(restaurant_id);

ALTER TABLE product_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_pairings" ON product_pairings
  USING  (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()))
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = auth.uid()));

CREATE POLICY "public_read_pairings" ON product_pairings
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION get_product_cooccurrences(
  p_product_id     UUID,
  p_restaurant_id  UUID,
  p_limit          INTEGER DEFAULT 8
)
RETURNS TABLE (
  product_id  UUID,
  score       BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    oi2.product_id,
    COUNT(*)::BIGINT AS score
  FROM order_items  oi1
  JOIN order_items  oi2  ON oi2.order_id = oi1.order_id
                        AND oi2.product_id <> oi1.product_id
  JOIN orders       o    ON o.id = oi1.order_id
                        AND o.restaurant_id = p_restaurant_id
                        AND o.status IN ('delivered', 'ready', 'completed')
  WHERE oi1.product_id = p_product_id
  GROUP BY oi2.product_id
  ORDER BY score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_product_cooccurrences(UUID, UUID, INTEGER) TO anon, authenticated;
