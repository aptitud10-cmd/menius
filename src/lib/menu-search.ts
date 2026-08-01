import type { Product, Category } from '@/types';
import { tName, tDesc } from '@/lib/i18n';

/**
 * Menu search engine for large catalogs.
 *
 * Extracted from MenuShell so it can be unit-tested: the previous inline version
 * was a raw substring match over name + description, which meant a customer
 * searching "wine" found nothing in a menu with a "Wine Selection" category
 * (no product is literally named "wine"), and "breakfast" returned 0 of 415 items.
 *
 * Ranking is intentionally simple and deterministic — no fuzzy library, no index
 * build. Everything runs client-side over the products already in memory.
 */

/** Match quality, ordered. Lower sorts first. */
const enum Rank {
  NameExact = 0,
  NamePrefix = 1,
  NameWord = 2,
  NameSubstring = 3,
  Category = 4,
  Description = 5,
}

export interface SearchHit {
  product: Product;
  rank: Rank;
  /** Category the product belongs to, when it matched via category name. */
  matchedCategory?: string;
}

/**
 * Lowercase + strip diacritics so "cafe" matches "café" and vice versa.
 * Critical for LatAm menus where accents are inconsistently typed.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    // Combining diacritical marks (U+0300–U+036F). Written as a range rather than
    // \p{Diacritic} because the TS target predates the unicode regex flag.
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Damerau-Levenshtein distance, capped: returns max+1 as soon as it's clearly over.
 * Counts a transposition ("panckaes" → "pancakes") as ONE edit — plain Levenshtein
 * scores it as two, which would miss the single most common fast-typing typo.
 */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      // Transposition of two adjacent characters.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      curr.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Tolerates a single typo, but only on tokens long enough that a 1-char edit
 * isn't just a different short word ("rice" vs "rise").
 */
function fuzzyMatches(token: string, query: string): boolean {
  if (query.length < 5) return false;
  return editDistance(token, query, 1) <= 1;
}

function rankOf(haystack: string, query: string): Rank | null {
  if (!haystack) return null;
  if (haystack === query) return Rank.NameExact;
  if (haystack.startsWith(query)) return Rank.NamePrefix;

  const words = haystack.split(/\s+/);
  if (words.some((w) => w.startsWith(query))) return Rank.NameWord;
  if (haystack.includes(query)) return Rank.NameSubstring;
  if (words.some((w) => fuzzyMatches(w, query))) return Rank.NameSubstring;

  return null;
}

export interface SearchOptions {
  products: Product[];
  categories: Category[];
  query: string;
  locale: string;
  defaultLocale: string;
}

/**
 * Returns products matching the query, best match first.
 * Returns null (not []) for an empty query so callers can tell
 * "not searching" apart from "searched, found nothing".
 */
export function searchMenu({
  products,
  categories,
  query,
  locale,
  defaultLocale,
}: SearchOptions): Product[] | null {
  const q = normalize(query);
  if (!q) return null;

  // Category names are searchable too — this is the main gap of the old engine.
  const categoryNameById = new Map<string, string>();
  const matchedCategoryIds = new Set<string>();
  for (const cat of categories) {
    const name = normalize(tName(cat, locale, defaultLocale));
    categoryNameById.set(cat.id, name);
    if (rankOf(name, q) !== null) matchedCategoryIds.add(cat.id);
  }

  const descriptionSearchEnabled = matchedCategoryIds.size === 0;

  const hits: SearchHit[] = [];

  for (const product of products) {
    const name = normalize(tName(product, locale, defaultLocale));
    const nameRank = rankOf(name, q);

    if (nameRank !== null) {
      hits.push({ product, rank: nameRank });
      continue;
    }

    if (matchedCategoryIds.has(product.category_id)) {
      hits.push({
        product,
        rank: Rank.Category,
        matchedCategory: categoryNameById.get(product.category_id),
      });
      continue;
    }

    // Descriptions are only searched when the query does NOT name a category.
    // "wine" names a whole section, so the customer wants the drink — not the 13
    // dishes cooked "in a white wine sauce". When no category matches, description
    // search is what makes ingredient queries ("avocado", "gluten") work.
    if (!descriptionSearchEnabled) continue;

    const description = normalize(tDesc(product, locale, defaultLocale));
    if (description.includes(q)) {
      hits.push({ product, rank: Rank.Description });
    }
  }

  hits.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    // Stable tiebreak: keep the menu's own ordering within a rank.
    return (a.product.sort_order ?? 0) - (b.product.sort_order ?? 0);
  });

  return hits.map((h) => h.product);
}

/**
 * Category suggestions shown under an empty search field — gives the customer
 * a way in without typing. Biased toward what actually sells.
 */
export function suggestedCategories(
  products: Product[],
  categories: Category[],
  limit = 8,
): Category[] {
  const ordersByCategory = new Map<string, number>();
  const countByCategory = new Map<string, number>();

  for (const p of products) {
    countByCategory.set(p.category_id, (countByCategory.get(p.category_id) ?? 0) + 1);
    const orders = p.orders_last_7d ?? 0;
    if (orders > 0) {
      ordersByCategory.set(p.category_id, (ordersByCategory.get(p.category_id) ?? 0) + orders);
    }
  }

  const hasOrderData = ordersByCategory.size > 0;

  return [...categories]
    .filter((c) => (countByCategory.get(c.id) ?? 0) > 0)
    .sort((a, b) => {
      if (hasOrderData) {
        const diff = (ordersByCategory.get(b.id) ?? 0) - (ordersByCategory.get(a.id) ?? 0);
        if (diff !== 0) return diff;
      }
      return (countByCategory.get(b.id) ?? 0) - (countByCategory.get(a.id) ?? 0);
    })
    .slice(0, limit);
}
