import { getDashboardContext } from '@/lib/get-dashboard-context';
import { BusinessOverview } from '@/components/dashboard/BusinessOverview';
import { getStartOfDayUTC } from '@/lib/date-utils';
import { isRevenueStatus } from '@/lib/order-state';

export const metadata = {
  title: 'Business Overview — MENIUS',
};

export default async function BusinessPage() {
  const { supabase, userId, restaurantId } = await getDashboardContext();

  // Fetch all branches owned by this user
  const { data: branches } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, currency, locale, logo_url, created_at, timezone')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true });

  const branchList = branches ?? [];

  // "Hoy" se corta con la timezone REAL de cada sucursal, no con la medianoche
  // UTC del runtime de Vercel (que desfasaría el corte varias horas). Cada
  // sucursal puede tener timezone distinta, por eso el corte es per-branch.
  const statsResults = await Promise.all(
    branchList.map(branch => {
      const todayISO = getStartOfDayUTC(branch.timezone ?? 'America/Mexico_City').toISOString();
      return supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('restaurant_id', branch.id)
        .gte('created_at', todayISO);
    })
  );

  const branchStats = branchList.map((branch, i) => {
    const orders = statsResults[i].data ?? [];
    // Revenue realizado = definición única compartida (isRevenueStatus).
    // 'ready' NO cuenta: comida lista pero aún no entregada/pagada.
    const completed = orders.filter(o => isRevenueStatus(o.status));
    // 'pending' es el estado inicial real ('new' no existe en la DB); incluirlo
    // para que las órdenes recién entradas cuenten como activas.
    const active = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
    const revenue = completed.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    return {
      ...branch,
      todayOrders: orders.length,
      activeOrders: active.length,
      todayRevenue: revenue,
      currency: branch.currency ?? 'MXN',
    };
  });

  const locale = (branches?.find(b => b.id === restaurantId)?.locale ?? 'es') as 'es' | 'en';

  return <BusinessOverview branches={branchStats} currentRestaurantId={restaurantId} locale={locale} />;
}
