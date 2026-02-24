import type { SupabaseClient } from '@supabase/supabase-js';

interface SeedProduct {
  name: string;
  description: string;
  price: number;
  image_url: string;
  variants?: Array<{ name: string; price_delta: number; sort_order: number }>;
  extras?: Array<{ name: string; price: number; sort_order: number }>;
}

// --------------- SPANISH ---------------

const SEED_CATEGORIES_ES = [
  { name: 'Desayunos', sort_order: 1 },
  { name: 'Almuerzos', sort_order: 2 },
  { name: 'Cenas', sort_order: 3 },
  { name: 'Aperitivos', sort_order: 4 },
  { name: 'Bebidas', sort_order: 5 },
  { name: 'Licores', sort_order: 6 },
  { name: 'Postres', sort_order: 7 },
];

const SEED_PRODUCTS_ES: Record<string, SeedProduct[]> = {
  Desayunos: [
    {
      name: '[Ejemplo] Chilaquiles Verdes',
      description: 'Totopos bañados en salsa verde con crema, queso fresco, cebolla y huevo estrellado.',
      price: 8.99,
      image_url: '/seed/es/chilaquiles.webp',
      variants: [
        { name: 'Con huevo estrellado', price_delta: 0, sort_order: 1 },
        { name: 'Con pollo deshebrado', price_delta: 3.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Huevos Rancheros',
      description: 'Huevos estrellados sobre tortilla con salsa roja, frijoles refritos y aguacate.',
      price: 7.99,
      image_url: '/seed/es/huevos-rancheros.webp',
    },
    {
      name: '[Ejemplo] Hot Cakes',
      description: 'Tres hot cakes esponjosos con miel de maple, mantequilla y fruta fresca.',
      price: 6.99,
      image_url: '/seed/es/hotcakes.webp',
      extras: [
        { name: 'Nutella', price: 1.50, sort_order: 1 },
        { name: 'Plátano extra', price: 1.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Molletes Especiales',
      description: 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate.',
      price: 6.50,
      image_url: '/seed/es/molletes.webp',
    },
    {
      name: '[Ejemplo] Omelette de Verduras',
      description: 'Omelette relleno de champiñones, espinaca, pimiento y queso manchego.',
      price: 8.50,
      image_url: '/seed/es/omelette.webp',
      extras: [
        { name: 'Extra queso', price: 1.50, sort_order: 1 },
        { name: 'Tocino', price: 2.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Avena con Frutas',
      description: 'Avena caliente con leche, miel, granola, fresas y arándanos.',
      price: 5.99,
      image_url: '/seed/es/avena.webp',
    },
  ],
  Almuerzos: [
    {
      name: '[Ejemplo] Hamburguesa Clásica',
      description: 'Carne de res 200g a la parrilla, lechuga, tomate, cebolla caramelizada, queso cheddar y papas.',
      price: 14.99,
      image_url: '/seed/es/hamburguesa.webp',
      variants: [
        { name: 'Sencilla', price_delta: 0, sort_order: 1 },
        { name: 'Doble carne', price_delta: 5.00, sort_order: 2 },
      ],
      extras: [
        { name: 'Tocino', price: 2.50, sort_order: 1 },
        { name: 'Aguacate', price: 2.00, sort_order: 2 },
        { name: 'Aros de cebolla', price: 3.00, sort_order: 3 },
      ],
    },
    {
      name: '[Ejemplo] Pollo a la Plancha',
      description: 'Pechuga marinada a la plancha con arroz, ensalada y vegetales de temporada.',
      price: 12.99,
      image_url: '/seed/es/pollo.webp',
    },
    {
      name: '[Ejemplo] Ensalada César',
      description: 'Lechuga romana, crutones, parmesano y aderezo césar casero.',
      price: 10.99,
      image_url: '/seed/es/ensalada.webp',
      extras: [
        { name: 'Con pollo', price: 3.00, sort_order: 1 },
        { name: 'Con camarones', price: 5.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Tacos al Pastor',
      description: 'Tres tacos de cerdo adobado con piña, cilantro y cebolla. Tortillas hechas a mano.',
      price: 9.99,
      image_url: '/seed/es/tacos.webp',
      variants: [
        { name: '3 piezas', price_delta: 0, sort_order: 1 },
        { name: '5 piezas', price_delta: 4.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Pasta Alfredo',
      description: 'Fettuccine en cremosa salsa alfredo con parmesano, acompañado de pan de ajo.',
      price: 13.50,
      image_url: '/seed/es/pasta.webp',
      variants: [
        { name: 'Sin proteína', price_delta: 0, sort_order: 1 },
        { name: 'Con pollo', price_delta: 3.00, sort_order: 2 },
        { name: 'Con camarones', price_delta: 5.00, sort_order: 3 },
      ],
    },
    {
      name: '[Ejemplo] Club Sándwich',
      description: 'Triple piso con pollo, tocino, lechuga, tomate, aguacate y papas a la francesa.',
      price: 11.99,
      image_url: '/seed/es/hamburguesa.webp',
    },
  ],
  Cenas: [
    {
      name: '[Ejemplo] Salmón a la Parrilla',
      description: 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas.',
      price: 22.99,
      image_url: '/seed/es/salmon.webp',
    },
    {
      name: '[Ejemplo] Pizza Margherita',
      description: 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca.',
      price: 16.99,
      image_url: '/seed/es/pizza.webp',
      variants: [
        { name: 'Individual', price_delta: 0, sort_order: 1 },
        { name: 'Mediana', price_delta: 6.00, sort_order: 2 },
        { name: 'Familiar', price_delta: 12.00, sort_order: 3 },
      ],
    },
    {
      name: '[Ejemplo] Filete de Res',
      description: 'Corte grueso de res a la parrilla con puré de papa, espárragos y salsa de vino tinto.',
      price: 26.99,
      image_url: '/seed/es/filete.webp',
      variants: [
        { name: 'Término medio', price_delta: 0, sort_order: 1 },
        { name: 'Bien cocido', price_delta: 0, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Enchiladas Suizas',
      description: 'Tortillas rellenas de pollo bañadas en salsa verde con crema y queso gratinado.',
      price: 13.99,
      image_url: '/seed/es/enchiladas.webp',
    },
    {
      name: '[Ejemplo] Sopa de Tortilla',
      description: 'Caldo de jitomate con tiras de tortilla, aguacate, crema, queso y chile pasilla.',
      price: 8.99,
      image_url: '/seed/es/sopa.webp',
    },
    {
      name: '[Ejemplo] Quesadillas de Flor de Calabaza',
      description: 'Tortillas de maíz rellenas de flor de calabaza, queso Oaxaca y epazote.',
      price: 9.99,
      image_url: '/seed/es/tacos.webp',
    },
  ],
  Aperitivos: [
    {
      name: '[Ejemplo] Guacamole con Totopos',
      description: 'Guacamole fresco preparado al momento con aguacate, cilantro, cebolla y limón.',
      price: 8.99,
      image_url: '/seed/es/guacamole.webp',
      variants: [
        { name: 'Individual', price_delta: 0, sort_order: 1 },
        { name: 'Para compartir', price_delta: 4.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Ceviche de Camarón',
      description: 'Camarones frescos marinados en limón con pepino, cebolla morada y aguacate.',
      price: 12.99,
      image_url: '/seed/es/ensalada.webp',
    },
    {
      name: '[Ejemplo] Nachos Supremos',
      description: 'Totopos con queso fundido, jalapeños, crema, guacamole y pico de gallo.',
      price: 10.99,
      image_url: '/seed/es/nachos.webp',
      extras: [
        { name: 'Con pollo', price: 3.50, sort_order: 1 },
        { name: 'Con carne', price: 4.00, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Empanadas de Queso',
      description: 'Tres empanadas crujientes rellenas de queso con salsa ranchera.',
      price: 7.99,
      image_url: '/seed/es/empanadas.webp',
    },
    {
      name: '[Ejemplo] Aros de Cebolla',
      description: 'Aros de cebolla empanizados y crujientes con dip de chipotle.',
      price: 6.99,
      image_url: '/seed/es/aros-cebolla.webp',
    },
    {
      name: '[Ejemplo] Alitas BBQ',
      description: 'Alitas de pollo bañadas en salsa barbecue, servidas con apio y aderezo ranch.',
      price: 11.99,
      image_url: '/seed/es/alitas.webp',
      variants: [
        { name: '6 piezas', price_delta: 0, sort_order: 1 },
        { name: '12 piezas', price_delta: 6.00, sort_order: 2 },
      ],
    },
  ],
  Bebidas: [
    {
      name: '[Ejemplo] Limonada Natural',
      description: 'Limonada recién exprimida con hierbabuena y hielo.',
      price: 4.00,
      image_url: '/seed/es/limonada.webp',
      variants: [
        { name: 'Regular', price_delta: 0, sort_order: 1 },
        { name: 'Grande', price_delta: 1.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Café de Olla',
      description: 'Café de grano con piloncillo y canela, estilo tradicional.',
      price: 3.50,
      image_url: '/seed/es/cafe.webp',
      variants: [
        { name: 'Caliente', price_delta: 0, sort_order: 1 },
        { name: 'Frío', price_delta: 0.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Agua de Horchata',
      description: 'Agua fresca de arroz con canela y un toque de vainilla.',
      price: 3.50,
      image_url: '/seed/es/horchata.webp',
    },
    {
      name: '[Ejemplo] Jugo Natural',
      description: 'Jugo recién exprimido de naranja, zanahoria o verde.',
      price: 4.50,
      image_url: '/seed/es/jugo.webp',
    },
    {
      name: '[Ejemplo] Refresco',
      description: 'Coca-Cola, Sprite, Fanta o agua mineral con gas.',
      price: 2.99,
      image_url: '/seed/es/limonada.webp',
    },
    {
      name: '[Ejemplo] Agua Mineral',
      description: 'Botella de agua purificada o mineral de 500ml.',
      price: 2.50,
      image_url: '/seed/es/limonada.webp',
    },
  ],
  Licores: [
    {
      name: '[Ejemplo] Margarita Clásica',
      description: 'Tequila, triple sec, jugo de limón y sal en el borde.',
      price: 9.99,
      image_url: '/seed/es/margarita.webp',
      variants: [
        { name: 'Natural', price_delta: 0, sort_order: 1 },
        { name: 'De mango', price_delta: 1.50, sort_order: 2 },
        { name: 'De tamarindo', price_delta: 1.50, sort_order: 3 },
      ],
    },
    {
      name: '[Ejemplo] Cerveza Artesanal',
      description: 'Selección de cervezas artesanales locales. Pregunta por la carta.',
      price: 6.99,
      image_url: '/seed/es/cerveza.webp',
    },
    {
      name: '[Ejemplo] Mezcal Oaxaqueño',
      description: 'Mezcal joven artesanal servido con naranja y sal de gusano.',
      price: 8.99,
      image_url: '/seed/es/mezcal.webp',
    },
    {
      name: '[Ejemplo] Mojito',
      description: 'Ron blanco, hierbabuena fresca, limón, azúcar y soda.',
      price: 8.99,
      image_url: '/seed/es/mojito.webp',
    },
    {
      name: '[Ejemplo] Copa de Vino Tinto',
      description: 'Selección de vino tinto de casa. Consulta nuestras opciones.',
      price: 7.99,
      image_url: '/seed/es/cerveza.webp',
    },
    {
      name: '[Ejemplo] Michelada Clásica',
      description: 'Cerveza con jugo de limón, sal, salsa picante y chamoy.',
      price: 6.99,
      image_url: '/seed/es/cerveza.webp',
    },
  ],
  Postres: [
    {
      name: '[Ejemplo] Flan Napolitano',
      description: 'Flan cremoso de vainilla con caramelo casero.',
      price: 5.50,
      image_url: '/seed/es/flan.webp',
    },
    {
      name: '[Ejemplo] Churros con Chocolate',
      description: 'Churros crujientes espolvoreados con azúcar y canela, con salsa de chocolate belga.',
      price: 5.99,
      image_url: '/seed/es/churros.webp',
      extras: [
        { name: 'Bola de helado', price: 2.00, sort_order: 1 },
        { name: 'Cajeta', price: 1.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Pastel de Tres Leches',
      description: 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas.',
      price: 6.99,
      image_url: '/seed/es/tres-leches.webp',
    },
    {
      name: '[Ejemplo] Brownie con Helado',
      description: 'Brownie de chocolate caliente con helado de vainilla y salsa de chocolate.',
      price: 7.99,
      image_url: '/seed/es/brownie.webp',
      extras: [
        { name: 'Bola extra de helado', price: 2.00, sort_order: 1 },
        { name: 'Crema batida', price: 1.50, sort_order: 2 },
      ],
    },
    {
      name: '[Ejemplo] Helado Artesanal',
      description: 'Dos bolas de helado artesanal. Sabores: vainilla, chocolate, fresa o mango.',
      price: 4.99,
      image_url: '/seed/es/helado.webp',
    },
    {
      name: '[Ejemplo] Pay de Queso',
      description: 'Pay de queso estilo New York con base de galleta y mermelada de frutos rojos.',
      price: 6.99,
      image_url: '/seed/es/pay-queso.webp',
    },
  ],
};

const SEED_TABLES_ES = [
  { name: 'Mesa 1' },
  { name: 'Mesa 2' },
  { name: 'Mesa 3' },
  { name: 'Mesa 4' },
  { name: 'Delivery' },
  { name: 'Para llevar' },
];

// --------------- ENGLISH ---------------

const SEED_CATEGORIES_EN = [
  { name: 'Breakfast', sort_order: 1 },
  { name: 'Lunch', sort_order: 2 },
  { name: 'Dinner', sort_order: 3 },
  { name: 'Appetizers', sort_order: 4 },
  { name: 'Beverages', sort_order: 5 },
  { name: 'Cocktails', sort_order: 6 },
  { name: 'Desserts', sort_order: 7 },
];

const SEED_PRODUCTS_EN: Record<string, SeedProduct[]> = {
  Breakfast: [
    {
      name: '[Sample] Golden Pancakes',
      description: 'Fluffy buttermilk pancakes served with maple syrup, butter, and fresh berries.',
      price: 10.99,
      image_url: '/seed/en/pancakes.webp',
      extras: [
        { name: 'Nutella drizzle', price: 1.50, sort_order: 1 },
        { name: 'Extra banana', price: 1.00, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Eggs Benedict',
      description: 'Poached eggs on English muffins with Canadian bacon and hollandaise sauce.',
      price: 13.99,
      image_url: '/seed/en/eggs-benedict.webp',
    },
    {
      name: '[Sample] French Toast',
      description: 'Thick-cut brioche dipped in vanilla-cinnamon batter, dusted with powdered sugar.',
      price: 11.49,
      image_url: '/seed/en/french-toast.webp',
    },
    {
      name: '[Sample] Western Omelette',
      description: 'Three-egg omelette with ham, bell peppers, onions, and melted cheddar.',
      price: 12.49,
      image_url: '/seed/en/omelette.webp',
      extras: [
        { name: 'Extra cheese', price: 1.50, sort_order: 1 },
        { name: 'Bacon', price: 2.50, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Belgian Waffles',
      description: 'Crispy Belgian waffles topped with whipped cream, strawberries, and maple syrup.',
      price: 11.99,
      image_url: '/seed/en/waffles.webp',
    },
    {
      name: '[Sample] Avocado Toast',
      description: 'Sourdough toast with smashed avocado, cherry tomatoes, feta, and a poached egg.',
      price: 12.99,
      image_url: '/seed/en/avocado-toast.webp',
    },
  ],
  Lunch: [
    {
      name: '[Sample] Classic Burger',
      description: 'Half-pound Angus beef patty, lettuce, tomato, caramelized onions, cheddar, and fries.',
      price: 14.99,
      image_url: '/seed/en/burger.webp',
      variants: [
        { name: 'Single', price_delta: 0, sort_order: 1 },
        { name: 'Double', price_delta: 5.00, sort_order: 2 },
      ],
      extras: [
        { name: 'Bacon', price: 2.50, sort_order: 1 },
        { name: 'Avocado', price: 2.00, sort_order: 2 },
        { name: 'Onion rings', price: 3.00, sort_order: 3 },
      ],
    },
    {
      name: '[Sample] Caesar Salad',
      description: 'Crisp romaine, shaved parmesan, garlic croutons, and house-made Caesar dressing.',
      price: 11.49,
      image_url: '/seed/en/caesar-salad.webp',
      extras: [
        { name: 'Add chicken', price: 3.00, sort_order: 1 },
        { name: 'Add shrimp', price: 5.00, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Club Sandwich',
      description: 'Triple-decker with turkey, bacon, lettuce, tomato, and mayo, served with fries.',
      price: 13.49,
      image_url: '/seed/en/club-sandwich.webp',
    },
    {
      name: '[Sample] Grilled Chicken Plate',
      description: 'Herb-marinated chicken breast with rice, grilled vegetables, and chimichurri.',
      price: 15.99,
      image_url: '/seed/en/grilled-chicken.webp',
    },
    {
      name: '[Sample] Fish Tacos',
      description: 'Three battered fish tacos with cabbage slaw, pico de gallo, and chipotle crema.',
      price: 14.49,
      image_url: '/seed/en/fish-tacos.webp',
      variants: [
        { name: '3 pieces', price_delta: 0, sort_order: 1 },
        { name: '5 pieces', price_delta: 4.00, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Pasta Alfredo',
      description: 'Fettuccine in creamy parmesan alfredo sauce, served with garlic bread.',
      price: 13.99,
      image_url: '/seed/en/pasta.webp',
      variants: [
        { name: 'Plain', price_delta: 0, sort_order: 1 },
        { name: 'With chicken', price_delta: 3.00, sort_order: 2 },
        { name: 'With shrimp', price_delta: 5.00, sort_order: 3 },
      ],
    },
  ],
  Dinner: [
    {
      name: '[Sample] Grilled Ribeye Steak',
      description: '12oz ribeye grilled to perfection with mashed potatoes, asparagus, and red wine jus.',
      price: 28.99,
      image_url: '/seed/en/steak.webp',
      variants: [
        { name: 'Medium rare', price_delta: 0, sort_order: 1 },
        { name: 'Medium', price_delta: 0, sort_order: 2 },
        { name: 'Well done', price_delta: 0, sort_order: 3 },
      ],
    },
    {
      name: '[Sample] Pan-Seared Salmon',
      description: 'Atlantic salmon with lemon-dill sauce, quinoa, and roasted seasonal vegetables.',
      price: 24.99,
      image_url: '/seed/en/salmon.webp',
    },
    {
      name: '[Sample] Baby Back Ribs',
      description: 'Slow-smoked pork ribs glazed with house BBQ sauce, served with coleslaw and cornbread.',
      price: 29.99,
      image_url: '/seed/en/ribs.webp',
    },
    {
      name: '[Sample] Lobster Tail',
      description: 'Butter-poached lobster tail with drawn butter, roasted potatoes, and asparagus.',
      price: 34.99,
      image_url: '/seed/en/lobster.webp',
    },
    {
      name: '[Sample] Margherita Pizza',
      description: 'Wood-fired crust, San Marzano tomato sauce, fresh mozzarella, and basil.',
      price: 18.99,
      image_url: '/seed/en/pizza.webp',
      variants: [
        { name: 'Personal', price_delta: 0, sort_order: 1 },
        { name: 'Medium', price_delta: 6.00, sort_order: 2 },
        { name: 'Large', price_delta: 12.00, sort_order: 3 },
      ],
    },
    {
      name: '[Sample] Garlic Shrimp',
      description: 'Jumbo shrimp sautéed in garlic butter with white wine, served over linguine.',
      price: 19.99,
      image_url: '/seed/en/shrimp.webp',
    },
  ],
  Appetizers: [
    {
      name: '[Sample] Buffalo Wings',
      description: 'Crispy chicken wings tossed in buffalo sauce, served with celery and ranch dip.',
      price: 12.99,
      image_url: '/seed/en/wings.webp',
      variants: [
        { name: '6 pieces', price_delta: 0, sort_order: 1 },
        { name: '12 pieces', price_delta: 6.00, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Loaded Nachos',
      description: 'Tortilla chips topped with melted cheese, jalapeños, guacamole, sour cream, and pico.',
      price: 11.49,
      image_url: '/seed/en/nachos.webp',
      extras: [
        { name: 'Add chicken', price: 3.50, sort_order: 1 },
        { name: 'Add beef', price: 4.00, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Spring Rolls',
      description: 'Crispy vegetable spring rolls served with sweet chili dipping sauce.',
      price: 9.99,
      image_url: '/seed/en/spring-rolls.webp',
    },
    {
      name: '[Sample] Beef Sliders',
      description: 'Three mini Angus beef burgers with pickle, cheddar, and special sauce.',
      price: 13.99,
      image_url: '/seed/en/sliders.webp',
    },
    {
      name: '[Sample] Fried Calamari',
      description: 'Lightly breaded calamari rings served with marinara and lemon aioli.',
      price: 14.99,
      image_url: '/seed/en/calamari.webp',
    },
    {
      name: '[Sample] Onion Rings',
      description: 'Thick-cut, beer-battered onion rings with chipotle dipping sauce.',
      price: 10.99,
      image_url: '/seed/en/onion-rings.webp',
    },
  ],
  Beverages: [
    {
      name: '[Sample] Fresh Lemonade',
      description: 'Hand-squeezed lemonade with fresh mint and ice.',
      price: 4.49,
      image_url: '/seed/en/lemonade.webp',
      variants: [
        { name: 'Regular', price_delta: 0, sort_order: 1 },
        { name: 'Large', price_delta: 1.50, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Gourmet Coffee',
      description: 'Single-origin medium roast, served hot or iced.',
      price: 4.99,
      image_url: '/seed/en/coffee.webp',
      variants: [
        { name: 'Hot', price_delta: 0, sort_order: 1 },
        { name: 'Iced', price_delta: 0.50, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Tropical Smoothie',
      description: 'Mango, pineapple, banana, and coconut milk blended smooth.',
      price: 6.49,
      image_url: '/seed/en/smoothie.webp',
    },
    {
      name: '[Sample] Mineral Water',
      description: 'Sparkling or still mineral water, 500ml bottle.',
      price: 3.49,
      image_url: '/seed/en/water.webp',
    },
    {
      name: '[Sample] Fresh Juice',
      description: 'Freshly squeezed orange, carrot, or green juice.',
      price: 5.49,
      image_url: '/seed/en/smoothie.webp',
    },
    {
      name: '[Sample] Iced Tea',
      description: 'House-brewed iced tea with lemon. Sweetened or unsweetened.',
      price: 3.99,
      image_url: '/seed/en/lemonade.webp',
    },
  ],
  Cocktails: [
    {
      name: '[Sample] Classic Margarita',
      description: 'Premium tequila, Cointreau, fresh lime juice, and a salted rim.',
      price: 11.99,
      image_url: '/seed/en/margarita.webp',
      variants: [
        { name: 'Classic', price_delta: 0, sort_order: 1 },
        { name: 'Mango', price_delta: 1.50, sort_order: 2 },
        { name: 'Spicy', price_delta: 1.50, sort_order: 3 },
      ],
    },
    {
      name: '[Sample] Craft Beer',
      description: 'Selection of local craft beers on tap. Ask for the rotating menu.',
      price: 7.99,
      image_url: '/seed/en/beer.webp',
    },
    {
      name: '[Sample] Whiskey Sour',
      description: 'Bourbon, fresh lemon juice, simple syrup, and a dash of bitters.',
      price: 13.99,
      image_url: '/seed/en/whiskey.webp',
    },
    {
      name: '[Sample] Mojito',
      description: 'White rum, fresh muddled mint, lime, sugar, and soda water.',
      price: 11.49,
      image_url: '/seed/en/mojito.webp',
    },
    {
      name: '[Sample] Glass of Wine',
      description: 'Curated selection of red, white, or rosé wines by the glass.',
      price: 9.99,
      image_url: '/seed/en/wine.webp',
    },
    {
      name: '[Sample] Long Island Iced Tea',
      description: 'Vodka, rum, gin, tequila, triple sec, sour mix, and cola.',
      price: 13.49,
      image_url: '/seed/en/mojito.webp',
    },
  ],
  Desserts: [
    {
      name: '[Sample] New York Cheesecake',
      description: 'Classic creamy cheesecake on a graham cracker crust with berry compote.',
      price: 8.99,
      image_url: '/seed/en/cheesecake.webp',
    },
    {
      name: '[Sample] Chocolate Brownie Sundae',
      description: 'Warm fudge brownie topped with vanilla ice cream, chocolate sauce, and whipped cream.',
      price: 9.49,
      image_url: '/seed/en/brownie.webp',
      extras: [
        { name: 'Extra scoop of ice cream', price: 2.00, sort_order: 1 },
        { name: 'Whipped cream', price: 1.50, sort_order: 2 },
      ],
    },
    {
      name: '[Sample] Tiramisu',
      description: 'Espresso-soaked ladyfingers layered with mascarpone cream and cocoa powder.',
      price: 9.99,
      image_url: '/seed/en/tiramisu.webp',
    },
    {
      name: '[Sample] Crème Brûlée',
      description: 'Classic French vanilla custard with a caramelized sugar crust.',
      price: 8.49,
      image_url: '/seed/en/creme-brulee.webp',
    },
    {
      name: '[Sample] Artisan Ice Cream',
      description: 'Two scoops of house-made ice cream. Flavors: vanilla, chocolate, strawberry, or mango.',
      price: 7.99,
      image_url: '/seed/en/ice-cream.webp',
    },
    {
      name: '[Sample] Apple Pie à la Mode',
      description: 'Warm spiced apple pie served with a scoop of vanilla ice cream and caramel drizzle.',
      price: 7.99,
      image_url: '/seed/en/apple-pie.webp',
    },
  ],
};

const SEED_TABLES_EN = [
  { name: 'Table 1' },
  { name: 'Table 2' },
  { name: 'Table 3' },
  { name: 'Table 4' },
  { name: 'Delivery' },
  { name: 'Takeout' },
];

const BANNER_URL = '/seed/banner-default.webp';

export async function seedRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantSlug: string,
  appUrl: string,
  locale: string = 'es'
) {
  const isEn = locale === 'en';
  const seedCategories = isEn ? SEED_CATEGORIES_EN : SEED_CATEGORIES_ES;
  const seedProducts = isEn ? SEED_PRODUCTS_EN : SEED_PRODUCTS_ES;
  const seedTables = isEn ? SEED_TABLES_EN : SEED_TABLES_ES;

  try {
    const { data: categories } = await supabase
      .from('categories')
      .insert(seedCategories.map((c) => ({
        restaurant_id: restaurantId,
        name: c.name,
        sort_order: c.sort_order,
        is_active: true,
      })))
      .select('id, name');

    if (!categories?.length) return;

    const categoryMap: Record<string, string> = {};
    for (const c of categories) categoryMap[c.name] = c.id;

    const productRows: Array<{
      restaurant_id: string;
      category_id: string;
      name: string;
      description: string;
      price: number;
      image_url: string;
      is_active: boolean;
      _key: string;
    }> = [];

    for (const [catName, products] of Object.entries(seedProducts)) {
      const catId = categoryMap[catName];
      if (!catId) continue;
      for (const p of products) {
        productRows.push({
          restaurant_id: restaurantId,
          category_id: catId,
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: p.image_url,
          is_active: true,
          _key: p.name,
        });
      }
    }

    const { data: createdProducts } = await supabase
      .from('products')
      .insert(productRows.map(({ _key, ...row }) => row))
      .select('id, name');

    if (!createdProducts?.length) return;

    const productMap: Record<string, string> = {};
    for (const p of createdProducts) productMap[p.name] = p.id;

    const allVariants: Array<{ product_id: string; name: string; price_delta: number; sort_order: number }> = [];
    const allExtras: Array<{ product_id: string; name: string; price: number; sort_order: number }> = [];

    for (const products of Object.values(seedProducts)) {
      for (const p of products) {
        const productId = productMap[p.name];
        if (!productId) continue;

        if (p.variants) {
          for (const v of p.variants) {
            allVariants.push({ product_id: productId, name: v.name, price_delta: v.price_delta, sort_order: v.sort_order });
          }
        }
        if (p.extras) {
          for (const e of p.extras) {
            allExtras.push({ product_id: productId, name: e.name, price: e.price, sort_order: e.sort_order });
          }
        }
      }
    }

    await Promise.all([
      allVariants.length ? supabase.from('product_variants').insert(allVariants) : null,
      allExtras.length ? supabase.from('product_extras').insert(allExtras) : null,
    ]);

    await supabase.from('tables').insert(
      seedTables.map((t) => ({
        restaurant_id: restaurantId,
        name: t.name,
        qr_code_value: `${appUrl}/r/${restaurantSlug}?table=${encodeURIComponent(t.name)}`,
      }))
    );

    await supabase
      .from('restaurants')
      .update({ cover_image_url: BANNER_URL })
      .eq('id', restaurantId);
  } catch {
    console.error('Failed to seed restaurant data — continuing without seed.');
  }
}
