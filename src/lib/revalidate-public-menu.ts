import { revalidatePath, revalidateTag } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Invalidate Next.js cache for the public menu of a restaurant.
 * Call after any change to products, categories, modifiers, or public restaurant fields.
 */
export function revalidatePublicMenu(slug: string | null | undefined): void {
  if (!slug) return;
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/[table]`, 'layout');
  revalidateTag('menu-data');
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
