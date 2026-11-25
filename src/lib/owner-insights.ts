import type { SupabaseClient } from '@supabase/supabase-js';
import type { LocalDayRange } from '@/lib/date-utils';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { isSale, type SaleFields } from '@/lib/sales';

/**
 * Analytics highlights for the owner: commissions not paid to delivery apps,
 * sales lost because nobody accepted in time, and how long orders take to be
 * ready, by hour.
 */

/**
 * Delivery-app commission used for the estimate: the middle plan ("Plus") of
 * Uber Eats and DoorDash charges 25% on delivery; pickup is 6% on DoorDash's
 * plans (Uber Eats 6–7%). Checked 2026-11-25 on DoorDash's merchant blog and
 * Uber Eats fee guides. Dine-in orders are not counted (apps don't do them).
 */
export const APP_COMMISSION = { delivery: 0.25, pickup: 0.06 } as const;

export interface InsightOrder extends SaleFields {
  total: number | string | null;
  tax_amount?: number | string | null;
  tip_amount?: number | string | null;
  delivery_fee?: number | string | null;
  order_type?: string | null;
  cancellation_reason?: string | null;
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export interface AppSavings {
  /** Estimated commission the apps would have taken. */
  amount: number;
  /** Delivery + pickup sales the estimate is based on. */
  orders: number;
}

/** Food subtotal of delivery/pickup sales × the app commission. */
export function estimateAppSavings(orders: ReadonlyArray<InsightOrder>): AppSavings {
  let amount = 0;
  let count = 0;
  for (const o of orders) {
    if (!isSale(o)) continue;
    const rate = o.order_type === 'delivery' ? APP_COMMISSION.delivery : o.order_type === 'pickup' ? APP_COMMISSION.pickup : 0;
    if (!rate) continue;
    // The app commission applies to the food: without tax, tip or delivery fee.
    const food = Math.max(0, num(o.total) - num(o.tax_amount) - num(o.tip_amount) - num(o.delivery_fee));
    amount += food * rate;
    count += 1;
  }
  return { amount: Math.round(amount * 100) / 100, orders: count };
}

export interface LostSales {
  orders: number;
  amount: number;
}

/** Orders auto-cancelled because nobody accepted them in time ('not_accepted'). */
export function lostToNotAccepted(orders: ReadonlyArray<InsightOrder>): LostSales {
  let count = 0;
  let amount = 0;
  for (const o of orders) {
    if (o.status !== 'cancelled' || o.cancellation_reason !== 'not_accepted') continue;
    count += 1;
    amount += num(o.total);
  }
  return { orders: count, amount: Math.round(amount * 100) / 100 };
}

export interface ReadyTimes {
  /** Median minutes from the order coming in to "Ready". */
  medianMinutes: number;
  orders: number;
  /** Local hour (0-23) with the slowest average, among hours with enough orders. */
  slowestHour: { hour: number; avgMinutes: number; orders: number } | null;
  byHour: Array<{ hour: number; avgMinutes: number; orders: number }>;
}

/** An hour needs this many orders before its average is shown. */
export const MIN_ORDERS_PER_HOUR = 3;

interface HistoryRow {
  order_id: string;
  created_at: string;
  order: { created_at: string; scheduled_for: string | null } | Array<{ created_at: string; scheduled_for: string | null }> | null;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Pure part, exported for tests: minutes per order + local hour of arrival. */
export function summarizeReadyTimes(samples: Array<{ minutes: number; hour: number }>): ReadyTimes | null {
  const valid = samples.filter((s) => s.minutes >= 1 && s.minutes <= 180);
  if (valid.length === 0) return null;
  const byHourMap = new Map<number, number[]>();
  for (const s of valid) byHourMap.set(s.hour, [...(byHourMap.get(s.hour) ?? []), s.minutes]);
  const byHour = Array.from(byHourMap, ([hour, mins]) => ({
    hour,
    orders: mins.length,
    avgMinutes: Math.round(mins.reduce((a, b) => a + b, 0) / mins.length),
  })).sort((a, b) => a.hour - b.hour);
  const eligible = byHour.filter((h) => h.orders >= MIN_ORDERS_PER_HOUR);
  const slowest = eligible.length >= 2 ? eligible.reduce((a, b) => (b.avgMinutes > a.avgMinutes ? b : a)) : null;
  return {
    medianMinutes: Math.round(median(valid.map((s) => s.minutes))),
    orders: valid.length,
    slowestHour: slowest,
    byHour: eligible,
  };
}

/** Time from the order coming in to the first "Ready", for orders of the period. */
export async function fetchReadyTimes(
  db: SupabaseClient,
  restaurantId: string,
  range: LocalDayRange,
  timezone: string,
): Promise<ReadyTimes | null> {
  const { rows, error } = await fetchAllRows<HistoryRow>((from, to) =>
    db
      .from('order_status_history')
      .select('order_id, created_at, order:orders!inner(restaurant_id, created_at, scheduled_for)')
      .eq('to_status', 'ready')
      .eq('order.restaurant_id', restaurantId)
      .gte('order.created_at', range.start.toISOString())
      .lt('order.created_at', range.end.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );
  if (error) throw new Error(error);

  const hourFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone });
  // First "Ready" per order (an undo + ready again must not count twice).
  const firstReady = new Map<string, { readyAt: number; order: { created_at: string; scheduled_for: string | null } }>();
  for (const r of rows) {
    const order = Array.isArray(r.order) ? r.order[0] : r.order;
    if (!order || order.scheduled_for) continue; // scheduled orders wait on purpose
    const key = r.order_id;
    const readyAt = Date.parse(r.created_at);
    const prev = firstReady.get(key);
    if (!prev || readyAt < prev.readyAt) firstReady.set(key, { readyAt, order });
  }
  const samples = Array.from(firstReady.values()).map(({ readyAt, order }) => ({
    minutes: (readyAt - Date.parse(order.created_at)) / 60_000,
    hour: Number(hourFmt.format(new Date(order.created_at))) % 24,
  }));
  return summarizeReadyTimes(samples);
}
