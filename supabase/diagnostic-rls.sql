-- ============================================================
-- DIAGNOSTIC: Verify RLS policies for products, categories, storage
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Check if RLS is enabled on key tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('products', 'categories', 'restaurants', 'profiles', 'product_variants', 'product_extras', 'modifier_groups', 'modifier_options')
ORDER BY tablename;

-- 2. List all policies on products table
SELECT polname AS policy_name, polcmd AS command, polroles::regrole[] AS roles
FROM pg_policy
WHERE polrelid = 'public.products'::regclass;

-- 3. List all policies on categories table
SELECT polname AS policy_name, polcmd AS command, polroles::regrole[] AS roles
FROM pg_policy
WHERE polrelid = 'public.categories'::regclass;

-- 4. Verify the user_owns_restaurant function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'user_owns_restaurant';

-- 5. Check storage buckets
SELECT id, name, public
FROM storage.buckets
WHERE name IN ('product-images', 'logos', 'restaurant-assets');

-- 6. Check storage policies on product-images bucket
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 7. Verify restaurants have owner_user_id set
SELECT id, name, slug, owner_user_id,
       CASE WHEN owner_user_id IS NULL THEN 'MISSING OWNER' ELSE 'OK' END AS status
FROM restaurants
ORDER BY created_at DESC
LIMIT 10;

-- 8. Verify profiles have default_restaurant_id set
SELECT user_id, default_restaurant_id,
       CASE WHEN default_restaurant_id IS NULL THEN 'MISSING RESTAURANT' ELSE 'OK' END AS status
FROM profiles
LIMIT 10;
