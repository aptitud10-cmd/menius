import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardContext {
  supabase: SupabaseClient;
  userId: string;
  restaurantId: string;
}

export const getDashboardContext = cache(async (): Promise<DashboardContext> => {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  return {
    supabase,
    userId: user.id,
    restaurantId: profile.default_restaurant_id,
  };
});
