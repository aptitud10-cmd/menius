-- ============================================================
-- MENIUS SaaS — Full Database Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Restaurants (tenants)
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT DEFAULT 'America/Mexico_City',
  currency TEXT DEFAULT 'MXN',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('super_admin', 'owner', 'staff')),
  default_restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Variants (e.g. "Small", "Large")
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta DECIMAL(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Product Extras (e.g. "Extra cheese", "Bacon")
CREATE TABLE product_extras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Tables (physical tables in a restaurant)
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qr_code_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  customer_name TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  total DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
);

-- Order Item Extras
CREATE TABLE order_item_extras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES product_extras(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_owner ON restaurants(owner_user_id);
CREATE INDEX idx_profiles_restaurant ON profiles(default_restaurant_id);
CREATE INDEX idx_categories_restaurant ON categories(restaurant_id);
CREATE INDEX idx_products_restaurant ON products(restaurant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_extras_product ON product_extras(product_id);
CREATE INDEX idx_tables_restaurant ON tables(restaurant_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_item_extras_item ON order_item_extras(order_item_id);

-- ============================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number(rest_id UUID)
RETURNS TEXT AS $$
DECLARE
  count_today INTEGER;
  today_str TEXT;
BEGIN
  today_str := TO_CHAR(NOW(), 'YYMMDD');
  SELECT COUNT(*) + 1 INTO count_today
  FROM orders
  WHERE restaurant_id = rest_id
    AND created_at::DATE = NOW()::DATE;
  RETURN 'ORD-' || today_str || '-' || LPAD(count_today::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

-- Helper: get user's restaurant_id
CREATE OR REPLACE FUNCTION get_user_restaurant_id()
RETURNS UUID AS $$
  SELECT default_restaurant_id FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user owns a restaurant
CREATE OR REPLACE FUNCTION user_owns_restaurant(rest_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants
    WHERE id = rest_id AND owner_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- RESTAURANTS ----
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_own_restaurants" ON restaurants
  FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY "owners_insert_restaurants" ON restaurants
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "owners_update_own_restaurants" ON restaurants
  FOR UPDATE USING (owner_user_id = auth.uid());

-- Public read for slug lookup (for public menu)
CREATE POLICY "public_read_restaurant_by_slug" ON restaurants
  FOR SELECT USING (true);

-- ---- PROFILES ----
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "system_insert_profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- ---- CATEGORIES ----
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_categories" ON categories
  FOR ALL USING (user_owns_restaurant(restaurant_id));

CREATE POLICY "public_read_active_categories" ON categories
  FOR SELECT USING (is_active = true);

-- ---- PRODUCTS ----
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_products" ON products
  FOR ALL USING (user_owns_restaurant(restaurant_id));

CREATE POLICY "public_read_active_products" ON products
  FOR SELECT USING (is_active = true);

-- ---- PRODUCT VARIANTS ----
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_variants" ON product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id AND user_owns_restaurant(p.restaurant_id)
    )
  );

CREATE POLICY "public_read_variants" ON product_variants
  FOR SELECT USING (true);

-- ---- PRODUCT EXTRAS ----
ALTER TABLE product_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_extras" ON product_extras
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_id AND user_owns_restaurant(p.restaurant_id)
    )
  );

CREATE POLICY "public_read_extras" ON product_extras
  FOR SELECT USING (true);

-- ---- TABLES ----
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_tables" ON tables
  FOR ALL USING (user_owns_restaurant(restaurant_id));

CREATE POLICY "public_read_tables" ON tables
  FOR SELECT USING (true);

-- ---- ORDERS ----
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_orders" ON orders
  FOR ALL USING (user_owns_restaurant(restaurant_id));

-- Public can create orders (customers placing orders)
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_own_order" ON orders
  FOR SELECT USING (true);

-- ---- ORDER ITEMS ----
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_order_items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id AND user_owns_restaurant(o.restaurant_id)
    )
  );

CREATE POLICY "public_insert_order_items" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_order_items" ON order_items
  FOR SELECT USING (true);

-- ---- ORDER ITEM EXTRAS ----
ALTER TABLE order_item_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_read_order_item_extras" ON order_item_extras
  FOR SELECT USING (true);

CREATE POLICY "public_insert_order_item_extras" ON order_item_extras
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- 5. STORAGE BUCKET for product images
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
