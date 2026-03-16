-- ============================================================
-- Buccaneer — Category Reorganization Migration
-- 26 categories → 10 cleaner categories
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- BEFORE (26 categories):
--   Juices & Fruits, Farm Fresh Eggs, Omelettes, Benedicts & Brunch,
--   Pancakes, French Toast, Waffles, Bagels & Bakery, Breakfast Wraps,
--   Burgers, Sandwiches, Chicken Sandwiches, Panini & Wraps,
--   Soups & Salads, Appetizers, Entrees & Steaks, Seafood,
--   Italian & Pasta, Greek Corner, Signature Dishes, Side Orders,
--   Cocktails, Smoothies & Beverages, Coffee & Hot Drinks,
--   Desserts, Ice Cream & Fountain
--
-- AFTER (10 categories):
--   1. Breakfast           (merged 9 breakfast categories)
--   2. Sandwiches & Wraps  (merged Sandwiches + Chicken Sandwiches + Panini & Wraps)
--   3. Burgers             (unchanged)
--   4. Soups & Salads      (unchanged)
--   5. Mains & Steaks      (merged Entrees + Seafood + Italian + Greek + Signature)
--   6. Appetizers & Sides  (merged Appetizers + Side Orders)
--   7. Cocktails           (unchanged)
--   8. Coffee & Drinks     (merged Coffee & Hot Drinks + Smoothies & Beverages)
--   9. Desserts            (merged Desserts + Ice Cream & Fountain)
--  10. Daily Specials      (new — empty, for rotating items)
-- ============================================================

DO $$
DECLARE
  v_rid        uuid;
  v_target_id  uuid;
BEGIN

  -- Get Buccaneer's restaurant_id
  SELECT id INTO v_rid FROM restaurants WHERE slug = 'buccaneer';
  IF v_rid IS NULL THEN
    RAISE EXCEPTION 'Restaurant "buccaneer" not found. Check the slug.';
  END IF;
  RAISE NOTICE 'Found Buccaneer: %', v_rid;

  -- ─────────────────────────────────────────────────────────
  -- 1. BREAKFAST
  --    Keep: Omelettes (rename to Breakfast)
  --    Merge in: Juices & Fruits, Farm Fresh Eggs, Benedicts & Brunch,
  --              Pancakes, French Toast, Waffles, Bagels & Bakery, Breakfast Wraps
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_target_id FROM categories
  WHERE restaurant_id = v_rid AND name = 'Omelettes';

  UPDATE products SET category_id = v_target_id
  WHERE restaurant_id = v_rid AND category_id IN (
    SELECT id FROM categories WHERE restaurant_id = v_rid
    AND name IN (
      'Juices & Fruits', 'Farm Fresh Eggs', 'Benedicts & Brunch',
      'Pancakes', 'French Toast', 'Waffles', 'Bagels & Bakery', 'Breakfast Wraps'
    )
  );

  UPDATE categories SET name = 'Breakfast', sort_order = 1
  WHERE id = v_target_id;

  DELETE FROM categories
  WHERE restaurant_id = v_rid
  AND name IN (
    'Juices & Fruits', 'Farm Fresh Eggs', 'Benedicts & Brunch',
    'Pancakes', 'French Toast', 'Waffles', 'Bagels & Bakery', 'Breakfast Wraps'
  );
  RAISE NOTICE '1. Breakfast done';

  -- ─────────────────────────────────────────────────────────
  -- 2. SANDWICHES & WRAPS
  --    Keep: Sandwiches (rename)
  --    Merge in: Chicken Sandwiches, Panini & Wraps
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_target_id FROM categories
  WHERE restaurant_id = v_rid AND name = 'Sandwiches';

  UPDATE products SET category_id = v_target_id
  WHERE restaurant_id = v_rid AND category_id IN (
    SELECT id FROM categories WHERE restaurant_id = v_rid
    AND name IN ('Chicken Sandwiches', 'Panini & Wraps')
  );

  UPDATE categories SET name = 'Sandwiches & Wraps', sort_order = 2
  WHERE id = v_target_id;

  DELETE FROM categories
  WHERE restaurant_id = v_rid
  AND name IN ('Chicken Sandwiches', 'Panini & Wraps');
  RAISE NOTICE '2. Sandwiches & Wraps done';

  -- ─────────────────────────────────────────────────────────
  -- 3. BURGERS (unchanged, update sort_order only)
  -- ─────────────────────────────────────────────────────────
  UPDATE categories SET sort_order = 3
  WHERE restaurant_id = v_rid AND name = 'Burgers';
  RAISE NOTICE '3. Burgers done';

  -- ─────────────────────────────────────────────────────────
  -- 4. SOUPS & SALADS (unchanged, update sort_order only)
  -- ─────────────────────────────────────────────────────────
  UPDATE categories SET sort_order = 4
  WHERE restaurant_id = v_rid AND name = 'Soups & Salads';
  RAISE NOTICE '4. Soups & Salads done';

  -- ─────────────────────────────────────────────────────────
  -- 5. MAINS & STEAKS
  --    Keep: Entrees & Steaks (rename)
  --    Merge in: Seafood, Italian & Pasta, Greek Corner, Signature Dishes
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_target_id FROM categories
  WHERE restaurant_id = v_rid AND name = 'Entrees & Steaks';

  UPDATE products SET category_id = v_target_id
  WHERE restaurant_id = v_rid AND category_id IN (
    SELECT id FROM categories WHERE restaurant_id = v_rid
    AND name IN ('Seafood', 'Italian & Pasta', 'Greek Corner', 'Signature Dishes')
  );

  UPDATE categories SET name = 'Mains & Steaks', sort_order = 5
  WHERE id = v_target_id;

  DELETE FROM categories
  WHERE restaurant_id = v_rid
  AND name IN ('Seafood', 'Italian & Pasta', 'Greek Corner', 'Signature Dishes');
  RAISE NOTICE '5. Mains & Steaks done';

  -- ─────────────────────────────────────────────────────────
  -- 6. APPETIZERS & SIDES
  --    Keep: Appetizers (rename)
  --    Merge in: Side Orders
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_target_id FROM categories
  WHERE restaurant_id = v_rid AND name = 'Appetizers';

  UPDATE products SET category_id = v_target_id
  WHERE restaurant_id = v_rid AND category_id IN (
    SELECT id FROM categories WHERE restaurant_id = v_rid AND name = 'Side Orders'
  );

  UPDATE categories SET name = 'Appetizers & Sides', sort_order = 6
  WHERE id = v_target_id;

  DELETE FROM categories
  WHERE restaurant_id = v_rid AND name = 'Side Orders';
  RAISE NOTICE '6. Appetizers & Sides done';

  -- ─────────────────────────────────────────────────────────
  -- 7. COCKTAILS (unchanged, update sort_order only)
  -- ─────────────────────────────────────────────────────────
  UPDATE categories SET sort_order = 7
  WHERE restaurant_id = v_rid AND name = 'Cocktails';
  RAISE NOTICE '7. Cocktails done';

  -- ─────────────────────────────────────────────────────────
  -- 8. COFFEE & DRINKS
  --    Keep: Coffee & Hot Drinks (rename)
  --    Merge in: Smoothies & Beverages
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_target_id FROM categories
  WHERE restaurant_id = v_rid AND name = 'Coffee & Hot Drinks';

  UPDATE products SET category_id = v_target_id
  WHERE restaurant_id = v_rid AND category_id IN (
    SELECT id FROM categories WHERE restaurant_id = v_rid AND name = 'Smoothies & Beverages'
  );

  UPDATE categories SET name = 'Coffee & Drinks', sort_order = 8
  WHERE id = v_target_id;

  DELETE FROM categories
  WHERE restaurant_id = v_rid AND name = 'Smoothies & Beverages';
  RAISE NOTICE '8. Coffee & Drinks done';

  -- ─────────────────────────────────────────────────────────
  -- 9. DESSERTS
  --    Keep: Desserts (sort_order only)
  --    Merge in: Ice Cream & Fountain
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_target_id FROM categories
  WHERE restaurant_id = v_rid AND name = 'Desserts';

  UPDATE products SET category_id = v_target_id
  WHERE restaurant_id = v_rid AND category_id IN (
    SELECT id FROM categories WHERE restaurant_id = v_rid AND name = 'Ice Cream & Fountain'
  );

  UPDATE categories SET sort_order = 9
  WHERE id = v_target_id;

  DELETE FROM categories
  WHERE restaurant_id = v_rid AND name = 'Ice Cream & Fountain';
  RAISE NOTICE '9. Desserts done';

  -- ─────────────────────────────────────────────────────────
  -- 10. DAILY SPECIALS (new empty category)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO categories (restaurant_id, name, sort_order, is_active, created_at)
  VALUES (v_rid, 'Daily Specials', 10, true, now());
  RAISE NOTICE '10. Daily Specials created';

  RAISE NOTICE '✅ Migration complete! Buccaneer now has 10 categories.';

END $$;

-- ─────────────────────────────────────────────────────────
-- VERIFY: Run this after migration to confirm results
-- ─────────────────────────────────────────────────────────
-- SELECT c.name, c.sort_order, COUNT(p.id) AS products
-- FROM categories c
-- LEFT JOIN products p ON p.category_id = c.id
-- WHERE c.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'buccaneer')
-- GROUP BY c.name, c.sort_order
-- ORDER BY c.sort_order;
