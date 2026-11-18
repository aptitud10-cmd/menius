import React from 'react';
import type { ComponentType, ReactNode } from 'react';
import {
  Beef,
  Beer,
  CakeSlice,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  GlassWater,
  IceCream,
  Martini,
  Milk,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Glyph = ComponentType<{ className?: string; strokeWidth?: number | string }>;

/** Same grid and stroke as lucide, for the breads lucide doesn't draw. */
function drawn(name: string, children: ReactNode): Glyph {
  function DrawnGlyph({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number | string }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {children}
      </svg>
    );
  }
  DrawnGlyph.displayName = name;
  return DrawnGlyph;
}

/** A roll seen from the side: domed top, flat base. */
export const Roll = drawn(
  'Roll',
  <>
    <path d="M3 14.5a9 8 0 0 1 18 0z" />
    <path d="M4 14.5v2A2.5 2.5 0 0 0 6.5 19h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
    <path d="M9 9.5 10.5 8M13.5 9.5 15 8" />
  </>,
);

/** A bagel from above: a ring with seeds. */
export const Bagel = drawn(
  'Bagel',
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M7.2 7.4h.01M12.4 5.4h.01M16.9 8h.01M18.4 12.6h.01M15.6 17.2h.01M10.2 18.5h.01M5.8 14.2h.01" />
  </>,
);

/** A slice of bread with grains. */
export const BreadSlice = drawn(
  'BreadSlice',
  <>
    <path d="M5 21v-9.4A4.5 4.5 0 0 1 7.5 3.5h9A4.5 4.5 0 0 1 19 11.6V21z" />
    <path d="M10 10l.6.6M14 12.5l.6.6M10.5 15.5l.6.6" />
  </>,
);

/** A muffin: puffed top over a pleated cup. */
export const Muffin = drawn(
  'Muffin',
  <>
    <path d="M4.5 12.5A3 3 0 0 1 6 7a6 4.5 0 0 1 12 0 3 3 0 0 1 1.5 5.5z" />
    <path d="M6 12.5 7.5 20.5h9l1.5-8" />
    <path d="M10.2 12.5l.4 8M13.8 12.5l-.4 8" />
  </>,
);

/** An English muffin: a flat round with nooks on top. */
export const EnglishMuffin = drawn(
  'EnglishMuffin',
  <>
    <ellipse cx="12" cy="10" rx="9" ry="4.5" />
    <path d="M3 10v4c0 2.5 4 4.5 9 4.5s9-2 9-4.5v-4" />
    <path d="M8.5 9.5h.01M12 8h.01M15.5 9.8h.01M11.5 11.6h.01" />
  </>,
);

/**
 * Stand-in for a product without a photo where a row needs something on the
 * left (the cart). With text alone, a cart of rolls and coffees looked empty
 * (Pedro, 2026-11-17). A tinted tile with a line icon reads as designed; a grey
 * plate icon next to real photos read as a failed image.
 *
 * The icon has to look like what's sold (Pedro, 2026-11-18: a buttered roll
 * drawn as a croissant). When nothing honest fits — a chicken cutlet is not a
 * drumstick, a shrimp is not a fish — it's the neutral fork and knife.
 *
 * Matched on the product name (the cart doesn't get categories). First match
 * wins, so the specific words go first: "Smoothie Colada" is a smoothie, not a
 * cocktail; "L.I. Iced Tea" is a cocktail, not tea; "Water Bagel" is a bagel.
 */
const RULES: [RegExp, Glyph][] = [
  [/smoothie|shake|batido|juice|jugo|lemonade|limonada|\bsoda\b|coke|\bcola\b|sprite|arnold palmer/, CupSoda],
  [
    /martini|margarita|cocktail|daiquiri|colada|mojito|cosmo|mimosa|bloody mary|sex on the beach|\bsour\b|russian|breeze|sling|fizz|collins|punch|kamikaze|zombie|slammer|fuzzy navel|godfather|cadillac|alexander|woo woo|melon ball|chi-chi|hawaiian|toasted almond|long island|l\.i\.|manhattan|old fashioned|negroni|mai tai|paloma|screwdriver|sunrise|casa blanca/,
    Martini,
  ],
  [/\bbeer|cerveza|corona|heineken|budweiser|bud light|beck'?s|coors|miller|modelo|presidente|stella|guinness|\bipa\b|lager/, Beer],
  [/\bwine|vino|sangria|cabernet|chardonnay|merlot|pinot|sauvignon|chianti|riesling|prosecco|champagne|malbec|zinfandel|moscato|\bros[eé]\b/, Wine],
  [/coffee|caf[eé]|espresso|cappuccino|\blatte\b|macchiato|\bmocha\b|\btea\b|\bt[eé]\b|hot chocolate|chocolate caliente/, Coffee],
  [/\bmilk|leche/, Milk],
  [/ice cream|helado|sundae|gelato/, IceCream],
  [/spinach pie|pot pie|shepherd'?s pie/, UtensilsCrossed],
  [/cake|\bpie\b|cheesecake|pastel|torta|tarta|brownie/, CakeSlice],
  [/cookie|galleta|donut|dona/, Cookie],
  [/\beggs?\b|omelet|huevo|benedict/, EggFried],
  [/salad|ensalada|avocado/, Salad],
  [/soup|sopa|chowder|caldo|\bchili\b/, Soup],
  [/pizza/, Pizza],
  [/burger|hamburguesa|sandwich|s[aá]ndwich|\bwrap\b|\bclub\b|\bmelt\b|panini|gyro|\bhero\b|reuben|\bblt\b|monte cristo/, Sandwich],
  [/croissant/, Croissant],
  [/bagel/, Bagel],
  [/english muffin/, EnglishMuffin],
  [/muffin|cupcake/, Muffin],
  [/\broll\b|\bbun\b|kaiser|biscuit/, Roll],
  [/bread|toast|\bpan\b|\brye\b|challah|pita/, BreadSlice],
  [/\bwater\b|\bagua\b/, GlassWater],
  [/fish|salmon|\btuna\b|flounder|\bsole\b|tilapia|\bcod\b|\bbass\b|trout|pescado|fisherman/, Fish],
  [/wings?\b|drumstick|fried chicken|nuggets|tenders|fingers|alitas/, Drumstick],
  [/steak|beef|carne|sirloin|t-bone|chop/, Beef],
];

export function productGlyph(name: string): Glyph {
  const n = name.toLowerCase();
  for (const [re, icon] of RULES) if (re.test(n)) return icon;
  return UtensilsCrossed;
}

export function ProductGlyph({ name, className, iconClassName }: { name: string; className?: string; iconClassName?: string }) {
  const Icon = productGlyph(name);
  return (
    <div className={cn('flex-shrink-0 grid place-items-center bg-[#e6faf7] text-[#047a65]', className)} aria-hidden="true">
      <Icon className={cn('w-6 h-6', iconClassName)} strokeWidth={1.75} />
    </div>
  );
}
