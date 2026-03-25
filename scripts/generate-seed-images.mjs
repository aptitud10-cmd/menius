/**
 * generate-seed-images.mjs
 * Regenerates all seed and demo product images using Google Imagen 4.
 * Requires GEMINI_API_KEY environment variable.
 *
 * Usage:
 *   node scripts/generate-seed-images.mjs
 *
 * What it does:
 *   1. Generates 74 unique food images (ES + EN) using Imagen 4 with professional
 *      McDonald's/KFC level food photography prompts
 *   2. Saves them as .webp files to /public/seed/es/ and /public/seed/en/
 *   3. Updates src/lib/demo-data.ts and src/lib/demo-data-en.ts to use
 *      the local /seed/ paths instead of Unsplash URLs
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY environment variable.');
  console.error('   Run: $env:GEMINI_API_KEY="your-key" ; node scripts/generate-seed-images.mjs');
  process.exit(1);
}

// ─── PRODUCT DEFINITIONS ──────────────────────────────────────────────────────
// Each entry: { file, name, description, category, cuisine }
// file = path relative to /public/

const ES_IMAGES = [
  // Desayunos
  { file: 'seed/es/chilaquiles.webp',     name: 'Chilaquiles Verdes',             description: 'Totopos bañados en salsa verde con crema, queso fresco, cebolla y huevo estrellado', category: 'Breakfast', cuisine: 'Mexican' },
  { file: 'seed/es/huevos-rancheros.webp',name: 'Huevos Rancheros',               description: 'Huevos estrellados sobre tortilla con salsa roja, frijoles refritos y aguacate', category: 'Breakfast', cuisine: 'Mexican' },
  { file: 'seed/es/hotcakes.webp',        name: 'Hot Cakes con Fruta',            description: 'Tres hot cakes esponjosos con miel de maple, mantequilla y fruta fresca', category: 'Breakfast', cuisine: 'Mexican' },
  { file: 'seed/es/molletes.webp',        name: 'Molletes Especiales',            description: 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate', category: 'Breakfast', cuisine: 'Mexican' },
  { file: 'seed/es/omelette.webp',        name: 'Omelette de Verduras',           description: 'Omelette relleno de champiñones, espinaca, pimiento y queso manchego', category: 'Breakfast', cuisine: 'Mexican' },
  { file: 'seed/es/avena.webp',           name: 'Avena con Frutas',               description: 'Avena caliente con leche, miel, granola, fresas y arándanos', category: 'Breakfast', cuisine: 'Mexican' },
  // Almuerzos
  { file: 'seed/es/hamburguesa.webp',     name: 'Hamburguesa Clásica',            description: 'Carne Angus 200g, queso cheddar, lechuga, tomate, cebolla caramelizada', category: 'Burgers', cuisine: 'American' },
  { file: 'seed/es/pollo.webp',           name: 'Pollo a la Plancha',             description: 'Pechuga marinada a la plancha con arroz, ensalada y vegetales de temporada', category: 'Chicken', cuisine: 'Mexican' },
  { file: 'seed/es/ensalada.webp',        name: 'Ensalada César',                 description: 'Lechuga romana, crutones, parmesano y aderezo césar casero', category: 'Salads', cuisine: 'Mexican' },
  { file: 'seed/es/tacos.webp',           name: 'Tacos al Pastor',                description: 'Tres tacos de cerdo adobado con piña, cilantro y cebolla, tortillas hechas a mano', category: 'Tacos', cuisine: 'Mexican' },
  { file: 'seed/es/pasta.webp',           name: 'Pasta Alfredo',                  description: 'Fettuccine en cremosa salsa alfredo con parmesano y pan de ajo', category: 'Pasta', cuisine: 'Italian' },
  // Cenas
  { file: 'seed/es/salmon.webp',          name: 'Salmón a la Parrilla',           description: 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas', category: 'Dinner', cuisine: 'Mexican' },
  { file: 'seed/es/pizza.webp',           name: 'Pizza Margherita',               description: 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca', category: 'Pizza', cuisine: 'Italian' },
  { file: 'seed/es/filete.webp',          name: 'Filete de Res',                  description: 'Corte grueso de res a la parrilla con puré de papa, espárragos y salsa de vino tinto', category: 'Dinner', cuisine: 'Argentine' },
  { file: 'seed/es/enchiladas.webp',      name: 'Enchiladas Suizas',              description: 'Tortillas rellenas de pollo bañadas en salsa verde con crema y queso gratinado', category: 'Dinner', cuisine: 'Mexican' },
  { file: 'seed/es/sopa.webp',            name: 'Sopa de Tortilla',               description: 'Caldo de jitomate con tiras de tortilla, aguacate, crema, queso y chile pasilla', category: 'Soups', cuisine: 'Mexican' },
  // Aperitivos
  { file: 'seed/es/guacamole.webp',       name: 'Guacamole con Totopos',          description: 'Guacamole fresco preparado al momento con aguacate, cilantro, cebolla y limón', category: 'Appetizers', cuisine: 'Mexican' },
  { file: 'seed/es/nachos.webp',          name: 'Nachos Supremos',                description: 'Totopos con queso fundido, jalapeños, crema, guacamole y pico de gallo', category: 'Appetizers', cuisine: 'Mexican' },
  { file: 'seed/es/empanadas.webp',       name: 'Empanadas de Queso',             description: 'Tres empanadas crujientes rellenas de queso con salsa ranchera', category: 'Appetizers', cuisine: 'Colombian' },
  { file: 'seed/es/aros-cebolla.webp',    name: 'Aros de Cebolla',               description: 'Aros de cebolla empanizados y crujientes con dip de chipotle', category: 'Appetizers', cuisine: 'American' },
  { file: 'seed/es/alitas.webp',          name: 'Alitas BBQ',                     description: 'Alitas de pollo bañadas en salsa barbecue, servidas con apio y aderezo ranch', category: 'Chicken', cuisine: 'American' },
  // Bebidas
  { file: 'seed/es/limonada.webp',        name: 'Limonada Natural',               description: 'Limonada recién exprimida con hierbabuena y hielo', category: 'Beverages', cuisine: 'Mexican' },
  { file: 'seed/es/cafe.webp',            name: 'Café de Olla',                   description: 'Café de grano con piloncillo y canela, estilo tradicional mexicano', category: 'Hot drinks', cuisine: 'Mexican' },
  { file: 'seed/es/horchata.webp',        name: 'Agua de Horchata',               description: 'Agua fresca de arroz con canela y un toque de vainilla', category: 'Beverages', cuisine: 'Mexican' },
  { file: 'seed/es/jugo.webp',            name: 'Jugo Natural de Naranja',        description: 'Jugo recién exprimido de naranja, zanahoria o verde', category: 'Beverages', cuisine: 'Mexican' },
  // Licores
  { file: 'seed/es/margarita.webp',       name: 'Margarita Clásica',              description: 'Tequila, triple sec, jugo de limón y sal en el borde, refrescante y vibrante', category: 'Drinks', cuisine: 'Mexican' },
  { file: 'seed/es/cerveza.webp',         name: 'Cerveza Artesanal',              description: 'Selección de cervezas artesanales locales, fría y espumosa', category: 'Drinks', cuisine: 'Mexican' },
  { file: 'seed/es/mezcal.webp',          name: 'Mezcal Oaxaqueño',               description: 'Mezcal joven artesanal servido con naranja y sal de gusano', category: 'Drinks', cuisine: 'Mexican' },
  { file: 'seed/es/mojito.webp',          name: 'Mojito',                         description: 'Ron blanco, hierbabuena fresca, limón, azúcar y soda', category: 'Drinks', cuisine: 'Mexican' },
  // Postres
  { file: 'seed/es/flan.webp',            name: 'Flan Napolitano',                description: 'Flan cremoso de vainilla con caramelo casero', category: 'Desserts', cuisine: 'Mexican' },
  { file: 'seed/es/churros.webp',         name: 'Churros con Chocolate',          description: 'Churros crujientes espolvoreados con azúcar y canela, con salsa de chocolate belga', category: 'Desserts', cuisine: 'Mexican' },
  { file: 'seed/es/tres-leches.webp',     name: 'Pastel de Tres Leches',          description: 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas', category: 'Desserts', cuisine: 'Mexican' },
  { file: 'seed/es/brownie.webp',         name: 'Brownie con Helado',             description: 'Brownie de chocolate caliente con helado de vainilla y salsa de chocolate', category: 'Desserts', cuisine: 'Mexican' },
  { file: 'seed/es/helado.webp',          name: 'Helado Artesanal',               description: 'Dos bolas de helado artesanal: vainilla, chocolate, fresa o mango', category: 'Desserts', cuisine: 'Mexican' },
  { file: 'seed/es/pay-queso.webp',       name: 'Pay de Queso',                   description: 'Pay de queso estilo New York con base de galleta y mermelada de frutos rojos', category: 'Desserts', cuisine: 'Mexican' },
];

const EN_IMAGES = [
  // Breakfast
  { file: 'seed/en/pancakes.webp',        name: 'Golden Pancakes',                description: 'Fluffy buttermilk pancakes with maple syrup, butter, and fresh berries', category: 'Breakfast', cuisine: 'American' },
  { file: 'seed/en/eggs-benedict.webp',   name: 'Eggs Benedict',                  description: 'Poached eggs on English muffins with Canadian bacon and hollandaise sauce', category: 'Breakfast', cuisine: 'American' },
  { file: 'seed/en/french-toast.webp',    name: 'French Toast',                   description: 'Thick-cut brioche dipped in vanilla-cinnamon batter, dusted with powdered sugar', category: 'Breakfast', cuisine: 'American' },
  { file: 'seed/en/omelette.webp',        name: 'Western Omelette',               description: 'Three-egg omelette with ham, bell peppers, onions, and melted cheddar', category: 'Breakfast', cuisine: 'American' },
  { file: 'seed/en/waffles.webp',         name: 'Belgian Waffles',                description: 'Crispy Belgian waffles topped with whipped cream, strawberries, and maple syrup', category: 'Breakfast', cuisine: 'American' },
  { file: 'seed/en/avocado-toast.webp',   name: 'Avocado Toast',                  description: 'Sourdough toast with smashed avocado, cherry tomatoes, feta, and a poached egg', category: 'Breakfast', cuisine: 'American' },
  // Lunch
  { file: 'seed/en/burger.webp',          name: 'Classic Burger',                 description: 'Half-pound Angus beef patty, lettuce, tomato, caramelized onions, cheddar, and fries', category: 'Burgers', cuisine: 'American' },
  { file: 'seed/en/caesar-salad.webp',    name: 'Caesar Salad',                   description: 'Crisp romaine, shaved parmesan, garlic croutons, and house-made Caesar dressing', category: 'Salads', cuisine: 'American' },
  { file: 'seed/en/club-sandwich.webp',   name: 'Club Sandwich',                  description: 'Triple-decker with turkey, bacon, lettuce, tomato, and mayo, served with fries', category: 'Sandwiches', cuisine: 'American' },
  { file: 'seed/en/grilled-chicken.webp', name: 'Grilled Chicken Plate',          description: 'Herb-marinated chicken breast with rice, grilled vegetables, and chimichurri', category: 'Chicken', cuisine: 'American' },
  { file: 'seed/en/fish-tacos.webp',      name: 'Fish Tacos',                     description: 'Three battered fish tacos with cabbage slaw, pico de gallo, and chipotle crema', category: 'Tacos', cuisine: 'Mexican' },
  { file: 'seed/en/pasta.webp',           name: 'Pasta Alfredo',                  description: 'Fettuccine in creamy parmesan alfredo sauce, served with garlic bread', category: 'Pasta', cuisine: 'Italian' },
  // Dinner
  { file: 'seed/en/steak.webp',           name: 'Grilled Ribeye Steak',           description: '12oz ribeye grilled to perfection with mashed potatoes, asparagus, and red wine jus', category: 'Dinner', cuisine: 'American' },
  { file: 'seed/en/salmon.webp',          name: 'Pan-Seared Salmon',              description: 'Atlantic salmon with lemon-dill sauce, quinoa, and roasted seasonal vegetables', category: 'Dinner', cuisine: 'American' },
  { file: 'seed/en/ribs.webp',            name: 'Baby Back Ribs',                 description: 'Slow-smoked pork ribs glazed with house BBQ sauce, served with coleslaw and cornbread', category: 'Dinner', cuisine: 'American' },
  { file: 'seed/en/lobster.webp',         name: 'Lobster Tail',                   description: 'Butter-poached lobster tail with drawn butter, roasted potatoes, and asparagus', category: 'Dinner', cuisine: 'American' },
  { file: 'seed/en/pizza.webp',           name: 'Margherita Pizza',               description: 'Wood-fired crust, San Marzano tomato sauce, fresh mozzarella, and basil', category: 'Pizza', cuisine: 'Italian' },
  { file: 'seed/en/shrimp.webp',          name: 'Garlic Shrimp',                  description: 'Jumbo shrimp sautéed in garlic butter with white wine, served over linguine', category: 'Dinner', cuisine: 'American' },
  // Appetizers
  { file: 'seed/en/wings.webp',           name: 'Buffalo Wings',                  description: 'Crispy chicken wings tossed in buffalo sauce, served with celery and ranch dip', category: 'Chicken', cuisine: 'American' },
  { file: 'seed/en/nachos.webp',          name: 'Loaded Nachos',                  description: 'Tortilla chips topped with melted cheese, jalapeños, guacamole, sour cream, and pico', category: 'Appetizers', cuisine: 'Mexican' },
  { file: 'seed/en/spring-rolls.webp',    name: 'Spring Rolls',                   description: 'Crispy vegetable spring rolls served with sweet chili dipping sauce', category: 'Appetizers', cuisine: 'Chinese' },
  { file: 'seed/en/sliders.webp',         name: 'Beef Sliders',                   description: 'Three mini Angus beef burgers with pickle, cheddar, and special sauce', category: 'Burgers', cuisine: 'American' },
  { file: 'seed/en/calamari.webp',        name: 'Fried Calamari',                 description: 'Lightly breaded calamari rings served with marinara and lemon aioli', category: 'Appetizers', cuisine: 'Italian' },
  { file: 'seed/en/onion-rings.webp',     name: 'Onion Rings',                    description: 'Thick-cut, beer-battered onion rings with chipotle dipping sauce', category: 'Appetizers', cuisine: 'American' },
  // Beverages
  { file: 'seed/en/lemonade.webp',        name: 'Fresh Lemonade',                 description: 'Hand-squeezed lemonade with fresh mint and ice', category: 'Beverages', cuisine: 'American' },
  { file: 'seed/en/coffee.webp',          name: 'Gourmet Coffee',                 description: 'Single-origin medium roast coffee served hot or iced', category: 'Hot drinks', cuisine: 'American' },
  { file: 'seed/en/smoothie.webp',        name: 'Tropical Smoothie',              description: 'Mango, pineapple, banana, and coconut milk blended smooth', category: 'Beverages', cuisine: 'American' },
  { file: 'seed/en/water.webp',           name: 'Sparkling Mineral Water',        description: 'Sparkling or still mineral water, 500ml bottle, served chilled', category: 'Beverages', cuisine: 'American' },
  // Cocktails
  { file: 'seed/en/margarita.webp',       name: 'Classic Margarita',              description: 'Premium tequila, Cointreau, fresh lime juice, and a salted rim', category: 'Drinks', cuisine: 'Mexican' },
  { file: 'seed/en/beer.webp',            name: 'Craft Beer',                     description: 'Selection of local craft beers on tap, cold and refreshing', category: 'Drinks', cuisine: 'American' },
  { file: 'seed/en/whiskey.webp',         name: 'Whiskey Sour',                   description: 'Bourbon, fresh lemon juice, simple syrup, and a dash of bitters', category: 'Drinks', cuisine: 'American' },
  { file: 'seed/en/mojito.webp',          name: 'Mojito',                         description: 'White rum, fresh muddled mint, lime, sugar, and soda water', category: 'Drinks', cuisine: 'American' },
  { file: 'seed/en/wine.webp',            name: 'Glass of Red Wine',              description: 'Curated selection of full-bodied red wine, Cabernet Sauvignon', category: 'Drinks', cuisine: 'Spanish' },
  // Desserts
  { file: 'seed/en/cheesecake.webp',      name: 'New York Cheesecake',            description: 'Classic creamy cheesecake on a graham cracker crust with berry compote', category: 'Desserts', cuisine: 'American' },
  { file: 'seed/en/brownie.webp',         name: 'Chocolate Brownie Sundae',       description: 'Warm fudge brownie topped with vanilla ice cream, chocolate sauce, and whipped cream', category: 'Desserts', cuisine: 'American' },
  { file: 'seed/en/tiramisu.webp',        name: 'Tiramisu',                       description: 'Espresso-soaked ladyfingers layered with mascarpone cream and cocoa powder', category: 'Desserts', cuisine: 'Italian' },
  { file: 'seed/en/creme-brulee.webp',    name: 'Crème Brûlée',                   description: 'Classic French vanilla custard with a caramelized sugar crust', category: 'Desserts', cuisine: 'French' },
  { file: 'seed/en/ice-cream.webp',       name: 'Artisan Ice Cream',              description: 'Two scoops of house-made ice cream: vanilla, chocolate, strawberry, or mango', category: 'Desserts', cuisine: 'American' },
  { file: 'seed/en/apple-pie.webp',       name: 'Apple Pie à la Mode',            description: 'Warm spiced apple pie served with a scoop of vanilla ice cream and caramel drizzle', category: 'Desserts', cuisine: 'American' },
];

const ALL_IMAGES = [...ES_IMAGES, ...EN_IMAGES];

// ─── PROMPT BUILDER (same logic as /api/ai/generate-image) ───────────────────

const latinCuisineMap = {
  Mexican:   'Rustic clay or Talavera ceramic plate. Warm terracotta color palette. Cilantro, lime wedge, salsa roja and verde on the side.',
  Colombian: 'Colorful ceramic plate. Hogao sauce, crispy chicharrón, patacones visible. Bandeja paisa generosity and color.',
  Peruvian:  'Modern fine-dining plate. Aji amarillo sauce drizzle, corn, purple potato, microgreens.',
  Argentine: 'Rustic wooden board. Char marks from the grill, chimichurri sauce on the side, lemon wedge.',
  Italian:   'White ceramic plate. Fresh basil leaf, extra-virgin olive oil drizzle, Parmigiano shavings.',
  Spanish:   'Cazuela clay dish or white ceramic. Saffron color, olive oil drizzle, paprika dust.',
  American:  'Cast iron skillet or thick white ceramic. Generous portion, crispy edges, diner-meets-gourmet energy.',
  Chinese:   'Blue-and-white porcelain bowl. Steaming broth, chopsticks at edge.',
  French:    'Classic white French bistro plate. Elegant, minimalist, Michelin-adjacent presentation.',
};

const angleMap = {
  Beverages:    'Camera at 20-degree tilt — shows glass profile, liquid level and condensation clearly.',
  'Hot drinks': 'Camera at 22-degree tilt — captures steam rising from the cup.',
  Desserts:     'Camera at 45-degree angle — captures every layer, drizzle and topping.',
  Breakfast:    'Camera at 50-degree overhead — shows full plate layout and vibrant colors.',
  Salads:       'Camera directly overhead — all ingredients visible, beautiful composition.',
  Pizza:        'Camera directly overhead — full pizza visible, one slice pulled slightly away showing cheese stretch.',
  Soups:        'Camera directly overhead — bowl centered, garnish floating, steam rising.',
  Tacos:        'Camera at 28-degree angle — 2–3 tacos arranged naturally, filling and toppings fully visible.',
  Bowls:        'Camera at 45-degree overhead — all ingredients arranged in sections.',
  Burgers:      "Camera at 38-degree angle (the McDonald's standard) — every layer of the burger clearly visible.",
  Sandwiches:   'Camera at 35-degree angle — cross-section visible showing all fillings.',
  Chicken:      'Camera at 30-degree angle — crispy texture and char visible from this angle.',
  Pasta:        'Camera at 40-degree angle — depth of the bowl, sauce coating and garnish visible.',
  Dinner:       'Camera at 38-degree hero angle — shows the full plate with protein, sides and sauce.',
  Appetizers:   'Camera at 35-degree angle — shows depth and texture of the appetizer.',
  Drinks:       'Camera at 20-degree tilt — shows glass and liquid level with condensation or ice.',
};

const surfaceMap = {
  Burgers:      'Polished dark slate stone surface. Deep matte charcoal background.',
  Chicken:      'Rustic matte black ceramic tile surface. Deep charcoal background.',
  Pizza:        'Worn wooden pizza board surface. Dark warm background.',
  Tacos:        'Terracotta or warm stone surface. Earthy warm-toned background.',
  Desserts:     'White marble surface with subtle veining. Soft light gray background.',
  Beverages:    'Polished black granite surface. Dark charcoal background.',
  'Hot drinks': 'Light oak wood surface. Warm cream-toned background.',
  Salads:       'White ceramic plate on white marble surface. Clean bright background.',
  Soups:        'Dark ceramic bowl on slate surface. Moody dark background.',
  Pasta:        'White ceramic bowl on linen cloth. Warm off-white background.',
  Breakfast:    'Light oak wood surface. Warm soft morning-light background.',
  Dinner:       'Polished slate surface. Deep charcoal background — makes food colors pop.',
  Appetizers:   'Dark matte surface. Dramatic moody background.',
  Sandwiches:   'Rustic wooden board. Warm natural background.',
  Drinks:       'Polished black granite surface. Dark charcoal background.',
};

function getFoodStylingDetails(name, description, category) {
  const lower = (name + ' ' + description).toLowerCase();
  if (/burger|hamburguesa|smash/.test(lower)) {
    return 'Burger layers perfectly stacked and visible. Cheese gently melting over the patty edges in golden ribbons. Patty showing deep Maillard-reaction crust with visible sear marks. Lettuce crisp and vibrant green, tomato slice red and fresh, sauce peeking out. One tiny drip of sauce falling from the side.';
  }
  if (/pollo|chicken|fried|crispy|alita|wing|buffalo/.test(lower)) {
    return 'Showing spectacular crispy golden-brown crust with visible ridges from the Maillard reaction. Steam wisps rising from the hot interior. Sauce glistening under the rim light.';
  }
  if (/taco|burrito|fish taco/.test(lower)) {
    return 'Taco filling overflowing naturally — visible layers of protein, fresh salsa, vibrant cilantro, crisp white onion. Lime wedge with one drop of juice. Slight char marks on tortilla.';
  }
  if (/pizza/.test(lower)) {
    return 'One pizza slice being slightly lifted — mozzarella cheese stretching in long, glossy strands. Toppings perfectly distributed. Crust showing golden-brown bubbles and char spots. Steam rising.';
  }
  if (/pasta|alfredo|primavera|carbonara|risotto|fettuccine/.test(lower)) {
    return 'Pasta twisted naturally into a nest. Sauce coating every strand — glistening under the key light. Fresh basil leaf on top. Parmigiano shavings. Steam rising.';
  }
  if (/salmon|steak|filete|ribeye|strip|lamb|lobster|shrimp|camarón|rib/.test(lower)) {
    return 'Protein showing perfect Maillard reaction — golden-brown or charred crust. Sauce artfully drizzled. Sides arranged beautifully. Steam rising from the hot dish.';
  }
  if (/enchilada|mole|chilaquil/.test(lower)) {
    return 'Authentic Mexican comfort food presentation. Sauce generously coating, queso fresco crumbled on top, crema drizzled, onion rings garnish. Steam rising.';
  }
  if (/ice cream|helado|sundae|brownie/.test(lower)) {
    return 'Ice cream scoops perfectly rounded, glistening. Sauce dripping naturally down the sides. Toppings scattered with precision. Micro condensation on the cold bowl.';
  }
  if (/coffee|café|latte|cappuccino|espresso|iced coffee|hot choc/.test(lower)) {
    return 'Latte art on the surface — perfect rosette or tulip pattern. Steam curling elegantly upward, backlit. Crema deep golden-brown.';
  }
  if (/lemonade|limonada|smoothie|juice|jugo|horchata|agua/.test(lower)) {
    return 'Vibrant color of the drink saturated and glowing. Condensation droplets on the outside. Fruit slice on the rim. Straw at an angle.';
  }
  if (/margarita|mojito|beer|cerveza|whiskey|wine|vino|mezcal|cocktail/.test(lower)) {
    return 'Drink glistening and vibrant. Ice cubes perfectly clear. Garnish (lime wedge, mint sprig, or citrus twist) precisely placed. Condensation on the glass.';
  }
  if (/cheesecake|pay|crème brûlée|tiramisu|churro|flan|tres leche|apple pie|brownie|waffle/.test(lower)) {
    return 'Dessert beautifully presented. Sauce or glaze dripping naturally. Garnish precise. Powdered sugar or cocoa dusted elegantly. Caramelization visible.';
  }
  if (/salad|ensalada|caesar/.test(lower)) {
    return 'Ingredients arranged beautifully. Greens crisp and vibrant. Dressing glistening on leaves. Parmesan shavings catching the light. Croutons golden-brown.';
  }
  if (/guacamole|nacho|empanada|onion ring|aros|spring roll|calamari|slider|bruschetta|mushroom/.test(lower)) {
    return 'Appetizer beautifully plated. Textures visible and inviting. Dipping sauce in small bowl nearby. Steam or crunch visible.';
  }
  if (/pancake|hotcake|waffle|french toast|omelette|huevo|egg|benedict|molletes|avocado toast|avena|burrito/.test(lower)) {
    return 'Breakfast plate looking warm and inviting. Butter melting on hot surface. Syrup or sauce dripping naturally. Berries or fruit vibrant and fresh.';
  }
  return 'Every ingredient perfectly visible and identifiable. Food appears fresh, appetizing and perfectly cooked. Textures crisp, sauces glistening. Steam rising if hot.';
}

function buildPrompt(item) {
  const { name, description, category, cuisine } = item;
  const cuisineCtx = latinCuisineMap[cuisine] ?? '';
  const angle = angleMap[category] ?? 'Camera at 38-degree hero angle — the professional food photography standard.';
  const surface = surfaceMap[category] ?? 'Polished matte slate surface. Deep charcoal background.';
  const styling = getFoodStylingDetails(name, description, category);

  return `Commercial food advertising photograph — the kind shot for a world-class restaurant chain like McDonald's, KFC or Nobu, produced by an award-winning food photographer using a Hasselblad H6D-400C with a 120mm f/4 macro lens, lit by a professional three-point studio lighting rig.

SUBJECT: "${name}" — ${description}.
${cuisineCtx ? `CUISINE CONTEXT: ${cuisineCtx}` : ''}
FOOD STYLING: ${styling}

LIGHTING SETUP (critical):
- Key light: 120cm octabox softbox at 45° left — creates soft gradients, no harsh shadows
- Fill light: large silver reflector at 30° right — reduces shadow contrast to a flattering 3:1 ratio
- Rim/backlight: strip softbox directly behind the dish — creates a luminous halo around steam and edges
- Combined result: food appears to GLOW from within, exactly like a multi-million-dollar advertising campaign

CAMERA & COMPOSITION (square framing):
- Aperture f/3.2 — subject razor-sharp, background melts into creamy bokeh
- ISO 100 — zero grain, ultra-clean shadows
- ${angle}
- SQUARE 1:1 composition — dish perfectly centered, filling about 70% of the frame
- Equal breathing room on all 4 sides — safe zone: all food within central 80%

SURFACE & BACKGROUND:
- ${surface}

COLOR GRADING (baked into the image):
- Color temperature 5800K — makes golden-browns, crispy crusts and warm tones absolutely sing
- Slightly lifted blacks (cinematic depth, not pure black)
- Teal-orange color split: warm food tones contrast against cool dark background
- Micro contrast boost on all textures — every crispy ridge, pore and glaze highlight visible

QUALITY MANDATE:
- 4K ultra-high resolution, 100% photorealistic, indistinguishable from a real photograph
- The image must make the viewer immediately hungry upon seeing it
- Absolutely NO text, watermarks, logos, UI elements, or human hands
- NO illustration, painting, cartoon or AI-looking artifacts — pure photorealism only`;
}

// ─── IMAGE GENERATION ────────────────────────────────────────────────────────

async function generateImage(prompt) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: { numberOfImages: 1, aspectRatio: '1:1' },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error('No image bytes returned');
  return Buffer.from(imageBytes, 'base64');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── DEMO DATA UPDATER ────────────────────────────────────────────────────────
// Maps Unsplash URLs in demo-data.ts and demo-data-en.ts to /seed/ paths

const ES_URL_MAP = {
  // Desayunos
  'photo-1534352956036': '/seed/es/chilaquiles.webp',   // chilaquiles
  'photo-1525351484163': '/seed/es/huevos-rancheros.webp',
  'photo-1567620905732': '/seed/es/hotcakes.webp',
  'photo-1528735602780': '/seed/es/molletes.webp',
  'photo-1510693206972': '/seed/es/omelette.webp',
  'photo-1517673400267': '/seed/es/avena.webp',
  // Almuerzos
  'photo-1568901346375': '/seed/es/hamburguesa.webp',
  'photo-1532550907401': '/seed/es/pollo.webp',
  'photo-1546793665': '/seed/es/ensalada.webp',
  'photo-1551504734': '/seed/es/tacos.webp',
  'photo-1645112411341': '/seed/es/pasta.webp',
  // Cenas
  'photo-1467003909585': '/seed/es/salmon.webp',
  'photo-1574071318508': '/seed/es/pizza.webp',
  'photo-1600891964092': '/seed/es/filete.webp',
  'photo-1547592166': '/seed/es/sopa.webp',
  'photo-1618040996337': '/seed/es/tacos.webp',  // quesadillas reuse tacos img
  // Aperitivos
  'photo-1615870216519': '/seed/es/guacamole.webp',
  'photo-1535399831218': '/seed/es/ensalada.webp', // ceviche reuse ensalada
  'photo-1513456852971': '/seed/es/nachos.webp',
  'photo-1601924582970': '/seed/es/empanadas.webp',
  'photo-1639024471283': '/seed/es/aros-cebolla.webp',
  'photo-1527477396000': '/seed/es/alitas.webp',
  // Bebidas
  'photo-1621263764928': '/seed/es/limonada.webp',
  'photo-1495474472287': '/seed/es/cafe.webp',
  'photo-1541658016709': '/seed/es/horchata.webp',
  'photo-1622597467836': '/seed/es/jugo.webp',
  'photo-1581636625402': '/seed/es/limonada.webp', // refresco
  'photo-1548839140': '/seed/es/limonada.webp',    // agua mineral
  // Licores
  'photo-1556855810': '/seed/es/margarita.webp',
  'photo-1535958636474': '/seed/es/cerveza.webp',
  'photo-1569529465841': '/seed/es/mezcal.webp',
  'photo-1551538827': '/seed/es/mojito.webp',
  'photo-1510812431401': '/seed/es/cerveza.webp', // vino tinto
  'photo-1513558161293': '/seed/es/cerveza.webp', // michelada
  // Postres
  'photo-1528975604071': '/seed/es/flan.webp',
  'photo-1481391319762': '/seed/es/churros.webp',
  'photo-1464305795204': '/seed/es/tres-leches.webp',
  'photo-1563805042': '/seed/es/brownie.webp',
  'photo-1501443762994': '/seed/es/helado.webp',
  'photo-1533134242443': '/seed/es/pay-queso.webp',
};

const EN_URL_MAP = {
  // Breakfast
  // pancakes: photo-1567620905732 (same as ES hotcakes) → use EN pancakes
  // eggs benedict: photo-1577973354094
  'photo-1577973354094': '/seed/en/eggs-benedict.webp',
  'photo-1484723091739': '/seed/en/french-toast.webp',
  // omelette: photo-1510693206972 → EN omelette
  // waffles: (not in grill house but in seed)
  // avocado toast: photo-1525351484163 → EN avocado-toast
  // Lunch
  // burger: photo-1568901346375 → EN burger
  // caesar: photo-1546793665 → EN caesar-salad
  // club: photo-1528735602780 → EN club-sandwich
  'photo-1580217593608': '/seed/en/fish-tacos.webp',
  // grilled chicken: photo-1532550907401 → EN grilled-chicken
  // pasta: photo-1645112411341 → EN pasta
  // Dinner
  // steak: photo-1600891964092 → EN steak
  // salmon: photo-1467003909585 → EN salmon
  'photo-1574484284002': '/seed/en/ribs.webp',
  'photo-1559737558': '/seed/en/lobster.webp',
  'photo-1632778149955': '/seed/en/ribs.webp', // chicken parm reuse ribs
  'photo-1476124369491': '/seed/en/pasta.webp', // mushroom risotto reuse pasta
  // Appetizer
  'photo-1567620832903': '/seed/en/wings.webp',
  'photo-1599487488170': '/seed/en/calamari.webp',
  'photo-1572695157366': '/seed/en/spring-rolls.webp',
  // nachos: photo-1513456852971 → EN nachos
  // shrimp cocktail: photo-1535399831218 → EN shrimp
  'photo-1756478629551': '/seed/en/spring-rolls.webp', // stuffed mushrooms
  // Beverage
  // lemonade: photo-1621263764928 → EN lemonade
  'photo-1461023058943': '/seed/en/coffee.webp',
  // smoothie: photo-1622597467836 → EN smoothie
  // water: photo-1548839140 → EN water
  'photo-1600271886742': '/seed/en/lemonade.webp', // orange juice
  'photo-1542990253': '/seed/en/coffee.webp', // hot chocolate
  // Drinks
  // margarita: photo-1556855810 → EN margarita
  // craft beer: photo-1535958636474 → EN beer
  // old fashioned: photo-1569529465841 → EN whiskey
  // mojito: photo-1551538827 → EN mojito
  // wine: photo-1510812431401 → EN wine
  // espresso martini: photo-1495474472287 → EN coffee (reuse)
  // Desserts
  // cheesecake: photo-1533134242443 → EN cheesecake
  // brownie: photo-1563805042 → EN brownie
  'photo-1571877227200': '/seed/en/tiramisu.webp',
  'photo-1470124182917': '/seed/en/creme-brulee.webp',
  'photo-1598110750624': '/seed/en/cheesecake.webp', // baklava reuse cheesecake
};

// Shared photo IDs that appear in both ES and EN data but should map differently
// We'll handle this by detecting the file context (demo-data.ts vs demo-data-en.ts)

function replaceUnsplashUrls(content, urlMap) {
  return content.replace(
    /https:\/\/images\.unsplash\.com\/photo-([A-Za-z0-9_-]+)\?[^'"]*/g,
    (fullUrl, photoId) => {
      // Try exact match first
      const exactKey = Object.keys(urlMap).find(k => fullUrl.includes(k));
      if (exactKey) return urlMap[exactKey];
      // Fallback: keep original
      return fullUrl;
    }
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting Imagen 4 seed image generation...');
  console.log(`📦 Total images to generate: ${ALL_IMAGES.length}`);
  console.log('');

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < ALL_IMAGES.length; i++) {
    const item = ALL_IMAGES[i];
    const outputPath = join(ROOT, 'public', item.file);
    const progress = `[${i + 1}/${ALL_IMAGES.length}]`;

    process.stdout.write(`${progress} Generating: ${item.name}...`);

    try {
      const prompt = buildPrompt(item);
      const imageBuffer = await generateImage(prompt);
      writeFileSync(outputPath, imageBuffer);
      generated++;
      console.log(` ✅`);
    } catch (err) {
      failed++;
      console.log(` ❌ ${err.message}`);
    }

    // Respect rate limits: 2 seconds between calls
    if (i < ALL_IMAGES.length - 1) {
      await sleep(2000);
    }
  }

  console.log('');
  console.log(`✅ Done! Generated: ${generated} | Failed: ${failed}`);

  // ── Update demo-data.ts ──
  console.log('');
  console.log('📝 Updating src/lib/demo-data.ts...');
  const esPath = join(ROOT, 'src', 'lib', 'demo-data.ts');
  let esContent = readFileSync(esPath, 'utf-8');

  // Build combined map for ES file (prefers ES, falls back to EN)
  const combinedEsMap = { ...EN_URL_MAP, ...ES_URL_MAP };
  const updatedEs = replaceUnsplashUrls(esContent, combinedEsMap);
  writeFileSync(esPath, updatedEs, 'utf-8');
  console.log('   ✅ demo-data.ts updated');

  // ── Update demo-data-en.ts ──
  console.log('📝 Updating src/lib/demo-data-en.ts...');
  const enPath = join(ROOT, 'src', 'lib', 'demo-data-en.ts');
  let enContent = readFileSync(enPath, 'utf-8');

  // Build combined map for EN file (maps common IDs to EN images)
  const combinedEnMap = { ...ES_URL_MAP, ...EN_URL_MAP };
  // Override shared IDs to prefer EN versions
  combinedEnMap['photo-1567620905732'] = '/seed/en/pancakes.webp'; // hotcakes→pancakes in EN
  combinedEnMap['photo-1568901346375'] = '/seed/en/burger.webp';
  combinedEnMap['photo-1546793665'] = '/seed/en/caesar-salad.webp';
  combinedEnMap['photo-1528735602780'] = '/seed/en/club-sandwich.webp';
  combinedEnMap['photo-1532550907401'] = '/seed/en/grilled-chicken.webp';
  combinedEnMap['photo-1645112411341'] = '/seed/en/pasta.webp';
  combinedEnMap['photo-1467003909585'] = '/seed/en/salmon.webp';
  combinedEnMap['photo-1600891964092'] = '/seed/en/steak.webp';
  combinedEnMap['photo-1510693206972'] = '/seed/en/omelette.webp';
  combinedEnMap['photo-1513456852971'] = '/seed/en/nachos.webp';
  combinedEnMap['photo-1535399831218'] = '/seed/en/shrimp.webp';
  combinedEnMap['photo-1621263764928'] = '/seed/en/lemonade.webp';
  combinedEnMap['photo-1622597467836'] = '/seed/en/smoothie.webp';
  combinedEnMap['photo-1548839140'] = '/seed/en/water.webp';
  combinedEnMap['photo-1556855810'] = '/seed/en/margarita.webp';
  combinedEnMap['photo-1535958636474'] = '/seed/en/beer.webp';
  combinedEnMap['photo-1551538827'] = '/seed/en/mojito.webp';
  combinedEnMap['photo-1510812431401'] = '/seed/en/wine.webp';
  combinedEnMap['photo-1533134242443'] = '/seed/en/cheesecake.webp';
  combinedEnMap['photo-1563805042'] = '/seed/en/brownie.webp';
  combinedEnMap['photo-1495474472287'] = '/seed/en/coffee.webp';
  combinedEnMap['photo-1569529465841'] = '/seed/en/whiskey.webp';

  const updatedEn = replaceUnsplashUrls(enContent, combinedEnMap);
  writeFileSync(enPath, updatedEn, 'utf-8');
  console.log('   ✅ demo-data-en.ts updated');

  console.log('');
  console.log('🎉 All done! Now run: git add -A && git commit -m "feat: regenerate seed images with Imagen 4" && git push');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
