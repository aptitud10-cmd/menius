import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
    }),
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIP: () => '1.2.3.4',
}));

vi.mock('@/lib/crypto/secrets', () => ({ decryptSecret: () => 'integrity-secret' }));
vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));

const ORDER_ID = '11111111-2222-3333-4444-555555555555';
const baseOrder = {
  id: ORDER_ID, status: 'pending', order_number: 'ORD-0001', total: 45000,
  customer_name: 'Ana', customer_email: 'ana@example.com', customer_phone: '300 123 4567',
  restaurant_id: 'r1', payment_status: 'pending', payment_method: 'online', customer_token: 'tok-cliente',
  restaurants: { currency: 'COP', country_code: 'CO', wompi_connected: true, wompi_public_key: 'pub_test_1', wompi_integrity_secret_enc: 'enc' },
};

function post(t: string | null = 'tok-cliente') {
  return new Request('http://localhost/api/payments/wompi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: ORDER_ID, slug: 'tienda', t: t ?? undefined }),
  });
}

describe('POST /api/payments/wompi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin el token del pedido (o con otro) responde 404 y no arma el pago', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...baseOrder }, error: null });
    const { POST } = await import('@/app/api/payments/wompi/route');
    for (const t of [null, 'otro-token']) {
      const res = await POST(post(t) as never);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.code).toBe('order_not_found');
      expect(JSON.stringify(body)).not.toContain('tok-cliente');
    }
  });

  it('pedido en efectivo: 409', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...baseOrder, payment_method: 'cash' }, error: null });
    const { POST } = await import('@/app/api/payments/wompi/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('cash_order');
  });

  it('con el token: devuelve los datos para abrir Wompi', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...baseOrder }, error: null });
    const { POST } = await import('@/app/api/payments/wompi/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reference).toBe(ORDER_ID);
    expect(body.amountInCents).toBe(4500000);
    expect(body.publicKey).toBe('pub_test_1');
    expect(body.redirectUrl).toContain('/tienda/orden/ORD-0001?paid=true&t=tok-cliente');
  });

  it('stable codes: already paid, cancelled, Wompi not set up', async () => {
    const { POST } = await import('@/app/api/payments/wompi/route');
    const cases = [
      [{ ...baseOrder, payment_status: 'paid' }, 409, 'already_paid'],
      [{ ...baseOrder, status: 'cancelled' }, 409, 'order_closed'],
      [{ ...baseOrder, restaurants: { ...baseOrder.restaurants, wompi_connected: false } }, 503, 'wompi_unavailable'],
    ] as const;
    for (const [order, status, code] of cases) {
      mockMaybeSingle.mockResolvedValueOnce({ data: order, error: null });
      const res = await POST(post() as never);
      expect(res.status).toBe(status);
      expect((await res.json()).code).toBe(code);
    }
  });
});
