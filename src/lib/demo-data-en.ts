import type { Restaurant, Category, Product } from '@/types';

const RESTAURANT_ID = 'demo-buccaneer-id';
const now = new Date().toISOString();

const CAT_APPETIZERS = 'buc-cat-appetizers';
const CAT_MAINS = 'buc-cat-mains';
const CAT_GREEK = 'buc-cat-greek';
const CAT_BURGERS = 'buc-cat-burgers';
const CAT_DESSERTS = 'buc-cat-desserts';
const CAT_DRINKS = 'buc-cat-drinks';

const P_WINGS = 'buc-p-wings';
const P_CALAMARI = 'buc-p-calamari';
const P_EGGS = 'buc-p-eggs';
const P_STEAK = 'buc-p-steak';
const P_GYRO = 'buc-p-gyro';
const P_MOUSSAKA = 'buc-p-moussaka';
const P_CLASSIC_BURGER = 'buc-p-classic-burger';
const P_PHILLY = 'buc-p-philly';
const P_BAKLAVA = 'buc-p-baklava';
const P_LEMONADE = 'buc-p-lemonade';

export const buccaneerRestaurant: Restaurant = {
  id: RESTAURANT_ID,
  name: 'Buccaneer Diner',
  slug: 'buccaneer-diner',
  owner_user_id: 'demo-owner-en',
  timezone: 'America/New_York',
  currency: 'USD',
  locale: 'en',
  logo_url: null,
  cover_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=600&fit=crop&q=80',
  description: 'Where Greek tradition meets American comfort. Fresh ingredients, bold flavors, and a warm atmosphere since 1987.',
  address: '742 Harbor Blvd, Oceanside, CA 92054',
  phone: '+1 (760) 555-0147',
  email: 'hello@buccaneerdiner.com',
  website: 'https://menius.app',
  is_active: true,
  order_types_enabled: ['dine_in', 'pickup'],
  payment_methods_enabled: ['cash'],
  operating_hours: {
    monday: { open: '07:00', close: '22:00' },
    tuesday: { open: '07:00', close: '22:00' },
    wednesday: { open: '07:00', close: '22:00' },
    thursday: { open: '07:00', close: '23:00' },
    friday: { open: '07:00', close: '23:30' },
    saturday: { open: '08:00', close: '23:30' },
    sunday: { open: '08:00', close: '21:00' },
  },
  created_at: now,
};

export const buccaneerCategories: Category[] = [
  { id: CAT_APPETIZERS, restaurant_id: RESTAURANT_ID, name: 'Appetizers', sort_order: 1, is_active: true, created_at: now },
  { id: CAT_MAINS, restaurant_id: RESTAURANT_ID, name: 'Main Courses', sort_order: 2, is_active: true, created_at: now },
  { id: CAT_GREEK, restaurant_id: RESTAURANT_ID, name: 'Greek Specialties', sort_order: 3, is_active: true, created_at: now },
  { id: CAT_BURGERS, restaurant_id: RESTAURANT_ID, name: 'Burgers & Sandwiches', sort_order: 4, is_active: true, created_at: now },
  { id: CAT_DESSERTS, restaurant_id: RESTAURANT_ID, name: 'Desserts', sort_order: 5, is_active: true, created_at: now },
  { id: CAT_DRINKS, restaurant_id: RESTAURANT_ID, name: 'Drinks', sort_order: 6, is_active: true, created_at: now },
];

export const buccaneerProducts: Product[] = [
  // ── Appetizers ──
  {
    id: P_WINGS,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_APPETIZERS,
    name: 'Buffalo Wings',
    description: 'Crispy wings tossed in your choice of sauce, served with celery sticks and blue cheese dip.',
    price: 12.99,
    image_url: 'https://images.unsplash.com/photo-1608039829572-9b0088ca6e13?w=800&h=600&fit=crop&q=80',
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: now,
    variants: [
      { id: 'buc-v-wings-6', product_id: P_WINGS, name: '6 Pieces', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-wings-12', product_id: P_WINGS, name: '12 Pieces', price_delta: 6, sort_order: 2 },
      { id: 'buc-v-wings-18', product_id: P_WINGS, name: '18 Pieces', price_delta: 11, sort_order: 3 },
    ],
    extras: [
      { id: 'buc-e-wings-ranch', product_id: P_WINGS, name: 'Extra Ranch Dip', price: 1.50, sort_order: 1 },
      { id: 'buc-e-wings-fries', product_id: P_WINGS, name: 'Side of Fries', price: 3.99, sort_order: 2 },
    ],
  },
  {
    id: P_CALAMARI,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_APPETIZERS,
    name: 'Fried Calamari',
    description: 'Golden crispy calamari rings served with marinara and lemon aioli.',
    price: 11.49,
    image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 2,
    created_at: now,
  },
  {
    id: 'buc-p-nachos',
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_APPETIZERS,
    name: 'Loaded Nachos',
    description: 'Tortilla chips topped with cheddar, jalapeños, sour cream, guacamole, and pico de gallo.',
    price: 13.99,
    image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 3,
    created_at: now,
    extras: [
      { id: 'buc-e-nachos-chicken', product_id: 'buc-p-nachos', name: 'Add Grilled Chicken', price: 4.99, sort_order: 1 },
      { id: 'buc-e-nachos-steak', product_id: 'buc-p-nachos', name: 'Add Steak', price: 6.99, sort_order: 2 },
    ],
  },

  // ── Main Courses ──
  {
    id: P_EGGS,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_MAINS,
    name: 'Classic Eggs Platter',
    description: 'Two eggs any style with your choice of side and toast. The diner classic since 1987.',
    price: 9.99,
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&h=600&fit=crop&q=80',
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: now,
    variants: [
      { id: 'buc-v-eggs-sunny', product_id: P_EGGS, name: 'Sunny Side Up', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-eggs-over-easy', product_id: P_EGGS, name: 'Over Easy', price_delta: 0, sort_order: 2 },
      { id: 'buc-v-eggs-over-hard', product_id: P_EGGS, name: 'Over Hard', price_delta: 0, sort_order: 3 },
      { id: 'buc-v-eggs-scrambled', product_id: P_EGGS, name: 'Scrambled', price_delta: 0, sort_order: 4 },
      { id: 'buc-v-eggs-poached', product_id: P_EGGS, name: 'Poached', price_delta: 0, sort_order: 5 },
    ],
    extras: [
      { id: 'buc-e-eggs-homefries', product_id: P_EGGS, name: 'Home Fries', price: 2.99, sort_order: 1 },
      { id: 'buc-e-eggs-frenchfries', product_id: P_EGGS, name: 'French Fries', price: 2.99, sort_order: 2 },
      { id: 'buc-e-eggs-white-toast', product_id: P_EGGS, name: 'White Toast', price: 0, sort_order: 3 },
      { id: 'buc-e-eggs-wheat-toast', product_id: P_EGGS, name: 'Wheat Toast', price: 0, sort_order: 4 },
      { id: 'buc-e-eggs-bacon', product_id: P_EGGS, name: 'Bacon (3 strips)', price: 3.49, sort_order: 5 },
      { id: 'buc-e-eggs-sausage', product_id: P_EGGS, name: 'Sausage Links', price: 3.49, sort_order: 6 },
      { id: 'buc-e-eggs-cheese', product_id: P_EGGS, name: 'Add Cheese', price: 1.50, sort_order: 7 },
    ],
  },
  {
    id: P_STEAK,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_MAINS,
    name: 'NY Strip Steak',
    description: '12oz USDA Choice strip steak grilled to perfection, served with mashed potatoes and seasonal vegetables.',
    price: 24.99,
    image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 2,
    created_at: now,
    variants: [
      { id: 'buc-v-steak-rare', product_id: P_STEAK, name: 'Rare', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-steak-mr', product_id: P_STEAK, name: 'Medium Rare', price_delta: 0, sort_order: 2 },
      { id: 'buc-v-steak-med', product_id: P_STEAK, name: 'Medium', price_delta: 0, sort_order: 3 },
      { id: 'buc-v-steak-well', product_id: P_STEAK, name: 'Well Done', price_delta: 0, sort_order: 4 },
    ],
  },
  {
    id: 'buc-p-salmon',
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_MAINS,
    name: 'Grilled Atlantic Salmon',
    description: 'Fresh Atlantic salmon fillet with lemon butter sauce, rice pilaf and steamed broccoli.',
    price: 19.99,
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 3,
    created_at: now,
  },

  // ── Greek Specialties ──
  {
    id: P_GYRO,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_GREEK,
    name: 'Lamb Gyro Platter',
    description: 'Slow-roasted lamb carved thin, served with warm pita, tzatziki, tomatoes, onions, and Greek salad.',
    price: 16.99,
    image_url: 'https://images.unsplash.com/photo-1561651188-d207bbec4ec3?w=800&h=600&fit=crop&q=80',
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: now,
    variants: [
      { id: 'buc-v-gyro-platter', product_id: P_GYRO, name: 'Platter', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-gyro-wrap', product_id: P_GYRO, name: 'Wrap', price_delta: -3, sort_order: 2 },
    ],
    extras: [
      { id: 'buc-e-gyro-feta', product_id: P_GYRO, name: 'Extra Feta Cheese', price: 2.49, sort_order: 1 },
      { id: 'buc-e-gyro-pita', product_id: P_GYRO, name: 'Extra Pita Bread', price: 1.99, sort_order: 2 },
      { id: 'buc-e-gyro-hummus', product_id: P_GYRO, name: 'Side of Hummus', price: 3.99, sort_order: 3 },
    ],
  },
  {
    id: P_MOUSSAKA,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_GREEK,
    name: 'Traditional Moussaka',
    description: 'Layers of eggplant, seasoned ground beef, potatoes, and creamy béchamel sauce, baked golden.',
    price: 17.49,
    image_url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 2,
    created_at: now,
  },
  {
    id: 'buc-p-souvlaki',
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_GREEK,
    name: 'Chicken Souvlaki',
    description: 'Marinated chicken skewers grilled over charcoal, served with Greek salad and lemon roast potatoes.',
    price: 15.49,
    image_url: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 3,
    created_at: now,
  },

  // ── Burgers & Sandwiches ──
  {
    id: P_CLASSIC_BURGER,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_BURGERS,
    name: 'The Classic Burger',
    description: '8oz Angus beef patty, lettuce, tomato, onion, pickles on a brioche bun.',
    price: 14.99,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop&q=80',
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: now,
    variants: [
      { id: 'buc-v-burger-single', product_id: P_CLASSIC_BURGER, name: 'Single Patty', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-burger-double', product_id: P_CLASSIC_BURGER, name: 'Double Patty', price_delta: 4.50, sort_order: 2 },
    ],
    extras: [
      { id: 'buc-e-burger-bacon', product_id: P_CLASSIC_BURGER, name: 'Add Bacon', price: 2.49, sort_order: 1 },
      { id: 'buc-e-burger-cheese', product_id: P_CLASSIC_BURGER, name: 'Add Cheddar', price: 1.49, sort_order: 2 },
      { id: 'buc-e-burger-egg', product_id: P_CLASSIC_BURGER, name: 'Add Fried Egg', price: 1.99, sort_order: 3 },
      { id: 'buc-e-burger-avocado', product_id: P_CLASSIC_BURGER, name: 'Add Avocado', price: 2.49, sort_order: 4 },
      { id: 'buc-e-burger-fries', product_id: P_CLASSIC_BURGER, name: 'Side of Fries', price: 3.99, sort_order: 5 },
      { id: 'buc-e-burger-rings', product_id: P_CLASSIC_BURGER, name: 'Onion Rings', price: 4.49, sort_order: 6 },
    ],
  },
  {
    id: P_PHILLY,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_BURGERS,
    name: 'Philly Cheesesteak',
    description: 'Thinly sliced ribeye, sautéed peppers and onions, melted provolone on a hoagie roll.',
    price: 15.99,
    image_url: 'https://images.unsplash.com/photo-1600555379765-f82335a7b1b0?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 2,
    created_at: now,
    extras: [
      { id: 'buc-e-philly-mushrooms', product_id: P_PHILLY, name: 'Add Mushrooms', price: 1.99, sort_order: 1 },
      { id: 'buc-e-philly-jalapenos', product_id: P_PHILLY, name: 'Add Jalapeños', price: 0.99, sort_order: 2 },
    ],
  },
  {
    id: 'buc-p-club',
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_BURGERS,
    name: 'Turkey Club Sandwich',
    description: 'Triple-decker with roasted turkey, bacon, lettuce, tomato, and mayo on toasted bread.',
    price: 13.49,
    image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 3,
    created_at: now,
  },

  // ── Desserts ──
  {
    id: P_BAKLAVA,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_DESSERTS,
    name: 'Homemade Baklava',
    description: 'Flaky phyllo pastry layered with walnuts and pistachios, drizzled with honey syrup.',
    price: 7.99,
    image_url: 'https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=800&h=600&fit=crop&q=80',
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: now,
  },
  {
    id: 'buc-p-cheesecake',
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_DESSERTS,
    name: 'NY Cheesecake',
    description: 'Creamy New York-style cheesecake with a graham cracker crust and fresh berry compote.',
    price: 8.99,
    image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 2,
    created_at: now,
  },
  {
    id: 'buc-p-sundae',
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_DESSERTS,
    name: 'Brownie Sundae',
    description: 'Warm chocolate brownie topped with vanilla ice cream, hot fudge, whipped cream, and a cherry.',
    price: 9.49,
    image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 3,
    created_at: now,
  },

  // ── Drinks ──
  {
    id: P_LEMONADE,
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_DRINKS,
    name: 'Fresh Squeezed Lemonade',
    description: 'House-made lemonade with real lemons, lightly sweetened. Served ice cold.',
    price: 4.49,
    image_url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 1,
    created_at: now,
    variants: [
      { id: 'buc-v-lemon-reg', product_id: P_LEMONADE, name: 'Regular', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-lemon-lg', product_id: P_LEMONADE, name: 'Large', price_delta: 1.50, sort_order: 2 },
    ],
  },
  {
    id: 'buc-p-frappe',
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_DRINKS,
    name: 'Greek Frappé',
    description: 'Traditional iced coffee made with instant coffee and cold water. Creamy and refreshing.',
    price: 5.49,
    image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 2,
    created_at: now,
    variants: [
      { id: 'buc-v-frappe-sweet', product_id: 'buc-p-frappe', name: 'Sweet', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-frappe-med', product_id: 'buc-p-frappe', name: 'Medium Sweet', price_delta: 0, sort_order: 2 },
      { id: 'buc-v-frappe-plain', product_id: 'buc-p-frappe', name: 'No Sugar', price_delta: 0, sort_order: 3 },
    ],
  },
  {
    id: 'buc-p-milkshake',
    restaurant_id: RESTAURANT_ID,
    category_id: CAT_DRINKS,
    name: 'Classic Milkshake',
    description: 'Thick and creamy milkshake made with real ice cream. A diner staple.',
    price: 6.99,
    image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&h=600&fit=crop&q=80',
    is_active: true,
    sort_order: 3,
    created_at: now,
    variants: [
      { id: 'buc-v-shake-choc', product_id: 'buc-p-milkshake', name: 'Chocolate', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-shake-van', product_id: 'buc-p-milkshake', name: 'Vanilla', price_delta: 0, sort_order: 2 },
      { id: 'buc-v-shake-straw', product_id: 'buc-p-milkshake', name: 'Strawberry', price_delta: 0, sort_order: 3 },
    ],
  },
];
