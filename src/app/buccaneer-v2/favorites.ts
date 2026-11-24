import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { FAVORITES, MENU_SLUG } from './data';

const logger = createLogger('buccaneer-v2');

/** product id -> price as shown ("12.95") */
export type FavoritePrices = Record<string, string>;

/**
 * Live prices of the six "Where to start" plates (app layout), so a price change in
 * the menu shows here too. Same ISR window as getCounts (revalidate = 300). On any
 * error, or for a plate that is no longer active, the approved fallback price stays.
 */
export async function getFavoritePrices(): Promise<FavoritePrices> {
  const out: FavoritePrices = Object.fromEntries(FAVORITES.map((f) => [f.id, f.price]));
  try {
    const db = createAdminClient({ isr: true });
    const { data: restaurant, error: rErr } = await db
      .from('restaurants')
      .select('id')
      .eq('slug', MENU_SLUG)
      .maybeSingle();
    if (rErr || !restaurant) throw rErr ?? new Error('restaurant not found');

    const { data, error } = await db
      .from('products')
      .select('id, price')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .in(
        'id',
        FAVORITES.map((f) => f.id),
      );
    if (error || !data) throw error ?? new Error('no favorites');

    for (const p of data) {
      const n = Number(p.price);
      if (Number.isFinite(n) && n > 0) out[p.id as string] = n.toFixed(2);
    }
  } catch (err: unknown) {
    logger.error('favorites fallback', { error: err instanceof Error ? err.message : String(err) });
  }
  return out;
}
