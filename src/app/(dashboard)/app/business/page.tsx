import { getDashboardContext } from '@/lib/get-dashboard-context';
import { BusinessOverview } from '@/components/dashboard/BusinessOverview';

export const metadata = {
  title: 'Business Overview — MENIUS',
};

export default async function BusinessPage() {
  const { supabase, userId, restaurantId } = await getDashboardContext();

  // Fetch all branches owned by this user
  const { data: branches } = await supabase
    .from('restaurants')
    .select('id, name, slug, is_active, currency, locale, logo_url, created_at')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true });

  // Fetch today's order stats for each branch in parallel
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const branchList = branches ?? [];

  const statsResults = await Promise.all(
    branchList.map(branch =>
      supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('restaurant_id', branch.id)
        .gte('created_at', todayISO)
    )
  );

  const branchStats = branchList.map((branch, i) => {
    const orders = statsResults[i].data ?? [];
    const completed = orders.filter(o => ['delivered', 'completed', 'ready'].includes(o.status));
    const active = orders.filter(o => ['new', 'confirmed', 'preparing'].includes(o.status));
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
