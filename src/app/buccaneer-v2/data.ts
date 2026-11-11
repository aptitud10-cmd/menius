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
export const PHONE_TEXT = '(718) 429-5188';
export const PHONE_HREF = 'tel:+17184295188';
export const DIRECTIONS_URL =
  'https://maps.google.com/?q=9301+Astoria+Blvd,+East+Elmhurst,+NY+11369';
export const ADDRESS_1 = '9301 Astoria Boulevard';
export const ADDRESS_2 = 'East Elmhurst, NY 11369';

/** `?category=` deep link. Names copied from the live menu (MenuSection names). */
export const cat = (name: string) => `${MENU_URL}?category=${encodeURIComponent(name)}`;

/** `?item=` deep link: opens that dish's sheet on the menu (product ID from the DB). */
export const item = (id: string) => `${MENU_URL}?item=${id}`;

// ---------------------------------------------------------------------------
// PHOTO SLOTS — one place to swap placeholders for real photography.
// Set a slot's `src` (a path under /public or a full URL) and the placeholder
// is replaced by the image in the exact same box. null = designed placeholder.
// ---------------------------------------------------------------------------
export type SlotId =
  | 'D01' | 'D04' | 'D06' | 'S01' | 'S02' | 'D02' | 'S05a' | 'D05' | 'D09'
  | 'S06' | 'S03' | 'S04' | 'S05b' | 'S11' | 'S10';

export const PHOTO_SLOTS: Record<SlotId, { src: string | null; label: string; alt: string }> = {
  D01: { src: null, label: 'D01 · Buttermilk pancakes, Morning hero', alt: 'A stack of buttermilk pancakes' },
  D04: { src: null, label: 'D04 · 7 oz burger, Midday hero', alt: 'A 7 oz Angus burger' },
  D06: { src: null, label: 'D06 · Seafood plate, Evening hero', alt: 'A seafood dinner plate' },
  S01: { src: null, label: 'S01 · Facade at night, sign on', alt: 'Buccaneer Diner sign lit at night' },
  S02: { src: null, label: 'S02 · Facade video poster (video pending)', alt: 'Buccaneer Diner facade at night' },
  D02: { src: null, label: 'D02 · Eggs and hash browns, at the counter', alt: 'Eggs with hash browns at the counter' },
  S05a: { src: null, label: 'S05a · Counter and stools, diagonal', alt: 'The counter and stools' },
  D05: { src: null, label: 'D05 · Dinner plate to share, booth', alt: 'A dinner plate to share' },
  D09: { src: null, label: 'D09 · Slice from the case, served', alt: 'A slice of cake from the dessert case' },
  S06: { src: null, label: 'S06 · Bake Shop dessert case, night', alt: 'The dessert case' },
  S03: { src: null, label: 'S03 · Facade by day', alt: 'Buccaneer Diner by day' },
  S04: { src: null, label: 'S04 · Dining room, wide', alt: 'The dining room' },
  S05b: { src: null, label: 'S05b · Counter detail, head-on', alt: 'The counter, up close' },
  S11: { src: null, label: 'S11 · Tabletop jukebox, booth', alt: 'A tabletop jukebox in a booth' },
  S10: { src: null, label: 'S10 · Dining room wheel clock', alt: 'The clock on the dining room wall' },
};

/**
 * AI product compositions (AD 6): already live on the menu, reused by URL, only
 * ever shown as small framed thumbnails inside Midday and Evening.
 * The pre-optimized 640px `-sm.webp` variant (20–35 KB), not the `ai/` original:
 * two of those originals weigh ~1.4 MB each for a 160px box.
 */
const CDN =
  'https://hdlhmqvbaxzhmhtablwt.supabase.co/storage/v1/object/public/product-images/opt/a1f5af6a-1805-49d2-b494-f074ac657357';
export const THUMBS = {
  burgers: `${CDN}/cheeseburger-1794385130172-sm.webp`,
  lunch: `${CDN}/club-turkey-bacon-1794342289068-sm.webp`,
  dinner: `${CDN}/lobster-tails-1786533460195-sm.webp`,
  appetizers: `${CDN}/the-sampler-1786537907822-sm.webp`,
};

// ---------------------------------------------------------------------------
// Counts — AD section 0, read from the live menu on 2026-11-10.
// TODO(dev): compute from the DB at render time (AD: "no se tipea a mano").
// ---------------------------------------------------------------------------
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
    orderMeta: 'Breakfast all day — pancakes, the Benedict',
    href: cat('Buttermilk Pancakes'),
    hourLabel: '5 a.m.',
  },
  midday: {
    phrase: 'Lunch hour.',
    orderTitle: 'Order lunch',
    orderMeta: 'Beef Burger, Cheeseburger',
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
    orderMeta: 'Burgers, disco fries',
    href: cat('9 oz. Specialty Steak Burgers'),
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
  dinner: [
    { name: 'Twin 5 oz. Rock Lobster Tails', id: '8371dba5-9a65-4d51-9665-a876bcbaecaa' },
    { name: 'Jumbo Shrimp (6) Broiled', id: '7e06171e-4e6a-490f-ac92-e2fcf40b1e5e' },
    { name: 'Shrimp Scampi (6)', id: '4db25be1-7e4e-48f7-a498-e9136ea57dfe' },
    { name: 'Deep Sea Scallops', id: '8ad940f3-0f69-4705-ae71-bb2447514c21' },
    { name: 'Filet of Sole Broiled', id: '2f2c96db-370a-4083-b8ff-f4ecb24d7e05' },
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
  beverage: cat('Coffee and Drinks Bar'),
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

export const DISCLOSURE = 'Framed thumbnails are styled product compositions.';
