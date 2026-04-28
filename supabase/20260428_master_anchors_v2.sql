-- ============================================================
-- Master Style Anchors v2 — adds 9 new categories (4 generic + 5 LatAm)
-- and expands aliases on existing categories with regional vocabulary.
--
-- Incremental: does not modify existing rows beyond aliases. Safe to re-run.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) Add 9 new categories (4 generic gaps + 5 LatAm-specific)
INSERT INTO master_style_anchors (category_slug, display_name, aliases) VALUES
  -- Generic gaps
  ('appetizer',    'Appetizers',         ARRAY['appetizer','starter','entrada','aperitivo','nachos','dip','mozzarella sticks','jalapeño popper','spring roll','calamares','calamari','onion ring','aros de cebolla','garlic bread','pan de ajo']),
  ('soup',         'Soups',              ARRAY['soup','sopa','crema','caldo','ramen','pho','minestrone','mondongo','sancocho','ajiaco','menudo','pozole','sopa de mariscos','sopa de tortilla','sopa azteca','consome','consomé','chicken soup','tomato soup']),
  ('rice',         'Rice dishes',        ARRAY['rice','arroz','arroz con pollo','arroz con camaron','arroz con camarón','paella','arroz chino','arroz frito','fried rice','arroz a la valenciana','arroz mixto','risotto','arroz con gandules','arroz con leche']),
  ('soft_drink',   'Soft drinks',        ARRAY['soda','gaseosa','refresco','agua','agua mineral','sparkling water','agua de jamaica','horchata','aguafresca','agua fresca','iced tea','te frio','té frío','tepache','kombucha','coca','pepsi','sprite','fanta']),
  -- LatAm-specific
  ('grill_meat',   'Grill / Asado',      ARRAY['churrasco','asado','parrillada','parrilla','bife','picanha','picaña','vacio','vacío','arrachera','tira','grill meat','mixed grill','mixed parrillada','chorizo asado','morcilla','grilled meats','meat platter','charqui']),
  ('ceviche',      'Ceviche',            ARRAY['ceviche','sebiche','seviche','tiradito','aguachile','leche de tigre','ceviche mixto','ceviche de camaron','ceviche de camarón','ceviche peruano']),
  ('arepa',        'Arepas',             ARRAY['arepa','arepas','reina pepiada','arepa rellena','cachapa']),
  ('empanada',     'Empanadas',          ARRAY['empanada','empanadas','pastelillo','pastel de carne','pasties','empanada de queso','empanada de pollo','empanada de carne']),
  ('combo_plate',  'Combo plates',       ARRAY['bandeja paisa','plato típico','plato tipico','plato del día','plato del dia','combinacion','combinación','combo','plato fuerte','platos típicos','plato montañero','plato montanero','comida corrida','sopes','huarache']),

  -- Regional Mexican single-dish anchors
  ('chilaquiles',  'Chilaquiles',        ARRAY['chilaquiles','chilaquiles verdes','chilaquiles rojos','chilaquiles con huevo','chilaquiles con pollo']),
  ('mole',         'Mole',               ARRAY['mole','mole poblano','mole verde','mole negro','enmoladas'])
ON CONFLICT (category_slug) DO NOTHING;

-- 2) Expand aliases on existing categories with regional LatAm vocabulary.
-- Uses array concatenation; if the alias already exists, it becomes a duplicate
-- in the array but matching still works correctly (longest-match wins).
UPDATE master_style_anchors
SET aliases = aliases || ARRAY[
  'churrasco','bife','lomo','lomito','vacio','vacío','picanha','picaña','arrachera',
  't-bone','ribeye','ribeye steak','new york strip','ny strip','sirloin','tenderloin',
  'porterhouse','filete mignon','filet mignon','filete','medallon','medallón','rib eye'
]
WHERE category_slug = 'steak';

UPDATE master_style_anchors
SET aliases = aliases || ARRAY[
  'pollo a la brasa','pollo asado','pechuga','milanesa de pollo','pollo frito',
  'pollo a la plancha','pollo grillado','pechuga rellena','pollito','pollos'
]
WHERE category_slug = 'chicken';

UPDATE master_style_anchors
SET aliases = aliases || ARRAY[
  'pulpo','pulpo a la gallega','calamares en su tinta','almejas','mejillones',
  'pescado frito','pescado a la plancha','filete de pescado','mariscos','marisco',
  'paella de mariscos','tilapia','mojarra','huachinango','dorado','robalo'
]
WHERE category_slug = 'seafood';

UPDATE master_style_anchors
SET aliases = aliases || ARRAY[
  'huevos rancheros','huevos a la mexicana','huevos divorciados','huevos al gusto',
  'huevos con jamon','huevos con jamón','desayuno típico','desayuno tipico',
  'gallo pinto','calentado','arepa de huevo','molletes'
]
WHERE category_slug = 'breakfast';

UPDATE master_style_anchors
SET aliases = aliases || ARRAY[
  'limonada','limeade','smoothie de fruta','batido de fruta','licuado','jugo natural',
  'jugo de naranja','jugo verde','green juice','detox juice','agua de coco'
]
WHERE category_slug = 'juice';

UPDATE master_style_anchors
SET aliases = aliases || ARRAY[
  'tres leches','arroz con leche','natilla','arequipe','dulce de leche','crema catalana',
  'churros','buñuelo','buñuelos','milhojas','torta','panqué','panque','volcán de chocolate',
  'volcan de chocolate','chocolate lava cake','helado','ice cream','sundae'
]
WHERE category_slug = 'dessert';

UPDATE master_style_anchors
SET aliases = aliases || ARRAY[
  'taquitos dorados','flautas','sopes','huarache','tlacoyo','gringa','volcán','volcan',
  'mulita','vampiro','choripan','chori pan','torta ahogada'
]
WHERE category_slug = 'taco';
