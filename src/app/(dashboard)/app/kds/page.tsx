import { getDashboardContext } from '@/lib/get-dashboard-context';
import { KitchenDisplay } from '@/components/orders/KitchenDisplay';

export default async function KDSPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { data: orders }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('currency, name')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('*, order_items(*, product:products(name))')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
      .order('created_at', { ascending: true })
      .limit(100),
  ]);

  const mappedOrders = (orders ?? []).map((o: any) => ({
    ...o,
    items: o.order_items ?? [],
  }));

  return (
    <KitchenDisplay
      initialOrders={mappedOrders}
      restaurantId={restaurantId}
      restaurantName={restaurant?.name ?? ''}
      currency={restaurant?.currency ?? 'USD'}
    />
  );
}
