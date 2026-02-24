import Link from 'next/link';
import { Maximize2 } from 'lucide-react';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { OrdersBoard } from '@/components/orders/OrdersBoard';

export default async function OrdersPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { data: orders }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('name, currency, phone, address')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id, qty, unit_price, line_total, notes,
          product:products ( name, image_url ),
          variant:product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) ),
          order_item_modifiers ( group_name, option_name, price_delta )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const mappedOrders = (orders ?? []).map((o: any) => ({
    ...o,
    items: o.order_items ?? [],
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="dash-heading">Órdenes</h1>
        <Link
          href="/kds"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Maximize2 className="w-4 h-4" />
          Modo Tablet
        </Link>
      </div>
      <OrdersBoard
        initialOrders={mappedOrders}
        restaurantId={restaurantId}
        currency={restaurant?.currency ?? 'MXN'}
        restaurantName={restaurant?.name ?? ''}
        restaurantPhone={restaurant?.phone ?? undefined}
        restaurantAddress={restaurant?.address ?? undefined}
      />
    </div>
  );
}
