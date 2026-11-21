// Sistema visual y textos del Counter (rediseño 2026-11-14, dirección "Apple"
// aprobada por Pedro). La jerarquía se arma con tipografía y superficies: fondo
// gris, tarjetas que se elevan, tres grises para el texto. El color queda para
// cuatro cosas: nuevo (accent: Aceptar y el contador de Nuevos), tipo de pedido
// (ícono + palabra), tiempo (amber/red) y peligro (critical: la alergia, el único
// relleno rojo). Pesos 500/600/700, nunca 800.
import { orderItemModLines, linesTotal, withTitle, type ModLine } from '@/lib/modifier-lines';
import type { Order, OrderItem } from '@/types';
import { PREP_CHOICES, nearestChoice, kitchenMinutes } from '@/lib/orders/eta';
import { LIGHT_TOKENS, cssVarName, type ThemeToken } from '@/lib/counter-themes';

// Cada color es una variable CSS de la apariencia (lib/counter-themes.ts), con el
// valor de Claro como respaldo.
const v = (k: ThemeToken) => `var(${cssVarName(k)}, ${LIGHT_TOKENS[k]})`;

export const C = {
  bg: v('bg'),
  surface: v('surface'),
  fill: v('fill'),
  thumb: v('thumb'),
  thumbShadow: v('thumbShadow'),
  line: v('line'),
  lineStrong: v('lineStrong'),
  ink: v('ink'),
  sub: v('sub'),
  faint: v('faint'),
  accent: v('accent'),
  onAccent: v('onAccent'),
  accentText: v('accentText'),
  status: v('status'),
  blue: v('blue'),
  violet: v('violet'),
  amber: v('amber'),
  red: v('red'),
  destructive: v('destructive'),
  critical: v('critical'),
  onCritical: v('onCritical'),
  warnBg: v('warnBg'),
  warnText: v('warnText'),
  warnBar: v('warnBar'),
  inverse: v('inverse'),
  onInverse: v('onInverse'),
  raised: v('raised'),
  raisedEdge: v('raisedEdge'),
  scrim: v('scrim'),
} as const;

/** Estilo de un modal u hoja: superficie elevada + borde (solo se ve en Oscuro) + sombra. */
export const RAISED = {
  background: C.raised,
  color: C.ink,
  boxShadow: `0 0 0 1px ${C.raisedEdge}, 0 24px 48px rgba(0,0,0,.28)`,
} as const;

/**
 * Paleta de las páginas del repartidor (driver/track/[token]). No tienen
 * apariencia: son EXACTAMENTE los colores que el Counter usaba antes del
 * rediseño (los respaldos de las variables --kds-* de entonces). No cambiar sin
 * revisar esas dos páginas.
 */
export const DRIVER_C = {
  bg: '#FFFFFF',
  surface: '#F2F4F3',
  surface2: '#E8ECEA',
  line: '#E1E6E3',
  ink: '#0E1412',
  sub: '#55605C',
  faint: '#7A8580',
  black: '#111816',
  onBlack: '#FFFFFF',
  green: '#05C8A7',
  greenInk: '#04241E',
  greenDeep: '#047A67',
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
  // Lista "Ahora" (tablet parada y celular, 2026-11-19)
  emptyAll: 'Sin pedidos activos',
  newAbove: (n: number) => (n === 1 ? '1 nuevo' : `${n} nuevos`),
  justAccepted: 'Recién aceptado',
  justReady: 'Recién listo',
  collect: (amount: string) => `Cobrar ${amount}`,
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
  delivery: 'Delivery',
  pickup: 'Recoger',
  dineIn: 'Mesa',
  allergy: 'Alergia',
  note: 'Nota',
  orderNote: 'Nota del pedido',
  utensilsYes: 'Con cubiertos',
  newOrders: (n: number) => (n === 1 ? '1 pedido nuevo' : `${n} pedidos nuevos`),
  ofN: (i: number, n: number) => `${i} de ${n}`,
  readyQuestion: '¿En cuánto estará listo?',
  seeAll: 'Ver todos',
  reject: 'Rechazar',
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
  eventSoundsTitle: 'Avisos',
  eventSoundsHint: 'Solo suenan cuando algo pasa sin que lo toques aquí.',
  eventReady: 'Listo en cocina',
  eventCancelled: 'Cancelado o error',
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
  orderHelp: 'Ayuda de MENIUS',
  cancelOrder: 'Cancelar pedido',
  rejectOrder: 'Rechazar pedido',
  // Avisos
  markedReady: (n: string) => `#${n} marcado listo`,
  markedDelivered: (n: string) => `#${n} entregado`,
  markedDispatched: (n: string) => `#${n} salió`,
  markedServed: (n: string) => `#${n} servido`,
  // Pickup que nadie vino a buscar (cancela + marca al cliente; con Deshacer).
  noShow: 'No vino a buscarlo',
  markedNoShow: (n: string) => `#${n}: no vino · cliente marcado`,
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
  // Personalización (sonido, colores, volumen) y modo demo
  customize: 'Sonido y colores',
  tabSound: 'Sonido',
  tabColors: 'Pantalla',
  tabVolume: 'Volumen',
  official: 'Oficial',
  useThis: 'Usar este',
  inUse: 'En uso',
  listen: 'Escuchar',
  volume: 'Volumen de las alertas',
  urgentAfter: 'Pasar a sonido urgente después de',
  seconds: (n: number) => `${n} s`,
  staffCanCustomize: 'Permitir a las tablets cambiar sonido y colores',
  staffCanCustomizeHelp: 'Si lo apagas, solo tú (con tu sesión) puedes cambiarlos.',
  locked: 'El dueño bloqueó los cambios de sonido y colores en esta tablet.',
  saveFailed: 'No se pudo guardar. Revisa la conexión e intenta de nuevo.',
  demoMode: 'Pedido de prueba',
  demoModeHelp: 'Un pedido falso solo en esta pantalla, para entrenar al personal y probar el sonido y la impresora. No se guarda ni se cobra.',
  startDemo: 'Enviar pedido de prueba',
  salesDemo: 'Demo de ventas (3 pedidos)',
  demoBanner: 'Pedido de prueba · no es real',
  demoExit: 'Salir',
  demoSummary: (n: number, total: string) => `${n} ${n === 1 ? 'orden' : 'órdenes'} · ${total}`,
  demoReady: 'Lista para tu restaurante',
  demoAgain: 'Repetir',
  search: 'Buscar por nombre o número',
  noScheduled: 'No hay pedidos programados',
  noHistory: 'Todavía no hay pedidos cerrados hoy',
  cancelled: 'Cancelado',
  menuTab: 'Menú',
  settings: 'Ajustes',
  mSearch: 'Buscar plato…',
  mOut: 'Agotados',
  mOutBtn: 'Se acabó',
  mBack: 'Volver a poner',
  mBackAll: 'Volver a poner todo',
  mItems: (n: number) => `${n} ${n === 1 ? 'plato' : 'platos'}`,
  mItemsOut: (n: number, o: number) => `${n} ${n === 1 ? 'plato' : 'platos'} · ${o} ${o === 1 ? 'agotado' : 'agotados'}`,
  mResults: (n: number) => `${n} ${n === 1 ? 'resultado' : 'resultados'}`,
  mNoResults: 'Ningún plato con ese nombre',
  mNoneOut: 'No hay nada agotado. Todo el menú está a la venta.',
  mChipAuto: (c: string) => `Se acabó · vuelve a las ${c}`,
  mChipManual: 'Se acabó · hasta que lo vuelvas a poner',
  mIsOutAuto: (n: string, c: string) => `${n} · se acabó hasta las ${c}`,
  mIsOutManual: (n: string) => `${n} · se acabó hasta que lo vuelvas a poner`,
  mPopTitle: (n: string) => `${n} se acabó…`,
  mTomorrow: 'Hasta mañana',
  mTomorrowSub: (c: string) => `vuelve solo a las ${c}`,
  mManual: 'Hasta que lo vuelva a poner',
  mManualSub: 'no vuelve solo',
  mSecAuto: (c: string) => `Vuelven solos a las ${c}`,
  mSecManual: 'Hasta que los vuelvas a poner',
  mIsBack: (n: string) => `${n} de vuelta en el menú`,
  mAllBack: (n: number) => `${n} ${n === 1 ? 'plato' : 'platos'} de vuelta en el menú`,
  mUndo: 'Deshacer',
  mFailed: 'No se pudo guardar. Revisa la conexión e intenta de nuevo.',
  mTodayHint: 'Sopas y especiales se manejan en',
  mTodayLink: 'Hoy',
  mLoading: 'Cargando el menú…',
  mLoadFailed: 'No se pudo cargar el menú.',
  mRetry: 'Reintentar',
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
  emptyAll: 'No active orders',
  newAbove: (n) => (n === 1 ? '1 new' : `${n} new`),
  justAccepted: 'Just accepted',
  justReady: 'Just marked ready',
  collect: (amount) => `Collect ${amount}`,
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
  delivery: 'Delivery',
  pickup: 'Pickup',
  dineIn: 'Table',
  allergy: 'Allergy',
  note: 'Note',
  orderNote: 'Order note',
  utensilsYes: 'Utensils requested',
  newOrders: (n) => (n === 1 ? '1 new order' : `${n} new orders`),
  ofN: (i, n) => `${i} of ${n}`,
  readyQuestion: 'Ready in how long?',
  seeAll: 'See all',
  reject: 'Reject',
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
  eventSoundsTitle: 'Alerts',
  eventSoundsHint: 'They only play when something happens that you didn’t tap here.',
  eventReady: 'Kitchen ready',
  eventCancelled: 'Cancelled or error',
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
  orderHelp: 'MENIUS help',
  cancelOrder: 'Cancel order',
  rejectOrder: 'Reject order',
  markedReady: (n) => `#${n} marked ready`,
  markedDelivered: (n) => `#${n} delivered`,
  markedDispatched: (n) => `#${n} sent out`,
  markedServed: (n) => `#${n} served`,
  noShow: 'Never picked it up',
  markedNoShow: (n) => `#${n}: no-show · customer flagged`,
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
  customize: 'Sound & colors',
  tabSound: 'Sound',
  tabColors: 'Display',
  tabVolume: 'Volume',
  official: 'Official',
  useThis: 'Use this',
  inUse: 'In use',
  listen: 'Listen',
  volume: 'Alert volume',
  urgentAfter: 'Switch to urgent sound after',
  seconds: (n: number) => `${n} s`,
  staffCanCustomize: 'Let tablets change sound and colors',
  staffCanCustomizeHelp: 'If off, only you (signed in) can change them.',
  locked: 'The owner locked sound and color changes on this tablet.',
  saveFailed: "Couldn't save. Check the connection and try again.",
  demoMode: 'Test order',
  demoModeHelp: 'A fake order on this screen only, to train staff and check sound and printing. Nothing is saved or charged.',
  startDemo: 'Send test order',
  salesDemo: 'Sales demo (3 orders)',
  demoBanner: 'Test order · not real',
  demoExit: 'Exit',
  demoSummary: (n: number, total: string) => `${n} ${n === 1 ? 'order' : 'orders'} · ${total}`,
  demoReady: 'Ready for your restaurant',
  demoAgain: 'Run again',
  search: 'Search by name or number',
  noScheduled: 'No scheduled orders',
  noHistory: 'No closed orders yet today',
  cancelled: 'Cancelled',
  menuTab: 'Menu',
  settings: 'Settings',
  mSearch: 'Search items…',
  mOut: 'Sold out',
  mOutBtn: 'Mark sold out',
  mBack: 'Put back',
  mBackAll: 'Put all back',
  mItems: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
  mItemsOut: (n, o) => `${n} ${n === 1 ? 'item' : 'items'} · ${o} sold out`,
  mResults: (n) => `${n} ${n === 1 ? 'result' : 'results'}`,
  mNoResults: 'No item with that name',
  mNoneOut: 'Nothing is sold out. The whole menu is for sale.',
  mChipAuto: (c) => `Sold out · back at ${c}`,
  mChipManual: 'Sold out · until you put it back',
  mIsOutAuto: (n, c) => `${n} · sold out until ${c}`,
  mIsOutManual: (n) => `${n} · sold out until you put it back`,
  mPopTitle: (n) => `${n} is sold out…`,
  mTomorrow: 'Until tomorrow',
  mTomorrowSub: (c) => `comes back on its own at ${c}`,
  mManual: 'Until I put it back',
  mManualSub: "doesn't come back on its own",
  mSecAuto: (c) => `Back on their own at ${c}`,
  mSecManual: 'Until you put them back',
  mIsBack: (n) => `${n} back on the menu`,
  mAllBack: (n) => `${n} ${n === 1 ? 'item' : 'items'} back on the menu`,
  mUndo: 'Undo',
  mFailed: 'Could not save. Check the connection and try again.',
  mTodayHint: 'Soups and specials are handled in',
  mTodayLink: 'Today',
  mLoading: 'Loading the menu…',
  mLoadFailed: 'Could not load the menu.',
  mRetry: 'Retry',
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
  // color: el del ícono y la palabra (sin relleno).
  if (t === 'delivery') return { key: 'delivery' as const, color: C.blue };
  if (t === 'pickup') return { key: 'pickup' as const, color: C.violet };
  return { key: 'dine_in' as const, color: C.ink };
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
 * Pickup en Listo: el contador pasa a ámbar a los 30 min y a rojo a los 60, como
 * el envejecimiento de tickets de Toast/Square/Aloha. Desde el ámbar aparece
 * "No vino a buscarlo". (Delivery listo sigue en ámbar a los 10: espera repartidor.)
 */
export const PICKUP_WAIT_WARN_MINS = 30;
export const PICKUP_WAIT_LATE_MINS = 60;

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
