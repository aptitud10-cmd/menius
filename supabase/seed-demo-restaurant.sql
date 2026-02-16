-- ============================================================
-- MENIUS — Demo Restaurant Seed Data
-- Run this in the Supabase SQL Editor AFTER the main migration
-- and AFTER you have created at least one user account.
--
-- Creates a fully populated demo restaurant at /r/demo
-- with 6 categories, 20 products, variants, extras and tables.
-- ============================================================

DO $$
DECLARE
  owner_id UUID;
  rest_id UUID;
  -- Category IDs
  cat_entradas UUID;
  cat_fuertes UUID;
  cat_postres UUID;
  cat_bebidas UUID;
  cat_especiales UUID;
  cat_desayunos UUID;
  -- Product IDs (for variants/extras)
  p_tacos UUID;
  p_burger UUID;
  p_salmon UUID;
  p_pizza UUID;
  p_limonada UUID;
  p_cafe UUID;
BEGIN

  -- Find an existing user to own the demo restaurant
  SELECT id INTO owner_id FROM auth.users LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Create an account first (sign up in the app), then re-run this script.';
  END IF;

  -- ---- 1. Restaurant ----
  -- Delete existing demo restaurant if any (clean re-seed)
  DELETE FROM restaurants WHERE slug = 'demo';

  INSERT INTO restaurants (id, name, slug, owner_user_id, timezone, currency)
  VALUES (
    gen_random_uuid(),
    'La Cocina de MENIUS',
    'demo',
    owner_id,
    'America/Mexico_City',
    'MXN'
  )
  RETURNING id INTO rest_id;

  -- ---- 2. Categories ----
  INSERT INTO categories (id, restaurant_id, name, sort_order, is_active) VALUES
    (gen_random_uuid(), rest_id, 'Entradas', 1, true)  RETURNING id INTO cat_entradas;
  INSERT INTO categories (id, restaurant_id, name, sort_order, is_active) VALUES
    (gen_random_uuid(), rest_id, 'Platos Fuertes', 2, true) RETURNING id INTO cat_fuertes;
  INSERT INTO categories (id, restaurant_id, name, sort_order, is_active) VALUES
    (gen_random_uuid(), rest_id, 'Postres', 3, true) RETURNING id INTO cat_postres;
  INSERT INTO categories (id, restaurant_id, name, sort_order, is_active) VALUES
    (gen_random_uuid(), rest_id, 'Bebidas', 4, true) RETURNING id INTO cat_bebidas;
  INSERT INTO categories (id, restaurant_id, name, sort_order, is_active) VALUES
    (gen_random_uuid(), rest_id, 'Especialidades del Chef', 5, true) RETURNING id INTO cat_especiales;
  INSERT INTO categories (id, restaurant_id, name, sort_order, is_active) VALUES
    (gen_random_uuid(), rest_id, 'Desayunos', 6, true) RETURNING id INTO cat_desayunos;

  -- ---- 3. Products — Entradas ----
  INSERT INTO products (restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (rest_id, cat_entradas, 'Guacamole Fresco', 'Aguacate machacado con cebolla, cilantro, chile serrano y limón. Servido con totopos artesanales.', 89.00, true, 1),
    (rest_id, cat_entradas, 'Quesadillas de Flor de Calabaza', 'Tortillas de maíz rellenas de flor de calabaza, queso Oaxaca y epazote.', 75.00, true, 2),
    (rest_id, cat_entradas, 'Ceviche de Camarón', 'Camarones frescos marinados en limón con pepino, cebolla morada, chile y aguacate.', 120.00, true, 3);

  -- ---- 3. Products — Platos Fuertes ----
  INSERT INTO products (id, restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (gen_random_uuid(), rest_id, cat_fuertes, 'Tacos al Pastor', 'Tres tacos de cerdo adobado con piña, cebolla y cilantro. Tortillas hechas a mano.', 95.00, true, 1)
    RETURNING id INTO p_tacos;

  INSERT INTO products (id, restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (gen_random_uuid(), rest_id, cat_fuertes, 'Hamburguesa MENIUS', 'Carne Angus 200g, queso cheddar, lechuga, tomate, cebolla caramelizada y salsa secreta. Con papas.', 165.00, true, 2)
    RETURNING id INTO p_burger;

  INSERT INTO products (id, restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (gen_random_uuid(), rest_id, cat_fuertes, 'Salmón a la Parrilla', 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas.', 245.00, true, 3)
    RETURNING id INTO p_salmon;

  INSERT INTO products (id, restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (gen_random_uuid(), rest_id, cat_fuertes, 'Pizza Margherita', 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca.', 180.00, true, 4)
    RETURNING id INTO p_pizza;

  INSERT INTO products (restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (rest_id, cat_fuertes, 'Enchiladas Suizas', 'Tortillas rellenas de pollo deshebrado bañadas en salsa verde con crema y queso gratinado.', 135.00, true, 5);

  -- ---- 3. Products — Postres ----
  INSERT INTO products (restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (rest_id, cat_postres, 'Churros con Chocolate', 'Churros crujientes espolvoreados con azúcar y canela, servidos con salsa de chocolate belga.', 65.00, true, 1),
    (rest_id, cat_postres, 'Flan Napolitano', 'Flan cremoso de vainilla con caramelo casero.', 55.00, true, 2),
    (rest_id, cat_postres, 'Pastel de Tres Leches', 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas.', 75.00, true, 3);

  -- ---- 3. Products — Bebidas ----
  INSERT INTO products (id, restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (gen_random_uuid(), rest_id, cat_bebidas, 'Limonada Natural', 'Limonada recién exprimida con hierbabuena y hielo.', 45.00, true, 1)
    RETURNING id INTO p_limonada;

  INSERT INTO products (id, restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (gen_random_uuid(), rest_id, cat_bebidas, 'Café de Olla', 'Café de grano con piloncillo y canela, estilo tradicional mexicano.', 40.00, true, 2)
    RETURNING id INTO p_cafe;

  INSERT INTO products (restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (rest_id, cat_bebidas, 'Agua de Horchata', 'Agua fresca de arroz con canela y un toque de vainilla.', 38.00, true, 3),
    (rest_id, cat_bebidas, 'Michelada Clásica', 'Cerveza con jugo de limón, sal, salsa picante y chamoy.', 75.00, true, 4);

  -- ---- 3. Products — Especialidades del Chef ----
  INSERT INTO products (restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (rest_id, cat_especiales, 'Mole Negro Oaxaqueño', 'Pollo en mole negro con más de 20 ingredientes, arroz rojo y tortillas calientes.', 195.00, true, 1),
    (rest_id, cat_especiales, 'Cochinita Pibil', 'Cerdo marinado en achiote y naranja agria, cocido lentamente. Con cebolla morada encurtida.', 175.00, true, 2),
    (rest_id, cat_especiales, 'Chiles en Nogada', 'Chile poblano relleno de picadillo con frutas, bañado en nogada y granada. De temporada.', 220.00, true, 3);

  -- ---- 3. Products — Desayunos ----
  INSERT INTO products (restaurant_id, category_id, name, description, price, is_active, sort_order) VALUES
    (rest_id, cat_desayunos, 'Chilaquiles Verdes', 'Totopos bañados en salsa verde con crema, queso fresco, cebolla y huevo estrellado.', 85.00, true, 1),
    (rest_id, cat_desayunos, 'Huevos Rancheros', 'Huevos estrellados sobre tortilla de maíz con salsa roja, frijoles refritos y aguacate.', 78.00, true, 2),
    (rest_id, cat_desayunos, 'Molletes Especiales', 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate.', 70.00, true, 3);

  -- ---- 4. Variants ----
  INSERT INTO product_variants (product_id, name, price_delta, sort_order) VALUES
    (p_tacos, '3 piezas', 0, 1),
    (p_tacos, '5 piezas', 30.00, 2),
    (p_tacos, '10 piezas (para compartir)', 85.00, 3);

  INSERT INTO product_variants (product_id, name, price_delta, sort_order) VALUES
    (p_burger, 'Sencilla', 0, 1),
    (p_burger, 'Doble carne', 45.00, 2);

  INSERT INTO product_variants (product_id, name, price_delta, sort_order) VALUES
    (p_pizza, 'Individual (20 cm)', 0, 1),
    (p_pizza, 'Mediana (30 cm)', 60.00, 2),
    (p_pizza, 'Familiar (40 cm)', 120.00, 3);

  INSERT INTO product_variants (product_id, name, price_delta, sort_order) VALUES
    (p_limonada, 'Chica (350 ml)', 0, 1),
    (p_limonada, 'Grande (500 ml)', 15.00, 2),
    (p_limonada, 'Jarra (1 litro)', 35.00, 3);

  INSERT INTO product_variants (product_id, name, price_delta, sort_order) VALUES
    (p_cafe, 'Caliente', 0, 1),
    (p_cafe, 'Frío', 10.00, 2);

  -- ---- 5. Extras ----
  INSERT INTO product_extras (product_id, name, price, sort_order) VALUES
    (p_tacos, 'Extra salsa habanero', 10.00, 1),
    (p_tacos, 'Queso fundido', 20.00, 2),
    (p_tacos, 'Nopales asados', 15.00, 3);

  INSERT INTO product_extras (product_id, name, price, sort_order) VALUES
    (p_burger, 'Extra queso cheddar', 20.00, 1),
    (p_burger, 'Tocino', 25.00, 2),
    (p_burger, 'Aros de cebolla', 30.00, 3),
    (p_burger, 'Jalapeños', 10.00, 4);

  INSERT INTO product_extras (product_id, name, price, sort_order) VALUES
    (p_salmon, 'Extra puré de camote', 25.00, 1),
    (p_salmon, 'Ensalada verde', 30.00, 2);

  INSERT INTO product_extras (product_id, name, price, sort_order) VALUES
    (p_pizza, 'Pepperoni', 25.00, 1),
    (p_pizza, 'Champiñones', 20.00, 2),
    (p_pizza, 'Aceitunas', 15.00, 3),
    (p_pizza, 'Extra mozzarella', 30.00, 4);

  -- ---- 6. Tables ----
  INSERT INTO tables (restaurant_id, name, qr_code_value, is_active) VALUES
    (rest_id, 'Mesa 1', 'demo-mesa-1', true),
    (rest_id, 'Mesa 2', 'demo-mesa-2', true),
    (rest_id, 'Mesa 3', 'demo-mesa-3', true),
    (rest_id, 'Mesa 4', 'demo-mesa-4', true),
    (rest_id, 'Mesa 5', 'demo-mesa-5', true),
    (rest_id, 'Barra 1', 'demo-barra-1', true),
    (rest_id, 'Terraza 1', 'demo-terraza-1', true),
    (rest_id, 'Terraza 2', 'demo-terraza-2', true);

  RAISE NOTICE '✅ Demo restaurant created successfully at /r/demo with 6 categories, 20 products, variants, extras and 8 tables!';

END $$;
