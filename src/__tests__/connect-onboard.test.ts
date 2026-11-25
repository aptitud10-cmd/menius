import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMaybeSingle = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }),
  }),
}));

const mockUpdateEq = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ update: () => ({ eq: mockUpdateEq }) }) }),
}));

const mockGetTenant = vi.fn();
vi.mock('@/lib/auth/get-tenant', () => ({ getTenant: (...a: unknown[]) => mockGetTenant(...a) }));

const mockHasPlanAccess = vi.fn();
vi.mock('@/lib/auth/check-plan', () => ({ hasPlanAccess: (...a: unknown[]) => mockHasPlanAccess(...a) }));

const mockAccountCreate = vi.fn();
const mockLinkCreate = vi.fn();
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ accounts: { create: mockAccountCreate }, accountLinks: { create: mockLinkCreate } }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIP: () => '1.2.3.4',
}));

const mockCaptureError = vi.fn();
vi.mock('@/lib/error-reporting', () => ({ captureError: (...a: unknown[]) => mockCaptureError(...a) }));

const restaurant = {
  id: 'r1', name: 'Buccaneer', stripe_account_id: null as string | null, country_code: 'US',
  currency: 'USD', commission_plan: false, locale: 'en',
};

function post() {
  return new Request('http://localhost/api/connect/onboard', { method: 'POST' });
}

describe('POST /api/connect/onboard — owner-facing errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenant.mockResolvedValue({ userId: 'u1', restaurantId: 'r1', email: 'owner@example.com' });
    mockHasPlanAccess.mockResolvedValue(true);
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('plan required: English for an English restaurant, Spanish otherwise', async () => {
    mockHasPlanAccess.mockResolvedValue(false);
    const { POST } = await import('@/app/api/connect/onboard/route');

    mockMaybeSingle.mockResolvedValueOnce({ data: restaurant, error: null });
    let res = await POST(post() as never);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Online payments require the Pro plan. Upgrade in Billing.', code: 'plan_required' });

    mockMaybeSingle.mockResolvedValueOnce({ data: { ...restaurant, locale: 'es' }, error: null });
    res = await POST(post() as never);
    expect(await res.json()).toEqual({ error: 'Los pagos en línea requieren el plan Pro. Actívalo en Facturación.', code: 'plan_required' });
  });

  it("Stripe error: never returns Stripe's raw message, reports it to Sentry", async () => {
    mockMaybeSingle.mockResolvedValue({ data: restaurant, error: null });
    mockAccountCreate.mockRejectedValue(new Error('No such account: acct_secret_123'));
    const { POST } = await import('@/app/api/connect/onboard/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('stripe_error');
    expect(body.error).toBe("We couldn't open Stripe right now. Try again in a few minutes.");
    expect(JSON.stringify(body)).not.toContain('acct_secret_123');
    expect(mockCaptureError).toHaveBeenCalled();
  });

  it('not the owner: 401 unauthenticated', async () => {
    mockGetTenant.mockResolvedValue(null);
    const { POST } = await import('@/app/api/connect/onboard/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('unauthenticated');
  });

  it('Colombian restaurant: 400 wompi_only; account not saved: 500 account_not_saved', async () => {
    const { POST } = await import('@/app/api/connect/onboard/route');
    mockMaybeSingle.mockResolvedValueOnce({ data: { ...restaurant, country_code: 'CO', currency: 'COP' }, error: null });
    let res = await POST(post() as never);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('wompi_only');

    mockMaybeSingle.mockResolvedValueOnce({ data: restaurant, error: null });
    mockAccountCreate.mockResolvedValue({ id: 'acct_new' });
    mockUpdateEq.mockResolvedValueOnce({ error: { message: 'boom' } });
    res = await POST(post() as never);
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe('account_not_saved');
  });

  it('happy path still returns the onboarding url', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...restaurant, stripe_account_id: 'acct_1' }, error: null });
    mockLinkCreate.mockResolvedValue({ url: 'https://connect.stripe.com/setup/x' });
    const { POST } = await import('@/app/api/connect/onboard/route');
    const res = await POST(post() as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://connect.stripe.com/setup/x' });
  });
});
