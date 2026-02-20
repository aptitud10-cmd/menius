-- ============================================================
-- MENIUS — Modifier Groups Migration
-- Run this in the Supabase SQL Editor for existing databases
-- ============================================================

-- 1. Create tables
CREATE TABLE IF NOT EXISTS modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multi')),
  min_select INTEGER NOT NULL DEFAULT 0,
  max_select INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modifier_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta DECIMAL(10,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  group_id UUID REFERENCES modifier_groups(id) ON DELETE SET NULL,
  option_id UUID REFERENCES modifier_options(id) ON DELETE SET NULL,
  group_name TEXT NOT NULL,
  option_name TEXT NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_modifier_groups_product ON modifier_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_modifier_options_group ON modifier_options(group_id);
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_item ON order_item_modifiers(order_item_id);

-- 3. RLS
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "owners_manage_modifier_groups" ON modifier_groups
    FOR ALL USING (
      EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND user_owns_restaurant(p.restaurant_id))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_modifier_groups" ON modifier_groups
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owners_manage_modifier_options" ON modifier_options
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM modifier_groups mg JOIN products p ON p.id = mg.product_id
        WHERE mg.id = group_id AND user_owns_restaurant(p.restaurant_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_modifier_options" ON modifier_options
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owners_read_order_item_modifiers" ON order_item_modifiers
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_insert_order_item_modifiers" ON order_item_modifiers
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Migrate existing variants -> modifier_groups (selection_type='single', is_required=true)
INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
SELECT
  uuid_generate_v4(),
  pv.product_id,
  'Variante',
  'single',
  1,
  1,
  true,
  0
FROM (SELECT DISTINCT product_id FROM product_variants) pv
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_groups mg WHERE mg.product_id = pv.product_id AND mg.name = 'Variante'
);

INSERT INTO modifier_options (group_id, name, price_delta, sort_order)
SELECT
  mg.id,
  pv.name,
  pv.price_delta,
  pv.sort_order
FROM product_variants pv
JOIN modifier_groups mg ON mg.product_id = pv.product_id AND mg.name = 'Variante'
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_options mo WHERE mo.group_id = mg.id AND mo.name = pv.name
);

-- 5. Migrate existing extras -> modifier_groups (selection_type='multi', is_required=false)
INSERT INTO modifier_groups (id, product_id, name, selection_type, min_select, max_select, is_required, sort_order)
SELECT
  uuid_generate_v4(),
  pe.product_id,
  'Extras',
  'multi',
  0,
  99,
  false,
  1
FROM (SELECT DISTINCT product_id FROM product_extras) pe
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_groups mg WHERE mg.product_id = pe.product_id AND mg.name = 'Extras'
);

INSERT INTO modifier_options (group_id, name, price_delta, sort_order)
SELECT
  mg.id,
  pe.name,
  pe.price,
  pe.sort_order
FROM product_extras pe
JOIN modifier_groups mg ON mg.product_id = pe.product_id AND mg.name = 'Extras'
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_options mo WHERE mo.group_id = mg.id AND mo.name = pe.name
);
