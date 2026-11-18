import { describe, it, expect } from 'vitest';
import { nextOpening, type OperatingHours } from '@/lib/orders/business-hours';
import { clockLabel } from '@/lib/option-hours';

// 2026-11-17 is a Tuesday.
const at = (h: number, m = 0) => new Date(2026, 10, 17, h, m);
const week = (open: string, close: string): OperatingHours =>
  Object.fromEntries(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d) => [d, { open, close }]));

describe('nextOpening', () => {
  it('later today when it is before opening', () => {
    expect(nextOpening(week('07:00', '22:00'), at(5, 30))).toEqual({ daysAhead: 0, minutes: 420 });
  });
  it('tomorrow when today already closed', () => {
    expect(nextOpening(week('07:00', '22:00'), at(23))).toEqual({ daysAhead: 1, minutes: 420 });
  });
  it('skips closed days', () => {
    const h = { ...week('07:00', '22:00'), wednesday: { closed: true }, thursday: { closed: true } };
    expect(nextOpening(h, at(23))).toEqual({ daysAhead: 3, minutes: 420 });
  });
  it('null when closed all week', () => {
    const h = Object.fromEntries(Object.keys(week('07:00', '22:00')).map((d) => [d, { closed: true }]));
    expect(nextOpening(h, at(12))).toBeNull();
  });
});

describe('clockLabel', () => {
  it('12-hour in English, 24-hour in Spanish', () => {
    expect(clockLabel(420, 'en')).toBe('7 AM');
    expect(clockLabel(19 * 60 + 30, 'en')).toBe('7:30 PM');
    expect(clockLabel(19 * 60 + 30, 'es')).toBe('19:30');
  });
});
