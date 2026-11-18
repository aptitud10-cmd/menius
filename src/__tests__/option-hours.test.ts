import { describe, it, expect } from 'vitest';
import { isOptionAvailableAt, optionHoursLabel, hasHours, normalizeHour, hoursRangeLabel } from '@/lib/option-hours';

// Local clock: only getHours/getMinutes are read (see inTimeZone).
const at = (h: number, m = 0) => new Date(2026, 10, 13, h, m);
const GRITS = { available_from: '05:30:00', available_until: '11:00:00' };

describe('isOptionAvailableAt', () => {
  it('no hours = always', () => {
    expect(isOptionAvailableAt({}, at(3))).toBe(true);
    expect(hasHours({})).toBe(false);
    expect(hasHours(GRITS)).toBe(true);
  });

  it('grits: 5:30 to 11:00, end exclusive', () => {
    expect(isOptionAvailableAt(GRITS, at(5, 29))).toBe(false);
    expect(isOptionAvailableAt(GRITS, at(5, 30))).toBe(true);
    expect(isOptionAvailableAt(GRITS, at(10, 59))).toBe(true);
    expect(isOptionAvailableAt(GRITS, at(11, 0))).toBe(false);
    expect(isOptionAvailableAt(GRITS, at(15))).toBe(false);
  });

  it('grace stretches only the closing time', () => {
    expect(isOptionAvailableAt(GRITS, at(11, 5), 10)).toBe(true);
    expect(isOptionAvailableAt(GRITS, at(11, 10), 10)).toBe(false);
    expect(isOptionAvailableAt(GRITS, at(5, 25), 10)).toBe(false);
  });

  it('crosses midnight', () => {
    const late = { available_from: '22:00', available_until: '02:00' };
    expect(isOptionAvailableAt(late, at(23))).toBe(true);
    expect(isOptionAvailableAt(late, at(1, 30))).toBe(true);
    expect(isOptionAvailableAt(late, at(12))).toBe(false);
  });
});

describe('optionHoursLabel', () => {
  it('writes AM/PM once when both sides match', () => {
    expect(optionHoursLabel(GRITS, 'en')).toBe('5:30–11 AM');
  });
  it('writes both when it crosses noon', () => {
    expect(optionHoursLabel({ available_from: '11:00', available_until: '15:30' }, 'en')).toBe('11 AM–3:30 PM');
  });
  it('24h in Spanish', () => {
    expect(optionHoursLabel(GRITS, 'es')).toBe('5:30–11:00');
  });
  it('null without hours', () => {
    expect(optionHoursLabel({}, 'en')).toBeNull();
  });
});

describe('normalizeHour', () => {
  it('keeps valid HH:MM (and trims seconds from Postgres)', () => {
    expect(normalizeHour('05:30')).toBe('05:30');
    expect(normalizeHour('5:30')).toBe('05:30');
    expect(normalizeHour('11:00:00')).toBe('11:00');
  });
  it('anything else is "no hours", never a value Postgres would reject', () => {
    expect(normalizeHour('')).toBeNull();
    expect(normalizeHour(null)).toBeNull();
    expect(normalizeHour('25:00')).toBeNull();
    expect(normalizeHour('11:75')).toBeNull();
    expect(normalizeHour("05:30'; drop table x")).toBeNull();
  });
});

describe('hoursRangeLabel', () => {
  it('12-hour clock in English, AM/PM once when both sides share it', () => {
    expect(hoursRangeLabel('07:00', '22:00', 'en')).toBe('7 AM–10 PM');
    expect(hoursRangeLabel('06:00', '11:30', 'en')).toBe('6–11:30 AM');
  });
  it('24-hour clock in Spanish', () => {
    expect(hoursRangeLabel('07:00', '22:00', 'es')).toBe('7:00–22:00');
  });
});
