-- ============================================================
-- MENIUS — Security & Performance Fixes
-- Run in Supabase SQL Editor
-- Fixes: search_path, RLS performance, subscriptions policy
-- ============================================================

-- ============================================================
-- 1. FIX FUNCTIONS: Add SET search_path = '' for security
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION generate_order_number(rest_id UUID)
RETURNS TEXT AS $$
DECLARE
  count_today INTEGER;
  today_str TEXT;
BEGIN
  today_str := TO_CHAR(NOW(), 'YYMMDD');
  SELECT COUNT(*) + 1 INTO count_today
  FROM public.orders
  WHERE restaurant_id = rest_id
    AND created_at::DATE = NOW()::DATE;
  RETURN 'ORD-' || today_str || '-' || LPAD(count_today::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION get_user_restaurant_id()
RETURNS UUID AS $$
  SELECT default_restaurant_id FROM public.profiles WHERE user_id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION user_owns_restaurant(rest_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = rest_id AND owner_user_id = (select auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION increment_promo_usage(p_code TEXT, p_restaurant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotions
  SET current_uses = current_uses + 1
  WHERE code = p_code AND restaurant_id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION handle_new_restaurant_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (restaurant_id, plan_id, status, trial_start, trial_end, current_period_end)
  VALUES (
    NEW.id,
    'basic',
    'trialing',
    NOW(),
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (restaurant_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================
-- 2. FIX RLS PERFORMANCE: (select auth.uid()) instead of auth.uid()
--    Drop old policies and recreate with optimized version
-- ============================================================

-- RESTAURANTS
DROP POLICY IF EXISTS "owners_read_own_restaurants" ON restaurants;
DROP POLICY IF EXISTS "owners_insert_restaurants" ON restaurants;
DROP POLICY IF EXISTS "owners_update_own_restaurants" ON restaurants;

CREATE POLICY "owners_read_own_restaurants" ON restaurants
  FOR SELECT USING (owner_user_id = (select auth.uid()));
CREATE POLICY "owners_insert_restaurants" ON restaurants
  FOR INSERT WITH CHECK (owner_user_id = (select auth.uid()));
CREATE POLICY "owners_update_own_restaurants" ON restaurants
  FOR UPDATE USING (owner_user_id = (select auth.uid()));

-- PROFILES
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (user_id = (select auth.uid()));

-- PROMOTIONS
DROP POLICY IF EXISTS "owners_manage_promotions" ON promotions;
CREATE POLICY "owners_manage_promotions" ON promotions
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = (select auth.uid())));

-- STAFF
DROP POLICY IF EXISTS "owners_manage_staff" ON staff_members;
DROP POLICY IF EXISTS "staff_read_own" ON staff_members;

CREATE POLICY "owners_manage_staff" ON staff_members
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = (select auth.uid())));
CREATE POLICY "staff_read_own" ON staff_members
  FOR SELECT USING (user_id = (select auth.uid()));

-- REVIEWS
DROP POLICY IF EXISTS "owners_manage_reviews" ON reviews;
CREATE POLICY "owners_manage_reviews" ON reviews
  FOR ALL USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = (select auth.uid())));

-- SUBSCRIPTIONS: Replace overly permissive policy with proper ones
DROP POLICY IF EXISTS "system_manage_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "owners_read_own_subscription" ON subscriptions;
DROP POLICY IF EXISTS "owners_update_own_subscription" ON subscriptions;

CREATE POLICY "owners_read_own_subscription" ON subscriptions
  FOR SELECT USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = (select auth.uid())));
CREATE POLICY "owners_update_own_subscription" ON subscriptions
  FOR UPDATE USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_user_id = (select auth.uid())));
CREATE POLICY "service_insert_subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (true);

-- STORAGE
DROP POLICY IF EXISTS "Authenticated users upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete product images" ON storage.objects;

CREATE POLICY "Authenticated users upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND (select auth.role()) = 'authenticated');
CREATE POLICY "Authenticated users update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND (select auth.role()) = 'authenticated');
CREATE POLICY "Authenticated users delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND (select auth.role()) = 'authenticated');
