import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConstructEvent, mockAccountRetrieve, mockSelect, mockEq, mockUpdate } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn(() => ({ select: mockSelect }));
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  return { mockConstructEvent: vi.fn(), mockAccountRetrieve: vi.fn(), mockSelect, mockEq, mockUpdate };
});

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    accounts: { retrieve: mockAccountRetrieve },
  }),
  getConnectWebhookSecret: () => 'whsec_connect',
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ update: mockUpdate }) }),
}));
vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));

const req = (sig: string | null = 'sig') =>
  new Request('http://localhost/api/connect/webhook', {
    method: 'POST',
    body: '{}',
    headers: sig ? { 'stripe-signature': sig } : {},
  });

const accountUpdated = { id: 'evt_a', type: 'account.updated', account: 'acct_1', data: { object: { id: 'acct_1' } } };
const readyAccount = { capabilities: { card_payments: 'active' }, requirements: { currently_due: [], past_due: [] } };

describe('POST /api/connect/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue({ data: [{ id: 'rest-1' }], error: null });
  });

  it('verifica la firma con el secret de Connect (eventos v1, no thin)', async () => {
    mockConstructEvent.mockReturnValue(accountUpdated);
    mockAccountRetrieve.mockResolvedValue(readyAccount);
    const { POST } = await import('@/app/api/connect/webhook/route');
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect(mockConstructEvent).toHaveBeenCalledWith('{}', 'sig', 'whsec_connect');
  });

  it('sin firma: 400', async () => {
    const { POST } = await import('@/app/api/connect/webhook/route');
    expect((await POST(req(null) as never)).status).toBe(400);
  });

  it('firma inválida: 400', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('bad sig'); });
    const { POST } = await import('@/app/api/connect/webhook/route');
    expect((await POST(req() as never)).status).toBe(400);
  });

  it('account.updated con la cuenta lista: prende el cobro con tarjeta', async () => {
    mockConstructEvent.mockReturnValue(accountUpdated);
    mockAccountRetrieve.mockResolvedValue(readyAccount);
    const { POST } = await import('@/app/api/connect/webhook/route');
    await POST(req() as never);
    expect(mockAccountRetrieve).toHaveBeenCalledWith('acct_1');
    expect(mockUpdate).toHaveBeenCalledWith({ stripe_onboarding_complete: true });
    expect(mockEq).toHaveBeenCalledWith('stripe_account_id', 'acct_1');
  });

  it('account.updated con verificación pendiente: lo deja apagado', async () => {
    mockConstructEvent.mockReturnValue(accountUpdated);
    mockAccountRetrieve.mockResolvedValue({ capabilities: { card_payments: 'pending' }, requirements: { currently_due: [], past_due: [] } });
    const { POST } = await import('@/app/api/connect/webhook/route');
    await POST(req() as never);
    expect(mockUpdate).toHaveBeenCalledWith({ stripe_onboarding_complete: false });
  });

  it('cuenta desconectada: apaga el cobro con tarjeta', async () => {
    mockConstructEvent.mockReturnValue({ id: 'evt_d', type: 'account.application.deauthorized', account: 'acct_1', data: { object: {} } });
    const { POST } = await import('@/app/api/connect/webhook/route');
    const res = await POST(req() as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ stripe_onboarding_complete: false });
  });

  it('si falla la base: 500 para que Stripe reintente', async () => {
    mockConstructEvent.mockReturnValue(accountUpdated);
    mockAccountRetrieve.mockResolvedValue(readyAccount);
    mockSelect.mockResolvedValue({ data: null, error: { message: 'timeout' } });
    const { POST } = await import('@/app/api/connect/webhook/route');
    expect((await POST(req() as never)).status).toBe(500);
  });

  it('si Stripe no responde: 500 para que Stripe reintente', async () => {
    mockConstructEvent.mockReturnValue(accountUpdated);
    mockAccountRetrieve.mockRejectedValue(new Error('stripe down'));
    const { POST } = await import('@/app/api/connect/webhook/route');
    expect((await POST(req() as never)).status).toBe(500);
  });
});
