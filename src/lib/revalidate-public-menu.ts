import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Invalidate Next.js cache for the public menu of a restaurant.
 * Call after any change to products, categories, modifiers, or public restaurant fields.
 * The menu uses ISR (revalidate=300) + React cache() — NOT unstable_cache with tags —
 * so invalidation is path-based via revalidatePath. (Prior revalidateTag calls here
 * were dead code: React.cache() doesn't honor tags.)
 */
export function revalidatePublicMenu(slug: string | null | undefined): void {
  if (!slug) return;
  revalidatePath(`/${slug}`, 'page');
  revalidatePath(`/${slug}/checkout`, 'page');
  revalidatePath(`/${slug}/[table]`, 'layout');
}

/**
 * Look up slug by restaurant id (RLS: caller must be allowed to read the row).
 */
export async function revalidatePublicMenuForRestaurant(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<void> {
  if (!restaurantId) return;
  const { data } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', restaurantId)
    .maybeSingle();
  revalidatePublicMenu(data?.slug ?? null);
}
