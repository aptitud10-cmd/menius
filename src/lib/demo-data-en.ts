import type { Restaurant, Category, Product } from '@/types';

const RID = 'demo-grillhouse-id';
const now = new Date().toISOString();
const older = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

const CAT_BREAKFAST = 'buc-cat-breakfast';
const CAT_LUNCH = 'buc-cat-lunch';
const CAT_DINNER = 'buc-cat-dinner';
const CAT_APPETIZER = 'buc-cat-appetizer';
const CAT_BEVERAGE = 'buc-cat-beverage';
const CAT_DRINKS = 'buc-cat-drinks';
const CAT_DESSERTS = 'buc-cat-desserts';

export const grillHouseRestaurant: Restaurant = {
  id: RID,
  name: 'The Grill House',
  slug: 'the-grill-house',
  owner_user_id: 'demo-owner-en',
  timezone: 'America/New_York',
  currency: 'USD',
  locale: 'en',
  logo_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=200&fit=crop&q=80',
  cover_image_url: '/demo/cover-the-grill-house.jpg',
  description: 'Premium grilled meats and fresh ingredients. A modern dining experience since 2020.',
  address: '742 Harbor Blvd, Oceanside, CA 92054',
  latitude: 33.1959,
  longitude: -117.3795,
  phone: '+1 (760) 555-0147',
  email: 'hello@thegrillhouse.com',
  website: 'https://menius.app',
  is_active: true,
  order_types_enabled: ['dine_in', 'pickup', 'delivery'],
  payment_methods_enabled: ['cash', 'online'],
  estimated_delivery_minutes: 25,
  delivery_fee: 3.99,
  operating_hours: {
    monday: { open: '07:00', close: '22:00' },
    tuesday: { open: '07:00', close: '22:00' },
    wednesday: { open: '07:00', close: '22:00' },
    thursday: { open: '07:00', close: '23:00' },
    friday: { open: '07:00', close: '23:30' },
    saturday: { open: '08:00', close: '23:30' },
    sunday: { open: '08:00', close: '21:00' },
  },
  country_code: 'US',
  state_code: 'CA',
  tax_rate: 7.25,
  tax_included: false,
  tax_label: 'Sales Tax',
  created_at: older,
};

export const grillHouseCategories: Category[] = [
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

export const grillHouseProducts: Product[] = [
  // ── Breakfast ──
  {
    id: P_PANCAKES, restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Classic Pancakes',
    description: 'Three fluffy buttermilk pancakes with maple syrup, butter, and fresh berries.',
    price: 10.99, image_url: '/seed/en/pancakes.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older,
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
    price: 13.99, image_url: '/seed/en/eggs-benedict.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-frenchtoast', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'French Toast',
    description: 'Thick-cut brioche dipped in cinnamon batter, griddled golden. Served with powdered sugar.',
    price: 11.49, image_url: '/seed/en/french-toast.webp',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-omelette', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Veggie Omelette',
    description: 'Three-egg omelette with mushrooms, spinach, bell peppers, onions, and Swiss cheese.',
    price: 12.49, image_url: '/seed/en/omelette.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-avotoast', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Avocado Toast',
    description: 'Smashed avocado on sourdough with cherry tomatoes, radish, everything seasoning, and a poached egg.',
    price: 11.99, image_url: '/seed/es/huevos-rancheros.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-burrito', restaurant_id: RID, category_id: CAT_BREAKFAST,
    name: 'Breakfast Burrito',
    description: 'Flour tortilla stuffed with scrambled eggs, cheddar, sausage, peppers, and salsa verde.',
    price: 12.99, image_url: '/seed/en/omelette.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },

  // ── Lunch ──
  {
    id: P_BURGER, restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'The Classic Burger',
    description: '8oz Angus beef patty, lettuce, tomato, onion, pickles on a brioche bun. Served with fries.',
    price: 14.99, image_url: '/seed/en/burger.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older,
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
    price: 11.49, image_url: '/seed/en/caesar-salad.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-club', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Club Sandwich',
    description: 'Triple-decker with roasted turkey, bacon, lettuce, tomato, and mayo on toasted bread.',
    price: 13.49, image_url: '/seed/en/club-sandwich.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-fishnchips', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Fish & Chips',
    description: 'Beer-battered Atlantic cod with golden fries, coleslaw, and tartar sauce.',
    price: 15.99, image_url: '/seed/en/fish-tacos.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-grillchicken', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Grilled Chicken',
    description: 'Herb-marinated grilled chicken breast with rice pilaf and steamed vegetables.',
    price: 14.49, image_url: '/seed/en/grilled-chicken.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-primavera', restaurant_id: RID, category_id: CAT_LUNCH,
    name: 'Pasta Primavera',
    description: 'Penne with sautéed seasonal vegetables in a light garlic olive oil sauce with parmesan.',
    price: 13.99, image_url: '/seed/en/pasta.webp',
    is_active: true, sort_order: 6, created_at: now, variants: [], extras: [],
  },

  // ── Dinner ──
  {
    id: P_STEAK, restaurant_id: RID, category_id: CAT_DINNER,
    name: 'NY Strip Steak',
    description: '12oz USDA Choice strip steak grilled to perfection with mashed potatoes and seasonal vegetables.',
    price: 28.99, image_url: '/seed/en/steak.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older,
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
    price: 24.99, image_url: '/seed/en/salmon.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-lambchops', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Lamb Chops',
    description: 'Herb-crusted New Zealand lamb chops with mint jelly, roasted potatoes and asparagus.',
    price: 29.99, image_url: '/seed/en/ribs.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-lobster', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Lobster Tail',
    description: 'Broiled Maine lobster tail with drawn butter, baked potato, and Caesar salad.',
    price: 34.99, image_url: '/seed/en/lobster.webp',
    is_active: true, sort_order: 4, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-chickparm', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Chicken Parmesan',
    description: 'Breaded chicken breast topped with marinara and melted mozzarella over spaghetti.',
    price: 18.99, image_url: '/seed/en/ribs.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-risotto', restaurant_id: RID, category_id: CAT_DINNER,
    name: 'Mushroom Risotto',
    description: 'Creamy Arborio rice with wild mushrooms, parmesan, truffle oil and fresh thyme.',
    price: 19.99, image_url: '/seed/en/pasta.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },

  // ── Appetizer ──
  {
    id: P_WINGS, restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Buffalo Wings',
    description: 'Crispy wings tossed in your choice of sauce, served with celery and blue cheese dip.',
    price: 12.99, image_url: '/seed/en/wings.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older,
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
    price: 11.49, image_url: '/seed/en/calamari.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-bruschetta', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Bruschetta',
    description: 'Toasted ciabatta topped with diced tomatoes, basil, garlic, and balsamic glaze.',
    price: 9.99, image_url: '/seed/en/spring-rolls.webp',
    is_active: true, sort_order: 3, created_at: now, variants: [], extras: [],
  },
  {
    id: 'buc-p-nachos', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Loaded Nachos',
    description: 'Tortilla chips topped with cheddar, jalapeños, sour cream, guacamole, and pico de gallo.',
    price: 13.99, image_url: '/seed/en/nachos.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-shrimp', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Shrimp Cocktail',
    description: 'Chilled jumbo shrimp served with zesty cocktail sauce and lemon wedges.',
    price: 14.99, image_url: '/seed/en/shrimp.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-mushrooms', restaurant_id: RID, category_id: CAT_APPETIZER,
    name: 'Stuffed Mushrooms',
    description: 'Button mushrooms filled with herbed cream cheese and breadcrumbs, baked golden.',
    price: 10.99, image_url: '/seed/en/spring-rolls.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },

  // ── Beverage ──
  {
    id: P_LEMONADE, restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Fresh Squeezed Lemonade',
    description: 'House-made lemonade with real lemons, lightly sweetened. Served ice cold.',
    price: 4.49, image_url: '/seed/en/lemonade.webp',
    is_active: true, sort_order: 1, created_at: older,
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
    price: 4.99, image_url: '/seed/en/coffee.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-smoothie', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Berry Smoothie',
    description: 'Blueberries, strawberries, banana, and Greek yogurt blended until silky smooth.',
    price: 6.49, image_url: '/seed/en/smoothie.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-sparkling', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Sparkling Water',
    description: 'San Pellegrino sparkling mineral water, 500ml bottle.',
    price: 3.49, image_url: '/seed/en/water.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-freshjuice', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice, no added sugar. Pure sunshine in a glass.',
    price: 5.49, image_url: '/seed/en/lemonade.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-hotchoc', restaurant_id: RID, category_id: CAT_BEVERAGE,
    name: 'Hot Chocolate',
    description: 'Rich Belgian hot chocolate topped with whipped cream and chocolate shavings.',
    price: 4.99, image_url: '/seed/en/coffee.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },

  // ── Drinks (Alcoholic) ──
  {
    id: P_MARGARITA, restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Classic Margarita',
    description: 'Tequila, triple sec, fresh lime juice, salt rim. Shaken and served on the rocks.',
    price: 11.99, image_url: '/seed/en/margarita.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older,
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
    price: 7.99, image_url: '/seed/en/beer.webp',
    is_active: true, sort_order: 2, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-oldfashioned', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Old Fashioned',
    description: 'Bourbon, Angostura bitters, sugar, orange peel. Stirred and served over a large ice cube.',
    price: 13.99, image_url: '/seed/en/whiskey.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-mojito', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Mojito',
    description: 'White rum, fresh mint, lime juice, sugar, and soda water. Light and refreshing.',
    price: 11.49, image_url: '/seed/en/mojito.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-redwine', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Red Wine',
    description: 'House selection Cabernet Sauvignon from Napa Valley. Rich, full-bodied.',
    price: 9.99, image_url: '/seed/en/wine.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-espressomartini', restaurant_id: RID, category_id: CAT_DRINKS,
    name: 'Espresso Martini',
    description: 'Vodka, fresh espresso, coffee liqueur, and simple syrup. Shaken until frothy.',
    price: 13.49, image_url: '/seed/en/coffee.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },

  // ── Desserts ──
  {
    id: 'buc-p-cheesecake', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'NY Cheesecake',
    description: 'Creamy New York-style cheesecake with a graham cracker crust and fresh berry compote.',
    price: 8.99, image_url: '/seed/en/cheesecake.webp',
    is_active: true, is_featured: true, sort_order: 1, created_at: older, variants: [], extras: [],
  },
  {
    id: P_BROWNIE, restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Brownie Sundae',
    description: 'Warm chocolate brownie topped with vanilla ice cream, hot fudge, whipped cream.',
    price: 9.49, image_url: '/seed/en/brownie.webp',
    is_active: true, sort_order: 2, created_at: older,
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
    price: 9.99, image_url: '/seed/en/tiramisu.webp',
    is_active: true, sort_order: 3, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-cremebrulee', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Crème Brûlée',
    description: 'Vanilla bean custard with a caramelized sugar crust. Perfectly torched.',
    price: 8.49, image_url: '/seed/en/creme-brulee.webp',
    is_active: true, sort_order: 4, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-applepie', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Apple Pie',
    description: 'Warm apple pie with cinnamon spice and a flaky butter crust. Served à la mode.',
    price: 7.99, image_url: '/seed/es/tres-leches.webp',
    is_active: true, sort_order: 5, created_at: older, variants: [], extras: [],
  },
  {
    id: 'buc-p-baklava', restaurant_id: RID, category_id: CAT_DESSERTS,
    name: 'Homemade Baklava',
    description: 'Flaky phyllo pastry layered with walnuts and pistachios, drizzled with honey syrup.',
    price: 7.99, image_url: '/seed/en/cheesecake.webp',
    is_active: true, sort_order: 6, created_at: older, variants: [], extras: [],
  },
];
