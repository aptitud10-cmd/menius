/**
 * generate-seed-images.mjs  (v2 — nano banana / gemini-3-pro-image-preview)
 *
 * Fixes vs v1:
 *  - Model: gemini-3-pro-image-preview (far more photorealistic than Imagen 4)
 *  - Prompts anchor in "RAW photograph", NOT "commercial advertising" (avoids Pixar/CGI look)
 *  - Every food item explicitly says what vessel it's IN/ON (plate, bowl, glass, board...)
 *  - Beverages: always served in appropriate GLASSWARE — never on a plate or pan
 *  - Explicit NO pans / NO skillets / NO CGI / NO 3D render throughout
 *  - cuisineContext suppressed for drinks (was causing "clay plate" for liquid drinks)
 *
 * Usage:
 *   $env:GEMINI_API_KEY="your-key" ; node scripts/generate-seed-images.mjs
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY');
  console.error('   $env:GEMINI_API_KEY="your-key" ; node scripts/generate-seed-images.mjs');
  process.exit(1);
}

// ─── PRODUCT DEFINITIONS ──────────────────────────────────────────────────────

const ES_IMAGES = [
  // Desayunos
  { file: 'seed/es/chilaquiles.webp',      name: 'Chilaquiles Verdes',           description: 'Totopos bañados en salsa verde con crema, queso fresco, cebolla y huevo estrellado',  category: 'Breakfast',  cuisine: 'Mexican' },
  { file: 'seed/es/huevos-rancheros.webp', name: 'Huevos Rancheros',             description: 'Huevos estrellados sobre tortilla con salsa roja, frijoles refritos y aguacate',          category: 'Breakfast',  cuisine: 'Mexican' },
  { file: 'seed/es/hotcakes.webp',         name: 'Hot Cakes con Fruta',           description: 'Tres hot cakes esponjosos con miel de maple, mantequilla y fruta fresca',                category: 'Breakfast',  cuisine: 'Mexican' },
  { file: 'seed/es/molletes.webp',         name: 'Molletes Especiales',           description: 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate',       category: 'Breakfast',  cuisine: 'Mexican' },
  { file: 'seed/es/omelette.webp',         name: 'Omelette de Verduras',          description: 'Omelette relleno de champiñones, espinaca, pimiento y queso manchego',                  category: 'Breakfast',  cuisine: 'Mexican' },
  { file: 'seed/es/avena.webp',            name: 'Avena con Frutas',              description: 'Avena caliente con leche, miel, granola, fresas y arándanos',                           category: 'Breakfast',  cuisine: 'Mexican' },
  // Almuerzos
  { file: 'seed/es/hamburguesa.webp',      name: 'Hamburguesa Clásica',           description: 'Carne Angus 200g, queso cheddar, lechuga, tomate, cebolla caramelizada',               category: 'Burgers',    cuisine: 'American' },
  { file: 'seed/es/pollo.webp',            name: 'Pollo a la Plancha',            description: 'Pechuga marinada servida con arroz, ensalada y vegetales de temporada',                 category: 'Chicken',    cuisine: 'Mexican' },
  { file: 'seed/es/ensalada.webp',         name: 'Ensalada César',                description: 'Lechuga romana, crutones, parmesano y aderezo césar casero',                           category: 'Salads',     cuisine: 'Mexican' },
  { file: 'seed/es/tacos.webp',            name: 'Tacos al Pastor',               description: 'Tres tacos de cerdo adobado con piña, cilantro y cebolla, tortillas hechas a mano',    category: 'Tacos',      cuisine: 'Mexican' },
  { file: 'seed/es/pasta.webp',            name: 'Pasta Alfredo',                 description: 'Fettuccine en cremosa salsa alfredo con parmesano y pan de ajo',                       category: 'Pasta',      cuisine: 'Italian' },
  // Cenas
  { file: 'seed/es/salmon.webp',           name: 'Salmón a la Parrilla',          description: 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas',          category: 'Dinner',     cuisine: 'Mexican' },
  { file: 'seed/es/pizza.webp',            name: 'Pizza Margherita',              description: 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca',            category: 'Pizza',      cuisine: 'Italian' },
  { file: 'seed/es/filete.webp',           name: 'Filete de Res',                 description: 'Corte grueso de res a la parrilla con puré de papa, espárragos y salsa de vino tinto', category: 'Dinner',     cuisine: 'Argentine' },
  { file: 'seed/es/enchiladas.webp',       name: 'Enchiladas Suizas',             description: 'Tortillas rellenas de pollo bañadas en salsa verde con crema y queso gratinado',      category: 'Dinner',     cuisine: 'Mexican' },
  { file: 'seed/es/sopa.webp',             name: 'Sopa de Tortilla',              description: 'Caldo de jitomate con tiras de tortilla, aguacate, crema, queso y chile pasilla',      category: 'Soups',      cuisine: 'Mexican' },
  // Aperitivos
  { file: 'seed/es/guacamole.webp',        name: 'Guacamole con Totopos',         description: 'Guacamole fresco preparado al momento con aguacate, cilantro, cebolla y limón',       category: 'Appetizers', cuisine: 'Mexican' },
  { file: 'seed/es/nachos.webp',           name: 'Nachos Supremos',               description: 'Totopos con queso fundido, jalapeños, crema, guacamole y pico de gallo',              category: 'Appetizers', cuisine: 'Mexican' },
  { file: 'seed/es/empanadas.webp',        name: 'Empanadas de Queso',            description: 'Tres empanadas crujientes rellenas de queso con salsa ranchera',                      category: 'Appetizers', cuisine: 'Colombian' },
  { file: 'seed/es/aros-cebolla.webp',     name: 'Aros de Cebolla',               description: 'Aros de cebolla empanizados y crujientes con dip de chipotle',                       category: 'Appetizers', cuisine: 'American' },
  { file: 'seed/es/alitas.webp',           name: 'Alitas BBQ',                    description: 'Alitas de pollo bañadas en salsa barbecue, servidas con apio y aderezo ranch',        category: 'Appetizers', cuisine: 'American' },
  // Bebidas
  { file: 'seed/es/limonada.webp',         name: 'Limonada Natural',              description: 'Limonada recién exprimida con hierbabuena y hielo',                                   category: 'Beverages',  cuisine: 'Mexican' },
  { file: 'seed/es/cafe.webp',             name: 'Café de Olla',                  description: 'Café de grano con piloncillo y canela, estilo tradicional mexicano',                  category: 'Hot drinks', cuisine: 'Mexican' },
  { file: 'seed/es/horchata.webp',         name: 'Agua de Horchata',              description: 'Agua fresca de arroz con canela y un toque de vainilla',                              category: 'Beverages',  cuisine: 'Mexican' },
  { file: 'seed/es/jugo.webp',             name: 'Jugo Natural de Naranja',       description: 'Jugo recién exprimido de naranja o zanahoria',                                        category: 'Beverages',  cuisine: 'Mexican' },
  // Licores
  { file: 'seed/es/margarita.webp',        name: 'Margarita Clásica',             description: 'Tequila, triple sec, jugo de limón y sal en el borde',                               category: 'Cocktails',  cuisine: 'Mexican' },
  { file: 'seed/es/cerveza.webp',          name: 'Cerveza Artesanal',             description: 'Selección de cervezas artesanales locales, fría y espumosa',                         category: 'Cocktails',  cuisine: 'Mexican' },
  { file: 'seed/es/mezcal.webp',           name: 'Mezcal Oaxaqueño',              description: 'Mezcal joven artesanal servido con rodaja de naranja y sal de gusano',               category: 'Cocktails',  cuisine: 'Mexican' },
  { file: 'seed/es/mojito.webp',           name: 'Mojito',                        description: 'Ron blanco, hierbabuena fresca, limón, azúcar y soda',                               category: 'Cocktails',  cuisine: 'Mexican' },
  // Postres
  { file: 'seed/es/flan.webp',             name: 'Flan Napolitano',               description: 'Flan cremoso de vainilla con caramelo casero',                                        category: 'Desserts',   cuisine: 'Mexican' },
  { file: 'seed/es/churros.webp',          name: 'Churros con Chocolate',         description: 'Churros crujientes espolvoreados con azúcar y canela, con salsa de chocolate belga', category: 'Desserts',   cuisine: 'Mexican' },
  { file: 'seed/es/tres-leches.webp',      name: 'Pastel de Tres Leches',         description: 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas',     category: 'Desserts',   cuisine: 'Mexican' },
  { file: 'seed/es/brownie.webp',          name: 'Brownie con Helado',            description: 'Brownie de chocolate caliente con helado de vainilla y salsa de chocolate',          category: 'Desserts',   cuisine: 'Mexican' },
  { file: 'seed/es/helado.webp',           name: 'Helado Artesanal',              description: 'Dos bolas de helado artesanal: vainilla, chocolate, fresa o mango',                  category: 'Desserts',   cuisine: 'Mexican' },
  { file: 'seed/es/pay-queso.webp',        name: 'Pay de Queso',                  description: 'Pay de queso estilo New York con base de galleta y mermelada de frutos rojos',       category: 'Desserts',   cuisine: 'Mexican' },
];

const EN_IMAGES = [
  // Breakfast
  { file: 'seed/en/pancakes.webp',         name: 'Golden Pancakes',               description: 'Fluffy buttermilk pancakes with maple syrup, butter, and fresh berries',             category: 'Breakfast',  cuisine: 'American' },
  { file: 'seed/en/eggs-benedict.webp',    name: 'Eggs Benedict',                 description: 'Poached eggs on English muffins with Canadian bacon and hollandaise sauce',           category: 'Breakfast',  cuisine: 'American' },
  { file: 'seed/en/french-toast.webp',     name: 'French Toast',                  description: 'Thick-cut brioche dipped in vanilla-cinnamon batter, dusted with powdered sugar',    category: 'Breakfast',  cuisine: 'American' },
  { file: 'seed/en/omelette.webp',         name: 'Western Omelette',              description: 'Three-egg omelette filled with ham, bell peppers, onions, and melted cheddar',      category: 'Breakfast',  cuisine: 'American' },
  { file: 'seed/en/waffles.webp',          name: 'Belgian Waffles',               description: 'Crispy Belgian waffles topped with whipped cream, strawberries, and maple syrup',   category: 'Breakfast',  cuisine: 'American' },
  { file: 'seed/en/avocado-toast.webp',    name: 'Avocado Toast',                 description: 'Sourdough toast with smashed avocado, cherry tomatoes, feta, and a poached egg',    category: 'Breakfast',  cuisine: 'American' },
  // Lunch
  { file: 'seed/en/burger.webp',           name: 'Classic Burger',                description: 'Half-pound Angus beef patty, lettuce, tomato, caramelized onions, cheddar',         category: 'Burgers',    cuisine: 'American' },
  { file: 'seed/en/caesar-salad.webp',     name: 'Caesar Salad',                  description: 'Crisp romaine, shaved parmesan, garlic croutons, and house-made Caesar dressing',   category: 'Salads',     cuisine: 'American' },
  { file: 'seed/en/club-sandwich.webp',    name: 'Club Sandwich',                 description: 'Triple-decker with turkey, bacon, lettuce, tomato, and mayo, served with fries',    category: 'Sandwiches', cuisine: 'American' },
  { file: 'seed/en/grilled-chicken.webp',  name: 'Grilled Chicken Plate',         description: 'Herb-marinated chicken breast with rice, grilled vegetables, and chimichurri',      category: 'Dinner',     cuisine: 'American' },
  { file: 'seed/en/fish-tacos.webp',       name: 'Fish Tacos',                    description: 'Three battered fish tacos with cabbage slaw, pico de gallo, and chipotle crema',   category: 'Tacos',      cuisine: 'Mexican' },
  { file: 'seed/en/pasta.webp',            name: 'Pasta Alfredo',                 description: 'Fettuccine in creamy parmesan alfredo sauce, served with garlic bread',             category: 'Pasta',      cuisine: 'Italian' },
  // Dinner
  { file: 'seed/en/steak.webp',            name: 'Grilled Ribeye Steak',          description: '12oz ribeye grilled to perfection with mashed potatoes, asparagus, and red wine jus', category: 'Dinner',   cuisine: 'American' },
  { file: 'seed/en/salmon.webp',           name: 'Pan-Seared Salmon',             description: 'Atlantic salmon fillet with lemon-dill sauce, quinoa, and roasted vegetables',      category: 'Dinner',     cuisine: 'American' },
  { file: 'seed/en/ribs.webp',             name: 'Baby Back Ribs',                description: 'Slow-smoked pork ribs glazed with house BBQ sauce, coleslaw and cornbread',        category: 'Dinner',     cuisine: 'American' },
  { file: 'seed/en/lobster.webp',          name: 'Lobster Tail',                  description: 'Butter-poached lobster tail with drawn butter, roasted potatoes, and asparagus',    category: 'Dinner',     cuisine: 'American' },
  { file: 'seed/en/pizza.webp',            name: 'Margherita Pizza',              description: 'Wood-fired crust, San Marzano tomato sauce, fresh mozzarella, and basil',          category: 'Pizza',      cuisine: 'Italian' },
  { file: 'seed/en/shrimp.webp',           name: 'Garlic Shrimp',                 description: 'Jumbo shrimp in garlic butter sauce with white wine, served over linguine',         category: 'Dinner',     cuisine: 'American' },
  // Appetizers
  { file: 'seed/en/wings.webp',            name: 'Buffalo Wings',                 description: 'Crispy chicken wings tossed in buffalo sauce, served with celery and ranch dip',   category: 'Appetizers', cuisine: 'American' },
  { file: 'seed/en/nachos.webp',           name: 'Loaded Nachos',                 description: 'Tortilla chips topped with melted cheese, jalapeños, guacamole, sour cream',       category: 'Appetizers', cuisine: 'Mexican' },
  { file: 'seed/en/spring-rolls.webp',     name: 'Spring Rolls',                  description: 'Crispy vegetable spring rolls served with sweet chili dipping sauce',               category: 'Appetizers', cuisine: 'Chinese' },
  { file: 'seed/en/sliders.webp',          name: 'Beef Sliders',                  description: 'Three mini Angus beef burgers with pickle, cheddar, and special sauce',             category: 'Burgers',    cuisine: 'American' },
  { file: 'seed/en/calamari.webp',         name: 'Fried Calamari',                description: 'Lightly breaded calamari rings served with marinara and lemon aioli',               category: 'Appetizers', cuisine: 'Italian' },
  { file: 'seed/en/onion-rings.webp',      name: 'Onion Rings',                   description: 'Thick-cut beer-battered onion rings with chipotle dipping sauce',                   category: 'Appetizers', cuisine: 'American' },
  // Beverages
  { file: 'seed/en/lemonade.webp',         name: 'Fresh Lemonade',                description: 'Hand-squeezed lemonade with fresh mint and ice',                                   category: 'Beverages',  cuisine: 'American' },
  { file: 'seed/en/coffee.webp',           name: 'Gourmet Coffee',                description: 'Single-origin medium roast coffee served hot or iced',                             category: 'Hot drinks', cuisine: 'American' },
  { file: 'seed/en/smoothie.webp',         name: 'Tropical Smoothie',             description: 'Mango, pineapple, banana, and coconut milk blended smooth',                        category: 'Beverages',  cuisine: 'American' },
  { file: 'seed/en/water.webp',            name: 'Sparkling Mineral Water',        description: 'Sparkling mineral water, 500ml bottle, served chilled with a lemon slice',        category: 'Beverages',  cuisine: 'American' },
  // Cocktails
  { file: 'seed/en/margarita.webp',        name: 'Classic Margarita',             description: 'Premium tequila, Cointreau, fresh lime juice, and a salted rim',                   category: 'Cocktails',  cuisine: 'Mexican' },
  { file: 'seed/en/beer.webp',             name: 'Craft Beer',                    description: 'Selection of local craft beers, cold and refreshing with a thick foam head',       category: 'Cocktails',  cuisine: 'American' },
  { file: 'seed/en/whiskey.webp',          name: 'Whiskey Sour',                  description: 'Bourbon, fresh lemon juice, simple syrup, and a dash of bitters, on the rocks',   category: 'Cocktails',  cuisine: 'American' },
  { file: 'seed/en/mojito.webp',           name: 'Mojito',                        description: 'White rum, fresh muddled mint, lime juice, sugar, and soda water with ice',       category: 'Cocktails',  cuisine: 'American' },
  { file: 'seed/en/wine.webp',             name: 'Glass of Red Wine',             description: 'Full-bodied Cabernet Sauvignon poured in a large wine glass',                      category: 'Cocktails',  cuisine: 'American' },
  // Desserts
  { file: 'seed/en/cheesecake.webp',       name: 'New York Cheesecake',           description: 'Creamy cheesecake on a graham cracker crust with fresh berry compote',             category: 'Desserts',   cuisine: 'American' },
  { file: 'seed/en/brownie.webp',          name: 'Chocolate Brownie Sundae',      description: 'Warm fudge brownie topped with vanilla ice cream, chocolate sauce, whipped cream', category: 'Desserts',   cuisine: 'American' },
  { file: 'seed/en/tiramisu.webp',         name: 'Tiramisu',                      description: 'Espresso-soaked ladyfingers layered with mascarpone cream and cocoa powder',       category: 'Desserts',   cuisine: 'Italian' },
  { file: 'seed/en/creme-brulee.webp',     name: 'Crème Brûlée',                  description: 'Classic French vanilla custard with a caramelized sugar crust, torched tableside', category: 'Desserts',  cuisine: 'French' },
  { file: 'seed/en/ice-cream.webp',        name: 'Artisan Ice Cream',             description: 'Two scoops of house-made ice cream: vanilla, chocolate, strawberry, or mango',    category: 'Desserts',   cuisine: 'American' },
  { file: 'seed/en/apple-pie.webp',        name: 'Apple Pie à la Mode',           description: 'Warm spiced apple pie served with vanilla ice cream and caramel drizzle',          category: 'Desserts',   cuisine: 'American' },
];

const ALL_IMAGES = [...ES_IMAGES, ...EN_IMAGES];

// ─── DRINK CATEGORIES (no cuisine context, always in glassware) ───────────────
const DRINK_CATEGORIES = new Set(['Beverages', 'Hot drinks', 'Cocktails']);

// ─── CONTAINER — what the food/drink is served IN or ON ──────────────────────
// This is the #1 fix for the "pan/skillet" problem. Always specify the vessel first.

function getContainer(name, category) {
  const lower = name.toLowerCase();

  // ── Cocktails & Alcoholic drinks ──
  if (/margarita/.test(lower)) return 'a classic margarita glass with a salted rim, filled with frozen or on-the-rocks margarita, lime wedge on the rim';
  if (/cerveza|beer|craft beer/.test(lower)) return 'a cold frosted pint glass of beer with a creamy foam head';
  if (/mezcal/.test(lower)) return 'a traditional clay copita (small clay cup) with a slice of orange and sal de gusano beside it on a small ceramic dish';
  if (/mojito/.test(lower)) return 'a tall highball glass filled with ice, fresh mint, lime, and soda water with a straw';
  if (/wine|vino/.test(lower)) return 'a large elegant wine glass with deep red wine';
  if (/whiskey|bourbon|sour|old fashioned|manhattan/.test(lower)) return 'a thick-walled whiskey rocks glass with a large clear ice cube';
  if (/cocktail|martini|cosmopolitan/.test(lower)) return 'an elegant cocktail glass';

  // ── Non-alcoholic cold beverages ──
  if (/limonada|lemonade/.test(lower)) return 'a tall highball glass filled with ice, lemonade, fresh mint sprigs, and a lemon slice on the rim';
  if (/horchata/.test(lower)) return 'a tall glass with ice filled with creamy white horchata, a cinnamon stick on the rim';
  if (/smoothie/.test(lower)) return 'a tall frosted glass filled with colorful tropical smoothie, a straw and fruit garnish on the rim';
  if (/water|agua mineral/.test(lower)) return 'a clear glass bottle of mineral water with condensation droplets and a lemon slice beside it';
  if (/jugo|juice|naranja/.test(lower)) return 'a chilled glass filled with freshly squeezed bright orange juice';

  // ── Hot drinks ──
  if (/café|coffee|espresso|latte|cappuccino|olla/.test(lower)) return 'a beautiful ceramic coffee mug or clay pot (for café de olla), steam gently rising from the top';
  if (/tea|té/.test(lower)) return 'a glass or ceramic mug with tea, steam rising';
  if (/hot chocolate|chocolate caliente/.test(lower)) return 'a large ceramic mug filled with hot chocolate, topped with whipped cream';

  // ── Burgers ──
  if (/burger|hamburguesa/.test(lower)) return 'a round ceramic plate or wooden board';

  // ── Tacos ──
  if (/taco/.test(lower)) return 'a traditional ceramic plate or oval serving tray';

  // ── Pizza ──
  if (/pizza/.test(lower)) return 'a round wooden pizza board';

  // ── Pasta ──
  if (/pasta|fettuccine|alfredo|spaghetti|linguine/.test(lower)) return 'a wide, shallow white ceramic pasta bowl';

  // ── Salads ──
  if (/salad|ensalada|césar|caesar/.test(lower)) return 'a wide ceramic salad bowl or large flat plate';

  // ── Soups ──
  if (/sopa|soup|chowder|bisque/.test(lower)) return 'a deep ceramic bowl';

  // ── Breakfast plates ──
  if (/pancake|hotcake|waffle|french toast|omelette|huevo|egg|benedict|avena|avocado toast|molletes|chilaquil/.test(lower)) return 'a round white ceramic breakfast plate';

  // ── Chicken / Meat plates ──
  if (/pollo|chicken|steak|filete|salmon|rib|lobster|shrimp|camarón|enchilada/.test(lower)) return 'a warm white ceramic dinner plate';

  // ── Appetizers ──
  if (/guacamole/.test(lower)) return 'a traditional molcajete (stone mortar bowl) or small ceramic bowl, with tortilla chips arranged around it';
  if (/nacho/.test(lower)) return 'a large oval ceramic sharing plate';
  if (/empanada/.test(lower)) return 'a small ceramic plate or rustic wooden board';
  if (/aro|onion ring/.test(lower)) return 'a ceramic plate lined with parchment paper, with a dipping sauce cup beside it';
  if (/alita|wing/.test(lower)) return 'a ceramic sharing plate lined with parchment';
  if (/calamari/.test(lower)) return 'a ceramic plate with marinara sauce in a small cup beside it';
  if (/slider/.test(lower)) return 'a small wooden board or slate serving plate';
  if (/spring roll/.test(lower)) return 'a rectangular ceramic plate with sweet chili sauce in a small bowl';

  // ── Desserts ──
  if (/helado|ice cream/.test(lower)) return 'a chilled ceramic bowl or glass coupe';
  if (/brownie|sundae/.test(lower)) return 'a white ceramic plate or deep glass bowl';
  if (/churro/.test(lower)) return 'a long rectangular ceramic plate, with a small cup of chocolate sauce beside it';
  if (/flan/.test(lower)) return 'a small ceramic ramekin or plate, inverted with caramel sauce pooling around it';
  if (/tres leches|three leche/.test(lower)) return 'a ceramic plate';
  if (/tiramisu/.test(lower)) return 'a rectangular glass dish or ceramic ramekin';
  if (/crème brûlée|creme brulee/.test(lower)) return 'a classic white oval ceramic ramekin with caramelized sugar top';
  if (/cheesecake|pay de queso/.test(lower)) return 'a white ceramic dessert plate';
  if (/apple pie|pie/.test(lower)) return 'a ceramic dessert plate';

  // Generic fallback by category
  if (DRINK_CATEGORIES.has(category)) return 'an appropriate glass or cup';
  return 'a white ceramic plate';
}

// ─── SURFACE — what the vessel sits ON ───────────────────────────────────────

function getSurface(category) {
  const s = {
    Beverages:    'a polished dark granite bar counter, water droplets scattered nearby. NO plates, NO food around it.',
    'Hot drinks': 'a warm light oak wood table surface, soft morning light. A small saucer underneath.',
    Cocktails:    'a sleek dark marble bar counter. One cocktail napkin folded beside it. Moody ambient bar lighting.',
    Burgers:      'a dark slate stone surface or rustic wooden board. Deep matte charcoal background.',
    Chicken:      'a warm white ceramic dinner plate on a dark slate surface.',
    Pizza:        'a worn rustic wooden pizza board on a rough stone surface. Dark warm background.',
    Tacos:        'a warm terracotta surface with a small woven cloth underneath. Earthy natural tones.',
    Desserts:     'a white marble surface with soft gray veining. Elegant minimal background.',
    Salads:       'a clean white marble surface, bright natural daylight look.',
    Soups:        'a dark slate or matte ceramic tile surface. Moody, warm tones.',
    Pasta:        'a white linen cloth on a wooden restaurant table. Warm ambient light.',
    Breakfast:    'a light oak wood breakfast table. Warm, soft morning light atmosphere.',
    Dinner:       'a polished dark slate restaurant surface. Deep charcoal background.',
    Appetizers:   'a rustic wooden serving board or dark ceramic tile. Casual restaurant feel.',
    Sandwiches:   'a rustic wooden board. Warm natural background.',
    Tacos:        'a warm terracotta surface. Earthy natural tones.',
    Burgers:      'a dark slate stone surface or rustic wooden board. Deep charcoal background.',
  };
  return s[category] ?? 'a clean dark matte surface. Restaurant table setting.';
}

// ─── ANGLE PER CATEGORY ───────────────────────────────────────────────────────

function getAngle(category) {
  const a = {
    Beverages:    '20-degree tilt showing the full glass profile, condensation, and liquid level',
    'Hot drinks': '22-degree tilt showing the cup rim, steam curling up, and latte art if present',
    Cocktails:    '20-degree tilt showing the glass silhouette and garnish against the background',
    Burgers:      '38-degree hero angle — every burger layer clearly visible from patty to bun',
    Tacos:        '28-degree angle — 2-3 tacos arranged naturally, filling spilling slightly, toppings visible',
    Pizza:        'overhead flat-lay — full round pizza visible, one slice lifted slightly to show cheese pull',
    Pasta:        '40-degree angle — bowl depth, sauce coating, garnish visible',
    Salads:       'overhead flat-lay — all colorful ingredients visible and arranged beautifully',
    Soups:        'overhead flat-lay — bowl centered, garnish floating, steam rising',
    Desserts:     '45-degree angle — shows every layer, drizzle, and topping in detail',
    Breakfast:    '50-degree overhead — full plate visible, vibrant colors',
    Dinner:       '38-degree hero angle — protein, sides, and sauce all clearly visible',
    Appetizers:   '35-degree angle — shows texture, crispness, and dipping sauce',
    Sandwiches:   '35-degree angle — cross-section visible showing all fillings',
  };
  return a[category] ?? '38-degree hero angle';
}

// ─── FOOD STYLING PER ITEM ────────────────────────────────────────────────────

function getStyling(name, description, category) {
  const lower = (name + ' ' + description).toLowerCase();

  if (DRINK_CATEGORIES.has(category)) {
    if (/margarita/.test(lower)) return 'Salt rim perfectly applied on half the glass. Lime wedge squeezed on the rim. Ice visible through glass. Drink color vibrant lime-green.';
    if (/beer|cerveza/.test(lower)) return 'Thick creamy foam head, condensation droplets on the cold glass, golden amber color glowing through the glass.';
    if (/mezcal/.test(lower)) return 'Clear or amber mezcal visible in the clay copita. Orange slice bright and fresh. Sal de gusano in a tiny separate dish.';
    if (/mojito/.test(lower)) return 'Fresh mint leaves pressed against the inside of the glass. Lime wedge. Ice cubes perfectly clear. Bubbles from soda rising.';
    if (/wine|vino/.test(lower)) return 'Deep ruby-red wine with legs running down the glass. Beautiful bokeh background.';
    if (/whiskey|bourbon/.test(lower)) return 'Amber whiskey with a perfectly clear large ice cube. Slight condensation. Orange peel twist garnish.';
    if (/limonada|lemonade/.test(lower)) return 'Vibrant yellow lemonade with fresh mint, ice cubes, lemon slice on rim. Condensation droplets on the cold glass.';
    if (/horchata/.test(lower)) return 'Creamy white horchata with a cinnamon stick. Ice visible. Slight cinnamon powder dusted on top.';
    if (/smoothie/.test(lower)) return 'Thick, vibrant tropical smoothie. Fresh fruit garnish on the rim. Straw inserted at a natural angle.';
    if (/juice|jugo/.test(lower)) return 'Bright vibrant orange color, freshly squeezed look. Small pulp particles visible. Slice of orange on rim.';
    if (/coffee|café|espresso/.test(lower)) return 'Perfect latte art or rosette on top. Steam rising delicately from the cup. Crema golden-brown and smooth.';
    if (/water/.test(lower)) return 'Clear sparkling water in the bottle, condensation droplets on the glass, one lemon slice beside it on the counter.';
    return 'Drink looks fresh, vibrant, and perfectly prepared. Garnish precisely placed. Condensation on the glass.';
  }

  if (/burger|hamburguesa/.test(lower)) return 'Burger cross-section perfectly visible: brioche bun sesame seeds sharp, patty with deep Maillard crust, cheese melting in golden ribbons, fresh lettuce and red tomato. One small sauce drip at the side.';
  if (/taco/.test(lower)) return 'Taco filling overflowing naturally — protein, vibrant salsa, fresh cilantro, white onion. Lime wedge with one drop of juice. Slight char marks on tortilla.';
  if (/pizza/.test(lower)) return 'One slice being lifted — mozzarella cheese stretching in long glossy strands. Crust golden-brown with charred bubbles. Fresh basil leaf bright green.';
  if (/pasta|alfredo|fettuccine/.test(lower)) return 'Pasta twisted into a natural nest. Sauce coating every strand, glistening. Fresh basil leaf. Parmigiano shavings catching the light. Steam rising.';
  if (/salmon|steak|filete|ribeye/.test(lower)) return 'Perfect sear marks on the protein. Golden-brown Maillard crust. Sauce artfully drizzled. Steam rising. Sides arranged beautifully on the plate.';
  if (/chicken|pollo/.test(lower)) return 'Golden-brown crispy exterior with char marks. Sauce glistening. Fresh herb garnish. Steam rising from the hot dish.';
  if (/ribs/.test(lower)) return 'Ribs glazed with sticky BBQ sauce catching the light. Slight caramelization on the surface. Coleslaw on the side vibrant and fresh.';
  if (/lobster|shrimp|camarón/.test(lower)) return 'Seafood perfectly cooked, glistening with butter. Lemon wedge bright yellow. Steam rising from the hot dish.';
  if (/enchilada/.test(lower)) return 'Sauce generously coating, queso fresco crumbled on top, crema drizzled in a natural pattern, cilantro bright green. Steam rising.';
  if (/chilaquil/.test(lower)) return 'Totopos visible through the green salsa, queso fresco crumbled, crema drizzled, red onion rings, egg yolk bright orange on top.';
  if (/guacamole/.test(lower)) return 'Chunky fresh guacamole, diced tomato, cilantro, lime visible. Tortilla chips arranged around the bowl, slightly salty.';
  if (/nacho/.test(lower)) return 'Cheese melted and pulling between chips. Jalapeño slices bright green. Guacamole bright green. Pico de gallo vibrant red-tomato.';
  if (/alita|wing/.test(lower)) return 'Crispy wings with sauce glazing glistening. Steam rising. Ranch dip in a small cup. Celery stick bright green.';
  if (/ice cream|helado/.test(lower)) return 'Ice cream scoops perfectly rounded, glistening. Sauce dripping naturally down sides. Slight condensation on the cold bowl.';
  if (/brownie/.test(lower)) return 'Warm brownie with cracked top, ice cream melting slightly over it. Chocolate sauce dripping. Whipped cream perfectly swirled.';
  if (/churro/.test(lower)) return 'Churros golden-brown, sugar and cinnamon visibly dusted. Chocolate sauce in the small cup dark and glossy. Steam rising.';
  if (/flan/.test(lower)) return 'Flan perfectly smooth with golden caramel sauce pooling around the base after being inverted onto the plate.';
  if (/pancake|hotcake/.test(lower)) return 'Pancakes stacked with butter melting on top, maple syrup dripping naturally down the sides. Fresh berries bright and colorful.';
  if (/waffle/.test(lower)) return 'Deep golden waffle squares with whipped cream, fresh strawberries, and maple syrup in the grid pockets.';
  if (/french toast/.test(lower)) return 'Golden french toast with caramelized edges, powdered sugar dusted, maple syrup pooling around the base.';
  if (/omelette/.test(lower)) return 'Omelette perfectly folded, golden exterior, cheese and filling visible from the open end. Steam rising.';
  if (/salad|ensalada/.test(lower)) return 'Greens crisp and vibrant. Dressing glistening on leaves. Parmesan shavings catching light. Croutons golden-brown.';
  if (/sopa|soup/.test(lower)) return 'Steam rising from the bowl. Garnish floating on top. Toppings (crema, queso, tortilla strips) clearly visible.';

  return 'Food looks fresh, appetizing, and perfectly prepared. Natural textures and colors. Steam rising if hot. Professional restaurant presentation.';
}

// ─── CUISINE CONTEXT (only for food, not drinks) ─────────────────────────────

const cuisineCtxMap = {
  Mexican:   'Authentic Mexican restaurant presentation. Traditional ceramic or clay serveware. Warm earthy terracotta tones. Fresh cilantro, lime, and salsa as natural garnishes.',
  Colombian: 'Colorful traditional Colombian presentation. Rustic earthenware. Hogao sauce, fresh herbs visible.',
  Argentine: 'Argentine steakhouse presentation. Rustic, generous portions. Chimichurri sauce on the side.',
  Italian:   'Italian restaurant presentation. White ceramic. Fresh basil, olive oil drizzle, Parmigiano shavings.',
  American:  'Classic American diner or restaurant presentation. Generous portions. Clean white or dark ceramic.',
  Chinese:   'Traditional Chinese presentation. Blue-and-white porcelain. Dipping sauce in small bowl.',
  French:    'Classic French bistro presentation. Elegant white ceramic. Minimalist, refined plating.',
};

// ─── BUILD PROMPT ─────────────────────────────────────────────────────────────

function buildPrompt(item) {
  const { name, description, category, cuisine } = item;

  const isDrink = DRINK_CATEGORIES.has(category);
  const container = getContainer(name, category);
  const surface = getSurface(category);
  const angle = getAngle(category);
  const styling = getStyling(name, description, category);
  const cuisineCtx = isDrink ? '' : (cuisineCtxMap[cuisine] ?? '');

  return `Hyperrealistic food photography RAW photograph. Shot in a real restaurant or food photography studio. Indistinguishable from an actual photograph taken with a professional DSLR camera. NOT CGI, NOT 3D render, NOT illustration, NOT painting, NOT Pixar, NOT animation, NOT AI art.

SERVED IN/ON: ${container}.

SUBJECT: "${name}" — ${description}.
${cuisineCtx ? `PRESENTATION STYLE: ${cuisineCtx}` : ''}
FOOD/DRINK STYLING: ${styling}

CAMERA: 50mm or 85mm prime lens, f/2.8 aperture, ISO 400, slight natural grain visible — this is a REAL photo, not a render.
ANGLE: Camera at ${angle}.
COMPOSITION: Square 1:1 frame. Subject centered, filling approximately 65-70% of frame. Equal breathing room on all sides.

SURFACE & SETTING: ${surface}

LIGHTING: Professional three-point soft lighting — large octabox softbox from the left, silver reflector fill from the right, subtle warm backlight creating natural rim separation. Food appears to glow naturally, not over-lit.

REALISM (critical):
- This is a REAL photograph taken in a real studio — show natural, authentic food
- Natural imperfections make it look real: condensation on cold drinks, slight caramelization, natural sauce drips
- NO plastic-looking textures, NO artificial CGI glow, NO over-processed digital sheen
- NO pans, skillets, woks, or cooking equipment unless the item is traditionally served in one (like a molcajete or hot skillet appetizer)
${isDrink ? '- Beverage MUST be shown in proper glassware (glass, mug, cup, or bottle) — NEVER on a plate or flat surface alone' : '- Food MUST be shown as served to a customer at a restaurant table — plated and ready to eat'}
- NO text, watermarks, logos, or human hands visible
- Natural film grain and DSLR sharpness — the imperfect realism of a real photograph`;
}

// ─── IMAGE GENERATION (gemini-3-pro-image-preview = nano banana) ──────────────

async function generateImage(prompt) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Primary: gemini-3-pro-image-preview (nano banana — most photorealistic)
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '1:1' },
      },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) return Buffer.from(part.inlineData.data, 'base64');
    }
    throw new Error('No image in gemini-3-pro response');
  } catch (proErr) {
    // Fallback: imagen-4.0-generate-001
    process.stdout.write(` [fallback-imagen4]`);
    try {
      const ai2 = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const imagenResp = await ai2.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: { numberOfImages: 1, aspectRatio: '1:1' },
      });
      const bytes = imagenResp.generatedImages?.[0]?.image?.imageBytes;
      if (bytes) return Buffer.from(bytes, 'base64');
      throw new Error('No bytes from Imagen 4');
    } catch {
      // Last fallback: gemini-2.5-flash-image (old SDK)
      process.stdout.write(` [fallback-flash]`);
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-image',
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      });
      const result = await model.generateContent(prompt);
      const parts = result.response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) return Buffer.from(part.inlineData.data, 'base64');
      }
      throw new Error('All models failed');
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── DEMO DATA URL UPDATER ────────────────────────────────────────────────────

const ES_URL_MAP = {
  'photo-1534352956036': '/seed/es/chilaquiles.webp',
  'photo-1525351484163': '/seed/es/huevos-rancheros.webp',
  'photo-1567620905732': '/seed/es/hotcakes.webp',
  'photo-1528735602780': '/seed/es/molletes.webp',
  'photo-1510693206972': '/seed/es/omelette.webp',
  'photo-1517673400267': '/seed/es/avena.webp',
  'photo-1568901346375': '/seed/es/hamburguesa.webp',
  'photo-1532550907401': '/seed/es/pollo.webp',
  'photo-1546793665':    '/seed/es/ensalada.webp',
  'photo-1551504734':    '/seed/es/tacos.webp',
  'photo-1645112411341': '/seed/es/pasta.webp',
  'photo-1467003909585': '/seed/es/salmon.webp',
  'photo-1574071318508': '/seed/es/pizza.webp',
  'photo-1600891964092': '/seed/es/filete.webp',
  'photo-1547592166':    '/seed/es/sopa.webp',
  'photo-1618040996337': '/seed/es/tacos.webp',
  'photo-1615870216519': '/seed/es/guacamole.webp',
  'photo-1535399831218': '/seed/es/ensalada.webp',
  'photo-1513456852971': '/seed/es/nachos.webp',
  'photo-1601924582970': '/seed/es/empanadas.webp',
  'photo-1639024471283': '/seed/es/aros-cebolla.webp',
  'photo-1527477396000': '/seed/es/alitas.webp',
  'photo-1621263764928': '/seed/es/limonada.webp',
  'photo-1495474472287': '/seed/es/cafe.webp',
  'photo-1541658016709': '/seed/es/horchata.webp',
  'photo-1622597467836': '/seed/es/jugo.webp',
  'photo-1581636625402': '/seed/es/limonada.webp',
  'photo-1548839140':    '/seed/es/limonada.webp',
  'photo-1556855810':    '/seed/es/margarita.webp',
  'photo-1535958636474': '/seed/es/cerveza.webp',
  'photo-1569529465841': '/seed/es/mezcal.webp',
  'photo-1551538827':    '/seed/es/mojito.webp',
  'photo-1510812431401': '/seed/es/cerveza.webp',
  'photo-1513558161293': '/seed/es/cerveza.webp',
  'photo-1528975604071': '/seed/es/flan.webp',
  'photo-1481391319762': '/seed/es/churros.webp',
  'photo-1464305795204': '/seed/es/tres-leches.webp',
  'photo-1563805042':    '/seed/es/brownie.webp',
  'photo-1501443762994': '/seed/es/helado.webp',
  'photo-1533134242443': '/seed/es/pay-queso.webp',
};

const EN_OVERRIDES = {
  'photo-1567620905732': '/seed/en/pancakes.webp',
  'photo-1568901346375': '/seed/en/burger.webp',
  'photo-1546793665':    '/seed/en/caesar-salad.webp',
  'photo-1528735602780': '/seed/en/club-sandwich.webp',
  'photo-1532550907401': '/seed/en/grilled-chicken.webp',
  'photo-1645112411341': '/seed/en/pasta.webp',
  'photo-1467003909585': '/seed/en/salmon.webp',
  'photo-1600891964092': '/seed/en/steak.webp',
  'photo-1510693206972': '/seed/en/omelette.webp',
  'photo-1513456852971': '/seed/en/nachos.webp',
  'photo-1535399831218': '/seed/en/shrimp.webp',
  'photo-1621263764928': '/seed/en/lemonade.webp',
  'photo-1622597467836': '/seed/en/smoothie.webp',
  'photo-1548839140':    '/seed/en/water.webp',
  'photo-1556855810':    '/seed/en/margarita.webp',
  'photo-1535958636474': '/seed/en/beer.webp',
  'photo-1551538827':    '/seed/en/mojito.webp',
  'photo-1510812431401': '/seed/en/wine.webp',
  'photo-1533134242443': '/seed/en/cheesecake.webp',
  'photo-1563805042':    '/seed/en/brownie.webp',
  'photo-1495474472287': '/seed/en/coffee.webp',
  'photo-1569529465841': '/seed/en/whiskey.webp',
  'photo-1577973354094': '/seed/en/eggs-benedict.webp',
  'photo-1484723091739': '/seed/en/french-toast.webp',
  'photo-1580217593608': '/seed/en/fish-tacos.webp',
  'photo-1574484284002': '/seed/en/ribs.webp',
  'photo-1559737558':    '/seed/en/lobster.webp',
  'photo-1632778149955': '/seed/en/ribs.webp',
  'photo-1476124369491': '/seed/en/pasta.webp',
  'photo-1567620832903': '/seed/en/wings.webp',
  'photo-1599487488170': '/seed/en/calamari.webp',
  'photo-1572695157366': '/seed/en/spring-rolls.webp',
  'photo-1756478629551': '/seed/en/spring-rolls.webp',
  'photo-1461023058943': '/seed/en/coffee.webp',
  'photo-1542990253':    '/seed/en/coffee.webp',
  'photo-1571877227200': '/seed/en/tiramisu.webp',
  'photo-1470124182917': '/seed/en/creme-brulee.webp',
  'photo-1598110750624': '/seed/en/cheesecake.webp',
  'photo-1626700051175': '/seed/en/omelette.webp',
  'photo-1600271886742': '/seed/en/lemonade.webp',
};

function replaceUnsplashUrls(content, urlMap) {
  return content.replace(
    /https:\/\/images\.unsplash\.com\/photo-([A-Za-z0-9_-]+)\?[^'"]*/g,
    (fullUrl) => {
      const key = Object.keys(urlMap).find(k => fullUrl.includes(k));
      return key ? urlMap[key] : fullUrl;
    }
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 generate-seed-images v2 — gemini-3-pro-image-preview (nano banana)');
  console.log(`📦 Total: ${ALL_IMAGES.length} images\n`);

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < ALL_IMAGES.length; i++) {
    const item = ALL_IMAGES[i];
    const outPath = join(ROOT, 'public', item.file);

    process.stdout.write(`[${String(i + 1).padStart(2)}/${ALL_IMAGES.length}] ${item.name}...`);

    try {
      const prompt = buildPrompt(item);
      const buf = await generateImage(prompt);
      writeFileSync(outPath, buf);
      generated++;
      console.log(' ✅');
    } catch (err) {
      failed++;
      console.log(` ❌ ${err.message}`);
    }

    if (i < ALL_IMAGES.length - 1) await sleep(2500);
  }

  console.log(`\n✅ Generated: ${generated} | ❌ Failed: ${failed}`);

  // Update demo TypeScript files
  console.log('\n📝 Updating demo-data.ts...');
  const esPath = join(ROOT, 'src', 'lib', 'demo-data.ts');
  writeFileSync(esPath, replaceUnsplashUrls(readFileSync(esPath, 'utf-8'), { ...EN_OVERRIDES, ...ES_URL_MAP }), 'utf-8');
  console.log('   ✅ demo-data.ts');

  console.log('📝 Updating demo-data-en.ts...');
  const enPath = join(ROOT, 'src', 'lib', 'demo-data-en.ts');
  const enMap = { ...ES_URL_MAP, ...EN_OVERRIDES };
  writeFileSync(enPath, replaceUnsplashUrls(readFileSync(enPath, 'utf-8'), enMap), 'utf-8');
  console.log('   ✅ demo-data-en.ts');

  console.log('\n🎉 Done! git add -A && git commit -m "feat: regenerate seed images v2" && git push');
}

main().catch(err => { console.error(err); process.exit(1); });
