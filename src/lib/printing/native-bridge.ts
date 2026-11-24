import type { ReceiptData } from './types';

type MeniusAndroidBridge = {
  /** Bloquea la página hasta que la impresora responde (todas las versiones de la app). */
  printReceipt: (json: string) => string;
  /** App >= 1.0.7: vuelve al instante; el resultado llega por window.__meniusPrintDone. */
  printReceiptAsync?: (json: string, callbackId: string) => void;
  isNativePrintAvailable?: () => boolean;
};

type PrintDoneHook = { __meniusPrintDone?: (callbackId: string, result: string) => void };

/**
 * Con la app vieja (solo printReceipt), una impresora que no responde congela la
 * página ~8 s por intento, y los toques hechos mientras tanto quedan en fila y la
 * vuelven a congelar (Galaxy Tab A11, 2026-11-24: minutos sin botones). Tras una
 * falla así, durante este tiempo no se vuelve a intentar: el aviso sale al instante.
 */
const SYNC_COOLDOWN_MS = 20_000;
let lastSyncFailAt = 0;

/** El resultado de la app nunca llega (no debería pasar): no dejar el pedido colgado. */
const ASYNC_TIMEOUT_MS = 60_000;
const pendingAsync = new Map<string, (result: string) => void>();
let asyncSeq = 0;
/** Un ticket a la vez también del lado web: el orden de salida es el de los pedidos. */
let asyncChain: Promise<unknown> = Promise.resolve();

function callAsync(M: MeniusAndroidBridge, json: string): Promise<string> {
  const w = window as unknown as PrintDoneHook;
  if (!w.__meniusPrintDone) {
    w.__meniusPrintDone = (id, result) => {
      const done = pendingAsync.get(id);
      if (!done) return;
      pendingAsync.delete(id);
      done(result);
    };
  }
  return new Promise((resolve) => {
    const id = `p${Date.now().toString(36)}-${++asyncSeq}`;
    const timer = setTimeout(() => { pendingAsync.delete(id); resolve('PRINT_ERROR: NO_RESPONSE'); }, ASYNC_TIMEOUT_MS);
    pendingAsync.set(id, (r) => { clearTimeout(timer); resolve(r); });
    try {
      M.printReceiptAsync!(json, id);
    } catch (e) {
      pendingAsync.delete(id);
      clearTimeout(timer);
      resolve(`PRINT_ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}

function check(result: unknown): void {
  if (result !== 'OK') {
    throw new Error(typeof result === 'string' && result.length > 0 ? result : 'Native print failed');
  }
}

function getBridge(): MeniusAndroidBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { MeniusAndroid?: MeniusAndroidBridge };
  const M = w.MeniusAndroid;
  if (!M || typeof M.printReceipt !== 'function') return null;
  return M;
}

/** True when running inside the MENIUS Counter Android WebView (native thermal print). */
/**
 * True inside the MENIUS Android WebView (native print path). We only require [printReceipt];
 * printer may still be unconfigured — then [nativePrintReceipt] throws with a clear message.
 */
export function isMeniusNativePrintAvailable(): boolean {
  return getBridge() != null;
}

export type NativeTicketType = 'receipt' | 'kitchen';

/**
 * Serializes receipt for Kotlin ESC/POS. Rejects if native returns non-OK.
 * Async bridge when the app has it (no freeze); else the blocking one, with cooldown.
 */
export async function nativePrintReceipt(data: ReceiptData, ticketType: NativeTicketType): Promise<void> {
  const M = getBridge();
  if (!M) throw new Error('MeniusAndroid not available');

  const ts =
    data.timestamp instanceof Date
      ? data.timestamp.toISOString()
      : typeof data.timestamp === 'string'
        ? data.timestamp
        : new Date(data.timestamp as unknown as number).toISOString();

  const payload = {
    restaurantName: data.restaurantName,
    orderNumber: data.orderNumber,
    customerName: data.customerName,
    customerPhone: data.customerPhone ?? null,
    orderType: data.orderType ?? null,
    paymentMethod: data.paymentMethod ?? null,
    deliveryAddress: data.deliveryAddress ?? null,
    items: data.items.map((i) => ({
      qty: i.qty,
      name: i.name,
      lineTotal: i.lineTotal,
      modifiers: i.modifiers ?? [],
      // App >= 1.0.3: precio base arriba + "Item total" (las anteriores lo ignoran).
      basePrice: i.basePrice ?? null,
      notes: i.notes ?? null,
      // App >= 1.0.3: el ticket de cocina lista solo lo que va a cocina.
      kitchen: i.kitchen !== false,
    })),
    subtotal: data.subtotal,
    // Desglose + mesa + QR del repartidor (app >= 1.0.3; las anteriores los ignoran).
    deliveryFee: data.deliveryFee ?? null,
    discountAmount: data.discountAmount ?? null,
    tax: data.tax ?? null,
    taxLabel: data.taxLabel ?? null,
    taxIncluded: data.taxIncluded ?? false,
    tableName: data.tableName ?? null,
    driverTrackingUrl: data.driverTrackingUrl ?? null,
    tip: data.tip ?? null,
    total: data.total,
    notes: data.notes ?? null,
    etaMinutes: data.etaMinutes ?? null,
    currency: data.currency,
    timestamp: ts,
    locale: data.locale ?? 'es',
    ticketType,
    // App >= 1.0.5: el mismo ticket que la impresora CloudPRNT (las anteriores lo
    // ignoran y siguen imprimiendo con los campos de arriba). Solo el recibo:
    // la copia de cocina mantiene su formato.
    ...(ticketType !== 'kitchen' && data.ticket && data.ticketText
      ? { ticket: data.ticket, ticketText: data.ticketText, ticketVersion: 2 }
      : {}),
  };

  const json = JSON.stringify(payload);

  if (typeof M.printReceiptAsync === 'function') {
    const run = () => callAsync(M, json);
    const p = asyncChain.then(run, run);
    asyncChain = p.catch(() => {});
    check(await p);
    return;
  }

  if (Date.now() - lastSyncFailAt < SYNC_COOLDOWN_MS) {
    throw new Error('PRINT_ERROR: PRINTER_COOLDOWN (the printer just failed to respond)');
  }
  const result = M.printReceipt(json);
  // Medido al VOLVER: los toques que esperaban en fila se disparan justo ahora.
  // NO_PRINTER no congela (falla antes de conectar): no activa la espera.
  if (result !== 'OK' && !(typeof result === 'string' && result.startsWith('NO_PRINTER'))) {
    lastSyncFailAt = Date.now();
  }
  check(result);
}

/** Extra methods exposed by MENIUS Counter >= 1.0.2 (see MeniusJsBridge.kt). */
type CounterAppBridge = {
  openPrinterSettings?: () => void;
  disconnectDevice?: () => void;
  vibrateNewOrder?: () => void;
  getAppVersion?: () => string;
  /** >= 1.0.8: versionCode mínimo; por debajo, la app se actualiza sola (obligatorio). */
  setMinAppVersion?: (versionCode: number) => void;
};

/**
 * The Counter Android app's shell, or null in a normal browser. Methods are
 * optional: a tablet still on 1.0.0/1.0.1 has printReceipt but none of these.
 */
export function getCounterAppBridge(): CounterAppBridge | null {
  if (typeof window === 'undefined') return null;
  const M = (window as unknown as { MeniusAndroid?: CounterAppBridge }).MeniusAndroid;
  return M && typeof M.openPrinterSettings === 'function' ? M : null;
}

