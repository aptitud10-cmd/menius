import { describe, expect, it } from 'vitest';
import { canDeleteAsTest } from '@/lib/orders/test-orders';

describe('canDeleteAsTest', () => {
  it('efectivo sin cobrar (el pedido de prueba típico) se puede borrar', () => {
    expect(canDeleteAsTest({ payment_status: 'pending', payment_intent_id: '' })).toBe(true);
    expect(canDeleteAsTest({ payment_status: null, payment_intent_id: null })).toBe(true);
  });
  it('cobrado o reembolsado no se borra', () => {
    expect(canDeleteAsTest({ payment_status: 'paid', payment_intent_id: '' })).toBe(false);
    expect(canDeleteAsTest({ payment_status: 'refunded', payment_intent_id: '' })).toBe(false);
    expect(canDeleteAsTest({ payment_status: 'partially_refunded', payment_intent_id: '' })).toBe(false);
  });
  it('con un cobro de Stripe iniciado no se borra, aunque no figure pagado', () => {
    expect(canDeleteAsTest({ payment_status: 'pending', payment_intent_id: 'pi_123' })).toBe(false);
  });
});
