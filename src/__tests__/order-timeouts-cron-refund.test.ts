import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Fase C: el cron de tiempos límite reembolsa los pedidos pagados que nadie
 * aceptó. Base en memoria (solo lo que usa el cron: select/update/insert con
 * eq/in/gte/order/limit) y Stripe simulado.
 */

type Row = Record<string, unknown>;
let orders: Row[] = [];
const inserts: Row[] = [];

function builder(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let op: 'select' | 'update' | 'insert' = 'select';
  let patch: Row = {};
  let returning = false;
  const b = {
    select: () => { if (op === 'select') op = 'select'; else returning = true; return b; },
    update: (p: Row) => { op = 'update'; patch = p; return b; },
    insert: (row: Row) => { op = 'insert'; inserts.push({ table, ...row }); return b; },
    eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return b; },
    in: (k: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[k])); return b; },
    gte: (k: string, v: string) => { filters.push((r) => String(r[k]) >= v); return b; },
    order: () => b,
    limit: () => b,
    then(resolve: (v: { data: unknown; error: null }) => void) {
      if (table !== 'orders') return resolve({ data: [], error: null });
      const hit = orders.filter((r) => filters.every((f) => f(r)));
      if (op === 'update') {
        hit.forEach((r) => Object.assign(r, patch));
        return resolve({ data: returning ? hit.map((r) => ({ id: r.id })) : null, error: null });
      }
      if (op === 'insert') return resolve({ data: null, error: null });
      return resolve({ data: hit.map((r) => ({ ...r })), error: null });
    },
  };
  return b;
}

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: (t: string) => builder(t) }) }));

const mockRefundCreate = vi.fn();
vi.mock('@/lib/stripe', () => ({ getStripe: () => ({ refunds: { create: mockRefundCreate } }) }));
vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));
vi.mock('@/lib/realtime/broadcast-order', () => ({ broadcastOrderUpdate: vi.fn().mockResolvedValue(undefined) }));
const mockNotify = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/lib/notifications/order-notifications', () => ({ notifyStatusChange: (...a: unknown[]) => mockNotify(...a) }));

import { GET } from '@/app/api/cron/order-timeouts/route';

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const req = () => new Request('http://localhost/api/cron/order-timeouts', { headers: { authorization: 'Bearer s3cret' } });

function paidPending(p: Row = {}): Row {
  return {
    id: 'o1', order_number: 'ORD-1', restaurant_id: 'r1', status: 'pending', order_type: 'pickup',
    payment_method: 'online', payment_status: 'paid', payment_intent_id: 'pi_123', scheduled_for: null,
    created_at: ago(20), updated_at: ago(16), prepared_at: null, customer_arrived_at: null,
    customer_name: 'Ana', customer_email: 'ana@example.com', customer_phone: null, driver_tracking_token: null,
    cancellation_reason: null, ...p,
  };
}

describe('cron order-timeouts: pagado y no aceptado', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 's3cret';
    vi.clearAllMocks();
    inserts.length = 0;
  });

  it('cancela, reembolsa el total con reverse_transfer y avisa al cliente ya reembolsado', async () => {
    orders = [paidPending()];
    let statusWhenRefunded: unknown;
    let paymentWhenNotified: unknown;
    mockRefundCreate.mockImplementation(async () => { statusWhenRefunded = orders[0].status; return { id: 're_1', status: 'succeeded' }; });
    mockNotify.mockImplementation(async () => { paymentWhenNotified = orders[0].payment_status; return { success: true }; });

    const res = await GET(req());
    const body = await res.json();

    expect(statusWhenRefunded).toBe('cancelled'); // primero se cancela, después se cobra la devolución
    expect(mockRefundCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_123', reverse_transfer: true, refund_application_fee: false }),
      { idempotencyKey: `not-accepted-refund:pi_123:${new Date().toISOString().slice(0, 10)}` },
    );
    expect(orders[0]).toMatchObject({ status: 'cancelled', payment_status: 'refunded', cancellation_reason: 'not_accepted' });
    expect(paymentWhenNotified).toBe('refunded'); // el email dice "reembolsado"
    expect(body.refunded).toEqual(['ORD-1']);
  });

  it('si Stripe rechaza, queda cancelado y cobrado; la próxima vuelta lo reintenta', async () => {
    orders = [paidPending()];
    mockRefundCreate.mockRejectedValueOnce(Object.assign(new Error('insufficient funds'), { code: 'balance_insufficient' }));

    let body = await (await GET(req())).json();
    expect(orders[0]).toMatchObject({ status: 'cancelled', payment_status: 'paid' });
    expect(body.refundFailed).toEqual(['ORD-1']);
    expect(mockNotify).toHaveBeenCalledTimes(1); // aviso con "reembolso en camino", una sola vez

    mockRefundCreate.mockResolvedValueOnce({ id: 're_2', status: 'succeeded' });
    body = await (await GET(req())).json();
    expect(orders[0].payment_status).toBe('refunded');
    expect(body.refunded).toEqual(['ORD-1']);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('"ya reembolsado" en Stripe cuenta como éxito', async () => {
    orders = [paidPending({ status: 'cancelled', cancellation_reason: 'not_accepted', updated_at: ago(30) })];
    mockRefundCreate.mockRejectedValueOnce(Object.assign(new Error('already'), { code: 'charge_already_refunded' }));

    await GET(req());
    expect(orders[0].payment_status).toBe('refunded');
  });

  it('pagado con Wompi no se cancela ni se reembolsa', async () => {
    orders = [paidPending({ payment_intent_id: '12345' })];
    await GET(req());
    expect(mockRefundCreate).not.toHaveBeenCalled();
    expect(orders[0].status).toBe('pending');
  });

  it('con menos de 15 min no se toca', async () => {
    orders = [paidPending({ created_at: ago(14), updated_at: ago(14) })];
    await GET(req());
    expect(mockRefundCreate).not.toHaveBeenCalled();
    expect(orders[0].status).toBe('pending');
  });
});
