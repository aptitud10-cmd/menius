/**
 * Textos del ticket impreso, en el idioma del restaurante (restaurants.locale).
 * Sin emojis: Inter no los tiene y la térmica imprimiría un cuadro vacío.
 * Mayúsculas donde el staff tiene que leer de un vistazo.
 */
import type { TicketChannel } from './channel';

export type TicketLocale = 'en' | 'es';

export interface TicketStrings {
  channel: Record<TicketChannel, string>;
  orderType: Record<'delivery' | 'pickup' | 'dine_in', string>;
  table: string;
  ready: string;
  reprint: string;
  testPrint: string;
  testPrintBody: string;
  allergy: string;
  scheduled: string;
  utensils: (yes: boolean) => string;
  /** Cantidad de productos, debajo de cubiertos (Pedro 2026-11-18). */
  itemCount: (n: number) => string;
  note: string;
  subtotal: string;
  delivery: string;
  discount: string;
  tip: string;
  total: string;
  paid: string;
  collectCash: (amount: string) => string;
  verifyPayment: string;
  placed: string;
  placedAt: string;
  dueAt: string;
  thanks: (restaurant: string) => string;
  orderDirect: string;
  driverScan: string;
  poweredBy: string;
}

const en: TicketStrings = {
  channel: { website: 'WEBSITE' },
  orderType: { delivery: 'DELIVERY', pickup: 'PICKUP', dine_in: 'DINE-IN' },
  table: 'TABLE',
  ready: 'READY',
  reprint: 'REPRINT — NOT A NEW ORDER',
  testPrint: 'TEST PRINT',
  testPrintBody: 'Your printer is connected to MENIUS.',
  allergy: 'ALLERGY',
  scheduled: 'SCHEDULED',
  utensils: (yes) => `Utensils: ${yes ? 'Yes' : 'No'}`,
  itemCount: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
  note: 'Note',
  subtotal: 'Subtotal',
  delivery: 'Delivery',
  discount: 'Discount',
  tip: 'Tip',
  total: 'TOTAL',
  paid: 'PAID — DO NOT COLLECT',
  collectCash: (amount) => `COLLECT ${amount} CASH`,
  verifyPayment: 'VERIFY PAYMENT ON TABLET',
  placed: 'Placed',
  placedAt: 'Placed at',
  dueAt: 'Due at',
  thanks: (r) => `Thank you for ordering from ${r}`,
  orderDirect: 'Order direct',
  driverScan: 'DRIVER: SCAN TO START',
  poweredBy: 'Online ordering by MENIUS',
};

const es: TicketStrings = {
  channel: { website: 'WEB' },
  orderType: { delivery: 'DOMICILIO', pickup: 'PARA LLEVAR', dine_in: 'EN MESA' },
  table: 'MESA',
  ready: 'LISTO',
  reprint: 'REIMPRESIÓN — NO ES PEDIDO NUEVO',
  testPrint: 'TICKET DE PRUEBA',
  testPrintBody: 'Tu impresora está conectada a MENIUS.',
  allergy: 'ALERGIA',
  scheduled: 'PROGRAMADO',
  utensils: (yes) => `Cubiertos: ${yes ? 'Sí' : 'No'}`,
  itemCount: (n) => `${n} ${n === 1 ? 'producto' : 'productos'}`,
  note: 'Nota',
  subtotal: 'Subtotal',
  delivery: 'Envío',
  discount: 'Descuento',
  tip: 'Propina',
  total: 'TOTAL',
  paid: 'PAGADO — NO COBRAR',
  collectCash: (amount) => `COBRAR ${amount} EFECTIVO`,
  verifyPayment: 'VERIFICAR PAGO EN LA TABLET',
  placed: 'Hecho',
  placedAt: 'Pedido:',
  dueAt: 'Para:',
  thanks: (r) => `Gracias por pedir en ${r}`,
  orderDirect: 'Pide directo',
  driverScan: 'REPARTIDOR: ESCANEA',
  poweredBy: 'Pedidos online con MENIUS',
};

/**
 * Los textos del ticket ya resueltos (sin funciones) para la app Android, que
 * imprime el MISMO diseño en ESC/POS (SPEC §1b opción b). Las térmicas ESC/POS
 * no tienen "—" en CP858: va "-".
 */
export interface TicketText {
  channelLine: string;
  ready: string;
  reprint: string;
  allergy: string;
  scheduled: string;
  utensils: string;
  itemCount: string;
  note: string;
  subtotal: string;
  tax: string;
  delivery: string;
  discount: string;
  tip: string;
  total: string;
  payment: string;
  table: string;
  placed: string;
  /** Pie ya armado: "Placed at November 13, 2:43 AM". */
  placedLine: string;
  dueLine: string;
  thanks: string;
  orderDirect: string;
  driverScan: string;
  poweredBy: string;
}

export function ticketTextFor(
  d: { locale: TicketLocale; channel: TicketChannel; orderType: 'delivery' | 'pickup' | 'dine_in'; includeUtensils: boolean; itemCount: number;
       payment: { kind: 'paid' | 'collect_cash' | 'verify' }; restaurant: { taxLabel: string; name: string };
       placedFull: string; dueFull?: string },
  paymentAmount: string,
): TicketText {
  const t = ticketStrings(d.locale);
  const ascii = (s: string) => s.replace(/—/g, '-');
  return {
    channelLine: `${t.channel[d.channel]} · ${t.orderType[d.orderType]}`,
    ready: t.ready,
    reprint: ascii(t.reprint),
    allergy: t.allergy,
    scheduled: t.scheduled,
    utensils: t.utensils(d.includeUtensils),
    itemCount: t.itemCount(d.itemCount),
    note: t.note,
    subtotal: t.subtotal,
    tax: d.restaurant.taxLabel,
    delivery: t.delivery,
    discount: t.discount,
    tip: t.tip,
    total: t.total,
    payment: ascii(d.payment.kind === 'paid' ? t.paid : d.payment.kind === 'collect_cash' ? t.collectCash(paymentAmount) : t.verifyPayment),
    table: t.table,
    placed: t.placed,
    placedLine: `${t.placedAt} ${d.placedFull}`,
    dueLine: d.dueFull ? `${t.dueAt} ${d.dueFull}` : '',
    thanks: t.thanks(d.restaurant.name),
    orderDirect: t.orderDirect,
    driverScan: t.driverScan,
    poweredBy: t.poweredBy,
  };
}

export function ticketStrings(locale: TicketLocale): TicketStrings {
  return locale === 'en' ? en : es;
}

/** Monto sin símbolo, con los decimales de la moneda ("9.70"; COP sin centavos). */
export function ticketAmount(n: number, currency: string): string {
  const digits = new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
