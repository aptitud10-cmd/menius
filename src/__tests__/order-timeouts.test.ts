import { describe, it, expect } from 'vitest';
import { classifyTimeout, needsRefundRetry, type TimeoutOrder } from '@/lib/orders/order-timeouts';

const NOW = Date.parse('2026-11-17T18:00:00Z');
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

function order(p: Partial<TimeoutOrder>): TimeoutOrder {
  return {
    status: 'pending', order_type: 'pickup', payment_method: 'cash', payment_status: 'pending',
    scheduled_for: null, created_at: ago(20), updated_at: ago(20), prepared_at: null, ...p,
  };
}

describe('sin aceptar', () => {
  it('a los 15 min se cancela y se avisa', () => {
    expect(classifyTimeout(order({ created_at: ago(15), updated_at: ago(15) }), NOW)).toEqual({ kind: 'cancel_not_accepted', notify: true });
    expect(classifyTimeout(order({ created_at: ago(14), updated_at: ago(14) }), NOW)).toBeNull();
  });

  it('un programado cuenta desde que se activó (updated_at), no desde que se creó', () => {
    expect(classifyTimeout(order({ created_at: ago(600), updated_at: ago(5) }), NOW)).toBeNull();
    expect(classifyTimeout(order({ created_at: ago(600), updated_at: ago(16) }), NOW)).toEqual({ kind: 'cancel_not_accepted', notify: false });
  });

  it('un programado que todavía no llega a su hora no se toca', () => {
    expect(classifyTimeout(order({ scheduled_for: ago(-60), created_at: ago(300), updated_at: ago(300) }), NOW)).toBeNull();
  });

  it('pagos online y pedidos ya cobrados no se cancelan aquí', () => {
    expect(classifyTimeout(order({ payment_method: 'online' }), NOW)).toBeNull();
    expect(classifyTimeout(order({ payment_method: 'wallet' }), NOW)).toBeNull();
    expect(classifyTimeout(order({ payment_status: 'paid' }), NOW)).toBeNull();
  });

  it('un pendiente viejo (backlog) se cancela sin email', () => {
    expect(classifyTimeout(order({ created_at: ago(60 * 24 * 200), updated_at: ago(60 * 24 * 200) }), NOW)).toEqual({ kind: 'cancel_not_accepted', notify: false });
  });
});

describe('aceptados y olvidados', () => {
  it('pickup en Listo se da por retirado a los 30 min (pickup_done, no auto_close)', () => {
    expect(classifyTimeout(order({ created_at: ago(999), status: 'ready', updated_at: ago(29) }), NOW)).toBeNull();
    expect(classifyTimeout(order({ created_at: ago(999), status: 'ready', updated_at: ago(30) }), NOW)).toEqual({ kind: 'pickup_done' });
  });

  it('en cocina se cierra a las 4 h, contando desde el último cambio', () => {
    expect(classifyTimeout(order({ status: 'preparing', created_at: ago(500), updated_at: ago(239), prepared_at: ago(300) }), NOW)).toBeNull();
    expect(classifyTimeout(order({ status: 'preparing', order_type: 'delivery', created_at: ago(800), updated_at: ago(654) }), NOW)).toEqual({ kind: 'auto_close', to: 'delivered' });
  });

  it('delivery en camino a las 3 h; mesa servida a las 3 h → completed', () => {
    expect(classifyTimeout(order({ created_at: ago(999), status: 'out_for_delivery', order_type: 'delivery', updated_at: ago(180) }), NOW)).toEqual({ kind: 'auto_close', to: 'delivered' });
    expect(classifyTimeout(order({ created_at: ago(999), status: 'served', order_type: 'dine_in', updated_at: ago(180) }), NOW)).toEqual({ kind: 'auto_close', to: 'completed' });
    expect(classifyTimeout(order({ created_at: ago(999), status: 'preparing', order_type: 'dine_in', updated_at: ago(240) }), NOW)).toEqual({ kind: 'auto_close', to: 'completed' });
  });

  it('delivery Listo esperando repartidor aguanta 4 h', () => {
    expect(classifyTimeout(order({ created_at: ago(999), status: 'ready', order_type: 'delivery', updated_at: ago(200) }), NOW)).toBeNull();
    expect(classifyTimeout(order({ created_at: ago(999), status: 'ready', order_type: 'delivery', updated_at: ago(240) }), NOW)).toEqual({ kind: 'auto_close', to: 'delivered' });
  });

  it('los cerrados no se tocan', () => {
    for (const status of ['delivered', 'completed', 'cancelled']) {
      expect(classifyTimeout(order({ status, updated_at: ago(9999) }), NOW)).toBeNull();
    }
  });
});

describe('sin aceptar y ya pagado (Fase C)', () => {
  const paid = (p: Partial<TimeoutOrder> = {}) => order({ payment_method: 'online', payment_status: 'paid', payment_intent_id: 'pi_123', ...p });

  it('pagado con Stripe: a los 15 min se reembolsa y se cancela', () => {
    expect(classifyTimeout(paid({ created_at: ago(15), updated_at: ago(15) }), NOW)).toEqual({ kind: 'refund_not_accepted', notify: true });
    expect(classifyTimeout(paid({ created_at: ago(14), updated_at: ago(14) }), NOW)).toBeNull();
  });

  it('cuenta desde que se confirmó el pago (updated_at), no desde el carrito', () => {
    expect(classifyTimeout(paid({ created_at: ago(30), updated_at: ago(10) }), NOW)).toBeNull();
  });

  it('pagado con Wompi o Mercado Pago no se toca: no hay reembolso automático', () => {
    expect(classifyTimeout(paid({ payment_intent_id: '12345678' }), NOW)).toBeNull();
    expect(classifyTimeout(paid({ payment_intent_id: 'wompi-abc' }), NOW)).toBeNull();
    expect(classifyTimeout(paid({ payment_intent_id: null }), NOW)).toBeNull();
  });

  it('online sin cobrar sigue sin tocarse (lo cierra monitor-orders)', () => {
    expect(classifyTimeout(order({ payment_method: 'online', payment_status: 'pending', payment_intent_id: 'pi_1' }), NOW)).toBeNull();
  });

  it('programado pagado todavía no activado no se toca', () => {
    expect(classifyTimeout(paid({ scheduled_for: ago(-60) }), NOW)).toBeNull();
  });
});

describe('reintento de reembolso', () => {
  const base = { status: 'cancelled', payment_status: 'paid', cancellation_reason: 'not_accepted', payment_intent_id: 'pi_1' };
  it('solo cancelado por no aceptado, todavía cobrado y con Stripe', () => {
    expect(needsRefundRetry(base)).toBe(true);
    expect(needsRefundRetry({ ...base, payment_status: 'refunded' })).toBe(false);
    expect(needsRefundRetry({ ...base, cancellation_reason: 'customer' })).toBe(false);
    expect(needsRefundRetry({ ...base, payment_intent_id: '999' })).toBe(false);
    expect(needsRefundRetry({ ...base, status: 'pending' })).toBe(false);
  });
});
