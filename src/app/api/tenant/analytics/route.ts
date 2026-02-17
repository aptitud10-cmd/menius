import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get('days')) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const prevSince = new Date();
  prevSince.setDate(prevSince.getDate() - days * 2);
  const prevSinceISO = prevSince.toISOString();

  const rid = tenant.restaurantId;

  const [currentRes, prevRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status, created_at, discount_amount')
      .eq('restaurant_id', rid)
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true }),
    supabase
      .from('orders')
      .select('id, total, status, created_at')
      .eq('restaurant_id', rid)
      .gte('created_at', prevSinceISO)
      .lt('created_at', sinceISO),
  ]);

  const allOrders = currentRes.data ?? [];
  const prevOrders = prevRes.data ?? [];

  const completedStatuses = ['completed', 'delivered', 'ready'];
  const completedOrders = allOrders.filter(o => completedStatuses.includes(o.status));
  const prevCompleted = prevOrders.filter(o => completedStatuses.includes(o.status));

  const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.total), 0);
  const prevRevenue = prevCompleted.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = allOrders.length;
  const prevTotalOrders = prevOrders.length;
  const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  const prevAvgTicket = prevCompleted.length > 0 ? prevRevenue / prevCompleted.length : 0;
  const totalDiscount = allOrders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
  const cancelledOrders = allOrders.filter(o => o.status === 'cancelled').length;
  const conversionRate = totalOrders > 0 ? ((totalOrders - cancelledOrders) / totalOrders) * 100 : 0;

  function pctChange(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null;
    return ((current - previous) / previous) * 100;
  }

  const salesByDay: Record<string, { date: string; orders: number; revenue: number }> = {};
  for (const o of allOrders) {
    const d = o.created_at.split('T')[0];
    if (!salesByDay[d]) salesByDay[d] = { date: d, orders: 0, revenue: 0 };
    salesByDay[d].orders++;
    if (completedStatuses.includes(o.status)) {
      salesByDay[d].revenue += Number(o.total);
    }
  }

  const statusCount: Record<string, number> = {};
  for (const o of allOrders) {
    statusCount[o.status] = (statusCount[o.status] || 0) + 1;
  }

  const hourlyDistribution: number[] = new Array(24).fill(0);
  for (const o of allOrders) {
    const hour = new Date(o.created_at).getHours();
    hourlyDistribution[hour]++;
  }

  const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
  const peakHourLabel = `${peakHour.toString().padStart(2, '0')}:00 - ${((peakHour + 1) % 24).toString().padStart(2, '0')}:00`;

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
    summary: {
      totalOrders,
      totalRevenue,
      avgTicket,
      totalDiscount,
      completedOrders: completedOrders.length,
      cancelledOrders,
      conversionRate,
      peakHour: peakHourLabel,
    },
    comparison: {
      revenueChange: pctChange(totalRevenue, prevRevenue),
      ordersChange: pctChange(totalOrders, prevTotalOrders),
      ticketChange: pctChange(avgTicket, prevAvgTicket),
    },
    salesByDay: Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date)),
    hourlyDistribution,
    statusCount,
    topProducts,
  });
}
