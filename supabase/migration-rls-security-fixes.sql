-- RLS Security Fixes — identified in production audit
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (IF NOT EXISTS / DROP IF EXISTS guards)

-- ============================================================
-- 1. order_location_latest — GPS coordinates had NO RLS
--    Risk: any authenticated user could read driver locations
--    across all restaurants.
-- ============================================================
ALTER TABLE order_location_latest ENABLE ROW LEVEL SECURITY;

-- Restaurant owner can read their drivers' locations
DROP POLICY IF EXISTS "order_location_owner_read" ON order_location_latest;
CREATE POLICY "order_location_owner_read" ON order_location_latest
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      WHERE r.owner_user_id = auth.uid()
    )
  );

-- Driver write path: /api/driver/location uses service role — no client policy needed.
-- Service role bypasses RLS, so GPS upserts continue to work without change.

-- ============================================================
-- 2. order_status_history — audit trail had NO RLS
--    Risk: cross-tenant visibility of order state changes.
-- ============================================================
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Restaurant owner can read their own order history
DROP POLICY IF EXISTS "order_status_history_owner_read" ON order_status_history;
CREATE POLICY "order_status_history_owner_read" ON order_status_history
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      WHERE r.owner_user_id = auth.uid()
    )
  );

-- Status history is written server-side via service role — no insert policy needed.

-- ============================================================
-- 3. cfdi_requests — policy used wrong column (user_id → owner_user_id)
--    Risk: policy silently matched nothing, fiscal data was unprotected.
-- ============================================================
DROP POLICY IF EXISTS "cfdi_requests_owner_read" ON cfdi_requests;

CREATE POLICY "cfdi_requests_owner_read" ON cfdi_requests
  FOR SELECT USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. product_pairings — policy used wrong column (owner_id → owner_user_id)
--    Risk: owners_manage_pairings matched nothing, pairings were unmanaged.
--    public_read_pairings (FOR SELECT USING true) is intentional — kept as-is.
-- ============================================================
DROP POLICY IF EXISTS "owners_manage_pairings" ON product_pairings;

CREATE POLICY "owners_manage_pairings" ON product_pairings
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_user_id = auth.uid()
    )
  );
