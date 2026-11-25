import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
    }),
  }),
}));

const mockSessionCreate = vi.fn();
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create: mockSessionCreate } } }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIP: () => '1.2.3.4',
}));

vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));

const ORDER_ID = '11111111-2222-3333-4444-555555555555';
const baseOrder = {
  id: ORDER_ID, order_number: 'BUC-0001', status: 'pending', total: 29, tip_amount: 0,
  customer_name: 'Ana', restaurant_id: 'r1', payment_status: 'pending', customer_token: 'tok-cliente',
  payment_method: 'online',
  restaurants: { currency: 'usd', stripe_account_id: 'acct_1', stripe_onboarding_complete: true, name: 'Buccaneer', commission_plan: false },
};

function post(t: string | null = 'tok-cliente') {
  return new Request('http://localhost/api/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: ORDER_ID, slug: 'tienda', t: t ?? undefined }),
  });
}

describe('POST /api/payments/checkout — error codes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps status and legacy `error`, adds a stable `code`', async () => {
    const { POST } = await import('@/app/api/payments/checkout/route');
    const cases = [
      [{ ...baseOrder, payment_method: 'cash' }, 409, 'cash_order', 'Este pedido se paga en efectivo.'],
      [{ ...baseOrder, payment_status: 'paid' }, 409, 'already_paid', 'Este pedido ya fue pagado.'],
      [{ ...baseOrder, status: 'cancelled' }, 409, 'order_closed', 'Este pedido ya no acepta pagos.'],
      [{ ...baseOrder, restaurants: { ...baseOrder.restaurants, currency: 'cop' } }, 400, 'wompi_only', 'This restaurant uses Wompi for online payments.'],
      [{ ...baseOrder, restaurants: { ...baseOrder.restaurants, stripe_onboarding_complete: false } }, 400, 'online_unavailable',
        'El pago en línea no está disponible para este restaurante aún. Por favor paga en persona.'],
    ] as const;
    for (const [order, status, code, error] of cases) {
      mockMaybeSingle.mockResolvedValueOnce({ data: order, error: null });
      const res = await POST(post() as never);
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error, code });
    }
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('wrong token: 404 order_not_found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: baseOrder, error: null });
    const { POST } = await import('@/app/api/payments/checkout/route');
    const res = await POST(post('otro') as never);
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('order_not_found');
  });

  it('Stripe failure: generic 500 with payment_start_failed', async () => {
    mockMaybeSingle.mockResolvedValue({ data: baseOrder, error: null });
    mockSessionCreate.mockRejectedValue(new Error('No such destination: acct_1'));
    const { POST } = await import('@/app/api/payments/checkout/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('payment_start_failed');
    expect(body.error).not.toContain('acct_1');
  });

  it('happy path still returns the session url', async () => {
    mockMaybeSingle.mockResolvedValue({ data: baseOrder, error: null });
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    const { POST } = await import('@/app/api/payments/checkout/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/x' });
  });
});
