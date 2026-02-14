-- FoodFlow Database Schema
-- Version: 1.0
-- Date: February 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'customer', 
  -- Roles: customer, restaurant_owner, restaurant_staff, super_admin
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- RESTAURANTS TABLE
-- =====================================================
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  accepts_online_orders BOOLEAN DEFAULT TRUE,
  delivery_enabled BOOLEAN DEFAULT TRUE,
  pickup_enabled BOOLEAN DEFAULT TRUE,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  delivery_radius_miles DECIMAL(5, 2) DEFAULT 5,
  
  -- Business Hours (JSON format)
  business_hours JSONB DEFAULT '{}',
  -- Example: {"monday": {"open": "09:00", "close": "22:00"}, "tuesday": {...}}
  
  -- Subscription
  subscription_plan VARCHAR(50), -- starter, professional, enterprise
  subscription_status VARCHAR(50) DEFAULT 'trialing', -- active, past_due, canceled, trialing
  subscription_stripe_id VARCHAR(255),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_subscription_status ON restaurants(subscription_status);

-- =====================================================
-- MENU CATEGORIES TABLE
-- =====================================================
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_restaurant ON menu_categories(restaurant_id);

-- =====================================================
-- MENU ITEMS TABLE
-- =====================================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  
  -- Options
  is_available BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  preparation_time_minutes INTEGER DEFAULT 15,
  
  -- Modifiers (JSON format)
  modifiers JSONB DEFAULT '[]',
  -- Example: [{"name": "Size", "options": [{"name": "Small", "price": 0}, {"name": "Large", "price": 2.00}]}]
  
  -- Dietary Tags
  dietary_tags TEXT[] DEFAULT '{}',
  -- Example: ['vegetarian', 'gluten-free', 'spicy']
  
  -- AI Generated Description (premium feature)
  ai_generated_description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Order Type
  order_type VARCHAR(20) NOT NULL, -- delivery, pickup, dine_in
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Status flow: pending → confirmed → preparing → ready → completed (or canceled)
  
  -- Customer Info (for guest orders)
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  
  -- Delivery Address
  delivery_address_line1 VARCHAR(255),
  delivery_address_line2 VARCHAR(255),
  delivery_city VARCHAR(100),
  delivery_state VARCHAR(100),
  delivery_zip_code VARCHAR(20),
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  delivery_instructions TEXT,
  
  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  tip DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Payment
  payment_method VARCHAR(50), -- stripe, cash, square
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_intent_id VARCHAR(255),
  
  -- Timing
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  special_instructions TEXT,
  internal_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  
  -- Snapshot (in case menu changes)
  item_name VARCHAR(255) NOT NULL,
  item_price DECIMAL(10, 2) NOT NULL,
  
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Selected Modifiers
  modifiers JSONB DEFAULT '{}',
  modifiers_price DECIMAL(10, 2) DEFAULT 0,
  
  -- Special Instructions
  special_instructions TEXT,
  
  -- Line Total
  line_total DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  
  plan VARCHAR(50) NOT NULL, -- starter, professional, enterprise
  status VARCHAR(50) NOT NULL, -- active, past_due, canceled, trialing
  
  -- Stripe Integration
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  
  -- Billing Period
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Plan Limits
  max_orders_per_month INTEGER, -- NULL = unlimited
  max_locations INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_restaurant ON subscriptions(restaurant_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- =====================================================
-- ANALYTICS DAILY TABLE
-- =====================================================
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Orders
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  canceled_orders INTEGER DEFAULT 0,
  
  -- Revenue
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  avg_order_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Order Types
  delivery_orders INTEGER DEFAULT 0,
  pickup_orders INTEGER DEFAULT 0,
  dine_in_orders INTEGER DEFAULT 0,
  
  -- Top Items
  top_selling_items JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(restaurant_id, date)
);

CREATE INDEX idx_analytics_restaurant ON analytics_daily(restaurant_id);
CREATE INDEX idx_analytics_date ON analytics_daily(date DESC);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL, -- new_order, order_status, subscription_expiring, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Read Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_restaurant ON notifications(restaurant_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- =====================================================
-- RESTAURANT STAFF TABLE
-- =====================================================
CREATE TABLE restaurant_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  role VARCHAR(50) NOT NULL, -- manager, chef, waiter, cashier
  permissions JSONB DEFAULT '{}',
  -- Example: {"can_edit_menu": true, "can_view_reports": false, "can_manage_orders": true}
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX idx_restaurant_staff_restaurant ON restaurant_staff(restaurant_id);
CREATE INDEX idx_restaurant_staff_user ON restaurant_staff(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_staff ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Restaurants policies
CREATE POLICY "Restaurant owners can view their restaurants" ON restaurants
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Restaurant owners can update their restaurants" ON restaurants
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Public can view active restaurants" ON restaurants
  FOR SELECT USING (is_active = TRUE);

-- Menu items policies (public can view if restaurant is active)
CREATE POLICY "Public can view active menu items" ON menu_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.is_active = TRUE
    )
  );

CREATE POLICY "Restaurant owners can manage their menu" ON menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Orders policies
CREATE POLICY "Customers can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Restaurant owners can view their orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = orders.restaurant_id 
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can update their orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = orders.restaurant_id 
      AND restaurants.owner_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get current date in YYYYMMDD format
  SELECT COUNT(*) INTO counter FROM orders WHERE DATE(created_at) = CURRENT_DATE;
  new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((counter + 1)::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA (Demo Restaurant)
-- =====================================================

-- Insert demo user
INSERT INTO users (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@foodflow.com', 'Demo Restaurant', 'restaurant_owner');

-- Insert demo restaurant
INSERT INTO restaurants (
  id,
  owner_id,
  name,
  slug,
  description,
  email,
  phone,
  address_line1,
  city,
  state,
  zip_code,
  latitude,
  longitude,
  subscription_plan,
  subscription_status,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Demo Taqueria',
  'demo-taqueria',
  'Auténtica comida mexicana en el corazón de la ciudad',
  'demo@taqueria.com',
  '(555) 123-4567',
  '123 Main Street',
  'Austin',
  'TX',
  '78701',
  30.2672,
  -97.7431,
  'professional',
  'active',
  TRUE
);

-- Insert demo menu categories
INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES
('00000000-0000-0000-0000-000000000002', 'Entradas', 0),
('00000000-0000-0000-0000-000000000002', 'Tacos', 1),
('00000000-0000-0000-0000-000000000002', 'Platos Fuertes', 2),
('00000000-0000-0000-0000-000000000002', 'Bebidas', 3);

-- =====================================================
-- END OF SCHEMA
-- =====================================================
