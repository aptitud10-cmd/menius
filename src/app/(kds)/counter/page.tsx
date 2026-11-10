import { getDashboardContext } from '@/lib/get-dashboard-context';
import { OPEN_ORDER_STATUSES, olderOpenOrdersFilter } from '@/lib/order-state';
import { CounterView } from '@/components/orders/CounterView';
import { isDeviceSession } from '@/lib/auth/device-session';

export const metadata = {
  title: 'Counter — MENIUS',
};

export default async function CounterPage() {
  const { supabase, restaurantId } = await getDashboardContext(true);

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const [{ data: restaurant }, { data: orders }, { data: oldScheduled }, isDevice] = await Promise.all([
    supabase
      .from('restaurants')
      .select('name, currency, slug, locale, latitude, longitude, tax_label, tax_included, orders_paused_until')
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
      .gte('created_at', sixHoursAgo)
      .order('created_at', { ascending: false })
      .limit(150),
    // Programados pendientes creados hace más de 6 h: sin esto no aparecían.
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
      .in('status', OPEN_ORDER_STATUSES)
      .lt('created_at', sixHoursAgo)
      .or(olderOpenOrdersFilter(sixHoursAgo))
      .order('created_at', { ascending: false })
      .limit(50),
    isDeviceSession(supabase),
  ]);

  const mappedOrders = [...(orders ?? []), ...(oldScheduled ?? [])].map((o: any) => ({
    ...o,
    items: o.order_items ?? [],
  }));

  return (
    <CounterView
      initialOrders={mappedOrders}
      restaurantId={restaurantId}
      restaurantName={restaurant?.name ?? 'Mi Restaurante'}
      currency={restaurant?.currency ?? 'MXN'}
      locale={restaurant?.locale ?? 'es'}
      restaurantLat={restaurant?.latitude ?? null}
      restaurantLng={restaurant?.longitude ?? null}
      taxLabel={(restaurant as any)?.tax_label ?? undefined}
      taxIncluded={(restaurant as any)?.tax_included ?? false}
      isDevice={isDevice}
      initialPausedUntil={restaurant?.orders_paused_until ?? null}
    />
  );
}
