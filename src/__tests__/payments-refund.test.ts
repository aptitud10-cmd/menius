import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Supabase admin mock ───────────────────────────────────────────────────────
// select().eq().eq().maybeSingle() para leer la orden; update().eq() para marcarla.
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ eq: mockEq, maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate, insert: mockInsert }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom, rpc: vi.fn() }),
}));

vi.mock('@/lib/auth/get-tenant', () => ({
  getTenant: vi.fn().mockResolvedValue({ userId: 'u1', restaurantId: 'r1' }),
}));

// ── Stripe mock ───────────────────────────────────────────────────────────────
const mockRefundCreate = vi.fn();
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ refunds: { create: mockRefundCreate } }),
}));

vi.mock('@/lib/error-reporting', () => ({ captureError: vi.fn() }));

const mockBroadcast = vi.fn();
vi.mock('@/lib/realtime/broadcast-order', () => ({ broadcastOrderUpdate: (...a: unknown[]) => mockBroadcast(...a) }));
const mockNotify = vi.fn().mockResolvedValue({ channel: 'email', success: true });
vi.mock('@/lib/notifications/order-notifications', () => ({ notifyStatusChange: (...a: unknown[]) => mockNotify(...a) }));

import { POST } from '@/app/api/payments/refund/route';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';

const paidOrder = {
  id: ORDER_ID,
  order_number: 'ORD-1',
  total: 30,
  payment_status: 'paid',
  payment_intent_id: 'pi_123',
  status: 'confirmed',
  promo_code: null,
  restaurant_id: 'r1',
  customer_name: 'Ana',
  customer_email: 'ana@example.com',
  customer_phone: null,
  order_type: 'pickup',
  delivery_address: null,
  restaurants: { stripe_account_id: 'acct_1', stripe_onboarding_complete: true, commission_plan: false },
};

function makeRequest() {
  return new NextRequest('http://localhost/api/payments/refund', {
    method: 'POST',
    body: JSON.stringify({ order_id: ORDER_ID }),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/payments/refund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: paidOrder, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('revierte el transfer al restaurante y conserva el application fee', async () => {
    mockRefundCreate.mockResolvedValue({ id: 're_1', status: 'succeeded' });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mockRefundCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: 'pi_123',
        reverse_transfer: true,
        refund_application_fee: false,
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'refunded', status: 'cancelled' }));
  });

  it('si Stripe rechaza el reembolso, no marca la orden como reembolsada', async () => {
    mockRefundCreate.mockRejectedValue(new Error('Insufficient funds in connected account'));

    const res = await POST(makeRequest());

    expect(res.status).toBe(502);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('avisa al cliente, a la página de seguimiento y guarda el historial', async () => {
    mockRefundCreate.mockResolvedValue({ id: 're_1', status: 'succeeded' });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockBroadcast).toHaveBeenCalledWith(ORDER_ID, 'cancelled');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ order_id: ORDER_ID, to_status: 'cancelled' }));
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled', customerEmail: 'ana@example.com', orderType: 'pickup' }));
  });

  it('Wompi / Mercado Pago: cancela sin Stripe y pide la devolución manual', async () => {
    const neq = vi.fn().mockResolvedValue({ error: null });
    mockUpdateEq.mockReturnValueOnce({ neq });
    for (const [tx, provider] of [['12345-1668624561-38705', 'Wompi'], ['1234567890', 'Mercado Pago']] as const) {
      mockMaybeSingle.mockResolvedValueOnce({ data: { ...paidOrder, payment_intent_id: tx, restaurants: null }, error: null });
      if (provider === 'Mercado Pago') mockUpdateEq.mockReturnValueOnce({ neq });
      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.manual_refund).toEqual({ provider, transaction_id: tx, amount: 30 });
    }
    expect(mockRefundCreate).not.toHaveBeenCalled();
    // Queda cancelada pero NO "refunded": el dinero todavía no volvió.
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ payment_status: 'refunded' }));
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
  });
});
