import { describe, it, expect, vi, beforeEach } from 'vitest';
import { allStationsDone, type KitchenRawItem } from '@/lib/kitchen';
import { pruneClosedOrders } from '@/hooks/use-realtime-orders';

const GRILL = '11111111-1111-1111-1111-111111111111';
const FRY = '22222222-2222-2222-2222-222222222222';
const item = (station: string | null, toKitchen = true): KitchenRawItem => ({
  qty: 1, product: { station_id: station, category: { send_to_kitchen: toKitchen } },
});

describe('LISTO por estación', () => {
  it('el pedido está listo cuando terminaron todas las estaciones con platos', () => {
    const items = [item(GRILL), item(FRY), item(null, false) /* gaseosa: mostrador */];
    expect(allStationsDone(items, [GRILL])).toBe(false);
    expect(allStationsDone(items, [GRILL, FRY])).toBe(true);
  });

  it('un plato sin estación solo se cierra desde "Todas"', () => {
    expect(allStationsDone([item(GRILL), item(null)], [GRILL])).toBe(false);
  });

  it('sin platos de cocina no hay nada que cerrar por estación', () => {
    expect(allStationsDone([item(null, false)], [GRILL])).toBe(false);
    expect(allStationsDone(undefined, [GRILL])).toBe(false);
  });
});

describe('Counter/KDS: pedidos cerrados viejos salen de memoria', () => {
  const now = Date.parse('2026-11-25T20:00:00Z');
  const h = (n: number) => new Date(now - n * 3600_000).toISOString();
  it('se van los cerrados de más de 12 h; los abiertos se quedan aunque sean viejos', () => {
    const list = [
      { id: 'a', status: 'delivered', created_at: h(13) },
      { id: 'b', status: 'cancelled', created_at: h(2) },
      { id: 'c', status: 'preparing', created_at: h(30) },
      { id: 'd', status: 'pending', created_at: h(48) }, // programado
      { id: 'e', status: 'delivered', created_at: h(11) },
    ];
    expect(pruneClosedOrders(list, now, 12 * 3600_000).map((o) => o.id)).toEqual(['b', 'c', 'd', 'e']);
  });
});

// ── Server action ──
const db = { order: null as unknown, rpc: { data: null as unknown, error: null as unknown } };
vi.mock('@/lib/auth/get-tenant', () => ({ getTenant: vi.fn(async () => ({ userId: 'u', restaurantId: 'r1', isDevice: true })) }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.order, error: null }) }) }) }) }),
    rpc: vi.fn(async () => db.rpc),
  }),
}));

describe('setKitchenStationDone', () => {
  const ORDER = '33333333-3333-3333-3333-333333333333';
  beforeEach(() => {
    db.order = { id: ORDER, order_items: [item(GRILL), item(FRY)] };
    db.rpc = { data: [GRILL], error: null };
  });

  it('una estación de dos: anota y dice que falta', async () => {
    const { setKitchenStationDone } = await import('@/lib/actions/kitchen-stations');
    expect(await setKitchenStationDone(ORDER, GRILL)).toEqual({ stationsDone: [GRILL], allDone: false });
  });

  it('la última estación: allDone', async () => {
    db.rpc = { data: [GRILL, FRY], error: null };
    const { setKitchenStationDone } = await import('@/lib/actions/kitchen-stations');
    expect(await setKitchenStationDone(ORDER, FRY)).toEqual({ stationsDone: [GRILL, FRY], allDone: true });
  });

  it('sin la migración aplicada: unsupported (el KDS cierra entero, como antes)', async () => {
    db.rpc = { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
    const { setKitchenStationDone } = await import('@/lib/actions/kitchen-stations');
    expect(await setKitchenStationDone(ORDER, GRILL)).toEqual({ unsupported: true });
  });

  it('ids inválidos o pedido de otra tienda', async () => {
    const { setKitchenStationDone } = await import('@/lib/actions/kitchen-stations');
    expect(await setKitchenStationDone('x', GRILL)).toEqual({ error: 'Datos inválidos' });
    db.order = null;
    expect(await setKitchenStationDone(ORDER, GRILL)).toEqual({ error: 'Orden no encontrada' });
  });
});
