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
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Stand-in for a product without a photo where a row needs something on the
 * left (the cart). With text alone, a cart of rolls and coffees looked empty
 * (Pedro, 2026-11-17). A tinted tile with a line icon reads as designed; a grey
 * plate icon next to real photos read as a failed image.
 *
 * Matched on the product name (the cart doesn't get categories). First match
 * wins, so the specific words go first: "Smoothie Colada" is a smoothie, not a
 * cocktail; "L.I. Iced Tea" is a cocktail, not tea; "Water Bagel" is bread.
 */
const RULES: [RegExp, LucideIcon][] = [
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
  [/croissant|\broll\b|bagel|toast|bread|\bpan\b|muffin|biscuit|pancake|waffle/, Croissant],
  [/\bwater\b|\bagua\b/, GlassWater],
  [/\beggs?\b|omelet|huevo|benedict/, EggFried],
  [/salad|ensalada/, Salad],
  [/soup|sopa|chowder|caldo|\bchili\b/, Soup],
  [/pizza/, Pizza],
  [/burger|hamburguesa|sandwich|s[aá]ndwich|\bwrap\b|\bclub\b|\bmelt\b|panini|gyro|\bhero\b|reuben|\bblt\b|monte cristo/, Sandwich],
  [/fish|salmon|shrimp|seafood|scallop|clam|lobster|tuna|flounder|pescado|camar[oó]n|mariscos|fisherman/, Fish],
  [/chicken|wings|pollo|alitas|turkey|pavo/, Drumstick],
  [/steak|beef|carne|ribs|sirloin|t-bone|pork|chop/, Beef],
];

export function productGlyph(name: string): LucideIcon {
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
