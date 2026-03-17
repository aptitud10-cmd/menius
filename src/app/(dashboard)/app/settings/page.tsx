import { redirect } from 'next/navigation';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { RestaurantSettings } from '@/components/dashboard/RestaurantSettings';
import { PrinterSettingsSection } from '@/components/dashboard/PrinterSettingsSection';

export default async function SettingsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .maybeSingle();

  if (!restaurant) redirect('/onboarding/create-restaurant');

  return (
    <div className="space-y-10 pb-10">
      <div>
        <h1 className="dash-heading mb-5">{restaurant?.locale === 'en' ? 'Settings' : 'Configuración'}</h1>
        <RestaurantSettings initialData={restaurant} />
      </div>
      <PrinterSettingsSection locale={restaurant?.locale ?? 'es'} />
    </div>
  );
}
