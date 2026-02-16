import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function getTenant(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.default_restaurant_id) return null;
  return { userId: user.id, restaurantId: profile.default_restaurant_id };
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const tenant = await getTenant(supabase);
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get('days')) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const rid = tenant.restaurantId;

  // Orders in period
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, status, created_at, discount_amount')
    .eq('restaurant_id', rid)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true });

  const allOrders = orders ?? [];
  const completedOrders = allOrders.filter(o => o.status === 'completed' || o.status === 'delivered');
  const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = allOrders.length;
  const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  const totalDiscount = allOrders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);

  // Sales by day
  const salesByDay: Record<string, { date: string; orders: number; revenue: number }> = {};
  for (const o of allOrders) {
    const d = o.created_at.split('T')[0];
    if (!salesByDay[d]) salesByDay[d] = { date: d, orders: 0, revenue: 0 };
    salesByDay[d].orders++;
    if (o.status === 'completed' || o.status === 'delivered') {
      salesByDay[d].revenue += Number(o.total);
    }
  }

  // Orders by status
  const statusCount: Record<string, number> = {};
  for (const o of allOrders) {
    statusCount[o.status] = (statusCount[o.status] || 0) + 1;
  }

  // Top products
  const orderIds = allOrders.map(o => o.id);
  let topProducts: { name: string; qty: number; revenue: number }[] = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, qty, line_total, products(name)')
      .in('order_id', orderIds);

    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const item of (items ?? [])) {
      const pid = item.product_id;
      const pname = (item as any).products?.name ?? 'Desconocido';
      if (!productMap[pid]) productMap[pid] = { name: pname, qty: 0, revenue: 0 };
      productMap[pid].qty += item.qty;
      productMap[pid].revenue += Number(item.line_total);
    }
    topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }

  return NextResponse.json({
    period: { days, since: sinceISO },
    summary: { totalOrders, totalRevenue, avgTicket, totalDiscount, completedOrders: completedOrders.length },
    salesByDay: Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date)),
    statusCount,
    topProducts,
  });
}
