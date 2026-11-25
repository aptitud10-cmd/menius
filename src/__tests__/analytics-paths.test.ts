import { describe, it, expect } from 'vitest';
import { isTrackedPath } from '@/lib/analytics';

describe('isTrackedPath', () => {
  it('mide la tienda, el checkout, la landing y el panel', () => {
    for (const p of ['/', '/buccaneer', '/buccaneer/checkout', '/onboarding/create-restaurant', '/app', '/app/menu/products']) {
      expect(isTrackedPath(p), p).toBe(true);
    }
  });
  it('no carga nada en Counter, KDS, repartidor ni admin', () => {
    for (const p of ['/app/counter', '/app/kds', '/counter', '/kds/cocina', '/driver/abc', '/admin', '/admin/restaurant', '/preview-counter']) {
      expect(isTrackedPath(p), p).toBe(false);
    }
    expect(isTrackedPath(null)).toBe(false);
  });
  it('no confunde rutas que solo empiezan igual', () => {
    expect(isTrackedPath('/counterpoint-cafe')).toBe(true);
    expect(isTrackedPath('/administracion-bar')).toBe(true);
  });
});
