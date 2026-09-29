/**
 * Shape helpers for the mobile app endpoints (/api/app/*).
 *
 * Extracted from the route handlers so the parsing rules can be tested without
 * standing up Supabase — the repo's convention for route logic (see
 * src/lib/orders/calculate-pricing.ts).
 */

/** A favorited restaurant as the app's Home screen renders it. */
export type FavoriteRestaurant = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  is_active: boolean | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pull the favorited restaurant ids out of an `app_devices.favorites` value.
 *
 * The column defaults to `'[]'::jsonb` but the app writes
 * `{ restaurants: [], products: [] }`, so both shapes exist in the table. Only
 * the object form carries restaurant ids — a bare array means "none yet".
 *
 * Ids are filtered to well-formed UUIDs: `.in()` on a uuid column rejects the
 * whole query if any element fails to cast, so one bad entry would otherwise
 * take the entire Home screen down.
 */
export function parseFavoriteRestaurantIds(favorites: unknown): string[] {
  if (!favorites || Array.isArray(favorites) || typeof favorites !== 'object') return [];

  const ids = (favorites as { restaurants?: unknown }).restaurants;
  if (!Array.isArray(ids)) return [];

  return ids.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id));
}

/** Drop restaurants the owner has deactivated. `null` is treated as active. */
export function keepActiveRestaurants(rows: FavoriteRestaurant[]): FavoriteRestaurant[] {
  return rows.filter((r) => r.is_active !== false);
}

/**
 * Flatten the restaurant PostgREST embeds alongside an order.
 *
 * The embed arrives as an object or a single-element array depending on how the
 * relationship is inferred, so the app would otherwise have to handle both.
 */
export function flattenOrderRestaurant<T extends Record<string, unknown>>(
  row: T & {
    restaurants?: { name: string; slug: string } | { name: string; slug: string }[] | null;
  },
): Omit<T, 'restaurants'> & { restaurant: { name: string; slug: string } | null } {
  const { restaurants, ...order } = row;
  const restaurant = Array.isArray(restaurants) ? (restaurants[0] ?? null) : (restaurants ?? null);
  return { ...order, restaurant };
}
