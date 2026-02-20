import { getDashboardContext } from '@/lib/get-dashboard-context';
import { CustomersManager } from '@/components/dashboard/CustomersManager';

export default async function CustomersPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('currency')
    .eq('id', restaurantId)
    .maybeSingle();

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-gray-900">Clientes</h1>
      <CustomersManager
        restaurantId={restaurantId}
        currency={restaurant?.currency ?? 'USD'}
      />
    </div>
  );
}
