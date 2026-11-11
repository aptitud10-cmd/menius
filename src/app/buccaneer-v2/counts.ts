import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { COUNTS, COUNT_GROUPS, MENU_SLUG, type Counts } from './data';

const logger = createLogger('buccaneer-v2');

/**
 * Dish counts read from the live menu at render time (AD 0: "no se tipea a
 * mano"). Same rule the menu uses: active products in active categories,
 * grouped by the category's group (or its own name when it has none).
 * Runs inside the page's ISR window (revalidate = 300), so at most one query
 * pair every 5 minutes. On any error the page keeps the last known numbers.
 */
export async function getCounts(): Promise<Counts> {
  try {
    const db = createAdminClient();
    const { data: restaurant, error: rErr } = await db
      .from('restaurants')
      .select('id')
      .eq('slug', MENU_SLUG)
      .maybeSingle();
    if (rErr || !restaurant) throw rErr ?? new Error('restaurant not found');

    const [{ data: cats, error: cErr }, { data: prods, error: pErr }] = await Promise.all([
      db
        .from('categories')
        .select('id, name, group_name')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true),
      db
        .from('products')
        .select('category_id')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true),
    ]);
    if (cErr || pErr || !cats || !prods) throw cErr ?? pErr ?? new Error('empty menu');

    const groupOf = new Map(cats.map((c) => [c.id as string, (c.group_name ?? c.name) as string]));
    const byGroup = new Map<string, number>();
    let total = 0;
    for (const p of prods) {
      const g = groupOf.get(p.category_id as string);
      if (!g) continue; // product in an inactive category: the menu doesn't show it
      total += 1;
      byGroup.set(g, (byGroup.get(g) ?? 0) + 1);
    }
    if (total === 0) throw new Error('no active products');

    const out = { ...COUNTS, total };
    for (const [key, group] of Object.entries(COUNT_GROUPS) as [keyof typeof COUNT_GROUPS, string][]) {
      out[key] = byGroup.get(group) ?? 0;
    }
    return out;
  } catch (err: unknown) {
    logger.error('counts fallback', { error: err instanceof Error ? err.message : String(err) });
    return COUNTS;
  }
}
