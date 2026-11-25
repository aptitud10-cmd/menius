import { describe, it, expect } from 'vitest';
import { isSale, isReceivedOrder, summarizeSales } from '@/lib/sales';
import { ALL_STATUSES, isAwaitingOnlinePayment } from '@/lib/order-state';
import { fetchAllRows } from '@/lib/supabase/fetch-all';

describe('isSale', () => {
  it('counts a cash order from the moment it is accepted (not pending, not cancelled)', () => {
    for (const status of ALL_STATUSES) {
      expect(isSale({ status, payment_method: 'cash', payment_status: 'pending' })).toBe(status !== 'cancelled' && status !== 'pending');
    }
  });

  it('a paid online order nobody accepted yet is not a sale (it may be refunded at 15 min)', () => {
    expect(isSale({ status: 'pending', payment_method: 'online', payment_status: 'paid' })).toBe(false);
  });

  it('treats a missing payment_method as cash (legacy rows)', () => {
    expect(isSale({ status: 'served', payment_method: null, payment_status: null })).toBe(true);
    expect(isSale({ status: 'served' })).toBe(true);
  });

  it('requires payment_status paid for online and wallet orders', () => {
    for (const method of ['online', 'wallet']) {
      expect(isSale({ status: 'preparing', payment_method: method, payment_status: 'paid' })).toBe(true);
      expect(isSale({ status: 'preparing', payment_method: method, payment_status: 'pending' })).toBe(false);
      expect(isSale({ status: 'delivered', payment_method: method, payment_status: 'refunded' })).toBe(false);
      expect(isSale({ status: 'pending', payment_method: method, payment_status: 'failed' })).toBe(false);
    }
  });

  it('never counts a cancelled order, even if it was paid', () => {
    expect(isSale({ status: 'cancelled', payment_method: 'online', payment_status: 'paid' })).toBe(false);
    expect(isSale({ status: 'cancelled', payment_method: 'cash', payment_status: 'paid' })).toBe(false);
  });

  it('includes served and ready, which the old report rules disagreed on', () => {
    expect(isSale({ status: 'served', payment_method: 'cash' })).toBe(true);
    expect(isSale({ status: 'ready', payment_method: 'cash' })).toBe(true);
  });
});

describe('isReceivedOrder', () => {
  it('drops unpaid online checkouts, pending or auto-cancelled', () => {
    expect(isReceivedOrder({ status: 'pending', payment_method: 'online', payment_status: 'pending' })).toBe(false);
    expect(isReceivedOrder({ status: 'cancelled', payment_method: 'wallet', payment_status: 'failed' })).toBe(false);
  });

  it('keeps paid or refunded online orders and every cash order', () => {
    expect(isReceivedOrder({ status: 'cancelled', payment_method: 'online', payment_status: 'refunded' })).toBe(true);
    expect(isReceivedOrder({ status: 'pending', payment_method: 'online', payment_status: 'paid' })).toBe(true);
    expect(isReceivedOrder({ status: 'cancelled', payment_method: 'cash', payment_status: 'pending' })).toBe(true);
  });

  it('agrees with isAwaitingOnlinePayment: an order hidden from the kitchen is not received', () => {
    const samples = [
      { status: 'pending', payment_method: 'online', payment_status: 'pending' },
      { status: 'pending', payment_method: 'wallet', payment_status: null },
      { status: 'pending', payment_method: 'online', payment_status: 'paid' },
      { status: 'pending', payment_method: 'cash', payment_status: 'pending' },
    ];
    for (const o of samples) {
      if (isAwaitingOnlinePayment(o)) expect(isReceivedOrder(o)).toBe(false);
    }
  });
});

describe('summarizeSales', () => {
  it('sums total, tax, tip, delivery and discount over sales only', () => {
    const summary = summarizeSales([
      { status: 'served', payment_method: 'cash', total: 30, tax_amount: 2.5, tip_amount: 4, delivery_fee: 0, discount_amount: 1 },
      { status: 'delivered', payment_method: 'online', payment_status: 'paid', total: '20.50', tax_amount: '1.5', tip_amount: null, delivery_fee: '3', discount_amount: 0 },
      { status: 'cancelled', payment_method: 'cash', total: 99, tax_amount: 9 },
      { status: 'pending', payment_method: 'online', payment_status: 'pending', total: 50, tax_amount: 4 },
    ]);
    expect(summary).toEqual({ count: 2, total: 50.5, tax: 4, tip: 4, deliveryFee: 3, discount: 1 });
  });
});

describe('fetchAllRows', () => {
  it('reads past the 1000-row cap page by page', async () => {
    const source = Array.from({ length: 2500 }, (_, i) => i);
    const calls: [number, number][] = [];
    const res = await fetchAllRows<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    });
    expect(res.rows).toHaveLength(2500);
    expect(res.truncated).toBe(false);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('reports truncation at maxRows and surfaces errors', async () => {
    const all = await fetchAllRows<number>(async (from, to) => ({ data: Array.from({ length: to - from + 1 }, (_, i) => from + i), error: null }), { pageSize: 10, maxRows: 25 });
    expect(all.rows).toHaveLength(25);
    expect(all.truncated).toBe(true);

    const failed = await fetchAllRows<number>(async () => ({ data: null, error: { message: 'boom' } }));
    expect(failed.error).toBe('boom');
  });
});
