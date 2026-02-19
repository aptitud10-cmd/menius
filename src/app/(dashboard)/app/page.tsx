import { redirect } from 'next/navigation';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { DashboardHome } from '@/components/dashboard/DashboardHome';

export default async function DashboardPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [restaurantRes, ordersRes, productsRes, tablesRes, recentOrdersRes, subRes, totalOrdersRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id, total, status')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('products')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
    supabase
      .from('tables')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('id, restaurant_id, table_id, order_number, status, customer_name, customer_phone, notes, total, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('subscriptions')
      .select('status, plan_id, trial_end')
      .eq('restaurant_id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId),
  ]);

  const restaurant = restaurantRes.data;
  if (!restaurant) redirect('/onboarding/create-restaurant');

  const todaysOrders = ordersRes.data ?? [];
  const salesToday = todaysOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);
  const pendingOrders = todaysOrders.filter((o) => o.status === 'pending').length;

  const activeProducts = productsRes.data?.length ?? 0;
  const activeTables = tablesRes.data?.length ?? 0;

  const stats = {
    ordersToday: todaysOrders.length,
    salesToday,
    activeProducts,
    activeTables,
    pendingOrders,
  };

  const hasOpenDay = (() => {
    const hours = restaurant.operating_hours;
    if (!hours || typeof hours !== 'object') return false;
    return Object.values(hours).some((day: any) => day && !day.closed && day.open && day.close);
  })();

  const onboarding = {
    hasLogo: !!restaurant.logo_url,
    hasProfile: !!(restaurant.description && restaurant.phone),
    hasHours: hasOpenDay,
    hasProducts: activeProducts >= 5,
    hasTables: activeTables >= 1,
    hasOrders: (totalOrdersRes.count ?? 0) > 0,
  };

  return (
    <DashboardHome
      restaurant={restaurant}
      stats={stats}
      recentOrders={recentOrdersRes.data ?? []}
      subscription={subRes.data ?? null}
      onboarding={onboarding}
    />
  );
}
