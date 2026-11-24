import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      update: () => ({ eq: mockUpdateEq }),
    }),
  }),
}));

const mockPIRetrieve = vi.fn();
const mockPICreate = vi.fn();
const mockPICancel = vi.fn();
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    paymentIntents: { retrieve: mockPIRetrieve, create: mockPICreate, cancel: mockPICancel },
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIP: () => '1.2.3.4',
}));

const mockCaptureError = vi.fn();
vi.mock('@/lib/error-reporting', () => ({ captureError: (...a: unknown[]) => mockCaptureError(...a) }));

const ORDER_ID = '11111111-2222-3333-4444-555555555555';
const baseOrder = {
  id: ORDER_ID, status: 'pending', total: 29, tip_amount: 0, order_number: 'BUC-0001',
  payment_intent_id: null as string | null, payment_status: 'pending', restaurant_id: 'r1',
  restaurants: { currency: 'usd', stripe_account_id: 'acct_1', stripe_onboarding_complete: true, commission_plan: false },
};

function post() {
  return new Request('http://localhost/api/payments/intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: ORDER_ID }),
  });
}

describe('POST /api/payments/intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
    mockPICancel.mockResolvedValue({});
  });

  it('pedido ya pagado: responde alreadyPaid (no 409) y no crea otro cobro', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...baseOrder, payment_status: 'paid', payment_intent_id: 'pi_1' }, error: null });
    const { POST } = await import('@/app/api/payments/intent/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alreadyPaid: true });
    expect(mockPICreate).not.toHaveBeenCalled();
  });

  it('PaymentIntent ya cobrado pero el webhook no llegó: alreadyPaid, sin clientSecret', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...baseOrder, payment_intent_id: 'pi_1' }, error: null });
    mockPIRetrieve.mockResolvedValue({ id: 'pi_1', status: 'succeeded', client_secret: 'secret_1' });
    const { POST } = await import('@/app/api/payments/intent/route');
    const res = await POST(post() as never);
    expect(await res.json()).toEqual({ alreadyPaid: true });
    expect(mockPICreate).not.toHaveBeenCalled();
  });

  it('no se pudo guardar el PaymentIntent: lo cancela y responde 500 (evita un segundo cobro)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: baseOrder, error: null });
    mockPICreate.mockResolvedValue({ id: 'pi_new', client_secret: 'secret_new' });
    mockUpdateEq.mockResolvedValue({ error: { message: 'connection reset' } });
    const { POST } = await import('@/app/api/payments/intent/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(500);
    expect(mockPICancel).toHaveBeenCalledWith('pi_new');
    expect(mockCaptureError).toHaveBeenCalled();
  });

  it('camino normal: crea el PaymentIntent, lo guarda y devuelve el clientSecret', async () => {
    mockMaybeSingle.mockResolvedValue({ data: baseOrder, error: null });
    mockPICreate.mockResolvedValue({ id: 'pi_new', client_secret: 'secret_new' });
    const { POST } = await import('@/app/api/payments/intent/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clientSecret: 'secret_new' });
    expect(mockPICancel).not.toHaveBeenCalled();
  });
});
