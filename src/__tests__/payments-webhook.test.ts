import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac, createHash } from 'crypto';

// ── Supabase admin mock ───────────────────────────────────────────────────────
const mockMaybeSingle = vi.fn();
const mockNeq = vi.fn(() => ({ select: mockSelect, maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle, neq: mockNeq }));
const mockEq = vi.fn(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle, select: mockSelect, neq: mockNeq }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
  upsert: mockUpsert,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// ── Stripe mock ───────────────────────────────────────────────────────────────
const mockConstructEvent = vi.fn();
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
  getPaymentsWebhookSecret: () => 'whsec_test',
}));

// ── Notifications mock (fire-and-forget — don't let it throw) ─────────────────
vi.mock('@/lib/notifications/order-notifications', () => ({
  sendPaymentConfirmedNotifications: vi.fn().mockResolvedValue(undefined),
}));

// ── Error reporting mock ──────────────────────────────────────────────────────
vi.mock('@/lib/error-reporting', () => ({
  captureError: vi.fn(),
}));

// ── MercadoPago SDK mock ──────────────────────────────────────────────────────
vi.mock('mercadopago', () => {
  const mockGet = vi.fn().mockResolvedValue({ status: 'approved', id: 'mp-pay-1' });
  function Payment() { return { get: mockGet }; }
  function MercadoPagoConfig() {}
  return { MercadoPagoConfig, Payment };
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(url: string, body: string | object, headers: Record<string, string> = {}) {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(url, {
    method: 'POST',
    body: bodyStr,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** Build a valid Wompi checksum for the given body + secret. */
function wompiChecksum(body: Record<string, unknown>, secret: string): string {
  const props = ['event', 'timestamp', 'data.transaction.id'];
  const toHash = props.map(prop => {
    const parts = prop.split('.');
    let val: unknown = body;
    for (const p of parts) val = (val as Record<string, unknown>)?.[p];
    return String(val ?? '');
  }).join('') + secret;
  return createHash('sha256').update(toHash).digest('hex');
}

/** Build a valid MP x-signature header value. */
function mpSignature(dataId: string, requestId: string, ts: string, secret: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/payments/webhook (Stripe)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: event not yet processed
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, select: mockSelect, neq: mockNeq });
    mockNeq.mockReturnValue({ select: mockSelect, maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, neq: mockNeq });
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'raw-body');
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing signature/i);
  });

  it('returns 400 when stripe-signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('signature mismatch'); });
    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'raw-body', {
      'stripe-signature': 'bad-sig',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid signature/i);
  });

  it('returns 200 immediately for duplicate event (idempotency)', async () => {
    mockConstructEvent.mockReturnValue({ id: 'evt_dup', type: 'checkout.session.completed', data: { object: {} } });
    // Simulate already processed
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'evt_dup' }, error: null });
    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'body', { 'stripe-signature': 'sig' });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    // update should NOT have been called
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('marks order as paid for checkout.session.completed with payment_status=paid', async () => {
    const session = { metadata: { order_id: 'order-1' }, payment_status: 'paid', payment_intent: 'pi_1' };
    mockConstructEvent.mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed', data: { object: session } });
    // Not yet processed
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // updateOrderPayment: neq → select → maybeSingle returns the updated row
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'order-1' }, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'body', { 'stripe-signature': 'sig' });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'paid' }));
  });

  it('does NOT update order for checkout.session.completed with payment_status=unpaid', async () => {
    const session = { metadata: { order_id: 'order-2' }, payment_status: 'unpaid', payment_intent: null };
    mockConstructEvent.mockReturnValue({ id: 'evt_2', type: 'checkout.session.completed', data: { object: session } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'body', { 'stripe-signature': 'sig' });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('marks order as paid for checkout.session.async_payment_succeeded', async () => {
    const session = { metadata: { order_id: 'order-3' }, payment_intent: 'pi_3' };
    mockConstructEvent.mockReturnValue({ id: 'evt_3', type: 'checkout.session.async_payment_succeeded', data: { object: session } });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'order-3' }, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'body', { 'stripe-signature': 'sig' });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'paid' }));
  });

  it('marks order as failed for checkout.session.async_payment_failed', async () => {
    const session = { metadata: { order_id: 'order-4' } };
    mockConstructEvent.mockReturnValue({ id: 'evt_4', type: 'checkout.session.async_payment_failed', data: { object: session } });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'order-4' }, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'body', { 'stripe-signature': 'sig' });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'failed' }));
  });

  it('marks order as failed for checkout.session.expired', async () => {
    const session = { metadata: { order_id: 'order-5' } };
    mockConstructEvent.mockReturnValue({ id: 'evt_5', type: 'checkout.session.expired', data: { object: session } });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'order-5' }, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'body', { 'stripe-signature': 'sig' });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'failed' }));
  });

  it('marks order as paid for payment_intent.succeeded (Apple Pay / Google Pay)', async () => {
    const session = { id: 'pi_6', metadata: { order_id: 'order-6' } };
    mockConstructEvent.mockReturnValue({ id: 'evt_6', type: 'payment_intent.succeeded', data: { object: session } });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'order-6' }, error: null });
    mockUpsert.mockResolvedValue({ error: null });

    const { POST } = await import('@/app/api/payments/webhook/route');
    const req = makeRequest('http://localhost/api/payments/webhook', 'body', { 'stripe-signature': 'sig' });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'paid' }));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WOMPI WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/payments/wompi-webhook', () => {
  const WOMPI_SECRET = 'wompi-test-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('WOMPI_EVENTS_SECRET', WOMPI_SECRET);
    mockInsert.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, select: mockSelect, neq: mockNeq });
    mockSelect.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, neq: mockNeq });
  });

  it('returns 503 when WOMPI_EVENTS_SECRET is not set', async () => {
    vi.stubEnv('WOMPI_EVENTS_SECRET', '');
    const { POST } = await import('@/app/api/payments/wompi-webhook/route');
    const req = makeRequest('http://localhost/api/payments/wompi-webhook', {});
    const res = await POST(req as never);
    expect(res.status).toBe(503);
  });

  it('returns 401 when signature fields are missing', async () => {
    const { POST } = await import('@/app/api/payments/wompi-webhook/route');
    const req = makeRequest('http://localhost/api/payments/wompi-webhook', { event: 'transaction.updated' });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 401 when checksum does not match', async () => {
    const { POST } = await import('@/app/api/payments/wompi-webhook/route');
    const body = {
      event: 'transaction.updated',
      timestamp: 1234567890,
      data: { transaction: { id: 'tx-1', status: 'APPROVED', reference: 'ORD-001' } },
      signature: { properties: ['event', 'timestamp', 'data.transaction.id'], checksum: 'bad-checksum' },
    };
    const req = makeRequest('http://localhost/api/payments/wompi-webhook', body);
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 200 for duplicate event (idempotency via 23505)', async () => {
    const { POST } = await import('@/app/api/payments/wompi-webhook/route');
    const body = {
      event: 'transaction.updated',
      timestamp: 1234567890,
      data: { transaction: { id: 'tx-dup', status: 'APPROVED', reference: 'ORD-DUP' } },
      signature: { properties: ['event', 'timestamp', 'data.transaction.id'], checksum: '' },
    };
    body.signature.checksum = wompiChecksum(body, WOMPI_SECRET);
    // Simulate unique constraint violation (already processed)
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });

    const req = makeRequest('http://localhost/api/payments/wompi-webhook', body);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('marks order as paid for transaction.updated APPROVED', async () => {
    const { POST } = await import('@/app/api/payments/wompi-webhook/route');
    const body = {
      event: 'transaction.updated',
      timestamp: 1234567890,
      data: { transaction: { id: 'tx-2', status: 'APPROVED', reference: 'ORD-002' } },
      signature: { properties: ['event', 'timestamp', 'data.transaction.id'], checksum: '' },
    };
    body.signature.checksum = wompiChecksum(body, WOMPI_SECRET);

    // Order found, not yet paid
    mockMaybeSingle.mockResolvedValue({ data: { id: 'order-w1', payment_status: 'pending' }, error: null });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    const req = makeRequest('http://localhost/api/payments/wompi-webhook', body);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'paid' }));
  });

  it('returns 200 without updating for non-APPROVED status', async () => {
    const { POST } = await import('@/app/api/payments/wompi-webhook/route');
    const body = {
      event: 'transaction.updated',
      timestamp: 1234567890,
      data: { transaction: { id: 'tx-3', status: 'DECLINED', reference: 'ORD-003' } },
      signature: { properties: ['event', 'timestamp', 'data.transaction.id'], checksum: '' },
    };
    body.signature.checksum = wompiChecksum(body, WOMPI_SECRET);

    const req = makeRequest('http://localhost/api/payments/wompi-webhook', body);
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MERCADOPAGO WEBHOOK
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/payments/mercadopago-webhook', () => {
  const MP_SECRET = 'mp-test-secret';
  const DATA_ID = 'mp-pay-99';
  const REQUEST_ID = 'req-abc';
  const TS = '1700000000';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('MP_WEBHOOK_SECRET', MP_SECRET);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, select: mockSelect, neq: mockNeq });
    mockSelect.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle, neq: mockNeq });
  });

  it('returns 503 when MP_WEBHOOK_SECRET is not set', async () => {
    vi.stubEnv('MP_WEBHOOK_SECRET', '');
    const { POST } = await import('@/app/api/payments/mercadopago-webhook/route');
    const req = makeRequest('http://localhost/api/payments/mercadopago-webhook', {});
    const res = await POST(req as never);
    expect(res.status).toBe(503);
  });

  it('returns 401 when x-signature does not match', async () => {
    const { POST } = await import('@/app/api/payments/mercadopago-webhook/route');
    const body = { type: 'payment', data: { id: DATA_ID } };
    const req = makeRequest(
      `http://localhost/api/payments/mercadopago-webhook?data.id=${DATA_ID}`,
      body,
      { 'x-signature': `ts=${TS},v1=badsignature`, 'x-request-id': REQUEST_ID },
    );
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it('returns 200 for irrelevant event type without updating', async () => {
    const { POST } = await import('@/app/api/payments/mercadopago-webhook/route');
    const sig = mpSignature(DATA_ID, REQUEST_ID, TS, MP_SECRET);
    const body = { type: 'plan', data: { id: DATA_ID } };
    const req = makeRequest(
      `http://localhost/api/payments/mercadopago-webhook?data.id=${DATA_ID}`,
      body,
      { 'x-signature': sig, 'x-request-id': REQUEST_ID },
    );
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 200 immediately when order is already paid (idempotency)', async () => {
    const { POST } = await import('@/app/api/payments/mercadopago-webhook/route');
    const sig = mpSignature(DATA_ID, REQUEST_ID, TS, MP_SECRET);
    const body = {
      type: 'payment',
      data: { id: DATA_ID, external_reference: 'ORD-MP1' },
    };
    // Order already paid
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'order-mp1', payment_status: 'paid', restaurant_id: 'rest-1' },
      error: null,
    });

    const req = makeRequest(
      `http://localhost/api/payments/mercadopago-webhook?data.id=${DATA_ID}`,
      body,
      { 'x-signature': sig, 'x-request-id': REQUEST_ID },
    );
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('marks order as paid when payment is approved', async () => {
    const { POST } = await import('@/app/api/payments/mercadopago-webhook/route');
    const sig = mpSignature(DATA_ID, REQUEST_ID, TS, MP_SECRET);
    const body = {
      type: 'payment',
      data: { id: DATA_ID, external_reference: 'ORD-MP2' },
    };

    // First maybeSingle: find order by external_reference
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'order-mp2', payment_status: 'pending', restaurant_id: 'rest-2' },
      error: null,
    });
    // Second maybeSingle: restaurant with mp_enabled + token
    mockMaybeSingle.mockResolvedValueOnce({
      data: { mp_access_token: 'APP_USR-token', mp_enabled: true },
      error: null,
    });

    const req = makeRequest(
      `http://localhost/api/payments/mercadopago-webhook?data.id=${DATA_ID}`,
      body,
      { 'x-signature': sig, 'x-request-id': REQUEST_ID },
    );
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'paid' }));
  });
});
