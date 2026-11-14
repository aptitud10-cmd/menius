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
  itemsCheckBag: (n: number) => string;
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
  orderDirect: string;
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
  itemsCheckBag: (n) => `${n} ${n === 1 ? 'item' : 'items'} — check bag`,
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
  orderDirect: 'Order direct',
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
  itemsCheckBag: (n) => `${n} ${n === 1 ? 'producto' : 'productos'} — revisa la bolsa`,
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
  orderDirect: 'Pide directo',
  poweredBy: 'Pedidos online con MENIUS',
};

export function ticketStrings(locale: TicketLocale): TicketStrings {
  return locale === 'en' ? en : es;
}
