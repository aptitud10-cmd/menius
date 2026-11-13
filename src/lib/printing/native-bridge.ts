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
  };

  const result = M.printReceipt(JSON.stringify(payload));
  if (result !== 'OK') {
    throw new Error(typeof result === 'string' && result.length > 0 ? result : 'Native print failed');
  }
}

/** Extra methods exposed by MENIUS Counter >= 1.0.2 (see MeniusJsBridge.kt). */
type CounterAppBridge = {
  openPrinterSettings?: () => void;
  disconnectDevice?: () => void;
  vibrateNewOrder?: () => void;
  getAppVersion?: () => string;
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

