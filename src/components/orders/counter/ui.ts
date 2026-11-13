// Sistema visual y textos del Counter (rediseño 2026-11). Referencia: Uber Eats
// Orders — fondo blanco, tarjetas grises sin borde, botones negros, verde solo
// para "nuevo" y "recibiendo pedidos". Los colores de estado nunca decoran.
import { orderItemModLines, linesTotal, withTitle, type ModLine } from '@/lib/modifier-lines';
import type { Order, OrderItem } from '@/types';
import { PREP_CHOICES, nearestChoice, kitchenMinutes } from '@/lib/orders/eta';

export const C = {
  bg: '#FFFFFF',
  surface: '#F2F4F3',      // tarjetas
  surface2: '#E8ECEA',     // hover / pulsado
  line: '#E1E6E3',
  ink: '#0E1412',
  sub: '#55605C',          // texto secundario (7:1 sobre blanco)
  faint: '#7A8580',
  black: '#111816',        // botón principal
  green: '#05C8A7',        // verde MENIUS — solo fondos, con texto oscuro encima
  greenInk: '#04241E',     // texto sobre verde (≈10:1)
  greenDeep: '#047A67',    // verde para texto sobre blanco (≥4.5:1)
  greenSoft: '#DFF7F1',
  blue: '#1D4ED8', blueSoft: '#E8EFFF',
  violet: '#6D28D9', violetSoft: '#F1E8FF',
  orange: '#B54708', orangeSoft: '#FFF1E0',
  amber: '#B45309', amberSoft: '#FEF3C7',
  red: '#C81E1E', redSoft: '#FDE8E8',
} as const;

export type Lang = 'es' | 'en';

const ES = {
  /** Idioma para fechas y horas (el de la tienda, no el del navegador). */
  locale: 'es',
  receiving: 'Recibiendo pedidos',
  receivingShort: 'Abierto',
  paused: (m: number) => `Pausado · ${m} min`,
  busy: (m: number) => `Ocupado · +${m} min`,
  offline: 'Sin conexión',
  reconnecting: 'Reconectando…',
  scheduled: 'Programados',
  history: 'Historial',
  menu: 'Menú',
  board: 'Pedidos',
  colNew: 'Nuevos',
  colPrep: 'Preparando',
  colReady: 'Listos',
  emptyNew: 'Sin pedidos nuevos',
  emptyPrep: 'Nada en preparación',
  emptyReady: 'Nada listo para entregar',
  accept: 'Aceptar',
  acceptMin: (m: number) => `Aceptar · ${m} min`,
  ready: 'Listo',
  serve: 'Servido',
  closeTable: 'Cerrar mesa',
  delivered: 'Entregado',
  dispatched: 'Salió',
  pickedUp: 'Recogido',
  items: (n: number) => `${n} ${n === 1 ? 'producto' : 'productos'}`,
  minAgo: (m: number) => (m < 1 ? 'ahora' : `hace ${m} min`),
  readyIn: (m: number) => `listo en ${m} min`,
  late: (m: number) => `atrasado ${m} min`,
  waiting: (m: number) => `esperando ${m} min`,
  paidOnline: 'Pagado online',
  cash: 'Efectivo',
  delivery: 'DELIVERY',
  pickup: 'RECOGER',
  dineIn: 'MESA',
  allergy: 'ALERGIA',
  note: 'Nota',
  orderNote: 'Nota del pedido',
  utensilsYes: 'Con cubiertos',
  newOrders: (n: number) => (n === 1 ? '1 pedido nuevo' : `${n} pedidos nuevos`),
  ofN: (i: number, n: number) => `${i} de ${n}`,
  readyQuestion: '¿En cuánto estará listo?',
  seeAll: 'Ver todos',
  reject: 'Rechazar',
  tapToSilence: 'Toca la pantalla para silenciar',
  autoAcceptIn: (s: number) => `Se acepta solo en ${s} s`,
  print: 'Imprimir',
  more: 'Más',
  close: 'Cerrar',
  customer: 'Cliente',
  time: 'Tiempo',
  payment: 'Pago',
  address: 'Dirección',
  openMap: 'Abrir mapa',
  driver: 'Repartidor',
  driverOnWay: 'En camino',
  driverAtDoor: 'En la puerta',
  routeStop: (n: number, of: number) => `parada ${n} de ${of}`,
  driverWaiting: (name: string) => `Esperando a ${name}`,
  customerArrived: 'El cliente ya llegó',
  customerArrivedToast: (name: string, num: string) => `${name} llegó por su pedido #${num}`,
  notesChangedToast: (num: string) => `El cliente cambió las instrucciones del #${num}`,
  deliveryPhoto: 'Foto de la entrega',
  total: 'Total',
  itemTotal: 'Total del plato',
  subtotal: 'Subtotal',
  tax: 'Impuestos',
  deliveryFee: 'Envío',
  discount: 'Descuento',
  tip: 'Propina',
  changeTime: 'Cambiar tiempo',
  scheduledFor: (when: string) => `Programado · ${when}`,
  // Más ⋯
  callCustomer: 'Llamar al cliente',
  resendNotice: 'Reenviar aviso al cliente',
  editItems: 'Editar productos',
  assignDriver: 'Asignar repartidor',
  statusHistory: 'Historial de estados',
  cancelOrder: 'Cancelar pedido',
  rejectOrder: 'Rechazar pedido',
  // Avisos
  markedReady: (n: string) => `#${n} marcado listo`,
  markedDelivered: (n: string) => `#${n} entregado`,
  markedDispatched: (n: string) => `#${n} salió`,
  markedServed: (n: string) => `#${n} servido`,
  accepted: (n: string, m: number) => `#${n} aceptado · listo en ${m} min`,
  undo: 'Deshacer',
  noticeFailed: 'No se pudo enviar el email al cliente.',
  noticeSent: 'Aviso enviado al cliente por email.',
  noEmail: 'El cliente no dejó email: no hay a quién avisar.',
  // Estado de la tienda
  storeStatus: 'Estado de la tienda',
  storeOpen: 'Recibiendo pedidos con normalidad',
  busyMode: 'Ocupado: sumar tiempo a cada pedido',
  normal: 'Normal',
  pauseOrders: 'Pausar pedidos nuevos',
  resume: 'Reanudar pedidos',
  untilTomorrow: 'Hasta mañana',
  min: (m: number) => `${m} min`,
  hours: (h: number) => (h === 1 ? '1 hora' : `${h} horas`),
  // Vistas
  backToBoard: 'Volver a pedidos',
  search: 'Buscar por nombre o número',
  noScheduled: 'No hay pedidos programados',
  noHistory: 'Todavía no hay pedidos cerrados hoy',
  cancelled: 'Cancelado',
} as const;

type Dict = { [K in keyof typeof ES]: (typeof ES)[K] extends (...a: infer A) => string ? (...a: A) => string : string };

const EN: Dict = {
  locale: 'en-US',
  receiving: 'Receiving orders',
  receivingShort: 'Open',
  paused: (m) => `Paused · ${m} min`,
  busy: (m) => `Busy · +${m} min`,
  offline: 'Offline',
  reconnecting: 'Reconnecting…',
  scheduled: 'Scheduled',
  history: 'History',
  menu: 'Menu',
  board: 'Orders',
  colNew: 'New',
  colPrep: 'Preparing',
  colReady: 'Ready',
  emptyNew: 'No new orders',
  emptyPrep: 'Nothing preparing',
  emptyReady: 'Nothing ready for handoff',
  accept: 'Accept',
  acceptMin: (m) => `Accept · ${m} min`,
  ready: 'Ready',
  serve: 'Served',
  closeTable: 'Close table',
  delivered: 'Delivered',
  dispatched: 'Sent out',
  pickedUp: 'Picked up',
  items: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
  minAgo: (m) => (m < 1 ? 'now' : `${m} min ago`),
  readyIn: (m) => `ready in ${m} min`,
  late: (m) => `${m} min late`,
  waiting: (m) => `waiting ${m} min`,
  paidOnline: 'Paid online',
  cash: 'Cash',
  delivery: 'DELIVERY',
  pickup: 'PICKUP',
  dineIn: 'TABLE',
  allergy: 'ALLERGY',
  note: 'Note',
  orderNote: 'Order note',
  utensilsYes: 'Utensils requested',
  newOrders: (n) => (n === 1 ? '1 new order' : `${n} new orders`),
  ofN: (i, n) => `${i} of ${n}`,
  readyQuestion: 'Ready in how long?',
  seeAll: 'See all',
  reject: 'Reject',
  tapToSilence: 'Tap the screen to silence',
  autoAcceptIn: (s) => `Auto-accepts in ${s}s`,
  print: 'Print',
  more: 'More',
  close: 'Close',
  customer: 'Customer',
  time: 'Time',
  payment: 'Payment',
  address: 'Address',
  openMap: 'Open map',
  driver: 'Driver',
  driverOnWay: 'On the way',
  driverAtDoor: 'At the door',
  routeStop: (n: number, of: number) => `stop ${n} of ${of}`,
  driverWaiting: (name: string) => `Waiting for ${name}`,
  customerArrived: 'Customer is here',
  customerArrivedToast: (name: string, num: string) => `${name} is here for order #${num}`,
  notesChangedToast: (num: string) => `Customer updated the instructions for #${num}`,
  deliveryPhoto: 'Delivery photo',
  total: 'Total',
  itemTotal: 'Item total',
  subtotal: 'Subtotal',
  tax: 'Tax',
  deliveryFee: 'Delivery fee',
  discount: 'Discount',
  tip: 'Tip',
  changeTime: 'Change time',
  scheduledFor: (when) => `Scheduled · ${when}`,
  callCustomer: 'Call customer',
  resendNotice: 'Resend customer notice',
  editItems: 'Edit items',
  assignDriver: 'Assign driver',
  statusHistory: 'Status history',
  cancelOrder: 'Cancel order',
  rejectOrder: 'Reject order',
  markedReady: (n) => `#${n} marked ready`,
  markedDelivered: (n) => `#${n} delivered`,
  markedDispatched: (n) => `#${n} sent out`,
  markedServed: (n) => `#${n} served`,
  accepted: (n, m) => `#${n} accepted · ready in ${m} min`,
  undo: 'Undo',
  noticeFailed: "Couldn't email the customer.",
  noticeSent: 'Customer notified by email.',
  noEmail: 'The customer left no email: nobody to notify.',
  storeStatus: 'Store status',
  storeOpen: 'Receiving orders normally',
  busyMode: 'Busy: add time to every order',
  normal: 'Normal',
  pauseOrders: 'Pause new orders',
  resume: 'Resume orders',
  untilTomorrow: 'Until tomorrow',
  min: (m) => `${m} min`,
  hours: (h) => (h === 1 ? '1 hour' : `${h} hours`),
  backToBoard: 'Back to orders',
  search: 'Search by name or number',
  noScheduled: 'No scheduled orders',
  noHistory: 'No closed orders yet today',
  cancelled: 'Cancelled',
};

export type CounterText = Dict;
export function counterText(lang: Lang): CounterText {
  return lang === 'en' ? EN : (ES as unknown as Dict);
}

// ── Formato ───────────────────────────────────────────────────────────────────

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function minsSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** Nombre corto para la tarjeta: "Maria Gonzalez" → "Maria G." */
export function shortName(name: string | null | undefined, fallback: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// ── Tipo de pedido ────────────────────────────────────────────────────────────

export function orderKind(order: Order) {
  const t = order.order_type ?? 'dine_in';
  if (t === 'delivery') return { key: 'delivery' as const, color: C.blue };
  if (t === 'pickup') return { key: 'pickup' as const, color: C.violet };
  return { key: 'dine_in' as const, color: C.black };
}

export function kindLabel(order: Order, T: CounterText) {
  const k = orderKind(order).key;
  if (k === 'delivery') return T.delivery;
  if (k === 'pickup') return T.pickup;
  const table = (order as { table?: { name?: string } }).table?.name ?? order.table_name;
  return table ? `${T.dineIn} ${table.replace(/^(mesa|table)\s*/i, '')}` : T.dineIn;
}

// ── Notas y alergias ──────────────────────────────────────────────────────────

const ALLERGY_RE = /alerg|allerg|al[eé]rgi|celiac|cel[ií]ac|gluten|nut|nuez|nueces|man[ií]|peanut|lactos|lactose|dairy|mariscos|shellfish|sesam|s[eé]samo|soy|soya|egg allergy|huevo/i;

export function isAllergyText(text: string | null | undefined) {
  return !!text && ALLERGY_RE.test(text);
}

/** Quita un "Allergy:" / "Alergia:" inicial: la etiqueta ya la pone la interfaz. */
export function stripNoteLabel(text: string) {
  return text.replace(/^\s*(allerg(y|ies)|alerg(ia|ias)|al[eé]rgic[oa]s?|nota|note)\s*[:\-–]\s*/i, '');
}

/** Todas las notas del pedido (generales + por producto) que mencionan alergias. */
export function orderAllergies(order: Order): string[] {
  const out: string[] = [];
  if (isAllergyText(order.notes)) out.push(order.notes);
  for (const it of order.items ?? []) if (isAllergyText(it.notes)) out.push(it.notes);
  return out;
}

export interface ParsedItem {
  qty: number;
  name: string;
  variant: string | null;
  /** Una línea por cosa, como se dice en la cocina, con su precio (lib/modifier-lines). */
  lines: ModLine[];
  /** Precio del plato sin recargos (unitario − líneas − extras). */
  basePrice: number;
  extras: { name: string; price: number }[];
  notes: string | null;
  lineTotal: number;
}

export function parseItem(item: OrderItem): ParsedItem {
  const raw = item as unknown as {
    modifier_lines?: unknown;
    order_item_modifiers?: { group_name?: string; option_name?: string; price_delta?: number }[];
    order_item_extras?: { price?: number; product_extras?: { name?: string } | null }[];
    extras?: { price?: number; extra?: { name?: string }; product_extras?: { name?: string } }[];
  };
  // "Cheeseburger" + Deluxe → "Cheeseburger Deluxe" (su recargo entra en el precio del plato).
  const { name, lines } = withTitle(item.product?.name ?? '—', orderItemModLines(raw));
  const extrasSrc = raw.extras ?? raw.order_item_extras ?? [];
  const extras = extrasSrc
    .map((e) => ({
      name: (e as { extra?: { name?: string } }).extra?.name ?? e.product_extras?.name ?? '',
      price: Number(e.price ?? 0),
    }))
    .filter((e) => e.name);
  return {
    qty: item.qty,
    name,
    variant: item.variant?.name ?? null,
    lines,
    basePrice: Math.round((Number(item.unit_price) - linesTotal(lines) - extras.reduce((s, e) => s + e.price, 0)) * 100) / 100,
    extras,
    notes: item.notes?.trim() ? item.notes.trim() : null,
    lineTotal: Number(item.line_total ?? item.unit_price * item.qty),
  };
}

export function itemCount(order: Order) {
  return (order.items ?? []).reduce((s, i) => s + (i.qty ?? 1), 0);
}

/** Tiempo sugerido: el mayor prep_time_minutes de los productos, o null. */
export function suggestedPrep(order: Order): number | null {
  return kitchenMinutes((order.items ?? []) as { product?: { prep_time_minutes?: number | null } | null }[]);
}

// Mismas reglas que el checkout (src/lib/orders/eta.ts).
export { PREP_CHOICES, nearestChoice };

/**
 * Minutos que faltan (negativo = atrasado) según el ETA guardado al aceptar.
 * Cuenta desde la aceptación (prepared_at), igual que el email y la página de
 * seguimiento del cliente; created_at solo como respaldo para pedidos viejos.
 */
export function minsLeft(order: Order): number | null {
  if (order.estimated_ready_minutes == null) return null;
  const acceptedAt = (order as { prepared_at?: string | null }).prepared_at ?? order.created_at;
  return order.estimated_ready_minutes - minsSince(acceptedAt);
}

/** Margen con que un programado pasa a Nuevos antes de su hora. */
export const SCHEDULED_LEAD_MS = 30 * 60_000;

/**
 * Desde cuándo un pedido NUEVO espera respuesta: su llegada; para un programado,
 * el inicio de su ventana; para uno ya activado por el cron (scheduled_for
 * borrado, updated_at = activación), la activación. Sin esto un programado de
 * ayer mostraba "hace 1200 min" y disparaba el aviso de urgente al instante.
 */
export function waitingSince(o: Pick<Order, 'created_at' | 'scheduled_for'> & { updated_at?: string | null }): number {
  const created = new Date(o.created_at).getTime();
  if (o.scheduled_for) return Math.max(created, new Date(o.scheduled_for).getTime() - SCHEDULED_LEAD_MS);
  const touched = o.updated_at ? new Date(o.updated_at).getTime() : created;
  return Math.max(created, touched);
}

/** Hora pactada de un programado: "12:30", o "mar 12:30" si no es hoy. */
export function scheduledWhen(iso: string, locale?: string) {
  const d = new Date(iso);
  const today = d.toDateString() === new Date().toDateString();
  return d.toLocaleString(locale ? [locale] : [], today ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export function isClosed(order: Order) {
  return ['delivered', 'completed', 'cancelled'].includes(order.status);
}
