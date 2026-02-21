import type { Restaurant, Category, Product } from '@/types';

const RID = 'demo-restaurant-id';
const now = new Date().toISOString();

const CAT_DESAYUNOS = 'demo-cat-desayunos';
const CAT_ALMUERZOS = 'demo-cat-almuerzos';
const CAT_CENAS = 'demo-cat-cenas';
const CAT_APERITIVOS = 'demo-cat-aperitivos';
const CAT_BEBIDAS = 'demo-cat-bebidas';
const CAT_LICORES = 'demo-cat-licores';
const CAT_TORTAS = 'demo-cat-tortas';

export const demoRestaurant: Restaurant = {
  id: RID,
  name: 'Demo Menius',
  slug: 'demo',
  owner_user_id: 'demo-owner',
  timezone: 'America/Mexico_City',
  currency: 'MXN',
  logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop&q=80',
  cover_image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&h=600&fit=crop&q=80',
  description: 'Sabores auténticos mexicanos con un toque contemporáneo. Ingredientes frescos, recetas de la abuela.',
  address: 'Av. Paseo de la Reforma 456, Col. Juárez, CDMX',
  phone: '+52 55 1234 5678',
  email: 'hola@lacocinamenius.com',
  website: 'https://menius.app',
  is_active: true,
  order_types_enabled: ['dine_in', 'pickup', 'delivery'],
  payment_methods_enabled: ['cash', 'online'],
  operating_hours: {
    monday: { open: '08:00', close: '22:00' },
    tuesday: { open: '08:00', close: '22:00' },
    wednesday: { open: '08:00', close: '22:00' },
    thursday: { open: '08:00', close: '23:00' },
    friday: { open: '08:00', close: '23:30' },
    saturday: { open: '09:00', close: '23:30' },
    sunday: { open: '09:00', close: '21:00' },
  },
  created_at: now,
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
    price: 95, image_url: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=600&h=400&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'v-chil-huevo', product_id: P_CHILAQUILES, name: 'Con huevo estrellado', price_delta: 0, sort_order: 1 },
      { id: 'v-chil-pollo', product_id: P_CHILAQUILES, name: 'Con pollo deshebrado', price_delta: 25, sort_order: 2 },
    ],
    extras: [],
    modifier_groups: [
      {
        id: 'mg-chil-proteina', product_id: P_CHILAQUILES, name: 'Proteina', selection_type: 'single' as const,
        min_select: 1, max_select: 1, is_required: true, sort_order: 0,
        options: [
          { id: 'mo-chil-huevo', group_id: 'mg-chil-proteina', name: 'Con huevo estrellado', price_delta: 0, is_default: false, sort_order: 0 },
          { id: 'mo-chil-pollo', group_id: 'mg-chil-proteina', name: 'Con pollo deshebrado', price_delta: 25, is_default: false, sort_order: 1 },
        ],
      },
    ],
  },
  {
    id: 'demo-p-huevos', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Huevos Rancheros',
    description: 'Huevos estrellados sobre tortilla con salsa roja, frijoles refritos y aguacate.',
    price: 85, image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-hotcakes', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Hot Cakes con Fruta',
    description: 'Tres hot cakes esponjosos con miel de maple, mantequilla y fruta fresca de temporada.',
    price: 78, image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-molletes', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Molletes Especiales',
    description: 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate.',
    price: 72, image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-omelette', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Omelette de Verduras',
    description: 'Omelette relleno de champiñones, espinaca, pimiento y queso manchego.',
    price: 89, image_url: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-avena', restaurant_id: RID, category_id: CAT_DESAYUNOS,
    name: 'Avena con Frutas',
    description: 'Avena caliente con leche, miel, granola, fresas y arándanos.',
    price: 65, image_url: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Almuerzos ──
  {
    id: P_BURGER, restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Hamburguesa MENIUS',
    description: 'Carne Angus 200g, queso cheddar, lechuga, tomate, cebolla caramelizada y salsa secreta.',
    price: 165, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'v-burger-s', product_id: P_BURGER, name: 'Sencilla', price_delta: 0, sort_order: 1 },
      { id: 'v-burger-d', product_id: P_BURGER, name: 'Doble carne', price_delta: 45, sort_order: 2 },
    ],
    extras: [
      { id: 'e-burger-tocino', product_id: P_BURGER, name: 'Tocino', price: 25, sort_order: 1 },
      { id: 'e-burger-aguacate', product_id: P_BURGER, name: 'Aguacate', price: 20, sort_order: 2 },
      { id: 'e-burger-aros', product_id: P_BURGER, name: 'Aros de cebolla', price: 30, sort_order: 3 },
    ],
    modifier_groups: [
      {
        id: 'mg-burger-tamano', product_id: P_BURGER, name: 'Tamano', selection_type: 'single' as const,
        min_select: 1, max_select: 1, is_required: true, sort_order: 0,
        options: [
          { id: 'mo-burger-s', group_id: 'mg-burger-tamano', name: 'Sencilla', price_delta: 0, is_default: false, sort_order: 0 },
          { id: 'mo-burger-d', group_id: 'mg-burger-tamano', name: 'Doble carne', price_delta: 45, is_default: false, sort_order: 1 },
        ],
      },
      {
        id: 'mg-burger-extras', product_id: P_BURGER, name: 'Extras', selection_type: 'multi' as const,
        min_select: 0, max_select: 5, is_required: false, sort_order: 1,
        options: [
          { id: 'mo-burger-tocino', group_id: 'mg-burger-extras', name: 'Tocino', price_delta: 25, is_default: false, sort_order: 0 },
          { id: 'mo-burger-aguacate', group_id: 'mg-burger-extras', name: 'Aguacate', price_delta: 20, is_default: false, sort_order: 1 },
          { id: 'mo-burger-aros', group_id: 'mg-burger-extras', name: 'Aros de cebolla', price_delta: 30, is_default: false, sort_order: 2 },
        ],
      },
    ],
  },
  {
    id: 'demo-p-pollo', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Pollo a la Plancha',
    description: 'Pechuga marinada a la plancha con arroz, ensalada y vegetales de temporada.',
    price: 135, image_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-cesar', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Ensalada César',
    description: 'Lechuga romana, crutones, parmesano y aderezo césar casero.',
    price: 110, image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-tacos', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Tacos al Pastor',
    description: 'Tres tacos de cerdo adobado con piña, cilantro y cebolla. Tortillas hechas a mano.',
    price: 95, image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-pasta', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Pasta Alfredo',
    description: 'Fettuccine en cremosa salsa alfredo con parmesano, acompañado de pan de ajo.',
    price: 140, image_url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-club', restaurant_id: RID, category_id: CAT_ALMUERZOS,
    name: 'Club Sándwich',
    description: 'Triple piso con pollo, tocino, lechuga, tomate, aguacate y papas a la francesa.',
    price: 125, image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Cenas ──
  {
    id: 'demo-p-salmon', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Salmón a la Parrilla',
    description: 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas.',
    price: 245, image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now, variants: [], extras: [],
  },
  {
    id: P_PIZZA, restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Pizza Margherita',
    description: 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca.',
    price: 180, image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now,
    variants: [
      { id: 'v-pizza-ind', product_id: P_PIZZA, name: 'Individual (20 cm)', price_delta: 0, sort_order: 1 },
      { id: 'v-pizza-med', product_id: P_PIZZA, name: 'Mediana (30 cm)', price_delta: 60, sort_order: 2 },
      { id: 'v-pizza-fam', product_id: P_PIZZA, name: 'Familiar (40 cm)', price_delta: 120, sort_order: 3 },
    ],
    extras: [
      { id: 'e-pizza-pepp', product_id: P_PIZZA, name: 'Pepperoni', price: 25, sort_order: 1 },
      { id: 'e-pizza-champi', product_id: P_PIZZA, name: 'Champiñones', price: 20, sort_order: 2 },
    ],
  },
  {
    id: 'demo-p-filete', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Filete de Res',
    description: 'Corte grueso de res a la parrilla con puré de papa, espárragos y salsa de vino tinto.',
    price: 285, image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-enchiladas', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Enchiladas Suizas',
    description: 'Tortillas rellenas de pollo bañadas en salsa verde con crema y queso gratinado.',
    price: 145, image_url: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-sopa', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Sopa de Tortilla',
    description: 'Caldo de jitomate con tiras de tortilla, aguacate, crema, queso y chile pasilla.',
    price: 85, image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-quesadillas', restaurant_id: RID, category_id: CAT_CENAS,
    name: 'Quesadillas de Flor de Calabaza',
    description: 'Tortillas de maíz rellenas de flor de calabaza, queso Oaxaca y epazote.',
    price: 95, image_url: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Aperitivos ──
  {
    id: 'demo-p-guacamole', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Guacamole Fresco',
    description: 'Aguacate machacado con cebolla, cilantro, chile serrano y limón. Servido con totopos.',
    price: 89, image_url: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-ceviche', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Ceviche de Camarón',
    description: 'Camarones frescos marinados en limón con pepino, cebolla morada y aguacate.',
    price: 120, image_url: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-nachos', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Nachos Supremos',
    description: 'Totopos con queso fundido, jalapeños, crema, guacamole y pico de gallo.',
    price: 110, image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-empanadas', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Empanadas de Queso',
    description: 'Tres empanadas crujientes rellenas de queso con salsa ranchera.',
    price: 75, image_url: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=600&h=400&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-aros', restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Aros de Cebolla',
    description: 'Aros de cebolla empanizados y crujientes con dip de chipotle.',
    price: 69, image_url: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: P_ALITAS, restaurant_id: RID, category_id: CAT_APERITIVOS,
    name: 'Alitas BBQ',
    description: 'Alitas de pollo bañadas en salsa barbecue, servidas con apio y aderezo ranch.',
    price: 125, image_url: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&h=400&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now,
    variants: [
      { id: 'v-alitas-6', product_id: P_ALITAS, name: '6 piezas', price_delta: 0, sort_order: 1 },
      { id: 'v-alitas-12', product_id: P_ALITAS, name: '12 piezas', price_delta: 60, sort_order: 2 },
    ],
    extras: [],
  },

  // ── Bebidas ──
  {
    id: P_LIMONADA, restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Limonada Natural',
    description: 'Limonada recién exprimida con hierbabuena y hielo.',
    price: 45, image_url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'v-lim-ch', product_id: P_LIMONADA, name: 'Chica (350 ml)', price_delta: 0, sort_order: 1 },
      { id: 'v-lim-gr', product_id: P_LIMONADA, name: 'Grande (500 ml)', price_delta: 15, sort_order: 2 },
    ],
    extras: [],
  },
  {
    id: 'demo-p-cafe', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Café de Olla',
    description: 'Café de grano con piloncillo y canela, estilo tradicional mexicano.',
    price: 40, image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-horchata', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Agua de Horchata',
    description: 'Agua fresca de arroz con canela y un toque de vainilla.',
    price: 38, image_url: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-jugo', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Jugo Natural',
    description: 'Jugo recién exprimido de naranja, zanahoria o verde.',
    price: 48, image_url: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-refresco', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Refresco',
    description: 'Coca-Cola, Sprite, Fanta o agua mineral con gas.',
    price: 35, image_url: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-agua', restaurant_id: RID, category_id: CAT_BEBIDAS,
    name: 'Agua Mineral',
    description: 'Botella de agua purificada o mineral de 500ml.',
    price: 28, image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Licores ──
  {
    id: P_MARGARITA, restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Margarita Clásica',
    description: 'Tequila, triple sec, jugo de limón y sal en el borde. Refrescante y vibrante.',
    price: 120, image_url: 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'v-marg-nat', product_id: P_MARGARITA, name: 'Natural', price_delta: 0, sort_order: 1 },
      { id: 'v-marg-mango', product_id: P_MARGARITA, name: 'De mango', price_delta: 15, sort_order: 2 },
      { id: 'v-marg-tam', product_id: P_MARGARITA, name: 'De tamarindo', price_delta: 15, sort_order: 3 },
    ],
    extras: [],
  },
  {
    id: 'demo-p-cerveza', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Cerveza Artesanal',
    description: 'Selección de cervezas artesanales locales. Pregunta por la carta del día.',
    price: 75, image_url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-mezcal', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Mezcal Oaxaqueño',
    description: 'Mezcal joven artesanal servido con naranja y sal de gusano.',
    price: 95, image_url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-mojito', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Mojito',
    description: 'Ron blanco, hierbabuena fresca, limón, azúcar y soda.',
    price: 110, image_url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-vino', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Copa de Vino Tinto',
    description: 'Selección de vino tinto de casa del Valle de Guadalupe.',
    price: 85, image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-michelada', restaurant_id: RID, category_id: CAT_LICORES,
    name: 'Michelada Clásica',
    description: 'Cerveza con jugo de limón, sal, salsa picante y chamoy.',
    price: 75, image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Tortas (Postres) ──
  {
    id: 'demo-p-flan', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Flan Napolitano',
    description: 'Flan cremoso de vainilla con caramelo casero.',
    price: 55, image_url: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 1, created_at: now, variants: [], extras: [],
  },
  {
    id: P_CHURROS, restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Churros con Chocolate',
    description: 'Churros crujientes espolvoreados con azúcar y canela, con salsa de chocolate belga.',
    price: 65, image_url: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=600&h=400&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now,
    variants: [],
    extras: [
      { id: 'e-churros-helado', product_id: P_CHURROS, name: 'Bola de helado', price: 20, sort_order: 1 },
      { id: 'e-churros-cajeta', product_id: P_CHURROS, name: 'Cajeta', price: 15, sort_order: 2 },
    ],
  },
  {
    id: 'demo-p-tresleches', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Pastel de Tres Leches',
    description: 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas.',
    price: 75, image_url: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-brownie', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Brownie con Helado',
    description: 'Brownie de chocolate caliente con helado de vainilla y salsa de chocolate.',
    price: 85, image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-helado', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Helado Artesanal',
    description: 'Dos bolas de helado artesanal. Sabores: vainilla, chocolate, fresa o mango.',
    price: 55, image_url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-pay', restaurant_id: RID, category_id: CAT_TORTAS,
    name: 'Pay de Queso',
    description: 'Pay de queso estilo New York con base de galleta y mermelada de frutos rojos.',
    price: 70, image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },
];
