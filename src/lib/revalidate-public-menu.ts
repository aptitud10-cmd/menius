import { revalidatePath, revalidateTag } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Invalidate Next.js cache for the public menu of a restaurant.
 * Call after any change to products, categories, modifiers, or public restaurant fields.
 * Uses a per-restaurant tag so only this restaurant's cache entry is flushed,
 * not all restaurants simultaneously.
 */
export function revalidatePublicMenu(slug: string | null | undefined): void {
  if (!slug) return;
  // Explicit 'page' type ensures Vercel purges the ISR HTML for this exact slug
  revalidatePath(`/${slug}`, 'page');
  revalidatePath(`/${slug}/checkout`, 'page');
  revalidatePath(`/${slug}/[table]`, 'layout');
  // Per-restaurant tag — invalidates only this slug's unstable_cache entry
  revalidateTag(`menu-data:${slug}`);
  revalidateTag(`menu-data`);
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
