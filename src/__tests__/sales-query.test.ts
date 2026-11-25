import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchProductSales, fetchSalesSince } from '@/lib/sales-query';

/** Minimal PostgREST stand-in: every filter is a no-op, range() serves a page. */
function fakeDb(rows: unknown[]) {
  const calls: Array<[number, number]> = [];
  const builder = {
    select: () => builder,
    eq: () => builder,
    not: () => builder,
    gte: () => builder,
    lt: () => builder,
    order: () => builder,
    range: (from: number, to: number) => {
      calls.push([from, to]);
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    },
  };
  return { db: { from: () => builder } as unknown as SupabaseClient, calls };
}

const paid = { status: 'confirmed', payment_method: 'online', payment_status: 'paid' };
const unpaid = { status: 'confirmed', payment_method: 'online', payment_status: 'pending' };
const cash = { status: 'ready', payment_method: 'cash', payment_status: null };

describe('fetchProductSales', () => {
  it('suma unidades e ingresos solo de pedidos que son venta', async () => {
    const { db } = fakeDb([
      { id: '1', product_id: 'burger', qty: 2, line_total: '20.00', products: { name: 'Burger' }, order: cash },
      { id: '2', product_id: 'burger', qty: 1, line_total: 10, products: { name: 'Burger' }, order: [paid] },
      { id: '3', product_id: 'burger', qty: 5, line_total: 50, products: { name: 'Burger' }, order: unpaid },
      { id: '4', product_id: 'fries', qty: 1, line_total: 4, products: [{ name: 'Fries' }], order: cash },
    ]);
    const { byProduct, error } = await fetchProductSales(db, 'r1', '2026-11-01T00:00:00Z');
    expect(error).toBeNull();
    expect(byProduct.get('burger')).toEqual({ name: 'Burger', qty: 3, revenue: 30 });
    expect(byProduct.get('fries')).toEqual({ name: 'Fries', qty: 1, revenue: 4 });
  });

  it('lee más de 1000 filas página por página', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({
      id: String(i), product_id: 'soup', qty: 1, line_total: 1, products: { name: 'Soup' }, order: cash,
    }));
    const { db, calls } = fakeDb(rows);
    const { byProduct } = await fetchProductSales(db, 'r1', '2026-11-01T00:00:00Z');
    expect(byProduct.get('soup')?.qty).toBe(2500);
    expect(calls.length).toBe(3);
  });
});

describe('fetchSalesSince', () => {
  it('descarta pagos online sin cobrar', async () => {
    const { db } = fakeDb([
      { total: 10, restaurant_id: 'r1', ...cash },
      { total: 20, restaurant_id: 'r1', ...paid },
      { total: 30, restaurant_id: 'r1', ...unpaid },
    ]);
    const { rows } = await fetchSalesSince(db, '2026-11-01T00:00:00Z');
    expect(rows.map((r) => r.total)).toEqual([10, 20]);
  });
});
