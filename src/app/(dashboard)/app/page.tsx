import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardHome } from '@/components/dashboard/DashboardHome';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  const restaurantId = profile.default_restaurant_id;

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) redirect('/onboarding/create-restaurant');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [ordersRes, productsRes, tablesRes, recentOrdersRes, subRes] = await Promise.all([
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
      .select('id, restaurant_id, table_id, order_number, status, customer_name, notes, total, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('subscriptions')
      .select('status, plan_id, trial_end')
      .eq('restaurant_id', restaurantId)
      .single(),
  ]);

  const todaysOrders = ordersRes.data ?? [];
  const salesToday = todaysOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);
  const pendingOrders = todaysOrders.filter((o) => o.status === 'pending').length;

  const stats = {
    ordersToday: todaysOrders.length,
    salesToday,
    activeProducts: productsRes.data?.length ?? 0,
    activeTables: tablesRes.data?.length ?? 0,
    pendingOrders,
  };

  return (
    <DashboardHome
      restaurant={restaurant}
      stats={stats}
      recentOrders={recentOrdersRes.data ?? []}
      subscription={subRes.data ?? null}
    />
  );
}
