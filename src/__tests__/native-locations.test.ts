import { describe, expect, it } from 'vitest';
import { latestFix, MAX_ACCURACY_M } from '@/lib/tracking/native-locations';

const NOW = Date.parse('2026-11-18T20:00:00Z');
const loc = (o: { lat?: number; lng?: number; acc?: number; ts?: string | number; mock?: boolean; sample?: boolean }) => ({
  timestamp: o.ts ?? '2026-11-18T19:59:50Z',
  mock: o.mock,
  sample: o.sample,
  coords: { latitude: o.lat ?? 40.76, longitude: o.lng ?? -73.87, accuracy: o.acc ?? 8 },
});

describe('latestFix (uploader nativo de Transistorsoft)', () => {
  it('acepta un solo objeto (batchSync false)', () => {
    expect(latestFix(loc({}), NOW)).toEqual({ lat: 40.76, lng: -73.87, accuracy: 8, recordedAt: '2026-11-18T19:59:50.000Z' });
  });

  it('de un lote se queda con el punto más nuevo, sin importar el orden', () => {
    const f = latestFix([
      loc({ lat: 1, ts: '2026-11-18T19:59:10Z' }),
      loc({ lat: 3, ts: '2026-11-18T19:59:50Z' }),
      loc({ lat: 2, ts: '2026-11-18T19:59:30Z' }),
    ], NOW);
    expect(f?.lat).toBe(3);
  });

  it('descarta puntos imprecisos, falsos (mock) e intermedios (sample)', () => {
    const f = latestFix([
      loc({ lat: 1, ts: '2026-11-18T19:59:10Z' }),
      loc({ lat: 2, ts: '2026-11-18T19:59:40Z', acc: MAX_ACCURACY_M + 1 }),
      loc({ lat: 3, ts: '2026-11-18T19:59:45Z', mock: true }),
      loc({ lat: 4, ts: '2026-11-18T19:59:50Z', sample: true }),
    ], NOW);
    expect(f?.lat).toBe(1);
  });

  it('null si no hay ningún punto válido', () => {
    expect(latestFix([], NOW)).toBeNull();
    expect(latestFix(undefined, NOW)).toBeNull();
    expect(latestFix([{ coords: { latitude: 'x', longitude: 1 } }], NOW)).toBeNull();
    expect(latestFix([loc({ lat: 95 })], NOW)).toBeNull();
    expect(latestFix([{ coords: { latitude: 1, longitude: 1, accuracy: 5 } }], NOW)).toBeNull(); // sin timestamp
  });

  it('acepta timestamp en milisegundos (timestampFormat epoch)', () => {
    expect(latestFix(loc({ ts: NOW - 5000 }), NOW)?.recordedAt).toBe('2026-11-18T19:59:55.000Z');
  });

  it('un reloj adelantado no deja un punto "del futuro" que bloquee a los siguientes', () => {
    expect(latestFix(loc({ ts: '2026-11-18T21:00:00Z' }), NOW)?.recordedAt).toBe('2026-11-18T20:00:00.000Z');
  });
});
