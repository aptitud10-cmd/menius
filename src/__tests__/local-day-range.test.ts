import { describe, it, expect } from 'vitest';
import {
  localDayStartUTC, localDayRange, lastLocalDaysRange, previousLocalDayRange,
  localDateString, addDaysToDateString, isDateString, resolveTimezone,
} from '@/lib/date-utils';

const NY = 'America/New_York';

const inRange = (iso: string, r: { start: Date; end: Date }) => {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
};

describe('local calendar days (restaurant timezone)', () => {
  it('a day in New York runs 00:00-24:00 local, not UTC', () => {
    const r = localDayRange('2026-11-24', '2026-11-24', NY)!;
    expect(r.start.toISOString()).toBe('2026-11-24T05:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-11-25T05:00:00.000Z');
    expect(r.days).toBe(1);
  });

  it('an order at 22:00 NY (03:00 UTC next day) belongs to the NY day', () => {
    const order = '2026-11-25T03:00:00.000Z'; // 2026-11-24 22:00 EST
    expect(localDateString(new Date(order), NY)).toBe('2026-11-24');
    expect(inRange(order, localDayRange('2026-11-24', '2026-11-24', NY)!)).toBe(true);
    expect(inRange(order, localDayRange('2026-11-25', '2026-11-25', NY)!)).toBe(false);
  });

  it('the previous evening (19:00 NY = 00:00 UTC) stays out of the next day', () => {
    const order = '2026-11-24T00:00:00.000Z'; // 2026-11-23 19:00 EST
    expect(inRange(order, localDayRange('2026-11-24', '2026-11-24', NY)!)).toBe(false);
    expect(inRange(order, localDayRange('2026-11-23', '2026-11-23', NY)!)).toBe(true);
  });

  it('summer time uses the EDT offset', () => {
    expect(localDayStartUTC('2026-07-04', NY).toISOString()).toBe('2026-07-04T04:00:00.000Z');
  });

  it('is exact on DST change days', () => {
    // Spring forward (2026-03-08): midnight is still EST
    expect(localDayStartUTC('2026-03-08', NY).toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(localDayStartUTC('2026-03-09', NY).toISOString()).toBe('2026-03-09T04:00:00.000Z');
    // Fall back (2026-11-01): midnight is still EDT, the day lasts 25 h
    const r = localDayRange('2026-11-01', '2026-11-01', NY)!;
    expect(r.start.toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });

  it('presets are whole calendar days including today', () => {
    const now = new Date('2026-11-25T03:00:00.000Z'); // 2026-11-24 22:00 NY
    const r = lastLocalDaysRange(7, NY, now);
    expect(r.startDate).toBe('2026-11-18');
    expect(r.endDate).toBe('2026-11-24');
    expect(r.start.toISOString()).toBe('2026-11-18T05:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-11-25T05:00:00.000Z');
    expect(r.days).toBe(7);

    const prev = previousLocalDayRange(r, NY);
    expect(prev.startDate).toBe('2026-11-11');
    expect(prev.endDate).toBe('2026-11-17');
    expect(prev.end.getTime()).toBe(r.start.getTime());
  });

  it('rejects malformed or inverted ranges', () => {
    expect(localDayRange('2026-11-25', '2026-11-24', NY)).toBeNull();
    expect(localDayRange('2026-02-30', '2026-03-01', NY)).toBeNull();
    expect(localDayRange('24/11/2026', '2026-11-25', NY)).toBeNull();
    expect(isDateString('2026-11-24')).toBe(true);
  });

  it('date arithmetic crosses months and years', () => {
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateString('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('falls back to the DB default timezone when missing or invalid', () => {
    expect(resolveTimezone(null)).toBe('America/Mexico_City');
    expect(resolveTimezone('Not/AZone')).toBe('America/Mexico_City');
    expect(resolveTimezone(NY)).toBe(NY);
  });
});
