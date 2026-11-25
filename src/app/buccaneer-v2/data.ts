/**
 * Content + photo-slot map for the Buccaneer Diner v2 landing (preview).
 *
 * Source of truth: ART_DIRECTION_BUCCANEER_V2.md. Facts the copy may claim are
 * in section 0 of that file; nothing here invents history or availability.
 */

export type DayState = 'morning' | 'midday' | 'evening' | 'night';

export const STATES: DayState[] = ['morning', 'midday', 'evening', 'night'];

/** AD 3.1 — food shifts, not sunrise/sunset. Hours are New York time. */
export function stateForHour(h: number): DayState {
  if (h >= 22 || h < 5) return 'night';
  if (h >= 16) return 'evening';
  if (h >= 11) return 'midday';
  return 'morning';
}

export const MENU_URL = 'https://menius.app/buccaneer';
/** Where this page lives. Change to the restaurant's own domain when it moves there. */
export const SITE_URL = 'https://menius.app/buccaneer-v2';
export const PHONE_TEXT = '(718) 429-5188';
export const PHONE_HREF = 'tel:+17184295188';
/** Second line, printed on the menu cover (2026-11-23). */
export const PHONE2_TEXT = '(718) 457-6803';
export const PHONE2_HREF = 'tel:+17184576803';
export const DIRECTIONS_URL =
  'https://maps.google.com/?q=93-01+Astoria+Blvd,+East+Elmhurst,+NY+11369';
export const ADDRESS_1 = '93-01 Astoria Boulevard';
export const ADDRESS_2 = 'East Elmhurst, NY 11369';

/**
 * Phones in portrait ("app" layout: dock, sheets, hour strip). Landscape phones
 * (<= 500 tall) keep the previous mobile layout. Same query as the APP block in
 * buccaneer-v2.css and in AppBehavior.tsx.
 */
export const APP_MQ = '(max-width: 719px) and (min-height: 501px)';

/** `?category=` deep link. Names copied from the live menu (MenuSection names). */
export const cat = (name: string) => `${MENU_URL}?category=${encodeURIComponent(name)}`;

/** `?item=` deep link: opens that dish's sheet on the menu (product ID from the DB). */
export const item = (id: string) => `${MENU_URL}?item=${id}`;

/** Google Maps place search: the listing that carries the reviews. */
export const REVIEWS_URL =
  'https://www.google.com/maps/search/?api=1&query=Buccaneer+Diner+93-01+Astoria+Blvd+East+Elmhurst+NY';
export const INSTAGRAM_URL = 'https://www.instagram.com/buccaneer_diner/';

/**
 * "Where to start" (app layout, copy approved 2026-11-24). Names and lines are the
 * site's own copy; `price` is only the fallback (getFavoritePrices reads the live one).
 * Images: the menu photos with the black backdrop removed (no other edits).
 */
export const FAVORITES = [
  { id: '6655f59e-90d9-4aa0-9099-41dfa6e3fbbd', name: 'Challah Bread French Toast', price: '12.95', line: 'Thick-cut challah, butter, and warm syrup. Served all day.', img: '/buccaneer/v2/app-dish-french-toast.webp' },
  { id: '388bb707-2bcc-4105-84bf-73d99cafa3f2', name: 'Roadhouse Burger', price: '15.95', line: 'Nine-ounce steak burger with pepper jack, bacon, avocado, grilled onions, and chipotle.', img: '/buccaneer/v2/app-dish-roadhouse.webp' },
  { id: '3d588e53-348e-41ad-84b2-0fb8a7def775', name: 'Crispy Chicken Parmigiana', price: '20.95', line: 'Breaded chicken, melted mozzarella, and marinara on ciabatta.', img: '/buccaneer/v2/app-dish-chicken-parm.webp' },
  { id: 'cba8ab37-fd43-4b03-b62a-c3b4a49b19cc', name: "Fisherman's Platter", price: '45.95', line: 'Lobster tail, stuffed shrimp, stuffed filet, stuffed clam, and scallops, broiled in garlic sauce.', img: '/buccaneer/v2/app-dish-fishermans.webp', tag: 'House signature' },
  { id: 'f19dfa7e-6832-4cd7-bddd-34c974a4f651', name: 'Greek Gyro', price: '25.95', line: 'Sliced gyro on warm pita with fries, Greek salad, and tzatziki.', img: '/buccaneer/v2/app-dish-gyro.webp' },
  { id: 'de5500c3-9f4c-4b9f-823c-0d562c02d087', name: 'New York Cheesecake', price: '7.45', line: 'Baked here, like every cake in the case.', img: '/buccaneer/v2/app-dish-cheesecake.webp' },
] as const;

// ---------------------------------------------------------------------------
// PHOTO SLOTS — one place to swap placeholders for real photography.
// Set a slot's `src` (a path under /public or a full URL) and the placeholder
// is replaced by the image in the exact same box. null = designed placeholder.
// ---------------------------------------------------------------------------
export type SlotId =
  | 'D01' | 'D04' | 'D06' | 'S01' | 'S02' | 'D02' | 'S05a' | 'D05' | 'D09'
  | 'S06' | 'S03' | 'S04' | 'S05b' | 'S11' | 'S10';

/** `position`: CSS object-position when the subject isn't centred (default `center`). */
// PROVISIONAL (2026-11-21, for the owner demo; the page is noindex): the `ia-*`
// files are Pedro's real photos of the booths with only the plate added by AI.
// Ideally they are replaced with real photography of the dishes before the site
// goes public — see "Fotos Buccaneer - guia.pdf". `barra-vertical` (S05a) is Pedro's
// real photo with only the bags on the counter removed (nothing added). D02, D09 and S06 are
// Pedro's real photos (visit 2026-11-23), as is S05b. D01 D04 D05 D06 are his real booth
// photos with only the plate added (measured against the table); nothing is fully AI anymore.
/**
 * `appSrc`: the crop for the portrait-phone app layout only (taller box than the
 * previous phone hero), tried before `mobileSrc`.
 * `mobileSrc`: a tighter crop for phones (<= 719 and phones in landscape), served
 * through <picture> so each screen downloads only its own file (2026-11-23: on
 * phones the wide booth shots left the dish small and far). `mobilePosition`:
 * object-position on phones when only the framing changes.
 */
export const PHOTO_SLOTS: Record<
  SlotId,
  { src: string | null; label: string; alt: string; position?: string; mobileSrc?: string; mobilePosition?: string; appSrc?: string }
> = {
  D01: { src: '/buccaneer/v2/ia-pancakes-ovalada.webp', mobileSrc: '/buccaneer/v2/ia-pancakes-ovalada-m.webp', appSrc: '/buccaneer/v2/app-hero2-pancakes.webp', position: 'center 58%', label: 'D01 · Buttermilk pancakes, Morning hero', alt: 'Three buttermilk pancakes on an oval platter and a cup of black coffee on a marble booth table, placemats and cutlery behind' },
  D04: { src: '/buccaneer/v2/ia-burger-deluxe.webp', mobileSrc: '/buccaneer/v2/ia-burger-deluxe-m.webp', appSrc: '/buccaneer/v2/app-hero2-burger.webp', position: 'center 35%', label: 'D04 · Cheeseburger, Midday hero', alt: 'A cheeseburger with lettuce, tomato and fries on a booth table, the tan booth behind' },
  D06: { src: '/buccaneer/v2/ia-lobster-copa.webp', mobileSrc: '/buccaneer/v2/ia-lobster-copa-m.webp', appSrc: '/buccaneer/v2/app-hero2-lobster.webp', position: 'center 86%', label: 'D06 · Twin lobster tails, Evening hero', alt: 'Twin broiled lobster tails with mashed potatoes and corn and a glass of white wine in a booth under the ship’s-wheel clock' },
  S01: { src: '/buccaneer/v2/fachada-noche-vertical.webp', label: 'S01 · Facade at night, sign on', alt: 'Buccaneer Diner at night, the red neon sign lit over a wet parking lot', position: 'center 28%', appSrc: '/buccaneer/v2/app-hero2-fachada.webp' },
  S02: { src: '/buccaneer/v2/fachada-noche.webp', label: 'S02 · Facade video poster (video pending)', alt: 'Buccaneer Diner facade at night, red and blue neon along the roof', position: 'center 70%' },
  D02: { src: '/buccaneer/v2/huevos-barra.webp', position: '34% 90%', mobilePosition: '20% 90%', label: 'D02 · Eggs and home fries, at the counter', alt: 'Two sunny-side-up eggs with home fries, toast and a cup of coffee on the counter, red stools alongside' },
  S05a: { src: '/buccaneer/v2/barra-vertical.webp', position: 'center 60%', label: 'S05a · Counter and stools', alt: 'The long counter with its red stools, the coffee station and the bar behind it' },
  D05: { src: '/buccaneer/v2/ia-calamari-booth12.webp', label: 'D05 · Dinner plate to share, booth', alt: 'A plate of fried calamari with a dish of marinara on a booth table, the tabletop jukebox behind' },
  D09: { src: '/buccaneer/v2/torta-booth.webp', label: 'D09 · Slice from the case, served', alt: 'A slice of chocolate layer cake and a cup of coffee on a booth table, the jukebox behind' },
  S06: { src: '/buccaneer/v2/vitrina-bake-shop.webp', label: 'S06 · Bake Shop dessert case, night', alt: 'The bake shop case: croissants, muffins and pound cake by the coffee urns' },
  // Not shown (2026-11-23): the dawn shot still has the neon on and read as a copy of S01. Needs a real daytime facade.
  S03: { src: null, label: 'S03 · Facade by day', alt: 'Buccaneer Diner by day' },
  S04: { src: '/buccaneer/v2/salon.webp', label: 'S04 · Dining room, wide', alt: 'The counter stools and orange booths of the dining room' },
  S05b: { src: '/buccaneer/v2/barra-cubierto.webp', label: 'S05b · Counter detail', alt: 'A place set at the granite counter, the red stools alongside' },
  S11: { src: '/buccaneer/v2/jukebox.webp', label: 'S11 · Tabletop jukebox, booth', alt: 'A tabletop jukebox in a booth' },
  S10: { src: '/buccaneer/v2/reloj-timon.webp', appSrc: '/buccaneer/v2/app-reloj.webp', label: 'S10 · Dining room wheel clock', alt: 'A ship’s-wheel clock with an anchor on the dining room wall, between two windows over the booths' },
};

// ---------------------------------------------------------------------------
// Counts — computed from the live menu at render time by counts.ts. These are
// only the fallback if that query fails (read from the menu on 2026-11-11).
// ---------------------------------------------------------------------------
export const MENU_SLUG = 'buccaneer';

export const COUNTS = {
  total: 408,
  breakfast: 81,
  burgers: 19,
  lunch: 62,
  salads: 21,
  appetizers: 21,
  sides: 24,
  dinner: 68,
  desserts: 19,
  bakeShop: 8,
  fountain: 6,
  smoothies: 10,
  beverage: 22,
  bar: 47,
};

export type Counts = typeof COUNTS;

/** Each count key -> the menu group it counts (categories.group_name, or the category name). */
export const COUNT_GROUPS: Record<Exclude<keyof Counts, 'total'>, string> = {
  breakfast: 'Breakfast',
  burgers: 'Burgers',
  lunch: 'Lunch',
  salads: 'Salads & Soups',
  appetizers: 'Appetizers',
  sides: 'Sides',
  dinner: 'Dinner',
  desserts: 'Desserts',
  bakeShop: 'The Bake Shop',
  fountain: 'From the Fountain',
  smoothies: 'Smoothies & Shakes',
  beverage: 'Beverage',
  bar: 'Bar',
};

// ---------------------------------------------------------------------------
// Per-state copy (AD 10.2). Order-card meta lines for tablet/desktop are <= 42
// chars; Midday/Evening use real dish names from the live menu and are
// PROVISIONAL until the 22.4 review of the eleven dishes.
// ---------------------------------------------------------------------------
export const STATE_COPY: Record<
  DayState,
  { phrase: string; orderTitle: string; orderMeta: string; href: string; hourLabel: string }
> = {
  morning: {
    phrase: 'Breakfast time.',
    orderTitle: 'Order breakfast',
    orderMeta: 'Breakfast all day — pancakes, omelettes',
    href: cat('Buttermilk Pancakes'),
    hourLabel: '5 a.m.',
  },
  midday: {
    phrase: 'Lunch hour.',
    orderTitle: 'Order lunch',
    orderMeta: 'Cheeseburger, Turkey & Bacon Club',
    href: cat('7 oz. Certified Angus Beef Burgers'),
    hourLabel: '11 a.m.',
  },
  evening: {
    phrase: 'Dinner, here or at home.',
    orderTitle: 'Order dinner',
    orderMeta: 'Rock Lobster Tails, Shrimp Scampi',
    href: cat('Seafood'),
    hourLabel: '4 p.m.',
  },
  night: {
    phrase: 'Up late? So are we.',
    orderTitle: 'Order now',
    // Not "Burgers, disco fries" (or a category link) until the owner confirms
    // what the kitchen serves overnight (AD 17, Q1 + Q4).
    orderMeta: 'Pickup or delivery',
    href: MENU_URL,
    hourLabel: '10 p.m.',
  },
};

/** Breakfast subcategories (live menu), AD 7.3A. */
export const BREAKFAST_INDEX = [
  'Buttermilk Pancakes',
  'Belgian Waffles',
  'French Toast',
  '3 Egg Specialty Omelettes',
  'Egg Omelettes',
  'The Benedict',
  'Farm Fresh Eggs',
  'Hand Rolled Water Bagels',
  'Greek Yogurt',
  'Juices',
];

/**
 * Pizarra dishes (AD 7.3C): first by sort_order from the live menu. PROVISIONAL —
 * the 22.4 review fixes the final eleven by product ID. Caps: Dinner <= 30 chars,
 * Appetizers <= 40, Bar (three + separators) <= 48.
 */
export const PIZARRA: Record<'dinner' | 'appetizers' | 'bar', { name: string; id: string }[]> = {
  // Pedro 2026-11-23: solo platos cuya foto del menú sale de una foto real de Pedro (más la langosta,
  // el plato del héroe de la noche). Fuera Jumbo Shrimp y Scampi (foto oculta), Scallops y Sole (IA).
  dinner: [
    { name: 'Twin 5 oz. Rock Lobster Tails', id: '8371dba5-9a65-4d51-9665-a876bcbaecaa' },
    { name: 'Beef & Reef', id: '98a8e761-2d01-4c2d-ac86-2ab9867dc521' },
    { name: 'Ribeye Steak', id: '5c80cf67-e976-4b53-8ff6-ad7436ec26f9' },
    { name: "Fisherman's Platter", id: 'cba8ab37-fd43-4b03-b62a-c3b4a49b19cc' },
    { name: 'Chicken Marsala', id: '54f8f23b-cbca-4f95-8356-40280ac751c5' },
  ],
  appetizers: [
    { name: 'The Sampler', id: '0ea30aa0-5ace-48a1-bc86-c4268c18d96d' },
    { name: 'Stuffed Clams (Appetizer)', id: 'd22c5695-877c-4caf-86f5-43d578af1153' },
    { name: 'Stuffed Mushrooms', id: '1c4952d9-253e-4c5c-9149-d8d540236987' },
  ],
  bar: [
    { name: 'Sea Breeze', id: '993e948f-e7fc-4b91-b28b-479fb74b797a' },
    { name: 'Bay Breeze', id: '21f75db3-adde-49d1-8d40-67031a2c2bd5' },
    { name: 'Singapore Sling', id: '7c777810-ea9a-486c-883f-ae346b46ccff' },
  ],
};

/** Deep-link targets per group (first subcategory in the live menu). */
export const LINKS = {
  fullMenu: MENU_URL,
  breakfast: cat('Buttermilk Pancakes'),
  // By id, not name: the category was renamed to "Coffee, Tea & Soft Drinks" (MenuShell
  // matches ?category= by id or exact name).
  beverage: cat('c1000001-0000-0000-0000-000000000040'),
  burgers: cat('7 oz. Certified Angus Beef Burgers'),
  lunch: cat('Signature Sandwiches'),
  salads: cat('Gourmet Salads'),
  sides: cat('Side Orders'),
  dinner: cat('Seafood'),
  appetizers: cat('Appetizers'),
  bar: cat('Specialty Drinks'),
  desserts: cat('Desserts'),
  bakeShop: cat('The Bake Shop'),
  fountain: cat('From the Fountain'),
  smoothies: cat('Smoothies'),
};

