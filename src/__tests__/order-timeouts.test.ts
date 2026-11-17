import { describe, it, expect } from 'vitest';
import { classifyTimeout, needsPickupReminder, type TimeoutOrder } from '@/lib/orders/order-timeouts';

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
  it('pickup en Listo se cierra a las 2 h', () => {
    expect(classifyTimeout(order({ created_at: ago(999), status: 'ready', updated_at: ago(119) }), NOW)).toBeNull();
    expect(classifyTimeout(order({ created_at: ago(999), status: 'ready', updated_at: ago(120) }), NOW)).toEqual({ kind: 'auto_close', to: 'delivered' });
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

describe('recordatorio de pickup', () => {
  const ready = (updatedMin: number, extra: Partial<TimeoutOrder> = {}) =>
    order({ created_at: ago(999), status: 'ready', order_type: 'pickup', updated_at: ago(updatedMin), ...extra });

  it('entre los 20 min y el cierre de las 2 h', () => {
    expect(needsPickupReminder(ready(19), NOW)).toBe(false);
    expect(needsPickupReminder(ready(20), NOW)).toBe(true);
    expect(needsPickupReminder(ready(119), NOW)).toBe(true);
    expect(needsPickupReminder(ready(120), NOW)).toBe(false);
  });

  it('no si el cliente ya avisó que llegó, ni en delivery', () => {
    expect(needsPickupReminder(ready(30, { customer_arrived_at: ago(2) }), NOW)).toBe(false);
    expect(needsPickupReminder(ready(30, { order_type: 'delivery' }), NOW)).toBe(false);
  });
});
