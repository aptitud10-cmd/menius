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
      <CustomersManager
        restaurantId={restaurantId}
        currency={restaurant?.currency ?? 'USD'}
      />
    </div>
  );
}
