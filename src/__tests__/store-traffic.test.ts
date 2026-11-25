import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { detectSource } from '@/lib/store-traffic';
import { getStorefrontStats } from '@/lib/storefront-analytics';
import { localDayRange, previousLocalDayRange } from '@/lib/date-utils';

const store = (q = '') => new URL(`https://menius.app/buccaneer${q}`);

describe('detectSource', () => {
  it('QR de la mesa por ?table= o utm', () => {
    expect(detectSource(store('?table=Mesa%204'), 'https://www.google.com/')).toBe('table_qr');
    expect(detectSource(store('?utm_source=qr_counter'), '')).toBe('table_qr');
  });
  it('Google y buscadores', () => {
    expect(detectSource(store(), 'https://www.google.com/')).toBe('google');
    expect(detectSource(store(), 'https://www.google.com.mx/')).toBe('google');
    expect(detectSource(store(), 'https://www.bing.com/search?q=diner')).toBe('google');
    expect(detectSource(store('?utm_source=gmb'), '')).toBe('google');
  });
  it('redes sociales', () => {
    expect(detectSource(store(), 'https://l.instagram.com/')).toBe('social');
    expect(detectSource(store(), 'https://m.facebook.com/')).toBe('social');
    expect(detectSource(store('?utm_source=ig'), '')).toBe('social');
  });
  it('directo, otros sitios y navegación interna', () => {
    expect(detectSource(store(), '')).toBe('direct');
    expect(detectSource(store(), 'https://buccaneerdiner.com/')).toBe('other');
    expect(detectSource(store(), 'https://menius.app/buccaneer/checkout')).toBeNull();
    expect(detectSource(store('?utm_source=newsletter'), '')).toBe('other');
  });
});

/** PostgREST stand-in: answers per table, ignores filters. */
function fakeDb(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const b = {
        select: () => b, eq: () => b, gte: () => b, lte: () => b, lt: () => b, not: () => b, in: () => b,
        order: () => b, limit: () => Promise.resolve({ data: rows, error: null }),
        range: (from: number, to: number) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }),
        then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: rows, error: null }),
      };
      return b;
    },
  } as unknown as SupabaseClient;
}

describe('getStorefrontStats', () => {
  const range = localDayRange('2026-11-01', '2026-11-30', 'America/New_York')!;
  const prev = previousLocalDayRange(range, 'America/New_York');
  const cash = { status: 'confirmed', payment_method: 'cash', payment_status: null };

  it('suma el embudo, ordena orígenes y separa clientes nuevos de los que vuelven', async () => {
    const db = fakeDb({
      store_traffic_daily: [
        { day: '2026-11-03', source: 'google', visits: 50, carts: 20, checkouts: 10, orders: 8 },
        { day: '2026-11-02', source: 'table_qr', visits: 30, carts: 15, checkouts: 9, orders: 7 },
        { day: '2026-11-03', source: 'google', visits: 20, carts: 5, checkouts: 2, orders: 1 },
      ],
      product_views_daily: [],
      customers: [
        { id: 'old', created_at: '2026-10-01T00:00:00Z' },
        { id: 'new1', created_at: '2026-11-05T00:00:00Z' },
        { id: 'new2', created_at: '2026-11-06T00:00:00Z' },
      ],
    });
    const stats = await getStorefrontStats(db, 'r1', range, prev, [
      { ...cash, total: 30, customer_id: 'old' },
      { ...cash, total: 20, customer_id: 'new1' },
      { ...cash, total: 10, customer_id: 'new2' },
      { ...cash, total: 14, customer_id: 'new2' },
      { status: 'cancelled', payment_method: 'cash', payment_status: null, total: 99, customer_id: 'x' },
    ]);
    expect(stats.trafficReady).toBe(true);
    expect(stats.trackedSince).toBe('2026-11-02');
    expect(stats.funnel).toEqual({ visits: 100, carts: 40, checkouts: 21, orders: 16 });
    expect(stats.sources.map((s) => s.source)).toEqual(['google', 'table_qr']);
    expect(stats.sources[0]).toEqual({ source: 'google', visits: 70, orders: 9 });
    // 'old' existed before the period, 'new2' ordered twice → both came back.
    expect(stats.customers.firstTime).toBe(1);
    expect(stats.customers.returning).toBe(2);
    expect(stats.customers.avgTicketFirstTime).toBe(20);
    expect(stats.customers.avgTicketReturning).toBe(18);
  });
});
