import { describe, it, expect } from 'vitest';
import {
  MAX_ROUTE_ORDERS, chooseBatchId, parseRouteTokens, stopsAhead, validateRoute, fetchStopsAhead, pickupDriverFields,
  type RouteOrderRow,
} from '@/lib/orders/driver-route';
import { tokenFromQr } from '@/app/driver/track/[token]/QrScanner';

const row = (token: string, over: Partial<RouteOrderRow> = {}): RouteOrderRow => ({
  id: `id-${token}`, restaurant_id: 'r1', order_type: 'delivery', status: 'ready',
  driver_tracking_token: token, driver_token_expires_at: null, batch_id: null, ...over,
});

describe('parseRouteTokens', () => {
  it('limpia, deduplica y rechaza basura', () => {
    expect(parseRouteTokens([' a ', 'b', 'a'])).toEqual(['a', 'b']);
    expect(parseRouteTokens('a')).toBeNull();
    expect(parseRouteTokens(['a', 3])).toBeNull();
    expect(parseRouteTokens([''])).toBeNull();
    expect(parseRouteTokens(['x'.repeat(201)])).toBeNull();
  });
});

describe('validateRoute', () => {
  it('acepta pedidos delivery abiertos del mismo restaurante', () => {
    expect(validateRoute(['a', 'b'], [row('a'), row('b')])).toBeNull();
  });
  it('rechaza token desconocido, pickup, cerrado, vencido, otro restaurante y más de 4', () => {
    expect(validateRoute(['a', 'z'], [row('a')])).toEqual({ reason: 'not_found', token: 'z' });
    expect(validateRoute(['a'], [row('a', { order_type: 'pickup' })])?.reason).toBe('not_delivery');
    expect(validateRoute(['a'], [row('a', { status: 'delivered' })])?.reason).toBe('closed');
    expect(validateRoute(['a'], [row('a', { status: 'cancelled' })])?.reason).toBe('closed');
    expect(validateRoute(['a'], [row('a', { driver_token_expires_at: '2020-01-01T00:00:00Z' })])?.reason).toBe('expired');
    expect(validateRoute(['a', 'b'], [row('a'), row('b', { restaurant_id: 'r2' })])).toEqual({ reason: 'other_restaurant', token: 'b' });
    const many = Array.from({ length: MAX_ROUTE_ORDERS + 1 }, (_, i) => `t${i}`);
    expect(validateRoute(many, many.map((t) => row(t)))?.reason).toBe('too_many');
  });
});

describe('chooseBatchId', () => {
  it('reusa el batch si todos lo comparten; si no, uno nuevo', () => {
    expect(chooseBatchId([row('a', { batch_id: 'B' }), row('b', { batch_id: 'B' })], () => 'NEW')).toBe('B');
    expect(chooseBatchId([row('a', { batch_id: 'B' }), row('b')], () => 'NEW')).toBe('NEW');
    expect(chooseBatchId([row('a'), row('b')], () => 'NEW')).toBe('NEW');
  });
});

describe('stopsAhead', () => {
  const mates = [
    { id: '1', batch_seq: 1, status: 'out_for_delivery' },
    { id: '2', batch_seq: 2, status: 'delivered' },
    { id: '3', batch_seq: 3, status: 'out_for_delivery', delivery_failed_at: '2026-11-10T00:00:00Z' },
    { id: '5', batch_seq: 5, status: 'out_for_delivery' },
  ];
  it('cuenta solo paradas anteriores sin terminar', () => {
    expect(stopsAhead(4, mates)).toBe(1);
    expect(stopsAhead(1, mates)).toBe(0);
    expect(stopsAhead(null, mates)).toBe(0);
  });
});

describe('fetchStopsAhead', () => {
  const db = (data: unknown[]) => ({
    from: () => ({ select: () => ({ eq: () => ({ neq: async () => ({ data, error: null }) }) }) }),
  });
  it('solo cuenta en camino y antes de llegar a la puerta', async () => {
    const mates = [{ id: 'x', batch_seq: 1, status: 'out_for_delivery' }];
    const base = { id: 'me', status: 'out_for_delivery', batch_id: 'B', batch_seq: 2 };
    expect(await fetchStopsAhead(db(mates), base)).toBe(1);
    expect(await fetchStopsAhead(db(mates), { ...base, status: 'ready' })).toBe(0);
    expect(await fetchStopsAhead(db(mates), { ...base, driver_at_door_at: '2026-11-10T00:00:00Z' })).toBe(0);
    expect(await fetchStopsAhead(db(mates), { ...base, batch_id: null })).toBe(0);
  });
});

describe('pickupDriverFields (quién lo lleva)', () => {
  const now = '2026-11-10T20:00:00Z';
  it('pone el nombre; teléfono solo del equipo', () => {
    expect(pickupDriverFields({ name: ' Carlos ', prevName: null, pool: null, now }))
      .toEqual({ driver_name: 'Carlos', driver_assigned_at: now });
    expect(pickupDriverFields({ name: 'Carlos', prevName: null, pool: { id: 'd1', phone: '+1718' }, now }))
      .toEqual({ driver_name: 'Carlos', driver_assigned_at: now, driver_id: 'd1', driver_phone: '+1718' });
  });
  it('si el asignado era otro, borra su teléfono', () => {
    expect(pickupDriverFields({ name: 'José', prevName: 'Carlos', pool: null, now }).driver_phone).toBeNull();
    expect('driver_phone' in pickupDriverFields({ name: 'carlos', prevName: 'Carlos', pool: null, now })).toBe(false);
  });
  it('sin nombre no toca nada', () => {
    expect(pickupDriverFields({ name: '  ', prevName: 'Carlos', pool: null, now })).toEqual({});
  });
});

describe('tokenFromQr', () => {
  it('saca el token del QR impreso', () => {
    expect(tokenFromQr('https://menius.app/driver/track/123e4567-e89b-12d3-a456-426614174000?lang=en'))
      .toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(tokenFromQr('https://menius.app/buccaneer')).toBeNull();
  });
});
