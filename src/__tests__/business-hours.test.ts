import { describe, it, expect } from 'vitest';
import { isOpenAt, validScheduledFor } from '@/lib/orders/business-hours';

// Fechas "locales" (getters = hora del restaurante). 2026-11-13 es viernes.
const at = (day: number, hh: number, mm = 0) => new Date(2026, 10, day, hh, mm);

describe('isOpenAt', () => {
  const normal = { friday: { open: '07:00', close: '22:00' }, saturday: { open: '08:00', close: '22:00' } };
  it('horario normal', () => {
    expect(isOpenAt(normal, at(13, 6, 59))).toBe(false);
    expect(isOpenAt(normal, at(13, 7))).toBe(true);
    expect(isOpenAt(normal, at(13, 21, 59))).toBe(true);
    expect(isOpenAt(normal, at(13, 22))).toBe(false);
  });
  it('día cerrado o sin cargar', () => {
    expect(isOpenAt({ friday: { closed: true } }, at(13, 12))).toBe(false);
    expect(isOpenAt({ saturday: { open: '08:00', close: '22:00' } }, at(13, 12))).toBe(false);
  });
  it('cruza la medianoche (18:00–02:00)', () => {
    const late = { friday: { open: '18:00', close: '02:00' }, saturday: { closed: true } };
    expect(isOpenAt(late, at(13, 17, 59))).toBe(false);
    expect(isOpenAt(late, at(13, 23, 30))).toBe(true);
    // Sábado 01:00 = madrugada del viernes, aunque el sábado esté cerrado.
    expect(isOpenAt(late, at(14, 1, 0))).toBe(true);
    expect(isOpenAt(late, at(14, 2, 0))).toBe(false);
  });
});

describe('validScheduledFor', () => {
  const now = Date.parse('2026-11-13T15:00:00Z');
  it('solo fechas reales al menos 5 min en el futuro', () => {
    expect(validScheduledFor('2026-11-13T16:00:00Z', now)?.toISOString()).toBe('2026-11-13T16:00:00.000Z');
    expect(validScheduledFor('2026-11-13T15:03:00Z', now)).toBeNull();
    expect(validScheduledFor('2026-11-12T16:00:00Z', now)).toBeNull();
    expect(validScheduledFor('mañana', now)).toBeNull();
    expect(validScheduledFor(undefined, now)).toBeNull();
  });
});
