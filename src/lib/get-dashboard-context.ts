import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isDeviceSession } from '@/lib/auth/device-session';

export interface DashboardContext {
  supabase: SupabaseClient;
  userId: string;
  userEmail: string | null;
  restaurantId: string;
}

/**
 * allowDevice: solo el Counter (página y sus rutas) lo pasa en true. Una tablet
 * vinculada con código que llega a cualquier otra cosa vuelve a /counter.
 */
export const getDashboardContext = cache(async (allowDevice: boolean = false): Promise<DashboardContext> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, isDevice] = await Promise.all([
    supabase
      .from('profiles')
      .select('default_restaurant_id')
      .eq('user_id', user.id)
      .maybeSingle(),
    isDeviceSession(supabase),
  ]);

  if (isDevice && !allowDevice) redirect('/counter');

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  return {
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    restaurantId: profile.default_restaurant_id,
  };
});
