import { getDashboardContext } from '@/lib/get-dashboard-context';
import { TablesManager } from '@/components/dashboard/TablesManager';

export default async function TablesPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [tablesRes, restaurantRes] = await Promise.all([
    supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at'),
    supabase
      .from('restaurants')
      .select('name, slug')
      .eq('id', restaurantId)
      .maybeSingle(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-gray-900">Mesas & Códigos QR</h1>
      <TablesManager
        initialTables={tablesRes.data ?? []}
        restaurantSlug={restaurantRes.data?.slug ?? ''}
        restaurantName={restaurantRes.data?.name ?? ''}
      />
    </div>
  );
}
