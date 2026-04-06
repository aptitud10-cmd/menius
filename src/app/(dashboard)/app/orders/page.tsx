import Link from 'next/link';
import { Maximize2 } from 'lucide-react';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { OrdersBoard } from '@/components/orders/OrdersBoard';

export default async function OrdersPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { data: orders }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('name, slug, currency, phone, address, locale, tax_label, tax_included')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select(`
        *,
        table:tables ( name ),
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
      .limit(500),
  ]);

  const mappedOrders = (orders ?? []).map((o: any) => ({
    ...o,
    table_name: o.table?.name ?? o.table_name ?? null,
    items: o.order_items ?? [],
  }));

  const isEn = restaurant?.locale === 'en';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="dash-heading">{isEn ? 'Orders' : 'Órdenes'}</h1>
        <Link
          href="/kds"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Maximize2 className="w-4 h-4" />
          {isEn ? 'Tablet Mode' : 'Modo Tablet'}
        </Link>
      </div>
      <OrdersBoard
        initialOrders={mappedOrders}
        restaurantId={restaurantId}
        restaurantSlug={restaurant?.slug ?? ''}
        currency={restaurant?.currency ?? 'MXN'}
        restaurantName={restaurant?.name ?? ''}
        restaurantPhone={restaurant?.phone ?? undefined}
        restaurantAddress={restaurant?.address ?? undefined}
        taxLabel={(restaurant as any)?.tax_label ?? undefined}
        taxIncluded={(restaurant as any)?.tax_included ?? false}
      />
    </div>
  );
}
