import { createClient } from '@/lib/supabase/server';

export interface TenantInfo {
  userId: string;
  restaurantId: string;
  email?: string;
}

/**
 * Get the authenticated user's tenant (restaurant) info.
 * Used in all tenant-scoped API routes to avoid repeating auth + profile queries.
 * Returns null if not authenticated or no restaurant is linked.
 *
 * Ownership is re-verified against restaurants.owner_user_id on every call —
 * profiles.default_restaurant_id alone is NOT proof of ownership. Roughly 16
 * routes act on the returned restaurantId with the service-role client (which
 * bypasses RLS): refunds, Wompi key writes, account deletion. If that column
 * could ever point at someone else's restaurant, all of them would operate on
 * it. The DB policy blocks writing a foreign id (see
 * migration-profiles-owner-check.sql); this check is the second layer, and the
 * one that also covers rows written before that policy existed.
 */
export async function getTenant(): Promise<TenantInfo | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.default_restaurant_id) return null;

  const { data: owned } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', profile.default_restaurant_id)
    .eq('owner_user_id', user.id)
    .maybeSingle();

  if (!owned) return null;

  return {
    userId: user.id,
    restaurantId: profile.default_restaurant_id,
    email: user.email,
  };
}
