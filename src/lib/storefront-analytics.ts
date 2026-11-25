import type { SupabaseClient } from '@supabase/supabase-js';
import type { LocalDayRange } from '@/lib/date-utils';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { fetchProductSales } from '@/lib/sales-query';
import { isSale, type SaleFields } from '@/lib/sales';
import type { TrafficSource } from '@/lib/store-traffic';

/**
 * Analytics → "Tu tienda online": visits, funnel, sources, dishes looked at
 * but rarely ordered, new vs returning customers. Traffic comes from
 * store_traffic_daily / product_views_daily (migration 20261126_store_traffic,
 * written by /api/public/track); customers come from orders.
 */

export interface Funnel {
  visits: number;
  carts: number;
  checkouts: number;
  orders: number;
}

export interface StorefrontStats {
  /** False until migration 20261126_store_traffic is applied (only customers then). */
  trafficReady: boolean;
  /** First day with any traffic counted (YYYY-MM-DD), null if none yet. */
  trackedSince: string | null;
  funnel: Funnel;
  /** Same period before; null when nothing was counted then. */
  previousFunnel: Funnel | null;
  sources: Array<{ source: TrafficSource; visits: number; orders: number }>;
  /** Dishes opened a lot and ordered little, worst first. */
  lowConversionDishes: Array<{ productId: string; name: string; views: number; units: number }>;
  /** Units ordered per view across every viewed dish (the menu's average). */
  avgDishConversion: number | null;
  customers: {
    firstTime: number;
    returning: number;
    avgTicketFirstTime: number | null;
    avgTicketReturning: number | null;
  };
}

interface TrafficRow extends Funnel {
  day: string;
  source: TrafficSource;
}

const EMPTY: Funnel = { visits: 0, carts: 0, checkouts: 0, orders: 0 };

function addFunnel(a: Funnel, b: Funnel): Funnel {
  return { visits: a.visits + b.visits, carts: a.carts + b.carts, checkouts: a.checkouts + b.checkouts, orders: a.orders + b.orders };
}

/** A dish needs this many opens in the period before its ratio means anything. */
export const MIN_VIEWS_FOR_DISH = 20;

/** True when the tables don't exist yet (migration not applied). */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message ?? '');
}

export async function getStorefrontStats(
  db: SupabaseClient,
  restaurantId: string,
  range: LocalDayRange,
  prevRange: LocalDayRange,
  /** Orders of the period (already read by the caller), with customer_id. */
  orders: ReadonlyArray<SaleFields & { total: number | string | null; customer_id?: string | null }>,
): Promise<StorefrontStats> {
  const trafficIn = (r: LocalDayRange) =>
    db
      .from('store_traffic_daily')
      .select('day, source, visits, carts, checkouts, orders')
      .eq('restaurant_id', restaurantId)
      .gte('day', r.startDate)
      .lte('day', r.endDate)
      .limit(5000);

  const [cur, prev] = await Promise.all([trafficIn(range), trafficIn(prevRange)]);
  const trafficReady = !isMissingTable(cur.error);
  if (cur.error && trafficReady) throw new Error(cur.error.message);

  const rows = trafficReady ? ((cur.data ?? []) as TrafficRow[]) : [];
  const funnel = rows.reduce<Funnel>((acc, r) => addFunnel(acc, r), EMPTY);
  const prevRows = prev.error ? [] : ((prev.data ?? []) as TrafficRow[]);
  const prevFunnel = prevRows.reduce<Funnel>((acc, r) => addFunnel(acc, r), EMPTY);
  const trackedSince = rows.length ? rows.map((r) => r.day).sort()[0] : null;

  const bySource = new Map<TrafficSource, { visits: number; orders: number }>();
  for (const r of rows) {
    const s = bySource.get(r.source) ?? { visits: 0, orders: 0 };
    s.visits += r.visits;
    s.orders += r.orders;
    bySource.set(r.source, s);
  }
  const sources = Array.from(bySource, ([source, v]) => ({ source, ...v }))
    .filter((s) => s.visits > 0)
    .sort((a, b) => b.visits - a.visits);

  // ── Dishes: opened vs ordered ──
  const viewsRes = !trafficReady ? { rows: [] as Array<{ product_id: string; views: number }> } : await fetchAllRows<{ product_id: string; views: number }>((from, to) =>
    db
      .from('product_views_daily')
      .select('product_id, views')
      .eq('restaurant_id', restaurantId)
      .gte('day', range.startDate)
      .lte('day', range.endDate)
      .order('day', { ascending: true })
      .order('product_id', { ascending: true })
      .range(from, to),
  );
  const views = new Map<string, number>();
  for (const v of viewsRes.rows) views.set(v.product_id, (views.get(v.product_id) ?? 0) + v.views);

  let lowConversionDishes: StorefrontStats['lowConversionDishes'] = [];
  let avgDishConversion: number | null = null;
  if (views.size > 0) {
    const { byProduct } = await fetchProductSales(db, restaurantId, range.start.toISOString(), range.end.toISOString());
    let totalViews = 0;
    let totalUnits = 0;
    const candidates: Array<{ productId: string; views: number; units: number }> = [];
    views.forEach((v, productId) => {
      const units = byProduct.get(productId)?.qty ?? 0;
      totalViews += v;
      totalUnits += Math.min(units, v);
      if (v >= MIN_VIEWS_FOR_DISH) candidates.push({ productId, views: v, units });
    });
    avgDishConversion = totalViews > 0 ? totalUnits / totalViews : null;
    const worst = candidates
      .filter((c) => avgDishConversion == null || c.units / c.views < avgDishConversion / 2)
      .sort((a, b) => a.units / a.views - b.units / b.views || b.views - a.views)
      .slice(0, 5);
    if (worst.length) {
      const { data: names } = await db
        .from('products')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .in('id', worst.map((w) => w.productId));
      const nameOf = new Map(((names ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
      lowConversionDishes = worst
        .filter((w) => nameOf.has(w.productId))
        .map((w) => ({ ...w, name: nameOf.get(w.productId)! }));
    }
  }

  // ── Customers: first order in this period vs came back ──
  const sold = orders.filter((o) => isSale(o) && o.customer_id);
  const customerIds = Array.from(new Set(sold.map((o) => o.customer_id as string)));
  const firstOrderAt = new Map<string, string>();
  for (let i = 0; i < customerIds.length; i += 100) {
    const { data } = await db
      .from('customers')
      .select('id, created_at')
      .eq('restaurant_id', restaurantId)
      .in('id', customerIds.slice(i, i + 100));
    for (const c of (data ?? []) as Array<{ id: string; created_at: string }>) firstOrderAt.set(c.id, c.created_at);
  }
  const ordersPerCustomer = new Map<string, number>();
  for (const o of sold) ordersPerCustomer.set(o.customer_id as string, (ordersPerCustomer.get(o.customer_id as string) ?? 0) + 1);

  const isReturning = (id: string) => {
    const since = firstOrderAt.get(id);
    // Customer row created before this period, or 2+ orders inside it.
    return (since != null && since < range.start.toISOString()) || (ordersPerCustomer.get(id) ?? 0) > 1;
  };
  let firstTime = 0;
  let returning = 0;
  for (const id of customerIds) (isReturning(id) ? returning++ : firstTime++);
  let sumFirst = 0, nFirst = 0, sumRet = 0, nRet = 0;
  for (const o of sold) {
    const t = Number(o.total ?? 0) || 0;
    if (isReturning(o.customer_id as string)) { sumRet += t; nRet++; } else { sumFirst += t; nFirst++; }
  }

  return {
    trafficReady,
    trackedSince,
    funnel,
    previousFunnel: prevFunnel.visits > 0 ? prevFunnel : null,
    sources,
    lowConversionDishes,
    avgDishConversion,
    customers: {
      firstTime,
      returning,
      avgTicketFirstTime: nFirst ? sumFirst / nFirst : null,
      avgTicketReturning: nRet ? sumRet / nRet : null,
    },
  };
}
