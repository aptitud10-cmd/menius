import { getDashboardContext } from '@/lib/get-dashboard-context';
import { CounterView } from '@/components/orders/CounterView';

export const metadata = {
  title: 'Counter — MENIUS',
};

export default async function CounterPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { data: orders }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('name, currency, slug')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select(`
        *,
        table:tables ( name ),
        order_items (
          id, qty, unit_price, line_total, notes,
          product:products ( id, name, image_url, dietary_tags ),
          variant:product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) ),
          order_item_modifiers ( group_name, option_name, price_delta )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("delivered","cancelled")')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const mappedOrders = (orders ?? []).map((o: any) => ({
    ...o,
    items: o.order_items ?? [],
  }));

  return (
    <CounterView
      initialOrders={mappedOrders}
      restaurantId={restaurantId}
      restaurantName={restaurant?.name ?? 'Mi Restaurante'}
      currency={restaurant?.currency ?? 'MXN'}
    />
  );
}
