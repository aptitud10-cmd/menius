import type { ReceiptData } from './types';

type MeniusAndroidBridge = {
  printReceipt: (json: string) => string;
  isNativePrintAvailable?: () => boolean;
};

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

/** Serializes receipt for Kotlin ESC/POS. Throws if native returns non-OK. */
export function nativePrintReceipt(data: ReceiptData, ticketType: NativeTicketType): void {
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
      notes: i.notes ?? null,
    })),
    subtotal: data.subtotal,
    tip: data.tip ?? null,
    total: data.total,
    notes: data.notes ?? null,
    etaMinutes: data.etaMinutes ?? null,
    currency: data.currency,
    timestamp: ts,
    locale: data.locale ?? 'es',
    ticketType,
  };

  const result = M.printReceipt(JSON.stringify(payload));
  if (result !== 'OK') {
    throw new Error(typeof result === 'string' && result.length > 0 ? result : 'Native print failed');
  }
}
