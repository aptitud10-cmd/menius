import { describe, it, expect, afterEach } from 'vitest';
import { canTransition, olderOpenOrdersFilter } from '@/lib/order-state';
import { chooseDriverToken } from '@/lib/orders/driver-token';
import { waitingSince, SCHEDULED_LEAD_MS } from '@/components/orders/counter/ui';
import { liveLocationTopic } from '@/lib/realtime/live-topic';

const NOW = Date.parse('2026-11-10T15:00:00.000Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const H = 3_600_000;

describe('olderOpenOrdersFilter', () => {
  it('programados por hora, aceptados de 48 h y pendientes tocados en la ventana', () => {
    const since = iso(6 * H);
    const f = olderOpenOrdersFilter(since, NOW);
    expect(f).toBe(
      `scheduled_for.gte.${since},and(status.neq.pending,created_at.gte.${iso(48 * H)}),and(status.eq.pending,updated_at.gte.${since})`,
    );
  });
});

describe('transiciones de mesa', () => {
  it('una mesa aceptada desde el panel (confirmed) se puede marcar servida', () => {
    expect(canTransition('confirmed', 'served')).toBe(true);
  });
  it('una mesa servida no se puede cancelar', () => {
    expect(canTransition('served', 'cancelled')).toBe(false);
  });
});

describe('chooseDriverToken', () => {
  const make = () => 'NEW';

  it('primera asignación: conserva el token del QR impreso y le da al menos 24 h', () => {
    const r = chooseDriverToken('Pepe', { driver_name: null, driver_tracking_token: 'PRINTED', driver_token_expires_at: iso(-1 * H) }, make, NOW);
    expect(r.token).toBe('PRINTED');
    expect(r.reused).toBe(true);
    expect(Date.parse(r.expiresAt!)).toBe(NOW + 24 * H);
  });

  it('mismo repartidor: conserva el token y no acorta un vencimiento más largo', () => {
    const later = iso(-30 * H);
    const r = chooseDriverToken(' Pepe ', { driver_name: 'Pepe', driver_tracking_token: 'T1', driver_token_expires_at: later }, make, NOW);
    expect(r.token).toBe('T1');
    expect(r.expiresAt).toBe(later);
  });

  it('otro repartidor: token nuevo (revoca el enlace del anterior)', () => {
    const r = chooseDriverToken('Juan', { driver_name: 'Pepe', driver_tracking_token: 'T1', driver_token_expires_at: null }, make, NOW);
    expect(r.token).toBe('NEW');
    expect(r.reused).toBe(false);
  });

  it('token vencido: uno nuevo', () => {
    const r = chooseDriverToken('Pepe', { driver_name: null, driver_tracking_token: 'OLD', driver_token_expires_at: iso(1 * H) }, make, NOW);
    expect(r.token).toBe('NEW');
  });

  it('sin nombre: desasigna', () => {
    expect(chooseDriverToken('  ', { driver_tracking_token: 'T1' }, make, NOW)).toEqual({ token: null, expiresAt: null, reused: false });
  });
});

describe('waitingSince', () => {
  it('pedido normal: desde que llegó', () => {
    const created = iso(10 * 60_000);
    expect(waitingSince({ created_at: created, scheduled_for: null, updated_at: created })).toBe(Date.parse(created));
  });

  it('programado: desde el inicio de su ventana, no desde que se hizo ayer', () => {
    const sched = new Date(NOW + 10 * 60_000).toISOString();
    expect(waitingSince({ created_at: iso(20 * H), scheduled_for: sched })).toBe(Date.parse(sched) - SCHEDULED_LEAD_MS);
  });

  it('programado ya activado por el cron (scheduled_for borrado): desde la activación', () => {
    const activated = iso(5 * 60_000);
    expect(waitingSince({ created_at: iso(20 * H), scheduled_for: null, updated_at: activated })).toBe(Date.parse(activated));
  });
});

describe('liveLocationTopic', () => {
  const prev = process.env.SUPABASE_SERVICE_ROLE_KEY;
  afterEach(() => { process.env.SUPABASE_SERVICE_ROLE_KEY = prev; });

  it('es estable por pedido, distinto entre pedidos y no contiene el id', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    const a = liveLocationTopic('11111111-1111-4111-8111-111111111111');
    expect(a).toBe(liveLocationTopic('11111111-1111-4111-8111-111111111111'));
    expect(a).not.toBe(liveLocationTopic('22222222-2222-4222-8222-222222222222'));
    expect(a).toMatch(/^order-loc:[0-9a-f]{40}$/);
    expect(a).not.toContain('1111');
  });

  it('sin clave del servidor no hay canal', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(liveLocationTopic('x')).toBeNull();
  });
});

import { primaryAction } from '@/components/orders/counter/CounterBoard';
import { counterText } from '@/components/orders/counter/ui';
import { tableBanner, stripTablePrefix } from '@/lib/printing/table-label';
import type { Order } from '@/types';

describe('primaryAction por tipo y estado', () => {
  const T = counterText('es');
  const o = (status: string, order_type: string) => ({ id: 'x', status, order_type } as unknown as Order);
  it('delivery listo → Salió; en camino → Entregado', () => {
    expect(primaryAction(o('ready', 'delivery'), T, 15)?.kind).toBe('dispatch');
    expect(primaryAction(o('out_for_delivery', 'delivery'), T, 15)?.kind).toBe('deliver');
  });
  it('recoger listo → Recogido; mesa lista → Servido → Cerrar mesa', () => {
    expect(primaryAction(o('ready', 'pickup'), T, 15)).toEqual({ kind: 'deliver', label: 'Recogido' });
    expect(primaryAction(o('ready', 'dine_in'), T, 15)?.kind).toBe('serve');
    expect(primaryAction(o('served', 'dine_in'), T, 15)?.kind).toBe('complete');
  });
  it('ready → out_for_delivery es una transición válida', () => {
    expect(canTransition('ready', 'out_for_delivery')).toBe(true);
  });
});

describe('nombre de mesa en el ticket', () => {
  it.each([
    ['Mesa 5', 'MESA 5'],
    ['Table 12', 'MESA 12'],
    ['7', 'MESA 7'],
    ['Mesa', 'MESA'],
    ['Terraza 2', 'EN MESA — TERRAZA 2'],
    ['Mesanine 1', 'EN MESA — MESANINE 1'],
    ['Tablero 3', 'EN MESA — TABLERO 3'],
  ])('%s → %s', (name, expected) => {
    expect(tableBanner(name, false)).toBe(expected);
  });
  it('en inglés', () => {
    expect(tableBanner('Mesa 5', true)).toBe('TABLE 5');
  });
  it('fila "Mesa:" sin repetir la palabra', () => {
    expect(stripTablePrefix('Mesa 5')).toBe('5');
    expect(stripTablePrefix('Terraza 2')).toBeNull();
  });
});
