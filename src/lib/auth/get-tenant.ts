import { createClient } from '@/lib/supabase/server';

export interface TenantInfo {
  userId: string;
  restaurantId: string;
}

/**
 * Get the authenticated user's tenant (restaurant) info.
 * Used in all tenant-scoped API routes to avoid repeating auth + profile queries.
 * Returns null if not authenticated or no restaurant is linked.
 */
export async function getTenant(): Promise<TenantInfo | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) return null;

  return {
    userId: user.id,
    restaurantId: profile.default_restaurant_id,
  };
}
