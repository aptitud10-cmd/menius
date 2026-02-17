import type { Restaurant, Category, Product } from '@/types';

// ============================================================
// MENIUS — Hardcoded Demo Restaurant Data
// Used as fallback when the demo restaurant is not in the DB
// ============================================================

const RESTAURANT_ID = 'demo-restaurant-id';
const now = new Date().toISOString();

// Category IDs
const CAT_ENTRADAS = 'demo-cat-entradas';
const CAT_FUERTES = 'demo-cat-fuertes';
const CAT_POSTRES = 'demo-cat-postres';
const CAT_BEBIDAS = 'demo-cat-bebidas';
const CAT_ESPECIALES = 'demo-cat-especiales';
const CAT_DESAYUNOS = 'demo-cat-desayunos';

// Product IDs (for variants/extras)
const P_TACOS = 'demo-p-tacos';
const P_BURGER = 'demo-p-burger';
const P_SALMON = 'demo-p-salmon';
const P_PIZZA = 'demo-p-pizza';
const P_LIMONADA = 'demo-p-limonada';
const P_CAFE = 'demo-p-cafe';

export const demoRestaurant: Restaurant = {
  id: RESTAURANT_ID,
  name: 'La Cocina de MENIUS',
  slug: 'demo',
  owner_user_id: 'demo-owner',
  timezone: 'America/Mexico_City',
  currency: 'MXN',
  logo_url: null,
  cover_image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&h=600&fit=crop&q=80',
  description: 'Sabores auténticos mexicanos con un toque contemporáneo. Ingredientes frescos, recetas de la abuela y un ambiente único.',
  address: 'Av. Paseo de la Reforma 456, Col. Juárez, CDMX',
  phone: '+52 55 1234 5678',
  email: 'hola@lacocinamenius.com',
  website: 'https://menius.app',
  is_active: true,
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
  { id: CAT_ENTRADAS, restaurant_id: RESTAURANT_ID, name: 'Entradas', sort_order: 1, is_active: true, created_at: now },
  { id: CAT_FUERTES, restaurant_id: RESTAURANT_ID, name: 'Platos Fuertes', sort_order: 2, is_active: true, created_at: now },
  { id: CAT_POSTRES, restaurant_id: RESTAURANT_ID, name: 'Postres', sort_order: 3, is_active: true, created_at: now },
  { id: CAT_BEBIDAS, restaurant_id: RESTAURANT_ID, name: 'Bebidas', sort_order: 4, is_active: true, created_at: now },
  { id: CAT_ESPECIALES, restaurant_id: RESTAURANT_ID, name: 'Especialidades del Chef', sort_order: 5, is_active: true, created_at: now },
  { id: CAT_DESAYUNOS, restaurant_id: RESTAURANT_ID, name: 'Desayunos', sort_order: 6, is_active: true, created_at: now },
];

export const demoProducts: Product[] = [
  // ── Entradas ──
  {
    id: 'demo-p-guacamole', restaurant_id: RESTAURANT_ID, category_id: CAT_ENTRADAS,
    name: 'Guacamole Fresco',
    description: 'Aguacate machacado con cebolla, cilantro, chile serrano y limón. Servido con totopos artesanales.',
    price: 89, image_url: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=600&h=600&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-quesadillas', restaurant_id: RESTAURANT_ID, category_id: CAT_ENTRADAS,
    name: 'Quesadillas de Flor de Calabaza',
    description: 'Tortillas de maíz rellenas de flor de calabaza, queso Oaxaca y epazote.',
    price: 75, image_url: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-ceviche', restaurant_id: RESTAURANT_ID, category_id: CAT_ENTRADAS,
    name: 'Ceviche de Camarón',
    description: 'Camarones frescos marinados en limón con pepino, cebolla morada, chile y aguacate.',
    price: 120, image_url: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  // ── Platos Fuertes ──
  {
    id: P_TACOS, restaurant_id: RESTAURANT_ID, category_id: CAT_FUERTES,
    name: 'Tacos al Pastor',
    description: 'Tres tacos de cerdo adobado con piña, cebolla y cilantro. Tortillas hechas a mano.',
    price: 95, image_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=600&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'v-tacos-3', product_id: P_TACOS, name: '3 piezas', price_delta: 0, sort_order: 1 },
      { id: 'v-tacos-5', product_id: P_TACOS, name: '5 piezas', price_delta: 30, sort_order: 2 },
      { id: 'v-tacos-10', product_id: P_TACOS, name: '10 piezas (para compartir)', price_delta: 85, sort_order: 3 },
    ],
    extras: [
      { id: 'e-tacos-habanero', product_id: P_TACOS, name: 'Extra salsa habanero', price: 10, sort_order: 1 },
      { id: 'e-tacos-queso', product_id: P_TACOS, name: 'Queso fundido', price: 20, sort_order: 2 },
      { id: 'e-tacos-nopales', product_id: P_TACOS, name: 'Nopales asados', price: 15, sort_order: 3 },
    ],
  },
  {
    id: P_BURGER, restaurant_id: RESTAURANT_ID, category_id: CAT_FUERTES,
    name: 'Hamburguesa MENIUS',
    description: 'Carne Angus 200g, queso cheddar, lechuga, tomate, cebolla caramelizada y salsa secreta. Con papas.',
    price: 165, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 2, created_at: now,
    variants: [
      { id: 'v-burger-s', product_id: P_BURGER, name: 'Sencilla', price_delta: 0, sort_order: 1 },
      { id: 'v-burger-d', product_id: P_BURGER, name: 'Doble carne', price_delta: 45, sort_order: 2 },
    ],
    extras: [
      { id: 'e-burger-cheddar', product_id: P_BURGER, name: 'Extra queso cheddar', price: 20, sort_order: 1 },
      { id: 'e-burger-tocino', product_id: P_BURGER, name: 'Tocino', price: 25, sort_order: 2 },
      { id: 'e-burger-aros', product_id: P_BURGER, name: 'Aros de cebolla', price: 30, sort_order: 3 },
      { id: 'e-burger-jalap', product_id: P_BURGER, name: 'Jalapeños', price: 10, sort_order: 4 },
    ],
  },
  {
    id: P_SALMON, restaurant_id: RESTAURANT_ID, category_id: CAT_FUERTES,
    name: 'Salmón a la Parrilla',
    description: 'Filete de salmón con costra de hierbas, puré de camote y verduras salteadas.',
    price: 245, image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now,
    variants: [],
    extras: [
      { id: 'e-salmon-pure', product_id: P_SALMON, name: 'Extra puré de camote', price: 25, sort_order: 1 },
      { id: 'e-salmon-ensalada', product_id: P_SALMON, name: 'Ensalada verde', price: 30, sort_order: 2 },
    ],
  },
  {
    id: P_PIZZA, restaurant_id: RESTAURANT_ID, category_id: CAT_FUERTES,
    name: 'Pizza Margherita',
    description: 'Masa artesanal, salsa de tomate San Marzano, mozzarella fresca y albahaca.',
    price: 180, image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now,
    variants: [
      { id: 'v-pizza-ind', product_id: P_PIZZA, name: 'Individual (20 cm)', price_delta: 0, sort_order: 1 },
      { id: 'v-pizza-med', product_id: P_PIZZA, name: 'Mediana (30 cm)', price_delta: 60, sort_order: 2 },
      { id: 'v-pizza-fam', product_id: P_PIZZA, name: 'Familiar (40 cm)', price_delta: 120, sort_order: 3 },
    ],
    extras: [
      { id: 'e-pizza-pepperoni', product_id: P_PIZZA, name: 'Pepperoni', price: 25, sort_order: 1 },
      { id: 'e-pizza-champi', product_id: P_PIZZA, name: 'Champiñones', price: 20, sort_order: 2 },
      { id: 'e-pizza-aceitunas', product_id: P_PIZZA, name: 'Aceitunas', price: 15, sort_order: 3 },
      { id: 'e-pizza-mozz', product_id: P_PIZZA, name: 'Extra mozzarella', price: 30, sort_order: 4 },
    ],
  },
  {
    id: 'demo-p-enchiladas', restaurant_id: RESTAURANT_ID, category_id: CAT_FUERTES,
    name: 'Enchiladas Suizas',
    description: 'Tortillas rellenas de pollo deshebrado bañadas en salsa verde con crema y queso gratinado.',
    price: 135, image_url: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  // ── Postres ──
  {
    id: 'demo-p-churros', restaurant_id: RESTAURANT_ID, category_id: CAT_POSTRES,
    name: 'Churros con Chocolate',
    description: 'Churros crujientes espolvoreados con azúcar y canela, servidos con salsa de chocolate belga.',
    price: 65, image_url: 'https://images.unsplash.com/photo-1624371414361-e670246c0660?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 1, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-flan', restaurant_id: RESTAURANT_ID, category_id: CAT_POSTRES,
    name: 'Flan Napolitano',
    description: 'Flan cremoso de vainilla con caramelo casero.',
    price: 55, image_url: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-tresleches', restaurant_id: RESTAURANT_ID, category_id: CAT_POSTRES,
    name: 'Pastel de Tres Leches',
    description: 'Bizcocho empapado en leche condensada, evaporada y crema, decorado con fresas.',
    price: 75, image_url: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  // ── Bebidas ──
  {
    id: P_LIMONADA, restaurant_id: RESTAURANT_ID, category_id: CAT_BEBIDAS,
    name: 'Limonada Natural',
    description: 'Limonada recién exprimida con hierbabuena y hielo.',
    price: 45, image_url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'v-lim-ch', product_id: P_LIMONADA, name: 'Chica (350 ml)', price_delta: 0, sort_order: 1 },
      { id: 'v-lim-gr', product_id: P_LIMONADA, name: 'Grande (500 ml)', price_delta: 15, sort_order: 2 },
      { id: 'v-lim-jarra', product_id: P_LIMONADA, name: 'Jarra (1 litro)', price_delta: 35, sort_order: 3 },
    ],
    extras: [],
  },
  {
    id: P_CAFE, restaurant_id: RESTAURANT_ID, category_id: CAT_BEBIDAS,
    name: 'Café de Olla',
    description: 'Café de grano con piloncillo y canela, estilo tradicional mexicano.',
    price: 40, image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now,
    variants: [
      { id: 'v-cafe-hot', product_id: P_CAFE, name: 'Caliente', price_delta: 0, sort_order: 1 },
      { id: 'v-cafe-cold', product_id: P_CAFE, name: 'Frío', price_delta: 10, sort_order: 2 },
    ],
    extras: [],
  },
  {
    id: 'demo-p-horchata', restaurant_id: RESTAURANT_ID, category_id: CAT_BEBIDAS,
    name: 'Agua de Horchata',
    description: 'Agua fresca de arroz con canela y un toque de vainilla.',
    price: 38, image_url: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-michelada', restaurant_id: RESTAURANT_ID, category_id: CAT_BEBIDAS,
    name: 'Michelada Clásica',
    description: 'Cerveza con jugo de limón, sal, salsa picante y chamoy.',
    price: 75, image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  // ── Especialidades del Chef ──
  {
    id: 'demo-p-mole', restaurant_id: RESTAURANT_ID, category_id: CAT_ESPECIALES,
    name: 'Mole Negro Oaxaqueño',
    description: 'Pollo en mole negro con más de 20 ingredientes, arroz rojo y tortillas calientes.',
    price: 195, image_url: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=600&h=600&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-cochinita', restaurant_id: RESTAURANT_ID, category_id: CAT_ESPECIALES,
    name: 'Cochinita Pibil',
    description: 'Cerdo marinado en achiote y naranja agria, cocido lentamente. Con cebolla morada encurtida.',
    price: 175, image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-chilesennogada', restaurant_id: RESTAURANT_ID, category_id: CAT_ESPECIALES,
    name: 'Chiles en Nogada',
    description: 'Chile poblano relleno de picadillo con frutas, bañado en nogada y granada. De temporada.',
    price: 220, image_url: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  // ── Desayunos ──
  {
    id: 'demo-p-chilaquiles', restaurant_id: RESTAURANT_ID, category_id: CAT_DESAYUNOS,
    name: 'Chilaquiles Verdes',
    description: 'Totopos bañados en salsa verde con crema, queso fresco, cebolla y huevo estrellado.',
    price: 85, image_url: 'https://images.unsplash.com/photo-1588157850899-6548e0cc1ed0?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 1, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-huevos', restaurant_id: RESTAURANT_ID, category_id: CAT_DESAYUNOS,
    name: 'Huevos Rancheros',
    description: 'Huevos estrellados sobre tortilla de maíz con salsa roja, frijoles refritos y aguacate.',
    price: 78, image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'demo-p-molletes', restaurant_id: RESTAURANT_ID, category_id: CAT_DESAYUNOS,
    name: 'Molletes Especiales',
    description: 'Bolillo abierto con frijoles refritos, queso gratinado, pico de gallo y aguacate.',
    price: 70, image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=600&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
];
