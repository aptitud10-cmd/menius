import type { Restaurant, Category, Product } from '@/types';

const RID = 'demo-restaurant-id';
const now = new Date().toISOString();
const older = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

const CAT_DESAYUNOS = 'demo-cat-desayunos';
const CAT_ALMUERZOS = 'demo-cat-almuerzos';
const CAT_CENAS = 'demo-cat-cenas';
const CAT_APERITIVOS = 'demo-cat-aperitivos';
const CAT_BEBIDAS = 'demo-cat-bebidas';
const CAT_LICORES = 'demo-cat-licores';
const CAT_TORTAS = 'demo-cat-tortas';

export const demoRestaurant: Restaurant = {
  id: RID,
  name: 'La Casa del Sabor',
  slug: 'la-casa-del-sabor',
  owner_user_id: 'demo-owner',
  timezone: 'America/Mexico_City',
  currency: 'USD',
  logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop&q=80',
  cover_image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&h=600&fit=crop&q=80',
  description: 'Sabores auténticos mexicanos con un toque contemporáneo. Ingredientes frescos, recetas de la abuela.',
  address: 'Av. Paseo de la Reforma 456, Col. Juárez, CDMX',
  latitude: 19.4284,
  longitude: -99.1676,
  phone: '+52 55 1234 5678',
  email: 'hola@lacocinamenius.com',
  website: 'https://menius.app',
  is_active: true,
  order_types_enabled: ['dine_in', 'pickup', 'delivery'],
  payment_methods_enabled: ['cash', 'online'],
  estimated_delivery_minutes: 30,
  delivery_fee: 3.99,
  operating_hours: {
    monday: { open: '08:00', close: '22:00' },
    tuesday: { open: '08:00', close: '22:00' },
    wednesday: { open: '08:00', close: '22:00' },
    thursday: { open: '08:00', close: '23:00' },
    friday: { open: '08:00', close: '23:30' },
    saturday: { open: '09:00', close: '23:30' },
    sunday: { open: '09:00', close: '21:00' },
  },
  country_code: 'MX',
  tax_rate: 16,
  tax_included: true,
  tax_label: 'IVA',
  created_at: older,
};

export const demoCategories: Category[] = [
  { id: CAT_DESAYUNOS, restaurant_id: RID, name: 'Desayunos', sort_order: 1, is_active: true, created_at: now },
  { id: CAT_ALMUERZOS, restaurant_id: RID, name: 'Almuerzos', sort_order: 2, is_active: true, created_at: now },
  { id: CAT_CENAS, restaurant_id: RID, name: 'Cenas', sort_order: 3, is_active: true, created_at: now },
  { id: CAT_APERITIVOS, restaurant_id: RID, name: 'Aperitivos', sort_order: 4, is_active: true, created_at: now },
  { id: CAT_BEBIDAS, restaurant_id: RID, name: 'Bebidas', sort_order: 5, is_active: true, created_at: now },
  { id: CAT_LICORES, restaurant_id: RID, name: 'Licores', sort_order: 6, is_active: true, created_at: now },
  { id: CAT_TORTAS, restaurant_id: RID, name: 'Tortas', sort_order: 7, is_active: true, created_at: now },
];

const P_CHILAQUILES = 'demo-p-chilaquiles';
const P_BURGER = 'demo-p-burger';
const P_PIZZA = 'demo-p-pizza';
const P_ALITAS = 'demo-p-alitas';
const P_LIMONADA = 'demo-p-limonada';
const P_MARGARITA = 'demo-p-margarita';
const P_CHURROS = 'demo-p-churros';

export const demoProducts: Product[] = [
  // ── Desayunos ──
  {
    id: P_CHILAQUILES, restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Chilaquiles Verdes',
    description: 'Totopos bañados en salsa verde con crema, queso fresco, cebolla y huevo estrellado.',
    price: 9.99, image_url: '/seed/es/chilaquiles.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older,
    variants: [
      { id: 'v-chil-huevo', product_id: P_CHILAQUILES, name: 'Con huevo estrellado', price_delta: 0, sort_order: 1 },
      { id: 'v-chil-pollo', product_id: P_CHILAQUILES, name: 'Con pollo deshebrado', price_delta: 2.50, sort_order: 2 },
    ],
    extras: [],
    modifier_groups: [
      {
        id: 'mg-chil-proteina', product_id: P_CHILAQUILES, name: 'Proteina', selection_type: 'single' as const,
        min_select: 1, max_select: 1, is_required: true, sort_order: 0,
        options: [
          { id: 'mo-chil-huevo', group_id: 'mg-chil-proteina', name: 'Con huevo estrellado', price_delta: 0, is_default: false, sort_order: 0 },
          { id: 'mo-chil-pollo', group_id: 'mg-chil-proteina', name: 'Con pollo deshebrado', price_delta: 2.50, is_default: false, sort_order: 1 },
        ],
      },
    ],
  },
  {
    id: 'demo-p-huevos', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Huevos Rancheros',
    description: 'Huevos estrellados sobre tortilla con salsa roja, frijoles refritos y aguacate.',
    price: 8.99, image_url: '/seed/es/huevos-rancheros.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-hotcakes', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Hot Cakes con Fruta',
    description: 'Tres hot cakes esponjosos con miel de maple, mantequilla y fruta fresca de temporada.',
    price: 10.99, image_url: '/seed/es/hotcakes.webp',
    is_active: true, sort_order: 3, created_at: now, dietary_tags: ['vegetarian'], variants: [], extras: [],
  },
  {
    id: 'demo-p-molletes', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Molletes Especiales',
    description: 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate.',
    price: 7.49, image_url: '/seed/es/molletes.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-omelette', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Omelette de Verduras',
    description: 'Omelette relleno de champiñones, espinaca, pimiento y queso manchego.',
    price: 12.49, image_url: '/seed/es/omelette.webp',
    is_active: true, sort_order: 5, created_at: older, dietary_tags: ['vegetarian', 'gluten_free'], variants: [], extras: [],
  },
  {
    id: 'demo-p-avena', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Avena con Frutas',
    description: 'Avena caliente con leche, miel, granola, fresas y arándanos.',
    price: 6.99, image_url: '/seed/es/avena.webp',
    is_active: true, sort_order: 6, created_at: older, dietary_tags: ['vegetarian', 'dairy_free'], variants: [], extras: [],
  },

  // ── Almuerzos ──
  {
    id: P_BURGER, restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Hamburguesa MENIUS',
    description: 'Carne Angus 200g, queso cheddar, lechuga, tomate, cebolla caramelizada y salsa secreta.',
    price: 14.99, image_url: '/seed/es/hamburguesa.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older,
    variants: [
      { id: 'v-burger-s', product_id: P_BURGER, name: 'Sencilla', price_delta: 0, sort_order: 1 },
      { id: 'v-burger-d', product_id: P_BURGER, name: 'Doble carne', price_delta: 4.50, sort_order: 2 },
    ],
    extras: [
      { id: 'e-burger-tocino', product_id: P_BURGER, name: 'Tocino', price: 2.49, sort_order: 1 },
      { id: 'e-burger-aguacate', product_id: P_BURGER, name: 'Aguacate', price: 2.49, sort_order: 2 },
      { id: 'e-burger-aros', product_id: P_BURGER, name: 'Aros de cebolla', price: 2.99, sort_order: 3 },
    ],
    modifier_groups: [
      {
        id: 'mg-burger-tamano', product_id: P_BURGER, name: 'Tamano', selection_type: 'single' as const,
        min_select: 1, max_select: 1, is_required: true, sort_order: 0,
        options: [
          { id: 'mo-burger-s', group_id: 'mg-burger-tamano', name: 'Sencilla', price_delta: 0, is_default: false, sort_order: 0 },
          { id: 'mo-burger-d', group_id: 'mg-burger-tamano', name: 'Doble carne', price_delta: 4.50, is_default: false, sort_order: 1 },
        ],
      },
      {
        id: 'mg-burger-extras', product_id: P_BURGER, name: 'Extras', selection_type: 'multi' as const,
        min_select: 0, max_select: 5, is_required: false, sort_order: 1,
        options: [
          { id: 'mo-burger-tocino', group_id: 'mg-burger-extras', name: 'Tocino', price_delta: 2.49, is_default: false, sort_order: 0 },
          { id: 'mo-burger-aguacate', group_id: 'mg-burger-extras', name: 'Aguacate', price_delta: 2.49, is_default: false, sort_order: 1 },
          { id: 'mo-burger-aros', group_id: 'mg-burger-extras', name: 'Aros de cebolla', price_delta: 2.99, is_default: false, sort_order: 2 },
        ],
      },
    ],
  },
  {
    id: 'demo-p-pollo', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Pollo a la Plancha',
    description: 'Pechuga marinada a la plancha con arroz, ensalada y vegetales de temporada.',
    price: 13.99, image_url: '/seed/es/pollo.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-cesar', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Ensalada César',
    description: 'Lechuga romana, crutones, parmesano y aderezo césar casero.',
    price: 11.49, image_url: '/seed/es/ensalada.webp',
    is_active: true, sort_order: 3, created_at: older, dietary_tags: ['vegetarian'], variants: [], extras: [],
  },
  {
    id: 'demo-p-tacos', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Tacos al Pastor',
    description: 'Tres tacos de cerdo adobado con piña, cilantro y cebolla. Tortillas hechas a mano.',
    price: 12.99, image_url: '/seed/es/tacos.webp',
    is_active: true, is_featured: true, sort_order: 4, created_at: older, dietary_tags: ['spicy'], variants: [], extras: [],
  },
  {
    id: 'demo-p-pasta', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Pasta Alfredo',
    description: 'Fettuccine en cremosa salsa alfredo con parmesano, acompañado de pan de ajo.',
    price: 13.99, image_url: '/seed/es/pasta.webp',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-club', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Club Sándwich',
    description: 'Triple piso con pollo, tocino, lechuga, tomate, aguacate y papas a la francesa.',
    price: 13.49, image_url: '/seed/es/molletes.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },

  // ── Cenas ──
  {
    id: 'demo-p-salmon', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Salmón a la Parrilla',
    description: 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas.',
    price: 24.99, image_url: '/seed/es/salmon.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older, dietary_tags: ['gluten_free'], variants: [], extras: [],
  },
  {
    id: P_PIZZA, restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Pizza Margherita',
    description: 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca.',
    price: 15.99, image_url: '/seed/es/pizza.webp',
    is_active: true, sort_order: 2, created_at: older,
    variants: [
      { id: 'v-pizza-ind', product_id: P_PIZZA, name: 'Individual (20 cm)', price_delta: 0, sort_order: 1 },
      { id: 'v-pizza-med', product_id: P_PIZZA, name: 'Mediana (30 cm)', price_delta: 5.00, sort_order: 2 },
      { id: 'v-pizza-fam', product_id: P_PIZZA, name: 'Familiar (40 cm)', price_delta: 10.00, sort_order: 3 },
    ],
    extras: [
      { id: 'e-pizza-pepp', product_id: P_PIZZA, name: 'Pepperoni', price: 2.49, sort_order: 1 },
      { id: 'e-pizza-champi', product_id: P_PIZZA, name: 'Champiñones', price: 1.99, sort_order: 2 },
    ],
  },
  {
    id: 'demo-p-filete', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Filete de Res',
    description: 'Corte grueso de res a la parrilla con puré de papa, espárragos y salsa de vino tinto.',
    price: 28.99, image_url: '/seed/es/filete.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-enchiladas', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Enchiladas Suizas',
    description: 'Tortillas rellenas de pollo bañadas en salsa verde con crema y queso gratinado.',
    price: 14.99, image_url: '/seed/es/chilaquiles.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-sopa', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Sopa de Tortilla',
    description: 'Caldo de jitomate con tiras de tortilla, aguacate, crema, queso y chile pasilla.',
    price: 8.99, image_url: '/seed/es/sopa.webp',
    is_active: true, sort_order: 5, created_at: older, dietary_tags: ['vegetarian', 'gluten_free'], variants: [], extras: [],
  },
  {
    id: 'demo-p-quesadillas', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Quesadillas de Flor de Calabaza',
    description: 'Tortillas de maíz rellenas de flor de calabaza, queso Oaxaca y epazote.',
    price: 9.99, image_url: '/seed/es/tacos.webp',
    is_active: true, sort_order: 6, created_at: now, dietary_tags: ['vegetarian'], variants: [], extras: [],
  },

  // ── Aperitivos ──
  {
    id: 'demo-p-guacamole', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Guacamole Fresco',
    description: 'Aguacate machacado con cebolla, cilantro, chile serrano y limón. Servido con totopos.',
    price: 8.50, image_url: '/seed/es/guacamole.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older, dietary_tags: ['vegan', 'gluten_free'], variants: [], extras: [],
  },
  {
    id: 'demo-p-ceviche', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Ceviche de Camarón',
    description: 'Camarones frescos marinados en limón con pepino, cebolla morada y aguacate.',
    price: 12.99, image_url: '/seed/es/ensalada.webp',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-nachos', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Nachos Supremos',
    description: 'Totopos con queso fundido, jalapeños, crema, guacamole y pico de gallo.',
    price: 11.99, image_url: '/seed/es/nachos.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-empanadas', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Empanadas de Queso',
    description: 'Tres empanadas crujientes rellenas de queso con salsa ranchera.',
    price: 7.99, image_url: '/seed/es/empanadas.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-aros', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Aros de Cebolla',
    description: 'Aros de cebolla empanizados y crujientes con dip de chipotle.',
    price: 6.99, image_url: '/seed/es/aros-cebolla.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: P_ALITAS, restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Alitas BBQ',
    description: 'Alitas de pollo bañadas en salsa barbecue, servidas con apio y aderezo ranch.',
    price: 12.99, image_url: '/seed/es/alitas.webp',
    is_active: true, sort_order: 6, created_at: older,
    variants: [
      { id: 'v-alitas-6', product_id: P_ALITAS, name: '6 piezas', price_delta: 0, sort_order: 1 },
      { id: 'v-alitas-12', product_id: P_ALITAS, name: '12 piezas', price_delta: 6.00, sort_order: 2 },
    ],
    extras: [],
  },

  // ── Bebidas ──
  {
    id: P_LIMONADA, restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Limonada Natural',
    description: 'Limonada recién exprimida con hierbabuena y hielo.',
    price: 3.99, image_url: '/seed/es/limonada.webp',
    is_active: true, sort_order: 1, created_at: older,
    variants: [
      { id: 'v-lim-ch', product_id: P_LIMONADA, name: 'Chica (350 ml)', price_delta: 0, sort_order: 1 },
      { id: 'v-lim-gr', product_id: P_LIMONADA, name: 'Grande (500 ml)', price_delta: 1.50, sort_order: 2 },
    ],
    extras: [],
  },
  {
    id: 'demo-p-cafe', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Café de Olla',
    description: 'Café de grano con piloncillo y canela, estilo tradicional mexicano.',
    price: 3.49, image_url: '/seed/es/cafe.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-horchata', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Agua de Horchata',
    description: 'Agua fresca de arroz con canela y un toque de vainilla.',
    price: 4.00, image_url: '/seed/es/horchata.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-jugo', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Jugo Natural',
    description: 'Jugo recién exprimido de naranja, zanahoria o verde.',
    price: 5.49, image_url: '/seed/es/jugo.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-refresco', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Refresco',
    description: 'Coca-Cola, Sprite, Fanta o agua mineral con gas.',
    price: 2.99, image_url: '/seed/es/limonada.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-agua', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Agua Mineral',
    description: 'Botella de agua purificada o mineral de 500ml.',
    price: 2.49, image_url: '/seed/es/limonada.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },

  // ── Licores ──
  {
    id: P_MARGARITA, restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Margarita Clásica',
    description: 'Tequila, triple sec, jugo de limón y sal en el borde. Refrescante y vibrante.',
    price: 11.99, image_url: '/seed/es/margarita.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older,
    variants: [
      { id: 'v-marg-nat', product_id: P_MARGARITA, name: 'Natural', price_delta: 0, sort_order: 1 },
      { id: 'v-marg-mango', product_id: P_MARGARITA, name: 'De mango', price_delta: 1.50, sort_order: 2 },
      { id: 'v-marg-tam', product_id: P_MARGARITA, name: 'De tamarindo', price_delta: 1.50, sort_order: 3 },
    ],
    extras: [],
  },
  {
    id: 'demo-p-cerveza', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Cerveza Artesanal',
    description: 'Selección de cervezas artesanales locales. Pregunta por la carta del día.',
    price: 7.99, image_url: '/seed/es/cerveza.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-mezcal', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Mezcal Oaxaqueño',
    description: 'Mezcal joven artesanal servido con naranja y sal de gusano.',
    price: 9.99, image_url: '/seed/es/mezcal.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-mojito', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Mojito',
    description: 'Ron blanco, hierbabuena fresca, limón, azúcar y soda.',
    price: 11.49, image_url: '/seed/es/mojito.webp',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-vino', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Copa de Vino Tinto',
    description: 'Selección de vino tinto de casa del Valle de Guadalupe.',
    price: 9.99, image_url: '/seed/es/cerveza.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-michelada', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Michelada Clásica',
    description: 'Cerveza con jugo de limón, sal, salsa picante y chamoy.',
    price: 7.49, image_url: '/seed/es/cerveza.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },

  // ── Tortas (Postres) ──
  {
    id: 'demo-p-flan', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Flan Napolitano',
    description: 'Flan cremoso de vainilla con caramelo casero.',
    price: 6.99, image_url: '/seed/es/flan.webp',
    is_active: true, sort_order: 1, created_at: older, variants: [], extras: [],
  },
  {
    id: P_CHURROS, restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Churros con Chocolate',
    description: 'Churros crujientes espolvoreados con azúcar y canela, con salsa de chocolate belga.',
    price: 7.49, image_url: '/seed/es/churros.webp',
    is_active: true, sort_order: 2, created_at: now,
    variants: [],
    extras: [
      { id: 'e-churros-helado', product_id: P_CHURROS, name: 'Bola de helado', price: 2.49, sort_order: 1 },
      { id: 'e-churros-cajeta', product_id: P_CHURROS, name: 'Cajeta', price: 1.99, sort_order: 2 },
    ],
  },
  {
    id: 'demo-p-tresleches', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Pastel de Tres Leches',
    description: 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas.',
    price: 8.49, image_url: '/seed/es/tres-leches.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-brownie', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Brownie con Helado',
    description: 'Brownie de chocolate caliente con helado de vainilla y salsa de chocolate.',
    price: 9.49, image_url: '/seed/es/brownie.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-helado', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Helado Artesanal',
    description: 'Dos bolas de helado artesanal. Sabores: vainilla, chocolate, fresa o mango.',
    price: 5.99, image_url: '/seed/es/helado.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'demo-p-pay', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Pay de Queso',
    description: 'Pay de queso estilo New York con base de galleta y mermelada de frutos rojos.',
    price: 7.99, image_url: '/seed/es/pay-queso.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },
];
