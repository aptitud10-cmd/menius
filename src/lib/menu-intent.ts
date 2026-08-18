import type { Product, Category, DietaryTag } from '@/types';
import { normalize, searchMenu } from '@/lib/menu-search';
import { tName } from '@/lib/i18n';

/**
 * Natural-language menu search — the intent layer on top of menu-search.ts.
 *
 * The customer types "algo picante sin gluten y barato" or "something light for
 * my kid". A substring engine returns nothing for either: no product is named
 * "algo", and "light" is a property, not a word on the menu.
 *
 * DESIGN: the model NEVER picks products. It only translates the sentence into
 * a structured filter, and the existing deterministic engine executes it. That
 * matters for three reasons:
 *   1. The model cannot hallucinate a dish the restaurant doesn't sell — the
 *      candidate set always comes from the real catalogue.
 *   2. Prices, stock and availability stay authoritative (the model sees them
 *      but never gets to invent them).
 *   3. If the model is slow, rate-limited or down, applyIntent() still runs on
 *      a heuristic intent and the search degrades to what it does today.
 */

/** Price bucket, resolved against the actual menu distribution — not fixed amounts. */
export type PriceIntent = 'cheap' | 'mid' | 'premium' | null;

export interface MenuIntent {
  /** Free-text terms to feed the existing lexical engine (dish/ingredient words). */
  terms: string[];
  /** Dietary tags the product MUST have. */
  requireTags: DietaryTag[];
  /** Dietary tags the product must NOT have (e.g. "sin picante", "no nuts"). */
  excludeTags: DietaryTag[];
  /** Relative price band. */
  price: PriceIntent;
  /** Bias toward what actually sells (e.g. "lo más pedido", "popular"). */
  wantsPopular: boolean;
  /** Restrict to a named category when the sentence points at one. */
  categoryHints: string[];
  /** Short answer shown above the results ("Encontré 4 opciones sin gluten"). */
  reply?: string;
}

export const EMPTY_INTENT: MenuIntent = {
  terms: [],
  requireTags: [],
  excludeTags: [],
  price: null,
  wantsPopular: false,
  categoryHints: [],
};

/** Every tag the model is allowed to emit. Anything else is dropped. */
const VALID_TAGS: readonly DietaryTag[] = [
  'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'spicy',
  'contains_nuts', 'keto', 'organic', 'halal', 'kosher',
];

const TAG_SET = new Set<string>(VALID_TAGS);

/**
 * Heuristic fallback. Runs when the model is unavailable, rate-limited, or the
 * query is short enough that a round-trip isn't worth 600 ms.
 *
 * Deliberately bilingual (ES/EN): the menus are LatAm + US.
 */
const TAG_PHRASES: Array<{ tag: DietaryTag; require: RegExp; exclude?: RegExp }> = [
  { tag: 'vegetarian',    require: /\b(vegetarian[oa]?s?|veggie|sin carne|meatless)\b/ },
  { tag: 'vegan',         require: /\b(vegan[oa]?s?)\b/ },
  { tag: 'gluten_free',   require: /\b(sin gluten|gluten[- ]?free|celiac[oa]?|celiac)\b/ },
  { tag: 'dairy_free',    require: /\b(sin lacteos|sin lactosa|dairy[- ]?free|lactose[- ]?free)\b/ },
  { tag: 'spicy',         require: /\b(picantes?|spicy|hot|pican|chile)\b/, exclude: /\b(sin picante|no spicy|not spicy|nada picante|no picante)\b/ },
  { tag: 'contains_nuts', require: /\b(con nueces|with nuts)\b/,           exclude: /\b(sin nueces|nut[- ]?free|no nuts|sin frutos secos)\b/ },
  { tag: 'keto',          require: /\b(keto|cetogenic[oa]|low[- ]?carb)\b/ },
  { tag: 'organic',       require: /\b(organic[oa]s?|organic)\b/ },
  { tag: 'halal',         require: /\b(halal)\b/ },
  { tag: 'kosher',        require: /\b(kosher)\b/ },
];

const CHEAP_RE   = /\b(barat[oa]s?|economic[oa]s?|cheap|budget|low price|mas barato|menos de)\b/;
const PREMIUM_RE = /\b(car[oa]s?|premium|expensive|lujo|gourmet|especial|fancy|lo mejor)\b/;
const POPULAR_RE = /\b(popular(es)?|mas pedid[oa]s?|best[- ]?sell(er|ing)|recomendad[oa]s?|lo mejor|top|favorit[oa]s?)\b/;

/** Words that carry no dish meaning — dropped before lexical search. */
const STOPWORDS = new Set([
  'algo','alguna','alguno','quiero','dame','busco','tienen','tenes','tienes','hay',
  'para','con','sin','que','del','las','los','una','uno','muy','mas','menos','pero',
  'and','the','with','without','some','something','anything','want','looking','for',
  'have','you','got','can','get','give','show','find','need','like','please','food',
  'comida','plato','platos','opcion','opciones','option','options','dish','dishes',
]);

/**
 * Parses intent without a model call. Always safe to run; also used as the
 * base that the model refines, so a model failure never loses these signals.
 */
export function heuristicIntent(query: string): MenuIntent {
  const q = normalize(query);
  if (!q) return { ...EMPTY_INTENT };

  const requireTags: DietaryTag[] = [];
  const excludeTags: DietaryTag[] = [];

  for (const { tag, require, exclude } of TAG_PHRASES) {
    // Exclusion wins: "sin picante" must never be read as "picante".
    if (exclude?.test(q)) {
      excludeTags.push(tag);
      continue;
    }
    if (require.test(q)) requireTags.push(tag);
  }

  const price: PriceIntent = CHEAP_RE.test(q) ? 'cheap' : PREMIUM_RE.test(q) ? 'premium' : null;

  const terms = q
    // Rango explícito en vez de \p{L}\p{N} con flag u: el target del proyecto
    // es es5 y no admite unicode property escapes (mismo criterio que
    // menu-search.ts, que evita \p{Diacritic} por la misma razón).
    // normalize() ya descompuso los diacríticos —incluida la tilde de la ñ,
    // que queda como 'n'—, así que a-z0-9 cubre ES/EN sin perder caracteres.
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  return {
    terms,
    requireTags,
    excludeTags,
    price,
    wantsPopular: POPULAR_RE.test(q),
    categoryHints: [],
  };
}

/**
 * Coerces whatever the model returned into a MenuIntent. Anything unrecognised
 * is dropped rather than trusted — the model output is untrusted input.
 */
export function sanitizeIntent(raw: unknown, fallback: MenuIntent): MenuIntent {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;

  const strArray = (v: unknown, max: number): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
         .map((x) => normalize(x))
         .filter(Boolean)
         .slice(0, max)
      : [];

  const tagArray = (v: unknown): DietaryTag[] =>
    Array.isArray(v)
      ? (v.filter((x): x is DietaryTag => typeof x === 'string' && TAG_SET.has(x)))
          .slice(0, VALID_TAGS.length)
      : [];

  const price = o.price;
  const validPrice: PriceIntent =
    price === 'cheap' || price === 'mid' || price === 'premium' ? price : null;

  const reply = typeof o.reply === 'string' ? o.reply.slice(0, 160).trim() : undefined;

  const requireTags = tagArray(o.requireTags);
  const excludeTags = tagArray(o.excludeTags);

  // A tag can't be both required and excluded — exclusion wins (safety: an
  // allergy filter must never be overridden by a loose "require".)
  const excludeSet = new Set(excludeTags);

  return {
    terms: strArray(o.terms, 8),
    requireTags: requireTags.filter((t) => !excludeSet.has(t)),
    excludeTags,
    price: validPrice,
    wantsPopular: typeof o.wantsPopular === 'boolean' ? o.wantsPopular : fallback.wantsPopular,
    categoryHints: strArray(o.categoryHints, 4),
    reply: reply || undefined,
  };
}

/** Merges model output over the heuristic, keeping signals the model missed. */
export function mergeIntent(heuristic: MenuIntent, model: MenuIntent): MenuIntent {
  const excludeTags = Array.from(new Set([...heuristic.excludeTags, ...model.excludeTags]));
  const excludeSet = new Set(excludeTags);
  return {
    terms: model.terms.length ? model.terms : heuristic.terms,
    // Union: the heuristic catching "sin gluten" must survive a model that missed it.
    requireTags: Array.from(
      new Set([...heuristic.requireTags, ...model.requireTags]),
    ).filter((t) => !excludeSet.has(t)),
    excludeTags,
    price: model.price ?? heuristic.price,
    wantsPopular: model.wantsPopular || heuristic.wantsPopular,
    categoryHints: model.categoryHints.length ? model.categoryHints : heuristic.categoryHints,
    reply: model.reply,
  };
}

/** True when the intent carries no signal at all — nothing to filter by. */
export function isEmptyIntent(i: MenuIntent): boolean {
  return (
    i.terms.length === 0 &&
    i.requireTags.length === 0 &&
    i.excludeTags.length === 0 &&
    i.price === null &&
    !i.wantsPopular &&
    i.categoryHints.length === 0
  );
}

/**
 * Price thresholds derived from THIS menu, not fixed amounts. "Cheap" at a steak
 * house and at a taquería are different numbers; terciles keep the filter
 * meaningful in both.
 */
function priceBands(products: Product[]): { cheap: number; premium: number } | null {
  const prices = products.map((p) => p.price).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (prices.length < 4) return null;
  return {
    cheap: prices[Math.floor(prices.length / 3)],
    premium: prices[Math.floor((prices.length * 2) / 3)],
  };
}

export interface ApplyIntentOptions {
  products: Product[];
  categories: Category[];
  intent: MenuIntent;
  locale: string;
  defaultLocale: string;
}

/**
 * Executes an intent against the catalogue using the existing lexical engine
 * for the text part. Fully deterministic and synchronous — no model involved.
 */
export function applyIntent({
  products,
  categories,
  intent,
  locale,
  defaultLocale,
}: ApplyIntentOptions): Product[] {
  if (isEmptyIntent(intent)) return [];

  let pool = products;

  // ── Dietary constraints ──
  // require: the tag must be present. A product with no tags cannot satisfy it,
  // which is correct: an untagged dish is not verified gluten-free.
  if (intent.requireTags.length > 0) {
    pool = pool.filter((p) => {
      const tags = p.dietary_tags ?? [];
      return intent.requireTags.every((t) => tags.includes(t));
    });
  }
  if (intent.excludeTags.length > 0) {
    pool = pool.filter((p) => {
      const tags = p.dietary_tags ?? [];
      return !intent.excludeTags.some((t) => tags.includes(t));
    });
  }

  // ── Category hints ──
  if (intent.categoryHints.length > 0) {
    const hintIds = new Set(
      categories
        .filter((c) => {
          const name = normalize(tName(c, locale, defaultLocale));
          return intent.categoryHints.some((h) => name.includes(h) || h.includes(name));
        })
        .map((c) => c.id),
    );
    // Only narrow when the hint actually matched something — a hallucinated
    // category name must not empty the results.
    if (hintIds.size > 0) pool = pool.filter((p) => hintIds.has(p.category_id));
  }

  // ── Price band ──
  if (intent.price) {
    const bands = priceBands(products);
    if (bands) {
      if (intent.price === 'cheap') pool = pool.filter((p) => p.price <= bands.cheap);
      else if (intent.price === 'premium') pool = pool.filter((p) => p.price >= bands.premium);
      else pool = pool.filter((p) => p.price > bands.cheap && p.price < bands.premium);
    }
  }

  // ── Lexical terms, through the existing engine ──
  let result: Product[];
  if (intent.terms.length > 0) {
    const poolIds = new Set(pool.map((p) => p.id));
    const seen = new Set<string>();
    result = [];
    for (const term of intent.terms) {
      const hits = searchMenu({ products: pool, categories, query: term, locale, defaultLocale });
      for (const p of hits ?? []) {
        if (poolIds.has(p.id) && !seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
      }
    }
    // Terms that match nothing (e.g. "light") must not zero out a query whose
    // real signal was the dietary/price filter.
    if (result.length === 0) result = pool;
  } else {
    result = pool;
  }

  // ── Ranking ──
  if (intent.wantsPopular) {
    result = [...result].sort((a, b) => (b.orders_last_7d ?? 0) - (a.orders_last_7d ?? 0));
  }

  // In-stock items first — never hide them, but don't lead with sold-out dishes.
  return [...result].sort((a, b) => Number(a.in_stock === false) - Number(b.in_stock === false));
}

/**
 * Compact catalogue summary sent to the model. Names + tags only: descriptions
 * would blow the token budget on a 400-item menu like Buccaneer's, and the model
 * only needs enough to map words to categories and tags.
 */
export function buildCatalogueDigest(
  products: Product[],
  categories: Category[],
  locale: string,
  defaultLocale: string,
  maxCategories = 40,
): string {
  const byCategory = new Map<string, string[]>();
  for (const p of products) {
    const list = byCategory.get(p.category_id) ?? [];
    if (list.length < 6) list.push(tName(p, locale, defaultLocale));
    byCategory.set(p.category_id, list);
  }
  const tagsSeen = new Set<string>();
  for (const p of products) for (const t of p.dietary_tags ?? []) tagsSeen.add(t);

  const lines = categories
    .slice(0, maxCategories)
    .map((c) => {
      const items = byCategory.get(c.id);
      if (!items?.length) return null;
      return `${tName(c, locale, defaultLocale)}: ${items.join(', ')}`;
    })
    .filter(Boolean);

  return [
    `Categorías y ejemplos:\n${lines.join('\n')}`,
    tagsSeen.size ? `\nTags disponibles en este menú: ${Array.from(tagsSeen).join(', ')}` : '',
  ].join('');
}
