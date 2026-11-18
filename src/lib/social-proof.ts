/**
 * Minimums before the public menu shows any social proof. A badge or a rating
 * built on a handful of orders reads as fake — and before a restaurant has
 * real traffic, those few orders are usually the owner's own tests.
 * Evidence: Cai et al. 2009 (AER) — "most popular" lifts demand only when it is
 * true; Baymard — a 5★ from 4 reviews loses ~2:1 to a 4.5★ from 57.
 */

/** Orders of the same product in the last 7 days before it can carry a badge. */
export const POPULAR_MIN_ORDERS_7D = 20;

/** At most this many products carry a popularity badge (DoorDash uses 3). */
export const POPULAR_MAX_BADGES = 3;

/**
 * Reviews tied to a real order AND with written text before the rating, the
 * review cards and the JSON-LD show.
 */
export const REVIEWS_MIN_FOR_RATING = 10;

type PopularitySignals = {
  popularity_rank?: number | null;
  orders_last_7d?: number | null;
};

/** True when the product's popularity is backed by enough real orders. */
export function hasRealPopularity(p: PopularitySignals): boolean {
  return (p.orders_last_7d ?? 0) >= POPULAR_MIN_ORDERS_7D;
}

/** True when the product may show a ranking badge (#1 / Top N). */
export function showsPopularityBadge(p: PopularitySignals): boolean {
  const rank = p.popularity_rank;
  return rank != null && rank <= POPULAR_MAX_BADGES && hasRealPopularity(p);
}
