import { getDashboardContext } from '@/lib/get-dashboard-context';
import { OrdersBoard } from '@/components/orders/OrdersBoard';

export default async function OrdersPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { data: orders }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('currency')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('*, order_items(*, product:products(name))')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const mappedOrders = (orders ?? []).map((o: any) => ({
    ...o,
    items: o.order_items ?? [],
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-white">Órdenes</h1>
      <OrdersBoard
        initialOrders={mappedOrders}
        restaurantId={restaurantId}
        currency={restaurant?.currency ?? 'MXN'}
      />
    </div>
  );
}
