import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RestaurantSettings } from '@/components/dashboard/RestaurantSettings';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', profile.default_restaurant_id)
    .single();

  if (!restaurant) redirect('/onboarding/create-restaurant');

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 text-white">Configuración</h1>
      <RestaurantSettings initialData={restaurant} />
    </div>
  );
}
