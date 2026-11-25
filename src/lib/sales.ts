/**
 * Single definition of "sale" for every owner-facing number
 * (Home, Analytics, Sales report CSV/PDF, Orders board).
 *
 * An order counts as a sale when:
 *  - the restaurant accepted it: not pending (an order nobody accepted may
 *    still be auto-cancelled at 15 min) and not cancelled — confirmed,
 *    preparing, almost_ready, ready, out_for_delivery, served, delivered and
 *    completed count — and
 *  - if it was paid online (payment_method other than 'cash'), the payment
 *    went through (payment_status === 'paid'). A refunded or never-paid online
 *    order is not a sale.
 *
 * payment_method null is treated as 'cash' (column default; legacy rows).
 */

/** Order columns needed by `isSale` / `isReceivedOrder`. Keep in sync with supabase/schema.sql. */
export const SALE_FIELDS = 'status, payment_method, payment_status';

export interface SaleFields {
  status: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
}

function isPaidOnline(method: string | null | undefined): boolean {
  return method != null && method !== 'cash';
}

/** True if the order counts toward sales totals. */
export function isSale(order: SaleFields): boolean {
  if (!order.status || order.status === 'cancelled' || order.status === 'pending') return false;
  if (!isPaidOnline(order.payment_method)) return true;
  return order.payment_status === 'paid';
}

/**
 * False for online checkouts that were never paid (still at the payment page
 * or abandoned and auto-cancelled). Those never reached the kitchen, so they
 * are not counted as orders nor as cancellations.
 */
export function isReceivedOrder(order: SaleFields): boolean {
  if (!isPaidOnline(order.payment_method)) return true;
  if (order.payment_status === 'paid' || order.payment_status === 'refunded') return true;
  return order.status !== 'pending' && order.status !== 'cancelled';
}

export interface SaleAmounts {
  total?: unknown;
  tax_amount?: unknown;
  tip_amount?: unknown;
  delivery_fee?: unknown;
  discount_amount?: unknown;
}

export interface SalesSummary {
  /** Number of orders that count as a sale. */
  count: number;
  /** Sum of `orders.total` (includes tax, tip and delivery fee). */
  total: number;
  tax: number;
  tip: number;
  deliveryFee: number;
  discount: number;
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Totals over the orders that count as a sale (others are ignored). */
export function summarizeSales(orders: ReadonlyArray<SaleFields & SaleAmounts>): SalesSummary {
  const out: SalesSummary = { count: 0, total: 0, tax: 0, tip: 0, deliveryFee: 0, discount: 0 };
  for (const o of orders) {
    if (!isSale(o)) continue;
    out.count += 1;
    out.total += num(o.total);
    out.tax += num(o.tax_amount);
    out.tip += num(o.tip_amount);
    out.deliveryFee += num(o.delivery_fee);
    out.discount += num(o.discount_amount);
  }
  return out;
}
