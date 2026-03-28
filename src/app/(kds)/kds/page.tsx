import { getDashboardContext } from '@/lib/get-dashboard-context';
import { KDSView } from '@/components/orders/KDSView';

export default async function KDSFullscreenPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { data: orders }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('name, currency, phone, address, slug, tax_label, tax_included')
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
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const mappedOrders = (orders ?? []).map((o: any) => ({
    ...o,
    items: o.order_items ?? [],
  }));

  return (
    <KDSView
      initialOrders={mappedOrders}
      restaurantId={restaurantId}
      restaurantName={restaurant?.name ?? 'Mi Restaurante'}
      currency={restaurant?.currency ?? 'MXN'}
      restaurantPhone={restaurant?.phone ?? undefined}
      restaurantAddress={restaurant?.address ?? undefined}
      restaurantSlug={restaurant?.slug ?? ''}
      taxLabel={(restaurant as any)?.tax_label ?? undefined}
      taxIncluded={(restaurant as any)?.tax_included ?? false}
    />
  );
}
