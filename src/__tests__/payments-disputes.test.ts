import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindOrder = vi.fn();
const mockEmailAdmins = vi.fn();
const mockEmailOwner = vi.fn();
vi.mock('@/lib/payments/admin-alerts', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payments/admin-alerts')>('@/lib/payments/admin-alerts');
  return {
    ...actual,
    findOrderForAlert: (...a: unknown[]) => mockFindOrder(...a),
    emailAdmins: (...a: unknown[]) => mockEmailAdmins(...a),
    emailRestaurantOwner: (...a: unknown[]) => mockEmailOwner(...a),
  };
});

const mockRefund = vi.fn();
vi.mock('@/lib/payments/stripe-refund', () => ({
  refundStripePayment: (...a: unknown[]) => mockRefund(...a),
  isAlreadyRefundedError: (e: { code?: string }) => e?.code === 'charge_already_refunded',
}));

const mockOrderUpdateEq2 = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: () => ({ eq: () => ({ eq: mockOrderUpdateEq2 }) }),
      select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }),
    }),
  }),
}));
vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));

const now = Math.floor(Date.now() / 1000);
const day = 86_400;

function fakeStripe(transfers: { id: string; amount: number; amount_reversed: number; created: number; currency?: string }[]) {
  return {
    charges: { retrieve: vi.fn().mockResolvedValue({ id: 'ch_1', transfer: 'tr_disputed', amount: 2900, currency: 'usd', refunded: false, payment_intent: 'pi_1' }) },
    transfers: {
      retrieve: vi.fn().mockResolvedValue({ id: 'tr_disputed', amount: 2900, amount_reversed: 0, destination: 'acct_1' }),
      list: vi.fn().mockResolvedValue({ data: transfers.map((t) => ({ currency: 'usd', ...t })) }),
      createReversal: vi.fn().mockResolvedValue({ id: 'trr_1' }),
    },
    disputes: { update: vi.fn().mockResolvedValue({}) },
  };
}

const dispute = (over: Record<string, unknown> = {}) => ({
  id: 'dp_1', amount: 2900, currency: 'usd', reason: 'fraudulent', charge: 'ch_1', payment_intent: 'pi_1', status: 'needs_response',
  evidence_details: { due_by: now + 7 * day, submission_count: 0 }, ...over,
});

describe('multa de disputa al restaurante', () => {
  beforeEach(() => vi.clearAllMocks());

  it('descuenta $15 de otro pago de hace más de 2 días, nunca del pedido disputado', async () => {
    const { chargeDisputeFeeToRestaurant } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([
      { id: 'tr_disputed', amount: 2900, amount_reversed: 0, created: now - 3 * day },
      { id: 'tr_today', amount: 4000, amount_reversed: 0, created: now - 3600 },
      { id: 'tr_old', amount: 3000, amount_reversed: 0, created: now - 5 * day },
    ]);
    const res = await chargeDisputeFeeToRestaurant(stripe as never, dispute() as never, 'received');
    expect(res).toEqual({ ok: true, transferId: 'tr_old' });
    expect(stripe.transfers.createReversal).toHaveBeenCalledWith(
      'tr_old',
      { amount: 1500, metadata: { dispute_id: 'dp_1', reason: 'dispute_fee_received' } },
      { idempotencyKey: 'dispute-fee:dp_1:received' },
    );
  });

  it('sin pagos viejos usa uno reciente; sin ninguno con saldo, avisa que hay que cobrarla a mano', async () => {
    const { chargeDisputeFeeToRestaurant } = await import('@/lib/payments/disputes');
    const recent = fakeStripe([{ id: 'tr_today', amount: 4000, amount_reversed: 0, created: now - 60 }]);
    expect(await chargeDisputeFeeToRestaurant(recent as never, dispute() as never, 'received')).toEqual({ ok: true, transferId: 'tr_today' });

    const none = fakeStripe([{ id: 'tr_small', amount: 2000, amount_reversed: 1000, created: now - 5 * day }]);
    const res = await chargeDisputeFeeToRestaurant(none as never, dispute() as never, 'received');
    expect(res.ok).toBe(false);
    expect(none.transfers.createReversal).not.toHaveBeenCalled();
  });

  it('moneda distinta de USD: no adivina la multa', async () => {
    const { chargeDisputeFeeToRestaurant } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([{ id: 'tr_old', amount: 3000, amount_reversed: 0, created: now - 5 * day }]);
    const res = await chargeDisputeFeeToRestaurant(stripe as never, dispute({ currency: 'mxn' }) as never, 'received');
    expect(res.ok).toBe(false);
    expect(stripe.charges.retrieve).not.toHaveBeenCalled();
  });

  it('disputa abierta: cobra la multa, precarga evidencia sin enviarla y avisa', async () => {
    const { handleDisputeCreated } = await import('@/lib/payments/disputes');
    mockFindOrder.mockResolvedValue({ id: 'order-1', order_number: 'ORD-1', restaurantName: 'Buccaneer' });
    const stripe = fakeStripe([{ id: 'tr_old', amount: 3000, amount_reversed: 0, created: now - 5 * day }]);
    await handleDisputeCreated(stripe as never, dispute() as never);
    expect(stripe.transfers.createReversal).toHaveBeenCalledTimes(1);
    expect(mockEmailAdmins).toHaveBeenCalledWith(expect.objectContaining({
      rows: expect.arrayContaining([['Multa $15', 'cobrada al restaurante']]),
    }));
  });

  it('perdida tras contestarla: monto del pedido + segunda multa', async () => {
    const { handleDisputeClosed } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([{ id: 'tr_old', amount: 3000, amount_reversed: 0, created: now - 5 * day }]);
    await handleDisputeClosed(stripe as never, dispute({ status: 'lost', evidence_details: { submission_count: 1 } }) as never);
    expect(stripe.transfers.createReversal).toHaveBeenCalledWith('tr_disputed', expect.objectContaining({ amount: 2900 }), { idempotencyKey: 'dispute-reversal:dp_1' });
    expect(stripe.transfers.createReversal).toHaveBeenCalledWith('tr_old', expect.objectContaining({ amount: 1500 }), { idempotencyKey: 'dispute-fee:dp_1:countered' });
  });

  it('perdida sin contestar: solo el monto (no hubo segunda multa)', async () => {
    const { handleDisputeClosed } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([{ id: 'tr_old', amount: 3000, amount_reversed: 0, created: now - 5 * day }]);
    await handleDisputeClosed(stripe as never, dispute({ status: 'lost' }) as never);
    expect(stripe.transfers.createReversal).toHaveBeenCalledTimes(1);
    expect(stripe.transfers.createReversal).toHaveBeenCalledWith('tr_disputed', expect.anything(), expect.anything());
  });

  it('ganada: no se toca nada (la primera multa ya se cobró al abrirse)', async () => {
    const { handleDisputeClosed } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([]);
    await handleDisputeClosed(stripe as never, dispute({ status: 'won', evidence_details: { submission_count: 1 } }) as never);
    expect(stripe.transfers.createReversal).not.toHaveBeenCalled();
  });
});

describe('aviso al dueño del restaurante', () => {
  type Build = (en: boolean) => { subject: string; intro: string; rows: [string, string][] };
  const lastOwnerEmail = (en: boolean) => {
    const call = mockEmailOwner.mock.calls.at(-1) as [string, Build];
    return { orderId: call[0], ...call[1](en) };
  };
  beforeEach(() => {
    mockEmailOwner.mockReset();
    mockFindOrder.mockResolvedValue({ id: 'order-1', order_number: 'ORD-1', restaurantName: 'Buccaneer', customer_name: 'Ana' });
  });

  it('disputa abierta: le avisa el monto, la multa y hasta cuándo mandar pruebas', async () => {
    const { handleDisputeCreated } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([{ id: 'tr_old', amount: 3000, amount_reversed: 0, created: now - 5 * day }]);
    await handleDisputeCreated(stripe as never, dispute() as never);
    const es = lastOwnerEmail(false);
    expect(es.orderId).toBe('order-1');
    expect(es.subject).toContain('#ORD-1');
    expect(es.intro).toContain('29.00 USD');
    expect(es.intro).toContain('ya se descontó');
    expect(es.rows).toContainEqual(['Motivo', 'Dice que no hizo la compra']);
    expect(lastOwnerEmail(true).subject).toBe('A customer disputed a card charge — order #ORD-1');
  });

  it('perdida tras contestarla: monto + la segunda multa', async () => {
    const { handleDisputeClosed } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([{ id: 'tr_old', amount: 3000, amount_reversed: 0, created: now - 5 * day }]);
    await handleDisputeClosed(stripe as never, dispute({ status: 'lost', evidence_details: { submission_count: 1 } }) as never);
    expect(lastOwnerEmail(false).intro).toContain('Se descontaron 29.00 USD de tus pagos, más $15 por haber contestado el caso.');
  });

  it('ganada: le avisa que no se descuenta nada más', async () => {
    const { handleDisputeClosed } = await import('@/lib/payments/disputes');
    await handleDisputeClosed(fakeStripe([]) as never, dispute({ status: 'won' }) as never);
    expect(lastOwnerEmail(false).subject).toBe('Contracargo ganado — pedido #ORD-1');
  });

  it('sin pedido identificado: no le escribe a nadie', async () => {
    const { handleDisputeCreated } = await import('@/lib/payments/disputes');
    mockFindOrder.mockResolvedValue(null);
    await handleDisputeCreated(fakeStripe([]) as never, dispute() as never);
    expect(mockEmailOwner).not.toHaveBeenCalled();
  });
});

describe('evidencia para el banco', () => {
  it('describe el pedido y ordena la línea de tiempo por hora real, en la zona del restaurante', async () => {
    const { buildDisputeEvidence } = await import('@/lib/payments/disputes');
    const ev = buildDisputeEvidence({
      order: {
        order_number: 'ORD-260810-001', created_at: '2026-11-20T14:05:00Z', order_type: 'pickup', total: 29,
        customer_name: 'Ana', customer_email: 'ana@example.com', customer_phone: '+1555',
        delivery_address: null, customer_arrived_at: null, driver_picked_up_at: null, driver_delivered_at: null, delivery_photo_url: null,
      },
      restaurant: { name: 'Buccaneer', slug: 'buccaneer', address: '1 Main St', timezone: 'America/New_York' },
      items: [{ product_name: 'Gyro', variant_name: 'Large', qty: 2, line_total: 24 }],
      history: [
        { to_status: 'ready', created_at: '2026-11-20T14:25:00Z' },
        { to_status: 'confirmed', created_at: '2026-11-20T14:06:00Z' },
      ],
      notifications: [{ event: 'ready', channel: 'email', created_at: '2026-11-20T14:25:30Z' }],
      appUrl: 'https://menius.app',
    });
    expect(ev.customer_email_address).toBe('ana@example.com');
    expect(ev.service_date).toBe('2026-11-20');
    expect(ev.product_description).toContain('2 x Gyro (Large) $24.00');
    expect(ev.product_description).toContain('Total charged: $29.00');
    const text = ev.uncategorized_text as string;
    expect(text.indexOf('accepted')).toBeLessThan(text.indexOf('Order ready'));
    expect(text).toContain('9:06'); // 14:06 UTC = 9:06 en Nueva York
    expect(text).toContain('https://menius.app/buccaneer/legal/refunds');
    expect(ev).not.toHaveProperty('shipping_address');
  });
});

describe('aviso temprano de fraude', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOrder.mockResolvedValue({ id: 'order-1', order_number: 'ORD-1', restaurantName: 'Buccaneer', customer_name: 'Ana' });
    mockRefund.mockResolvedValue({ id: 're_1', status: 'succeeded' });
  });

  it('$15 o menos: lo devuelve solo y marca el pedido reembolsado', async () => {
    const { handleEarlyFraudWarning } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([]);
    stripe.charges.retrieve.mockResolvedValue({ id: 'ch_1', amount: 1200, currency: 'usd', refunded: false, payment_intent: 'pi_1' });
    await handleEarlyFraudWarning(stripe as never, { id: 'issfr_1', actionable: true, charge: 'ch_1', fraud_type: 'made_with_stolen_card' });
    expect(mockRefund).toHaveBeenCalledWith('pi_1', expect.objectContaining({ reason: 'fraudulent', idempotencyKey: 'efw-refund:issfr_1' }));
    expect(mockOrderUpdateEq2).toHaveBeenCalledWith('payment_status', 'paid');
    expect(mockEmailAdmins).toHaveBeenCalledTimes(1);
    // El dueño se entera: el reembolso sale de sus pagos.
    expect(mockEmailOwner).toHaveBeenCalledTimes(1);
    const mail = mockEmailOwner.mock.calls[0][1](false);
    expect(mail.subject).toContain('Cobro devuelto por posible fraude');
    expect(mail.intro).toContain('12.00 USD');
  });

  it('más de $15: no devuelve, avisa para decidir', async () => {
    const { handleEarlyFraudWarning } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([]);
    await handleEarlyFraudWarning(stripe as never, { id: 'issfr_2', actionable: true, charge: 'ch_1' });
    expect(mockRefund).not.toHaveBeenCalled();
    expect(mockEmailAdmins).toHaveBeenCalledWith(expect.objectContaining({ intro: expect.stringContaining('No se devolvió solo') }));
    const mail = mockEmailOwner.mock.calls[0][1](true);
    expect(mail.subject).toContain('Possible fraud');
    expect(mail.intro).toContain('refunding it now from Orders');
  });

  it('no accionable (ya tiene disputa o está devuelto): no hace nada más que avisar', async () => {
    const { handleEarlyFraudWarning } = await import('@/lib/payments/disputes');
    const stripe = fakeStripe([]);
    stripe.charges.retrieve.mockResolvedValue({ id: 'ch_1', amount: 1000, currency: 'usd', refunded: false, payment_intent: 'pi_1' });
    await handleEarlyFraudWarning(stripe as never, { id: 'issfr_3', actionable: false, charge: 'ch_1' });
    expect(mockRefund).not.toHaveBeenCalled();
    expect(mockEmailAdmins).toHaveBeenCalledTimes(1);
    expect(mockEmailOwner).not.toHaveBeenCalled();
  });
});
