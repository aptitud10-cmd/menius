import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReceiptData } from '@/lib/printing/types';

// Galaxy Tab A11, 2026-11-24: con la impresora sin responder, el puente bloqueante
// congelaba el Counter ~8 s por intento y los toques en fila lo volvían a congelar.

const data = {
  restaurantName: 'Test', orderNumber: 'ORD-1', customerName: 'Leo', items: [],
  subtotal: 0, total: 0, currency: 'USD', timestamp: new Date('2026-11-24T10:00:00Z'),
} as unknown as ReceiptData;

type W = { MeniusAndroid?: unknown; __meniusPrintDone?: (id: string, r: string) => void };

async function load() {
  vi.resetModules();
  return import('@/lib/printing/native-bridge');
}

describe('nativePrintReceipt', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as W).MeniusAndroid;
    delete (window as unknown as W).__meniusPrintDone;
  });

  it('app vieja: tras una falla no vuelve a llamar al puente durante 20 s', async () => {
    const printReceipt = vi.fn(() => 'PRINT_ERROR: PRINTER_TIMEOUT');
    (window as unknown as W).MeniusAndroid = { printReceipt };
    const { nativePrintReceipt } = await load();

    await expect(nativePrintReceipt(data, 'receipt')).rejects.toThrow('PRINTER_TIMEOUT');
    await expect(nativePrintReceipt(data, 'receipt')).rejects.toThrow('PRINTER_COOLDOWN');
    expect(printReceipt).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20_001);
    await expect(nativePrintReceipt(data, 'receipt')).rejects.toThrow('PRINTER_TIMEOUT');
    expect(printReceipt).toHaveBeenCalledTimes(2);
  });

  it('app vieja: NO_PRINTER no activa la espera (no congela)', async () => {
    const printReceipt = vi.fn(() => 'NO_PRINTER: pick one');
    (window as unknown as W).MeniusAndroid = { printReceipt };
    const { nativePrintReceipt } = await load();

    await expect(nativePrintReceipt(data, 'receipt')).rejects.toThrow('NO_PRINTER');
    await expect(nativePrintReceipt(data, 'receipt')).rejects.toThrow('NO_PRINTER');
    expect(printReceipt).toHaveBeenCalledTimes(2);
  });

  it('app nueva: usa el puente asíncrono, de a uno, y resuelve con __meniusPrintDone', async () => {
    const calls: string[] = [];
    const printReceipt = vi.fn(() => 'OK');
    const printReceiptAsync = vi.fn((_json: string, id: string) => { calls.push(id); });
    (window as unknown as W).MeniusAndroid = { printReceipt, printReceiptAsync };
    const { nativePrintReceipt } = await load();

    const a = nativePrintReceipt(data, 'receipt');
    const b = nativePrintReceipt(data, 'kitchen');
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(1); // el segundo espera al primero

    (window as unknown as W).__meniusPrintDone!(calls[0], 'PRINT_ERROR: PRINTER_TIMEOUT');
    await expect(a).rejects.toThrow('PRINTER_TIMEOUT');
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);

    (window as unknown as W).__meniusPrintDone!(calls[1], 'OK');
    await expect(b).resolves.toBeUndefined();
    expect(printReceipt).not.toHaveBeenCalled();
  });

  it('app nueva: si la respuesta nunca llega, falla a los 60 s', async () => {
    (window as unknown as W).MeniusAndroid = { printReceipt: vi.fn(), printReceiptAsync: vi.fn() };
    const { nativePrintReceipt } = await load();

    const p = nativePrintReceipt(data, 'receipt');
    const assertion = expect(p).rejects.toThrow('NO_RESPONSE');
    await vi.advanceTimersByTimeAsync(60_001);
    await assertion;
  });
});
