import type { Restaurant, Category, Product } from '@/types';

const RID = 'demo-buccaneer-id';
const now = new Date().toISOString();

const CAT_BREAKFAST = 'buc-cat-breakfast';
const CAT_LUNCH = 'buc-cat-lunch';
const CAT_DINNER = 'buc-cat-dinner';
const CAT_APPETIZER = 'buc-cat-appetizer';
const CAT_BEVERAGE = 'buc-cat-beverage';
const CAT_DRINKS = 'buc-cat-drinks';
const CAT_DESSERTS = 'buc-cat-desserts';

export const buccaneerRestaurant: Restaurant = {
  id: RID,
  name: 'Buccaneer Diner',
  slug: 'buccaneer-diner',
  owner_user_id: 'demo-owner-en',
  timezone: 'America/New_York',
  currency: 'USD',
  locale: 'en',
  logo_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=200&fit=crop&q=80',
  cover_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=600&fit=crop&q=80',
  description: 'Where Greek tradition meets American comfort. Fresh ingredients, bold flavors since 1987.',
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
  { id: CAT_BREAKFAST, restaurant_id: RID, name: 'Breakfast', sort_order: 1, is_active: true, created_at: now },
  { id: CAT_LUNCH, restaurant_id: RID, name: 'Lunch', sort_order: 2, is_active: true, created_at: now },
  { id: CAT_DINNER, restaurant_id: RID, name: 'Dinner', sort_order: 3, is_active: true, created_at: now },
  { id: CAT_APPETIZER, restaurant_id: RID, name: 'Appetizer', sort_order: 4, is_active: true, created_at: now },
  { id: CAT_BEVERAGE, restaurant_id: RID, name: 'Beverage', sort_order: 5, is_active: true, created_at: now },
  { id: CAT_DRINKS, restaurant_id: RID, name: 'Drinks', sort_order: 6, is_active: true, created_at: now },
  { id: CAT_DESSERTS, restaurant_id: RID, name: 'Desserts', sort_order: 7, is_active: true, created_at: now },
];

const P_PANCAKES = 'buc-p-pancakes';
const P_BURGER = 'buc-p-burger';
const P_STEAK = 'buc-p-steak';
const P_WINGS = 'buc-p-wings';
const P_LEMONADE = 'buc-p-lemonade';
const P_MARGARITA = 'buc-p-margarita';
const P_BROWNIE = 'buc-p-brownie';

export const buccaneerProducts: Product[] = [
  // ── Breakfast ──
  {
    id: P_PANCAKES, restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Classic Pancakes',
    description: 'Three fluffy buttermilk pancakes with maple syrup, butter, and fresh berries.',
    price: 10.99, image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'buc-v-pan-reg', product_id: P_PANCAKES, name: 'Regular (3 pcs)', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-pan-lg', product_id: P_PANCAKES, name: 'Stack (5 pcs)', price_delta: 4, sort_order: 2 },
    ],
    extras: [
      { id: 'buc-e-pan-nutella', product_id: P_PANCAKES, name: 'Nutella drizzle', price: 1.99, sort_order: 1 },
      { id: 'buc-e-pan-bacon', product_id: P_PANCAKES, name: 'Side of bacon', price: 3.49, sort_order: 2 },
    ],
  },
  {
    id: 'buc-p-benedict', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Eggs Benedict',
    description: 'Poached eggs on toasted English muffins with Canadian bacon and hollandaise sauce.',
    price: 13.99, image_url: 'https://images.unsplash.com/photo-1608039829572-9b0088ca6e13?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-frenchtoast', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'French Toast',
    description: 'Thick-cut brioche dipped in cinnamon batter, griddled golden. Served with powdered sugar.',
    price: 11.49, image_url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-omelette', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Veggie Omelette',
    description: 'Three-egg omelette with mushrooms, spinach, bell peppers, onions, and Swiss cheese.',
    price: 12.49, image_url: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-avotoast', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Avocado Toast',
    description: 'Smashed avocado on sourdough with cherry tomatoes, radish, everything seasoning, and a poached egg.',
    price: 11.99, image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-burrito', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Breakfast Burrito',
    description: 'Flour tortilla stuffed with scrambled eggs, cheddar, sausage, peppers, and salsa verde.',
    price: 12.99, image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Lunch ──
  {
    id: P_BURGER, restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'The Classic Burger',
    description: '8oz Angus beef patty, lettuce, tomato, onion, pickles on a brioche bun. Served with fries.',
    price: 14.99, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'buc-v-burger-s', product_id: P_BURGER, name: 'Single Patty', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-burger-d', product_id: P_BURGER, name: 'Double Patty', price_delta: 4.50, sort_order: 2 },
    ],
    extras: [
      { id: 'buc-e-burger-bacon', product_id: P_BURGER, name: 'Add Bacon', price: 2.49, sort_order: 1 },
      { id: 'buc-e-burger-cheese', product_id: P_BURGER, name: 'Add Cheddar', price: 1.49, sort_order: 2 },
      { id: 'buc-e-burger-avo', product_id: P_BURGER, name: 'Add Avocado', price: 2.49, sort_order: 3 },
    ],
  },
  {
    id: 'buc-p-caesar', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Caesar Salad',
    description: 'Crisp romaine, parmesan, croutons, and house-made Caesar dressing.',
    price: 11.49, image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-club', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Club Sandwich',
    description: 'Triple-decker with roasted turkey, bacon, lettuce, tomato, and mayo on toasted bread.',
    price: 13.49, image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-fishnchips', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Fish & Chips',
    description: 'Beer-battered Atlantic cod with golden fries, coleslaw, and tartar sauce.',
    price: 15.99, image_url: 'https://images.unsplash.com/photo-1579208030886-b1f5b814e3ae?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-grillchicken', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Grilled Chicken',
    description: 'Herb-marinated grilled chicken breast with rice pilaf and steamed vegetables.',
    price: 14.49, image_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-primavera', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Pasta Primavera',
    description: 'Penne with sautéed seasonal vegetables in a light garlic olive oil sauce with parmesan.',
    price: 13.99, image_url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Dinner ──
  {
    id: P_STEAK, restaurant_id: RID, category_id: CAT_DINNER,
    name: 'NY Strip Steak',
    description: '12oz USDA Choice strip steak grilled to perfection with mashed potatoes and seasonal vegetables.',
    price: 28.99, image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'buc-v-steak-mr', product_id: P_STEAK, name: 'Medium Rare', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-steak-med', product_id: P_STEAK, name: 'Medium', price_delta: 0, sort_order: 2 },
      { id: 'buc-v-steak-well', product_id: P_STEAK, name: 'Well Done', price_delta: 0, sort_order: 3 },
    ],
    extras: [],
  },
  {
    id: 'buc-p-salmon', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Grilled Atlantic Salmon',
    description: 'Fresh Atlantic salmon fillet with lemon butter sauce, rice pilaf and steamed broccoli.',
    price: 24.99, image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-lambchops', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Lamb Chops',
    description: 'Herb-crusted New Zealand lamb chops with mint jelly, roasted potatoes and asparagus.',
    price: 29.99, image_url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-lobster', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Lobster Tail',
    description: 'Broiled Maine lobster tail with drawn butter, baked potato, and Caesar salad.',
    price: 34.99, image_url: 'https://images.unsplash.com/photo-1553247407-23251ce81f59?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-chickparm', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Chicken Parmesan',
    description: 'Breaded chicken breast topped with marinara and melted mozzarella over spaghetti.',
    price: 18.99, image_url: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-risotto', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Mushroom Risotto',
    description: 'Creamy Arborio rice with wild mushrooms, parmesan, truffle oil and fresh thyme.',
    price: 19.99, image_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Appetizer ──
  {
    id: P_WINGS, restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Buffalo Wings',
    description: 'Crispy wings tossed in your choice of sauce, served with celery and blue cheese dip.',
    price: 12.99, image_url: 'https://images.unsplash.com/photo-1608039829572-9b0088ca6e13?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'buc-v-wings-6', product_id: P_WINGS, name: '6 Pieces', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-wings-12', product_id: P_WINGS, name: '12 Pieces', price_delta: 6, sort_order: 2 },
    ],
    extras: [
      { id: 'buc-e-wings-ranch', product_id: P_WINGS, name: 'Extra Ranch Dip', price: 1.50, sort_order: 1 },
    ],
  },
  {
    id: 'buc-p-calamari', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Fried Calamari',
    description: 'Golden crispy calamari rings served with marinara and lemon aioli.',
    price: 11.49, image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-bruschetta', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Bruschetta',
    description: 'Toasted ciabatta topped with diced tomatoes, basil, garlic, and balsamic glaze.',
    price: 9.99, image_url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-nachos', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Loaded Nachos',
    description: 'Tortilla chips topped with cheddar, jalapeños, sour cream, guacamole, and pico de gallo.',
    price: 13.99, image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-shrimp', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Shrimp Cocktail',
    description: 'Chilled jumbo shrimp served with zesty cocktail sauce and lemon wedges.',
    price: 14.99, image_url: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-mushrooms', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Stuffed Mushrooms',
    description: 'Button mushrooms filled with herbed cream cheese and breadcrumbs, baked golden.',
    price: 10.99, image_url: 'https://images.unsplash.com/photo-1604579278540-db6507ee0fdb?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Beverage ──
  {
    id: P_LEMONADE, restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Fresh Squeezed Lemonade',
    description: 'House-made lemonade with real lemons, lightly sweetened. Served ice cold.',
    price: 4.49, image_url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'buc-v-lemon-reg', product_id: P_LEMONADE, name: 'Regular', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-lemon-lg', product_id: P_LEMONADE, name: 'Large', price_delta: 1.50, sort_order: 2 },
    ],
    extras: [],
  },
  {
    id: 'buc-p-icedcoffee', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Iced Coffee',
    description: 'Cold-brewed coffee served over ice with your choice of milk. Rich and smooth.',
    price: 4.99, image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-smoothie', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Berry Smoothie',
    description: 'Blueberries, strawberries, banana, and Greek yogurt blended until silky smooth.',
    price: 6.49, image_url: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-sparkling', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Sparkling Water',
    description: 'San Pellegrino sparkling mineral water, 500ml bottle.',
    price: 3.49, image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-freshjuice', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice, no added sugar. Pure sunshine in a glass.',
    price: 5.49, image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602d23?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-hotchoc', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Hot Chocolate',
    description: 'Rich Belgian hot chocolate topped with whipped cream and chocolate shavings.',
    price: 4.99, image_url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Drinks (Alcoholic) ──
  {
    id: P_MARGARITA, restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Classic Margarita',
    description: 'Tequila, triple sec, fresh lime juice, salt rim. Shaken and served on the rocks.',
    price: 11.99, image_url: 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now,
    variants: [
      { id: 'buc-v-marg-classic', product_id: P_MARGARITA, name: 'Classic', price_delta: 0, sort_order: 1 },
      { id: 'buc-v-marg-mango', product_id: P_MARGARITA, name: 'Mango', price_delta: 1.50, sort_order: 2 },
      { id: 'buc-v-marg-straw', product_id: P_MARGARITA, name: 'Strawberry', price_delta: 1.50, sort_order: 3 },
    ],
    extras: [],
  },
  {
    id: 'buc-p-craftbeer', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Craft Beer',
    description: 'Rotating selection of local craft beers on tap. Ask your server for today\'s picks.',
    price: 7.99, image_url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-oldfashioned', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Old Fashioned',
    description: 'Bourbon, Angostura bitters, sugar, orange peel. Stirred and served over a large ice cube.',
    price: 13.99, image_url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-mojito', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Mojito',
    description: 'White rum, fresh mint, lime juice, sugar, and soda water. Light and refreshing.',
    price: 11.49, image_url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-redwine', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Red Wine',
    description: 'House selection Cabernet Sauvignon from Napa Valley. Rich, full-bodied.',
    price: 9.99, image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-espressomartini', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Espresso Martini',
    description: 'Vodka, fresh espresso, coffee liqueur, and simple syrup. Shaken until frothy.',
    price: 13.49, image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Desserts ──
  {
    id: 'buc-p-cheesecake', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'NY Cheesecake',
    description: 'Creamy New York-style cheesecake with a graham cracker crust and fresh berry compote.',
    price: 8.99, image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&h=340&fit=crop&q=80',
    is_active: true, is_featured: true, sort_order: 1, created_at: now, variants: [], extras: [],
  },
  {
    id: P_BROWNIE, restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Brownie Sundae',
    description: 'Warm chocolate brownie topped with vanilla ice cream, hot fudge, whipped cream.',
    price: 9.49, image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 2, created_at: now,
    variants: [],
    extras: [
      { id: 'buc-e-brownie-scoop', product_id: P_BROWNIE, name: 'Extra ice cream scoop', price: 2.49, sort_order: 1 },
      { id: 'buc-e-brownie-whip', product_id: P_BROWNIE, name: 'Extra whipped cream', price: 0.99, sort_order: 2 },
    ],
  },
  {
    id: 'buc-p-tiramisu', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Tiramisu',
    description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.',
    price: 9.99, image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-cremebrulee', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Crème Brûlée',
    description: 'Vanilla bean custard with a caramelized sugar crust. Perfectly torched.',
    price: 8.49, image_url: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-applepie', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Apple Pie',
    description: 'Warm apple pie with cinnamon spice and a flaky butter crust. Served à la mode.',
    price: 7.99, image_url: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 5, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-baklava', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Homemade Baklava',
    description: 'Flaky phyllo pastry layered with walnuts and pistachios, drizzled with honey syrup.',
    price: 7.99, image_url: 'https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=600&h=340&fit=crop&q=80',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },
];
