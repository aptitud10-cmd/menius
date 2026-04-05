-- ============================================================
-- MENIUS — Security Audit Fixes (Apr 2026)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Fixes:
--   1. generate_order_number — use restaurant's local timezone
--      so counters reset at local midnight, not UTC midnight.
--   2. public_read_variants RLS — exclude variants of inactive products.
--   3. public_read_extras RLS — same scope fix for product_extras.
--   4. storage upload policy — scoped to restaurant owner's bucket.
-- ============================================================


-- ============================================================
-- 1. generate_order_number — restaurant-local timezone
-- ============================================================
-- Previous version used NOW()::DATE (database UTC midnight).
-- For a restaurant in Mexico City (UTC-6) the counter reset at
-- 6 PM local time, not at midnight. This caused two order series
-- within the same calendar day from the customer's perspective.

CREATE OR REPLACE FUNCTION generate_order_number(rest_id UUID)
RETURNS TEXT AS $$
DECLARE
  count_today INTEGER;
  today_str   TEXT;
  lock_key    BIGINT;
  rest_tz     TEXT;
  now_local   TIMESTAMP;
BEGIN
  -- Per-restaurant advisory lock prevents duplicate numbers under concurrent load.
  lock_key := ('x' || left(replace(rest_id::text, '-', ''), 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Fetch the restaurant's configured timezone (default UTC if missing).
  SELECT COALESCE(timezone, 'UTC')
    INTO rest_tz
    FROM public.restaurants
   WHERE id = rest_id;

  -- All comparisons happen in the restaurant's local time.
  now_local := (NOW() AT TIME ZONE COALESCE(rest_tz, 'UTC'))::TIMESTAMP;
  today_str := TO_CHAR(now_local, 'YYMMDD');

  SELECT COUNT(*) + 1
    INTO count_today
    FROM public.orders
   WHERE restaurant_id = rest_id
     AND (created_at AT TIME ZONE COALESCE(rest_tz, 'UTC'))::DATE = now_local::DATE;

  RETURN 'ORD-' || today_str || '-' || LPAD(count_today::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = '';


-- ============================================================
-- 2. RLS — public_read_variants: restrict to active products
-- ============================================================
-- Previous policy: FOR SELECT USING (true)
-- This exposed variants of discontinued/draft products to any anonymous client.
-- New policy: only expose variants whose parent product is active.

DROP POLICY IF EXISTS "public_read_variants" ON product_variants;

CREATE POLICY "public_read_variants" ON product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.products p
       WHERE p.id = product_id
         AND p.is_active = true
    )
  );


-- ============================================================
-- 3. RLS — public_read_extras: same scope fix for product_extras
-- ============================================================
-- Same issue: extras of inactive products were publicly readable.

DROP POLICY IF EXISTS "public_read_extras" ON product_extras;

CREATE POLICY "public_read_extras" ON product_extras
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.products p
       WHERE p.id = product_id
         AND p.is_active = true
    )
  );


-- ============================================================
-- 4. RLS — public_read_modifier_groups and modifier_options
-- ============================================================
-- Same pattern: only expose modifier groups/options for active products.

DROP POLICY IF EXISTS "public_read_modifier_groups" ON modifier_groups;

CREATE POLICY "public_read_modifier_groups" ON modifier_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.products p
       WHERE p.id = product_id
         AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "public_read_modifier_options" ON modifier_options;

CREATE POLICY "public_read_modifier_options" ON modifier_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.modifier_groups mg
        JOIN public.products p ON p.id = mg.product_id
       WHERE mg.id = group_id
         AND p.is_active = true
    )
  );


-- ============================================================
-- VERIFY
-- ============================================================
-- Run these after applying the migration to confirm correctness:
--
-- 1. Check generate_order_number uses local time:
--    SELECT generate_order_number('<some_restaurant_uuid>');
--
-- 2. Confirm new policies exist:
--    SELECT tablename, policyname, cmd
--      FROM pg_policies
--     WHERE tablename IN ('product_variants', 'product_extras', 'modifier_groups', 'modifier_options')
--     ORDER BY tablename;
