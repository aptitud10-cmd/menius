import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      update: () => ({ eq: mockUpdateEq }),
    }),
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIP: () => '1.2.3.4',
}));
vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));

const mockCreate = vi.fn();
vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class {},
  Preference: class { create = mockCreate; },
}));

const ORDER_ID = '11111111-2222-3333-4444-555555555555';
const baseOrder = {
  id: ORDER_ID, order_number: 'ORD-0001', total: 350, customer_name: 'Ana', customer_email: 'ana@example.com',
  customer_phone: '55 1234 5678', status: 'pending', payment_status: 'pending', payment_method: 'online',
  restaurant_id: 'r1', customer_token: 'tok-cliente',
  restaurants: { currency: 'MXN', mp_access_token: 'APP_USR-x', mp_enabled: true, name: 'Taquería', locale: 'es' },
};

function post(t: string | null = 'tok-cliente') {
  return new Request('http://localhost/api/payments/mercadopago', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: ORDER_ID, slug: 'taqueria', t: t ?? undefined }),
  });
}

describe('POST /api/payments/mercadopago', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'pref_1', init_point: 'https://mp.example/checkout/pref_1' });
  });

  it('sin el token del pedido (o con otro) responde 404 y no crea el pago', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...baseOrder }, error: null });
    const { POST } = await import('@/app/api/payments/mercadopago/route');
    for (const t of [null, 'otro-token']) {
      const res = await POST(post(t) as never);
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe('order_not_found');
    }
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('con el token: crea la preferencia con las URLs de vuelta del cliente', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...baseOrder }, error: null });
    const { POST } = await import('@/app/api/payments/mercadopago/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(200);
    expect((await res.json()).checkout_url).toBe('https://mp.example/checkout/pref_1');
    const body = mockCreate.mock.calls[0][0].body;
    expect(body.back_urls.success).toContain('/taqueria/orden/ORD-0001?paid=true&t=tok-cliente');
  });

  it('códigos estables: efectivo, ya pagado, cancelado, sin configurar, error de MP', async () => {
    const { POST } = await import('@/app/api/payments/mercadopago/route');
    const cases = [
      [{ ...baseOrder, payment_method: 'cash' }, 409, 'cash_order'],
      [{ ...baseOrder, payment_status: 'paid' }, 409, 'already_paid'],
      [{ ...baseOrder, status: 'cancelled' }, 409, 'order_closed'],
      [{ ...baseOrder, restaurants: { ...baseOrder.restaurants, mp_enabled: false } }, 503, 'online_unavailable'],
    ] as const;
    for (const [order, status, code] of cases) {
      mockMaybeSingle.mockResolvedValueOnce({ data: order, error: null });
      const res = await POST(post() as never);
      expect(res.status).toBe(status);
      expect((await res.json()).code).toBe(code);
    }
    mockMaybeSingle.mockResolvedValueOnce({ data: { ...baseOrder }, error: null });
    mockCreate.mockRejectedValueOnce(new Error('invalid access token APP_USR-x'));
    const res = await POST(post() as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('payment_start_failed');
    expect(JSON.stringify(body)).not.toContain('APP_USR');
  });
});
