import { redirect } from 'next/navigation';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { RestaurantSettings } from '@/components/dashboard/RestaurantSettings';

export default async function SettingsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .maybeSingle();

  if (!restaurant) redirect('/onboarding/create-restaurant');

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 text-white">Configuración</h1>
      <RestaurantSettings initialData={restaurant} />
    </div>
  );
}
