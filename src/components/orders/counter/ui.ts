// Sistema visual y textos del Counter (rediseño 2026-11). Referencia: Uber Eats
// Orders — fondo blanco, tarjetas grises sin borde, botones negros, verde solo
// para "nuevo" y "recibiendo pedidos". Los colores de estado nunca decoran.
import type { Order, OrderItem } from '@/types';

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
  receiving: 'Recibiendo pedidos',
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
  total: 'Total',
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
  receiving: 'Receiving orders',
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
  total: 'Total',
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
  mods: { group: string; option: string; delta: number }[];
  extras: { name: string; price: number }[];
  notes: string | null;
  lineTotal: number;
}

export function parseItem(item: OrderItem): ParsedItem {
  const raw = item as unknown as {
    order_item_modifiers?: { group_name?: string; option_name?: string; price_delta?: number }[];
    order_item_extras?: { price?: number; product_extras?: { name?: string } | null }[];
    extras?: { price?: number; extra?: { name?: string }; product_extras?: { name?: string } }[];
  };
  const mods = (raw.order_item_modifiers ?? [])
    .filter((m) => m.option_name)
    .map((m) => ({ group: m.group_name ?? '', option: m.option_name as string, delta: Number(m.price_delta ?? 0) }));
  const extrasSrc = raw.extras ?? raw.order_item_extras ?? [];
  const extras = extrasSrc
    .map((e) => ({
      name: (e as { extra?: { name?: string } }).extra?.name ?? e.product_extras?.name ?? '',
      price: Number(e.price ?? 0),
    }))
    .filter((e) => e.name);
  return {
    qty: item.qty,
    name: item.product?.name ?? '—',
    variant: item.variant?.name ?? null,
    mods,
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
  const times = (order.items ?? [])
    .map((i) => Number((i.product as { prep_time_minutes?: number } | undefined)?.prep_time_minutes ?? 0))
    .filter((n) => n > 0);
  return times.length ? Math.max(...times) : null;
}

export const PREP_CHOICES = [10, 15, 20, 30, 45] as const;

export function nearestChoice(m: number) {
  return PREP_CHOICES.reduce((best, c) => (Math.abs(c - m) < Math.abs(best - m) ? c : best), PREP_CHOICES[1]);
}

/** Minutos que faltan (negativo = atrasado) según el ETA guardado al aceptar. */
export function minsLeft(order: Order): number | null {
  if (order.estimated_ready_minutes == null) return null;
  return order.estimated_ready_minutes - minsSince(order.created_at);
}

export function isClosed(order: Order) {
  return ['delivered', 'completed', 'cancelled'].includes(order.status);
}
