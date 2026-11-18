import { describe, it, expect } from 'vitest';
import { computePrintersStatus } from '@/lib/printing/printer-status';

const NOW = Date.parse('2026-11-18T12:00:00Z');
const ago = (s: number) => new Date(NOW - s * 1000).toISOString();
const P = (over: Partial<{ id: string; name: string; is_active: boolean; last_poll_at: string | null }> = {}) =>
  ({ id: 'p1', name: 'Counter', is_active: true, last_poll_at: ago(5), ...over });

describe('computePrintersStatus (F5 + §1b regla 3)', () => {
  it('online si hizo poll en los últimos 60 s; offline si no', () => {
    expect(computePrintersStatus([P()], [], NOW).printers[0].state).toBe('online');
    expect(computePrintersStatus([P({ last_poll_at: ago(61) })], [], NOW).printers[0].state).toBe('offline');
    expect(computePrintersStatus([P({ last_poll_at: null })], [], NOW).printers[0].state).toBe('offline');
  });

  it('CloudPRNT activo hasta 10 min sin poll: un corte corto no reactiva el auto-print de la tablet', () => {
    expect(computePrintersStatus([P({ last_poll_at: ago(5 * 60) })], [], NOW).cloudprntActive).toBe(true);
    expect(computePrintersStatus([P({ last_poll_at: ago(11 * 60) })], [], NOW).cloudprntActive).toBe(false);
    expect(computePrintersStatus([P({ is_active: false })], [], NOW).cloudprntActive).toBe(false);
    expect(computePrintersStatus([], [], NOW).cloudprntActive).toBe(false);
  });

  it('cuenta en cola solo lo vencido y los fallidos de las últimas 12 h', () => {
    const jobs = [
      { printer_id: 'p1', status: 'queued', not_before: null, created_at: ago(30) },
      { printer_id: 'p1', status: 'queued', not_before: new Date(NOW + 60_000).toISOString(), created_at: ago(1) },
      { printer_id: 'p1', status: 'failed', not_before: null, created_at: ago(60) },
      { printer_id: 'p1', status: 'failed', not_before: null, created_at: ago(13 * 3600) },
      { printer_id: 'p2', status: 'queued', not_before: null, created_at: ago(30) },
    ];
    const s = computePrintersStatus([P()], jobs, NOW).printers[0];
    expect(s.queuedCount).toBe(1);
    expect(s.failedCount).toBe(1);
  });

  it('las impresoras apagadas no aparecen', () => {
    expect(computePrintersStatus([P({ is_active: false })], [], NOW).printers).toEqual([]);
  });
});
