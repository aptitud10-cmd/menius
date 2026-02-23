import { redirect } from 'next/navigation';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { DashboardHome } from '@/components/dashboard/DashboardHome';

export default async function DashboardPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  const [restaurantRes, ordersRes, productsRes, tablesRes, recentOrdersRes, subRes, totalOrdersRes, weekOrdersRes, topProductsRes] = await Promise.all([
    supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id, total, status, created_at, order_type')
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
    supabase
      .from('orders')
      .select('id, total, status, created_at, order_type')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at'),
    supabase
      .from('order_items')
      .select('qty, products!inner(name, restaurant_id)')
      .eq('products.restaurant_id', restaurantId)
      .limit(500),
  ]);

  const restaurant = restaurantRes.data;
  if (!restaurant) redirect('/onboarding/create-restaurant');

  const todaysOrders = ordersRes.data ?? [];
  const validToday = todaysOrders.filter((o) => o.status !== 'cancelled');
  const salesToday = validToday.reduce((sum, o) => sum + Number(o.total), 0);
  const pendingOrders = todaysOrders.filter((o) => o.status === 'pending').length;
  const cancelledToday = todaysOrders.filter((o) => o.status === 'cancelled').length;
  const avgOrderToday = validToday.length > 0 ? salesToday / validToday.length : 0;

  const activeProducts = productsRes.data?.length ?? 0;
  const activeTables = tablesRes.data?.length ?? 0;

  // Yesterday comparison
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekOrders = weekOrdersRes.data ?? [];
  const yesterdayOrders = weekOrders.filter((o) => {
    const d = new Date(o.created_at);
    return d >= yesterdayStart && d < todayStart && o.status !== 'cancelled';
  });
  const salesYesterday = yesterdayOrders.reduce((s, o) => s + Number(o.total), 0);

  // Revenue by order type (today)
  const revenueByType = { dine_in: 0, pickup: 0, delivery: 0 };
  for (const o of validToday) {
    const t = (o.order_type || 'dine_in') as keyof typeof revenueByType;
    if (t in revenueByType) revenueByType[t] += Number(o.total);
  }

  const stats = {
    ordersToday: todaysOrders.length,
    salesToday,
    activeProducts,
    activeTables,
    pendingOrders,
    cancelledToday,
    avgOrderToday,
    salesYesterday,
    ordersYesterday: yesterdayOrders.length,
    revenueByType,
  };

  // Build 7-day chart data
  const weekOrders = weekOrdersRes.data ?? [];
  const dailyMap = new Map<string, { orders: number; revenue: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { orders: 0, revenue: 0 });
  }
  for (const o of weekOrders) {
    if (o.status === 'cancelled') continue;
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      entry.orders += 1;
      entry.revenue += Number(o.total);
    }
  }
  const chartData = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    label: new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric' }),
    ...data,
  }));

  // Hourly distribution (today)
  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
  for (const o of todaysOrders) {
    if (o.status === 'cancelled') continue;
    const h = new Date(o.created_at).getHours();
    hourlyMap.set(h, (hourlyMap.get(h) ?? 0) + 1);
  }
  const hourlyData = Array.from(hourlyMap.entries())
    .filter(([, count]) => count > 0 || true)
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }));

  // Top products
  const productCounts = new Map<string, number>();
  for (const item of (topProductsRes.data ?? []) as any[]) {
    const name = item.products?.name;
    if (name) productCounts.set(name, (productCounts.get(name) ?? 0) + item.qty);
  }
  const topProducts = Array.from(productCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, qty]) => ({ name, qty }));

  // Order type breakdown
  const orderTypeCounts = { dine_in: 0, pickup: 0, delivery: 0 };
  for (const o of weekOrders) {
    if (o.status === 'cancelled') continue;
    const t = (o.order_type || 'dine_in') as keyof typeof orderTypeCounts;
    if (t in orderTypeCounts) orderTypeCounts[t]++;
  }

  const analytics = { chartData, hourlyData, topProducts, orderTypeCounts };

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
      analytics={analytics}
    />
  );
}
