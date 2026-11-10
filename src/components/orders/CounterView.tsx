'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import {
  Menu, X, Bell, Check, CheckCircle, Clock, ChevronLeft,
  Truck, ShoppingBag, Utensils, MessageCircle, Phone,
  MapPin, Pause, Flame, Printer, History, AlertTriangle,
  Wifi, WifiOff, ChevronRight, User, Settings2, Calendar, Plus, Ban,
} from 'lucide-react';
import { useRealtimeOrders, type RealtimeConnectionStatus } from '@/hooks/use-realtime-orders';
import { useLeaderTab } from '@/hooks/use-leader-tab';
import {
  updateOrderStatus, updateOrderETA, setPauseOrders, assignDriver, updateOrderTip,
  sendOrderNotification, openShift, closeShift,
  fetchOrderStatusHistory,
} from '@/lib/actions/restaurant';
import { PrinterService } from '@/lib/printing/PrinterService';
import { getCounterAppBridge } from '@/lib/printing/native-bridge';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { PrinterConfig } from '@/lib/printing/PrinterConfig';
import type { PrinterConfigData } from '@/lib/printing/PrinterConfig';
import type { Order, OrderItem } from '@/types';
import { cn } from '@/lib/utils';
import { isRevenueStatus } from '@/lib/order-state';
import { counterText, nearestChoice, suggestedPrep, waitingSince, SCHEDULED_LEAD_MS } from './counter/ui';
import { CounterBoard, type PrimaryKind } from './counter/CounterBoard';
import { NewOrdersAlert } from './counter/NewOrdersAlert';
import { OrderSheet } from './counter/OrderSheet';
import {
  CounterTopBar, StoreStatusSheet, OrdersListView, CounterToast,
  type CounterViewMode, type StoreState,
} from './counter/CounterChrome';

// ─── i18n ─────────────────────────────────────────────────────────────────────

function getT(locale?: string) {
  const en = locale === 'en';
  return {
    en,
    // Tabs
    tabNew:      en ? 'New'              : 'Nuevas',
    tabPrep:     en ? 'Preparing'        : 'En preparación',
    tabReady:    en ? 'Ready'            : 'Listas',
    tabHistory:  en ? 'History'          : 'Historial',
    // Splash / new order
    newOrder:    en ? 'New order'        : 'Nueva orden',
    newScheduledOrder: en ? 'New scheduled order' : 'Nuevo pedido programado',
    tapAnywhere: en ? 'Tap to view · auto-accepting in' : 'Toca para ver · auto-aceptando en',
    autoAccepting: en ? 'Auto-accepting…' : 'Aceptando automáticamente…',
    viewOrder:   en ? 'View order'       : 'Ver orden',
    items:       (n: number) => en ? `${n} item${n !== 1 ? 's' : ''}` : `${n} ${n === 1 ? 'producto' : 'productos'}`,
    // Order types
    delivery:    en ? 'Delivery'         : 'Delivery',
    pickup:      en ? 'Pickup'           : 'Para recoger',
    dineIn:      en ? 'Dine-in'          : 'En mesa',
    // Action buttons
    confirmBtn:  (eta: number) => en ? `Confirm  ${eta} min` : `Confirmar  ${eta} min`,
    readyBtn:    (type?: string) => type === 'delivery'
      ? (en ? 'Ready to dispatch' : 'Listo para entregar')
      : type === 'dine_in'
        ? (en ? 'Ready to serve'  : 'Listo para servir')
        : (en ? 'Ready for pickup' : 'Listo para recoger'),
    deliveredBtn: en ? 'Delivered'       : 'Entregado',
    deliveredBtnFor: (type?: string) => type === 'pickup'
      ? (en ? 'Picked up' : 'Recogido')
      : type === 'dine_in'
        ? (en ? 'Served'   : 'Servido')
        : (en ? 'Delivered': 'Entregado'),
    almostReadyBtn: en ? 'Almost ready' : 'Casi listo',
    outForDeliveryBtn: en ? 'Out for delivery' : 'En camino al cliente',
    deliveryGuardTitle: en ? "Driver hasn't confirmed pickup yet" : 'El repartidor no ha confirmado que recogió',
    deliveryGuardBody:  en ? "The driver hasn't scanned the QR link yet. Mark as delivered anyway?" : 'El repartidor aún no confirmó que recogió el pedido. ¿Marcar como entregado de todas formas?',
    deliveryGuardConfirm: en ? 'Yes, mark delivered' : 'Sí, marcar entregado',
    // Order detail
    eta:         en ? 'Prep time'        : 'Tiempo estimado',
    adjustEta:   en ? 'Adjust'           : 'Ajustar',
    overdue:     en ? 'Overdue'          : '¡Atrasado!',
    timeLeft:    en ? 'remaining'        : 'restantes',
    preparing:   en ? 'Preparing…'       : 'En preparación…',
    total:       en ? 'Total'            : 'Total',
    payment:     en ? 'Payment'          : 'Pago',
    cash:        en ? 'Cash'             : 'Efectivo',
    online:      en ? 'Online'           : 'En línea',
    wallet:      en ? 'Wallet'           : 'Wallet',
    notes:       en ? 'Notes'            : 'Notas',
    viewOnMap:   en ? 'View on map →'   : 'Ver en mapa →',
    notifyCustomer: en ? 'Resend notification' : 'Reenviar notificación',
    callCustomer: en ? 'Call customer'   : 'Llamar al cliente',
    notifSentWa:  en ? 'Customer notified via WhatsApp' : 'Cliente notificado por WhatsApp',
    notifSentSms: en ? 'Customer notified via SMS' : 'Cliente notificado por SMS',
    notifSentEmail: en ? 'Customer notified via email' : 'Cliente notificado por email',
    notifFailed:  en ? 'Notification failed' : 'Notificación fallida',
    notifFallback: en ? 'Primary failed · email sent' : 'Fallo principal · email enviado',
    notifNoContact: en ? 'No contact info for customer' : 'Sin datos de contacto del cliente',
    moreActions:  en ? 'More' : 'Más',
    driver:      en ? 'Driver assigned'  : 'Repartidor asignado',
    assignDriver: en ? 'Assign driver'   : 'Asignar repartidor',
    editDriver:  en ? 'Edit'             : 'Editar',
    // Cancel
    cancelOrder: en ? 'Cancel order'     : 'Cancelar orden',
    rejectOrder: en ? 'Reject order'     : 'Rechazar orden',
    confirmCancel: en ? 'Confirm cancel' : 'Confirmar cancelación',
    no:          en ? 'No'               : 'No',
    reasons:     en
      ? ['Out of stock', 'Restaurant closed', 'Too busy', 'Address out of zone', 'Other']
      : ['Sin stock', 'Restaurante cerrado', 'Demasiada demanda', 'Dirección fuera de zona', 'Otro'],
    rejectReason: en ? 'Select a reason' : 'Elige el motivo',
    // Sidebar
    online_status: en ? 'Online'         : 'En línea',
    paused_status: en ? 'Paused'         : 'Pausado',
    busyMode:    en ? 'Busy mode'        : 'Modo ocupado',
    busyNormal:  en ? 'Normal'           : 'Normal',
    busyAdd10:   en ? '+10 min'          : '+10 min',
    busyAdd20:   en ? '+20 min'          : '+20 min',
    pauseOrders: en ? 'Pause orders'     : 'Pausar órdenes',
    resumeOrders: en ? 'Resume orders'   : 'Reanudar órdenes',
    pause30:     en ? '30 minutes'       : '30 minutos',
    pause60:     en ? '1 hour'           : '1 hora',
    pause120:    en ? '2 hours'          : '2 horas',
    pauseTomorrow: en ? 'Until tomorrow' : 'Hasta mañana',
    pauseFailed: en ? "Couldn't change the pause. Check the connection and try again." : 'No se pudo cambiar la pausa. Revisa la conexión e intenta de nuevo.',
    autoPrint:   en ? 'Auto-print'       : 'Auto-impresión',
    todaySummary: en ? "Today's summary" : 'Resumen de hoy',
    todayOrders: en ? 'orders'           : 'órdenes',
    // Status / empty states
    waitingOrders: en ? 'Waiting for orders…' : 'Esperando órdenes…',
    connectedRt:   en ? 'Connected in real time' : 'Conectado en tiempo real',
    noPrepping:    en ? 'Nothing preparing'  : 'Nada en preparación',
    noReady:       en ? 'No orders ready'    : 'Sin órdenes listas',
    noHistory:     en ? 'No history today'   : 'Sin historial hoy',
    selectOrder:   en ? 'Select an order'    : 'Selecciona una orden',
    urgent:        en ? 'Urgent!'            : '¡Urgente!',
    // Offline banner
    offlineBanner: en
      ? 'No connection — new orders will not arrive until internet is restored'
      : 'Sin conexión — los nuevos pedidos no llegarán hasta recuperar internet',
    // History
    delivered:   en ? 'Delivered'       : 'Entregada',
    cancelled:   en ? 'Cancelled'       : 'Cancelada',
    duration:    (m: number) => en ? `${m} min` : `${m} min`,
    // Time
    justNow:     en ? 'now'             : 'ahora',
    minsAgo:     (m: number) => en ? `${m}m` : `${m}m`,
    search:      en ? 'Search order or customer…' : 'Buscar orden o cliente…',
    filterAll:   en ? 'All'        : 'Todos',
    filterDelivered: en ? 'Delivered' : 'Entregados',
    filterCancelled: en ? 'Cancelled' : 'Cancelados',
    filterDelivery:  en ? 'Delivery'  : 'Delivery',
    filterPickup:    en ? 'Pickup'    : 'Recoger',
    filterDineIn:    en ? 'Dine-in'   : 'Mesa',
    results:     (n: number) => en ? `${n} order${n !== 1 ? 's' : ''}` : `${n} ${n === 1 ? 'orden' : 'órdenes'}`,
    // Shift
    shiftTitle:      en ? 'Cash Register'       : 'Caja / Turno',
    shiftOpen:       en ? 'Open shift'           : 'Abrir turno',
    shiftClose:      en ? 'Close shift'          : 'Cerrar turno',
    shiftOpened:     en ? 'Shift open'           : 'Turno abierto',
    shiftOpeningCash: en ? 'Opening cash'        : 'Efectivo inicial',
    shiftClosingCash: en ? 'Closing cash counted' : 'Efectivo contado al cierre',
    shiftNotes:      en ? 'Notes (optional)'     : 'Notas (opcional)',
    shiftReportZ:    en ? 'Z Report'             : 'Reporte Z',
    shiftPrint:      en ? 'Print report'         : 'Imprimir reporte',
    shiftDuration:   (h: number, m: number) => en ? `${h}h ${m}m` : `${h}h ${m}m`,
    shiftRevenue:    en ? 'Total revenue'        : 'Total ventas',
    shiftCash:       en ? 'Cash sales'           : 'Ventas efectivo',
    shiftCard:       en ? 'Card / Online'        : 'Tarjeta / Online',
    shiftOrders:     en ? 'Completed orders'     : 'Órdenes completadas',
    shiftExpected:   en ? 'Expected cash'        : 'Efectivo esperado',
    shiftDiff:       en ? 'Difference'           : 'Diferencia',
    shiftNoActive:   en ? 'No shift open'        : 'Sin turno activo',
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#06C167';
const SLA_WARN_MINS = 5;
type Tab = 'new' | 'prep' | 'ready' | 'scheduled' | 'history';
type Locale = 'es' | 'en';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency, minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function elapsedMins(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function elapsedSecs(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1_000);
}

function fmtCountdown(secs: number) {
  const abs = Math.abs(secs);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(createdAt: string, t: ReturnType<typeof getT>) {
  const m = elapsedMins(createdAt);
  if (m < 1) return t.justNow;
  if (m < 60) return t.minsAgo(m);
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ─── Audio ────────────────────────────────────────────────────────────────────
//
// Strategy: decode the MP3s into AudioBuffers via the Web Audio API during the
// unlock tap (user gesture). Once an AudioContext is resumed by a gesture it
// stays running, so BufferSource nodes created from setInterval will play
// without any block — even on iOS Safari.

let _audioCtx: AudioContext | null = null;
let _newOrderBuffer: AudioBuffer | null = null;
let _acceptedBuffer: AudioBuffer | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      _audioCtx = new Ctx();
    } catch { return null; }
  }
  return _audioCtx;
}

function playBuffer(buffer: AudioBuffer | null) {
  const ctx = getAudioCtx();
  if (!ctx || !buffer) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* unavailable */ }
}

function synthChime() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.6, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t); osc.stop(t + 0.55);
    });
  } catch { /* unavailable */ }
}

async function loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
  const ctx = getAudioCtx();
  if (!ctx) return null;
  try {
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuf);
  } catch { return null; }
}

function playNewOrderSound() {
  if (_newOrderBuffer) {
    playBuffer(_newOrderBuffer);
  } else {
    synthChime();
  }
}

function playAcceptSound() {
  if (_acceptedBuffer) {
    playBuffer(_acceptedBuffer);
  } else {
    synthChime();
  }
}

function playUrgentSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    [880, 880, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'square';
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch { /* unavailable */ }
}

function sendPushNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: '/favicon.ico', tag: 'menius-order' }); } catch { /* failed */ }
}

// ─── Type icons ──────────────────────────────────────────────────────────────

const TYPE_ICON = {
  delivery: Truck,
  pickup: ShoppingBag,
  dine_in: Utensils,
} as const;

function getTypeLabel(orderType: string | undefined, t: ReturnType<typeof getT>) {
  if (orderType === 'delivery') return t.delivery;
  if (orderType === 'pickup') return t.pickup;
  return t.dineIn;
}

// ══════════════════════════════════════════════════════════════════════════════
// Props
// ══════════════════════════════════════════════════════════════════════════════

interface CounterViewProps {
  initialOrders: Order[];
  restaurantId: string;
  restaurantName: string;
  currency: string;
  locale?: Locale;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  taxLabel?: string;
  taxIncluded?: boolean;
  tabletMode?: boolean;
  /** Tablet vinculada con código: solo Counter, sin reembolsos ni enlaces al panel. */
  isDevice?: boolean;
  /** restaurants.orders_paused_until al cargar — la pausa vive en la DB, no en el aparato. */
  initialPausedUntil?: string | null;
  /** Solo para la vista previa de desarrollo: pedidos que arrancan en la alerta. */
  previewAlertIds?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CounterView — main component
// ══════════════════════════════════════════════════════════════════════════════

export function CounterView({
  initialOrders, restaurantId, restaurantName, currency, locale = 'es',
  restaurantLat, restaurantLng, taxLabel, taxIncluded, tabletMode = false, isDevice = false,
  initialPausedUntil = null, previewAlertIds,
}: CounterViewProps) {
  const t = getT(locale);

  // ── Audio unlock gate ──
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  // Running inside the MENIUS Counter Android app (>= 1.0.2). Set after mount so
  // server and first client render match.
  const [inApp, setInApp] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const unlockAudio = useCallback((silent = false) => {
    // Resume (or create) the AudioContext during the user-gesture tap.
    // On iOS Safari this is the ONLY moment the context can be started.
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Play a silent buffer immediately to fully unlock the context
    if (ctx) {
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch { /* ignore */ }
    }

    // Decode both MP3s into AudioBuffers in the background.
    // Once decoded, playBuffer() works from any timer / interval.
    loadAudioBuffer('/sounds/new-order.mp3').then(b => {
      if (b) { _newOrderBuffer = b; if (!silent) playBuffer(b); } // first chime confirms a manual unlock
    });
    loadAudioBuffer('/sounds/order-accepted.mp3').then(b => {
      if (b) _acceptedBuffer = b;
    });

    setAudioUnlocked(true);
  }, []);

  // Inside the app there is no gate to tap: unlock silently on mount (a chime every
  // time the app opens would just be noise).
  useEffect(() => {
    if (!getCounterAppBridge()) return;
    setInApp(true);
    unlockAudio(true);
  }, [unlockAudio]);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // On mobile/portrait: when an order is selected we show detail fullscreen
  const [showDetailMobile, setShowDetailMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Order actions state ──
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Synchronous in-flight guard for accept — survives the stale-closure window
  // that React state can't (auto-accept + manual tap firing in the same tick).
  const acceptingRef = useRef<Set<string>>(new Set());
  const [eta, setEta] = useState(15);
  const [busyExtra, setBusyExtra] = useState(0);

  // ── Pause state ──
  const [pausedUntil, setPausedUntil] = useState<number | null>(() => {
    const ms = initialPausedUntil ? new Date(initialPausedUntil).getTime() : NaN;
    return Number.isFinite(ms) && ms > Date.now() ? ms : null;
  });
  const [pauseModalOpen, setPauseModalOpen] = useState(false);

  // ── Auto-print on accept ──
  const [autoPrint, setAutoPrint] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('counter-auto-print') === 'true'
  );
  // ── Print on arrival (before accepting) ──
  const [printOnArrival, setPrintOnArrival] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('counter-print-on-arrival') === 'true'
  );
  const printOnArrivalRef = useRef(printOnArrival);
  printOnArrivalRef.current = printOnArrival;

  // One tab per restaurant owns sound/push/print side effects (see handleNewOrder)
  const isLeader = useLeaderTab(`menius-counter-leader:${restaurantId}`);
  const isLeaderRef = useRef(isLeader);
  const printedOnArrivalRef = useRef<Set<string>>(new Set());
  isLeaderRef.current = isLeader;

  // ── Cancel/reject ──
  const [cancelModal, setCancelModal] = useState<{ orderId: string; type: 'reject' | 'cancel' } | null>(null);
  // Set when the server rejects a plain cancel because the order is paid —
  // the modal then offers "refund & cancel" via /api/payments/refund.
  const [refundRequired, setRefundRequired] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // ── Driver modal ──
  const [driverModal, setDriverModal] = useState<{ orderId: string; address?: string; trackingToken?: string } | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  // FK to drivers table — set only when picking from the pool, cleared on manual
  // name edits. Links orders.driver_id so the driver batch API sees the order.
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [driverPool, setDriverPool] = useState<{ id: string; name: string; phone: string }[]>([]);

  // ── Printer modal ──
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfigData>(() =>
    typeof window !== 'undefined' ? PrinterConfig.config : { receiptEnabled: true, kitchenEnabled: false }
  );

  // ── 86 / Stock panel ──
  const [stockProducts, setStockProducts] = useState<{ id: string; name: string; in_stock: boolean }[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockUpdating, setStockUpdating] = useState<string | null>(null);

  const [deliveryGuardModal, setDeliveryGuardModal] = useState<{ order: Order } | null>(null);

  // ── Shift management ──
  interface ActiveShift { id: string; opening_cash: number; opened_at: string }
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`counter-shift-${restaurantId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [shiftModal, setShiftModal] = useState<'open' | 'close' | 'report' | null>(null);
  const [shiftOpenCash, setShiftOpenCash] = useState('0');
  const [shiftCloseCash, setShiftCloseCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftSaving, setShiftSaving] = useState(false);
  interface ShiftReport {
    totalOrders: number; totalRevenue: number; totalCash: number;
    totalCard: number; expectedCash: number; cashDifference: number;
    openingCash: number; closingCash: number;
    openedAt: string; closedAt: string;
  }
  const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null);

  // ── Toasts ──
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [notifToast, setNotifToast] = useState<{ text: string; ok: boolean } | null>(null);

  // Edit order items
  const [editItemsModal, setEditItemsModal] = useState<{ orderId: string } | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null);
  const [editSearch, setEditSearch] = useState('');
  const [editProducts, setEditProducts] = useState<{ id: string; name: string; price: number; image_url?: string; in_stock: boolean }[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── Notification history (per order, in-memory) ──
  const [notifStatus, setNotifStatus] = useState<Record<string, { channel: string; success: boolean; error?: string; time: number }>>({});

  // ── Splash queue ──
  const [splashQueue, setSplashQueue] = useState<Order[]>(() =>
    previewAlertIds ? initialOrders.filter(o => previewAlertIds.includes(o.id)) : []);

  // ── Rediseño 2026-11: tablero, hoja de detalle, estado de la tienda ──
  const T = counterText(locale === 'en' ? 'en' : 'es');
  const [view, setView] = useState<CounterViewMode>('board');
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  // La alerta suena hasta que alguien toca la pantalla (no hasta aceptar).
  const [alertAck, setAlertAck] = useState(false);
  // Último tiempo elegido: es el default del próximo pedido.
  const [lastPrep, setLastPrep] = useState(15);
  useEffect(() => {
    try { const v = Number(localStorage.getItem('counter-last-prep')); if (v > 0) setLastPrep(v); } catch { /* sin storage */ }
  }, []);
  // Auto-aceptar: APAGADO por defecto; se activa por tablet en el menú.
  const [autoAcceptOn, setAutoAcceptOn] = useState(false);
  useEffect(() => {
    try { setAutoAcceptOn(localStorage.getItem('counter-auto-accept') === 'true'); } catch { /* sin storage */ }
  }, []);
  // Cambios de estado con 5 s para deshacer: se ven al instante (override local)
  // y se envían al servidor al vencer el plazo. El override evita que el poll
  // de 10 s devuelva la tarjeta a su columna anterior mientras tanto.
  const [pendingStatus, setPendingStatus] = useState<Record<string, Order['status']>>({});
  const pendingTimers = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>>(new Map());
  const [toastAction, setToastAction] = useState<{ label: string; run: () => void } | null>(null);

  // ── Connection / misc ──
  const [isOnline, setIsOnline] = useState(true);
  const [, tick] = useState(0);
  const urgentRef = useRef<Set<string>>(new Set());
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState<'all' | 'delivery' | 'pickup' | 'dine_in'>('all');
  const [historyStatus, setHistoryStatus] = useState<'all' | 'delivered' | 'cancelled'>('all');

  // ── History search ──

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showError = (msg: string) => {
    setSuccessToast(null); setToastAction(null);
    setErrorToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setErrorToast(null), 4500);
  };
  const showSuccess = (msg: string, action?: { label: string; run: () => void }) => {
    setErrorToast(null);
    setSuccessToast(msg);
    setToastAction(action ?? null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setSuccessToast(null); setToastAction(null); }, action ? 4500 : 3000);
  };
  // Los avisos al cliente son automáticos y silenciosos (como en Uber). Antes
  // cada "Casi listo"/"Servir" mostraba "Notificación fallida" aunque nada
  // fallara (channel 'none') y cada pedido sin email, "Sin datos de contacto".
  // Ahora solo se avisa si un email REALMENTE no salió.
  const showNotif = useCallback((result: { channel: string; success: boolean; error?: string }, orderId?: string) => {
    if (result.channel === 'email' && !result.success) showError(T.noticeFailed);
    if (orderId) {
      setNotifStatus(prev => ({ ...prev, [orderId]: { ...result, time: Date.now() } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T.noticeFailed]);

  // ── Effects ──

  // Tick every second for live countdown timers
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  // Connection status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Mark counter as visited for onboarding checklist
  useEffect(() => {
    localStorage.setItem('menius-counter-visited', 'true');
  }, []);

  // Wake Lock — keep tablet screen on
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    interface WakeLockSentinel { release(): Promise<void>; }
    interface NavigatorWithWakeLock {
      wakeLock: { request(type: 'screen'): Promise<WakeLockSentinel> };
    }
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = await (navigator as unknown as NavigatorWithWakeLock).wakeLock.request('screen');
      } catch { /* denied */ }
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  // Push permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);


  // Load driver pool
  useEffect(() => {
    fetch('/api/tenant/drivers')
      .then(r => r.json())
      .then(d => { if (d.drivers) setDriverPool(d.drivers.filter((dr: { is_active: boolean }) => dr.is_active)); })
      .catch(() => {});
  }, []);

  // ── New order handler ──
  // Sound/push/print are gated to the LEADER tab only: every open Counter tab
  // receives the realtime INSERT, so two tabs meant two printed tickets and a
  // double chime per order. The splash stays per-tab (it's visual context).
  const handleNewOrder = useCallback((order: Order) => {
    // Programado para más adelante: se avisa, pero NO entra al splash (que lo
    // auto-aceptaba a los 30 s → "preparando", email e impresión para un
    // pedido de mañana) ni se imprime. Queda en la pestaña Programados.
    const scheduledMs = order.scheduled_for ? new Date(order.scheduled_for).getTime() : NaN;
    const isFutureScheduled = Number.isFinite(scheduledMs) && scheduledMs > Date.now() + SCHEDULED_SPLASH_LEAD_MS;
    if (isLeaderRef.current) {
      playNewOrderSound();
      try { getCounterAppBridge()?.vibrateNewOrder?.(); } catch { /* not in the app */ }
      sendPushNotification(
        `🔔 ${isFutureScheduled ? t.newScheduledOrder : t.newOrder} · ${restaurantName}`,
        `${order.customer_name || 'Cliente'} · #${order.order_number} · ${fmt(order.total, currency)}`
      );
      // Print immediately on arrival if enabled
      if (printOnArrivalRef.current && !isFutureScheduled) {
        // Se marca solo si salió: si la impresora falló al llegar, aceptar reimprime.
        PrinterService.printOrder(order, undefined, restaurantName, currency, locale, taxLabel, taxIncluded)
          .then(() => { printedOnArrivalRef.current.add(order.id); })
          .catch(() => {});
      }
    }
    if (isFutureScheduled) {
      const when = new Date(scheduledMs).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      showSuccess(`${t.newScheduledOrder} #${order.order_number} · ${when}`);
      return;
    }
    promotedRef.current?.add(order.id);
    setSplashQueue(q => (q.some(x => x.id === order.id) ? q : [...q, order]));
    setAlertAck(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantName, currency, locale, taxLabel, taxIncluded, t.newOrder, t.newScheduledOrder]);

  const { orders, updateOrderLocally, rtStatus, lastSyncAt, refetch } = useRealtimeOrders({ restaurantId, initialOrders, onNewOrder: handleNewOrder });

  // Pedidos con los cambios "en espera de deshacer" aplicados.
  const ordersView = useMemo(
    () => (Object.keys(pendingStatus).length === 0
      ? orders
      : orders.map(o => (pendingStatus[o.id] ? { ...o, status: pendingStatus[o.id] } : o))),
    [orders, pendingStatus],
  );

  // Pickup: el cliente tocó "Ya llegué" en su seguimiento → suena y avisa.
  // La primera pasada solo registra (al abrir la tablet no suenan los viejos).
  const arrivedSeenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const arrived = orders.filter(o => o.order_type === 'pickup' && o.customer_arrived_at && !['delivered', 'completed', 'cancelled'].includes(o.status));
    if (!arrivedSeenRef.current) { arrivedSeenRef.current = new Set(arrived.map(o => o.id)); return; }
    for (const o of arrived) {
      if (arrivedSeenRef.current.has(o.id)) continue;
      arrivedSeenRef.current.add(o.id);
      if (isLeaderRef.current) playNewOrderSound();
      showSuccess(T.customerArrivedToast(o.customer_name?.split(' ')[0] || T.customer, o.order_number?.split('-').pop() ?? ''));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // El cliente puede corregir las instrucciones de entrega desde su seguimiento
  // (apto, timbre…) hasta que el repartidor sale. Si cambian con el ticket ya
  // impreso, la tablet suena y avisa para que nadie trabaje con la nota vieja.
  const notesSeenRef = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    const active = orders.filter(o => o.order_type === 'delivery' && !['delivered', 'completed', 'cancelled'].includes(o.status));
    if (!notesSeenRef.current) { notesSeenRef.current = new Map(active.map(o => [o.id, o.notes ?? ''])); return; }
    for (const o of active) {
      const now = o.notes ?? '';
      const before = notesSeenRef.current.get(o.id);
      notesSeenRef.current.set(o.id, now);
      if (before === undefined || before === now) continue;
      if (isLeaderRef.current) playNewOrderSound();
      showSuccess(T.notesChangedToast(o.order_number?.split('-').pop() ?? ''));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // ── Derived lists ──
  // Reloj de 30 s: un programado pasa de "Programados" a "Nuevos" (con la
  // alerta verde) SCHEDULED_SPLASH_LEAD_MS antes de su hora, sin esperar al
  // cron activate-scheduled (que corre cada 10 min y llegaba tarde).
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const isDue = useCallback((o: Order) =>
    !o.scheduled_for || new Date(o.scheduled_for).getTime() <= clock + SCHEDULED_SPLASH_LEAD_MS,
  [clock]);
  const waitingSinceIso = (o: Order) => new Date(waitingSince(o as Order & { updated_at?: string | null })).toISOString();

  const scheduledOrders = useMemo(() =>
    ordersView.filter(o => o.status === 'pending' && o.scheduled_for && !isDue(o))
      .sort((a, b) => new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime()),
    [ordersView, isDue]);

  const newOrders = useMemo(() =>
    ordersView.filter(o => o.status === 'pending' && isDue(o))
      .sort((a, b) => waitingSince(a as Order & { updated_at?: string | null }) - waitingSince(b as Order & { updated_at?: string | null })),
    [ordersView, isDue]);

  // Programado que entra en su ventana: misma alerta que un pedido recién llegado.
  // Los que ya estaban en ventana al abrir el Counter (o llegaron así por
  // handleNewOrder) se marcan sin alertar.
  const promotedRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const due = ordersView.filter(o => o.status === 'pending' && o.scheduled_for && isDue(o));
    if (promotedRef.current === null) { promotedRef.current = new Set(due.map(o => o.id)); return; }
    const fresh = due.filter(o => !promotedRef.current!.has(o.id));
    if (fresh.length === 0) return;
    fresh.forEach(o => promotedRef.current!.add(o.id));
    if (isLeaderRef.current) playNewOrderSound();
    setSplashQueue(q => [...q, ...fresh.filter(o => !q.some(x => x.id === o.id))]);
    setAlertAck(false);
  }, [ordersView, isDue]);

  const overdueCount = useMemo(() =>
    newOrders.filter(o => elapsedMins(waitingSinceIso(o)) >= SLA_WARN_MINS).length,
    [newOrders]);

  const prepOrders = useMemo(() =>
    ordersView.filter(o => ['confirmed', 'preparing', 'almost_ready'].includes(o.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [ordersView]);

  const readyOrders = useMemo(() =>
    ordersView.filter(o => ['ready', 'out_for_delivery', 'served'].includes(o.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [ordersView]);

  const historyOrders = useMemo(() => {
    let r = ordersView.filter(o => ['delivered', 'completed', 'cancelled'].includes(o.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (historyStatus !== 'all') r = r.filter(o => o.status === historyStatus);
    if (historyType !== 'all') r = r.filter(o => o.order_type === historyType);
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      r = r.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        (o.customer_name ?? '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [ordersView, historySearch, historyType, historyStatus]);

  const currentList = useMemo(() => {
    if (activeTab === 'new') return newOrders;
    if (activeTab === 'prep') return prepOrders;
    if (activeTab === 'ready') return readyOrders;
    if (activeTab === 'scheduled') return scheduledOrders;
    return historyOrders;
  }, [activeTab, newOrders, prepOrders, readyOrders, scheduledOrders, historyOrders]);

  // Auto-select first order when tab changes or list changes
  useEffect(() => {
    if (!currentList.find(o => o.id === selectedId)) {
      const first = currentList[0]?.id ?? null;
      setSelectedId(first);
      if (!first) setShowDetailMobile(false);
    }
  }, [currentList, selectedId]);

  // SLA urgent beep (after 5 min without response)
  useEffect(() => {
    newOrders.forEach(o => {
      if (elapsedMins(waitingSinceIso(o)) >= SLA_WARN_MINS && !urgentRef.current.has(o.id)) {
        urgentRef.current.add(o.id);
        playUrgentSound();
        sendPushNotification(
          `⚠️ ${t.urgent} · ${restaurantName}`,
          `#${o.order_number} — ${SLA_WARN_MINS} min without response`
        );
      }
    });
  });

  // ── Derived ──
  const selectedOrder = orders.find(o => o.id === selectedId) ?? null;

  // Load products for 86 / stock panel when sidebar opens
  useEffect(() => {
    if (!sidebarOpen) return;
    setStockLoading(true);
    fetch('/api/products/stock')
      .then(r => r.json())
      .then(data => setStockProducts(data.products ?? []))
      .catch(() => {})
      .finally(() => setStockLoading(false));
  }, [sidebarOpen]);

  const isPaused = !!pausedUntil && Date.now() < pausedUntil;
  const pauseLeftMins = pausedUntil ? Math.max(0, Math.ceil((pausedUntil - Date.now()) / 60_000)) : 0;
  const effectiveEta = eta + busyExtra;
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  // Misma regla que el dashboard (REVENUE_STATUSES): solo pedidos cerrados son venta.
  const todayRevenue = todayOrders.filter(o => isRevenueStatus(o.status)).reduce((s, o) => s + Number(o.total), 0);

  // ── Actions ──
  const handleAccept = useCallback(async (order: Order, mins?: number) => {
    // Guard against double-fire: auto-accept (countdown) and a manual tap can
    // both target the same order in the same tick. The ref is synchronous, so the
    // second caller sees it immediately — prevents duplicate status updates and
    // printer tickets. (React state would still be stale within the same tick.)
    if (acceptingRef.current.has(order.id) || order.status !== 'pending') return;
    acceptingRef.current.add(order.id);
    setUpdatingId(order.id);
    // `mins` es el total elegido (con el extra de "Ocupado" ya incluido por
    // defaultMinsFor, o el que tocó el cajero): lo que dice el botón es
    // exactamente lo que se guarda y se le avisa al cliente.
    const eff = mins ?? eta + busyExtra;
    // La preferencia de cocina solo se aprende en modo normal: con "Ocupado"
    // no se puede separar cuánto del número elegido era el extra.
    const learn = busyExtra === 0;
    setSplashQueue(q => q.filter(x => x.id !== order.id));
    // Optimistic update — move order to 'preparing' immediately in the UI
    // (con ETA y hora de aceptación, para que "listo en N min" salga bien ya).
    updateOrderLocally(order.id, { status: 'preparing', estimated_ready_minutes: eff, prepared_at: new Date().toISOString() } as Partial<Order>);
    try {
      // Una sola escritura: estado + tiempo (antes eran 2 acciones en serie y el
      // evento realtime de la primera devolvía la tarjeta a Nuevos un instante).
      const res = await updateOrderStatus(order.id, 'preparing', undefined, { etaMinutes: eff });
      if (res?.error) {
        updateOrderLocally(order.id, { status: order.status }); // revert
        showError(res.error);
        return;
      }
      playAcceptSound();
      // Si ya salió el ticket al llegar ("imprimir al llegar"), no se imprime otro al aceptar.
      const shouldPrint = (autoPrint || order.order_type === 'dine_in') && !printedOnArrivalRef.current.has(order.id);
      if (shouldPrint) PrinterService.printOrder(order, eff, restaurantName, currency, locale, taxLabel, taxIncluded).catch(() => {});
      // Se queda donde estaba: la tarjeta pasa sola a "Preparando".
      setSheetId(prev => (prev === order.id ? null : prev));
      if (learn) {
        setLastPrep(eff);
        try { localStorage.setItem('counter-last-prep', String(eff)); } catch { /* sin storage */ }
      }
      showSuccess(T.accepted(order.order_number?.split('-').pop() ?? '', eff));
      if (res.notification) showNotif(res.notification, order.id);
    } catch {
      updateOrderLocally(order.id, { status: order.status }); // revert
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally {
      setUpdatingId(null);
      acceptingRef.current.delete(order.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eta, busyExtra, restaurantName, currency, autoPrint, t, updateOrderLocally, locale, taxLabel, taxIncluded, showNotif]);


  // ── Rediseño: acción principal de cada tarjeta ──────────────────────────
  const statusFor = (o: Order, kind: PrimaryKind): Order['status'] =>
    kind === 'ready' ? 'ready'
      : kind === 'dispatch' ? 'out_for_delivery'
      : kind === 'serve' ? 'served'
      : kind === 'complete' ? 'completed'
      : (o.order_type === 'dine_in' ? 'completed' : 'delivered');

  const commitStatus = useCallback((order: Order, kind: PrimaryKind, bypassGuard = false) => {
    // Repartidor asignado que todavía no retiró: se mantiene el aviso de siempre.
    if (!bypassGuard && kind === 'deliver' && order.order_type === 'delivery' && order.driver_name && !order.driver_picked_up_at) {
      setDeliveryGuardModal({ order });
      return;
    }
    const next = statusFor(order, kind);
    const previous = pendingTimers.current.get(order.id);
    if (previous) { clearTimeout(previous.timer); previous.run(); }
    setPendingStatus(p => ({ ...p, [order.id]: next }));
    setSheetId(cur => (cur === order.id ? null : cur));

    const run = async () => {
      pendingTimers.current.delete(order.id);
      setUpdatingId(order.id);
      try {
        const res = await updateOrderStatus(order.id, next);
        if (res?.error) { showError(res.error); return; }
        updateOrderLocally(order.id, { status: next });
        if (res.notification) showNotif(res.notification, order.id);
      } catch {
        showError(t.en ? 'Unexpected error' : 'Error inesperado');
      } finally {
        // Si mientras tanto se tocó otro cambio sobre el mismo pedido, su marca
        // local sigue vigente: borrarla hacía que la tarjeta saltara hacia atrás.
        if (!pendingTimers.current.has(order.id)) {
          setPendingStatus(p => { const c = { ...p }; delete c[order.id]; return c; });
        }
        setUpdatingId(null);
      }
    };
    const timer = setTimeout(run, 5000);
    pendingTimers.current.set(order.id, { timer, run });

    const num = order.order_number?.split('-').pop() ?? '';
    const msg = kind === 'ready' ? T.markedReady(num) : kind === 'serve' ? T.markedServed(num) : kind === 'dispatch' ? T.markedDispatched(num) : T.markedDelivered(num);
    showSuccess(msg, {
      label: T.undo,
      run: () => {
        const pend = pendingTimers.current.get(order.id);
        if (pend) { clearTimeout(pend.timer); pendingTimers.current.delete(order.id); }
        setPendingStatus(p => { const c = { ...p }; delete c[order.id]; return c; });
        setSuccessToast(null); setToastAction(null);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T, t, updateOrderLocally, showNotif]);

  // Si la página se cierra con un cambio en espera, se envía igual.
  useEffect(() => {
    const flush = () => { pendingTimers.current.forEach(p => { clearTimeout(p.timer); p.run(); }); };
    // En el WebView de Android, mandar la app al fondo o apagar la pantalla NO
    // dispara pagehide: visibilitychange sí. Mientras la página sigue viva el
    // envío se completa; si después la matan, el cambio ya salió.
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, []);

  // Los botones de tiempo son el TOTAL que se le promete al cliente. Con
  // "Ocupado" activo, el extra se suma y se redondea a una opción de la lista
  // (así el botón por defecto siempre está marcado en la hoja y en la alerta).
  const defaultMinsFor = useCallback((o: Order) => nearestChoice((suggestedPrep(o) ?? lastPrep) + busyExtra), [lastPrep, busyExtra]);

  const onPrimary = useCallback((o: Order, kind: PrimaryKind) => {
    if (kind === 'accept') handleAccept(o, defaultMinsFor(o));
    else commitStatus(o, kind);
  }, [handleAccept, commitStatus, defaultMinsFor]);

  const resendNotice = useCallback(async (o: Order) => {
    // almost_ready reenvía "en preparación"; served/cerrados no ofrecen reenvío.
    const ev = o.status === 'almost_ready' ? 'preparing' : o.status;
    const res = await sendOrderNotification(o.id, ev).catch(() => null);
    const n = res && 'notification' in res ? res.notification : null;
    if (n?.channel === 'email' && n.success) showSuccess(T.noticeSent);
    else if (n && n.channel === 'none') showError(T.noEmail);
    else showError(T.noticeFailed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T]);

  // ── Edit order items ──────────────────────────────────────────────────────
  const openEditItems = useCallback(async (orderId: string) => {
    setEditItemsModal({ orderId });
    setEditSearch('');
    setEditLoading(true);
    try {
      const res = await fetch('/api/products/stock');
      const data = await res.json();
      setEditProducts(data.products ?? []);
    } catch { /* ignore */ }
    setEditLoading(false);
  }, []);

  const handleAddItem = useCallback(async (orderId: string, productId: string) => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/tenant/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, qty: 1 }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorToast(data.error ?? 'Error'); return; }
      // Update local orders state
      const existingOrder = orders.find(o => o.id === orderId);
      if (existingOrder) {
        const newItem = { ...data.item, product: data.item.product };
        updateOrderLocally(orderId, { items: [...(existingOrder.items ?? []), newItem as any], total: data.newTotal });
      }
      setSuccessToast(t.en ? 'Item added' : 'Producto agregado');
    } catch { setErrorToast(t.en ? 'Error adding item' : 'Error al agregar'); }
    setEditSaving(false);
  }, [t.en, orders, updateOrderLocally]);

  const handleRemoveItem = useCallback(async (orderId: string, itemId: string) => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/tenant/orders/${orderId}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorToast(data.error ?? 'Error'); return; }
      const existingOrder = orders.find(o => o.id === orderId);
      if (existingOrder) {
        updateOrderLocally(orderId, { items: (existingOrder.items ?? []).filter(i => i.id !== itemId), total: data.newTotal });
      }
    } catch { setErrorToast(t.en ? 'Error removing item' : 'Error al eliminar'); }
    setEditSaving(false);
  }, [t.en, orders, updateOrderLocally]);

  const handleAdjustEta = useCallback(async (order: Order, newEta: number) => {
    setUpdatingId(order.id);
    try {
      const res = await updateOrderETA(order.id, newEta);
      if (res?.error) { showError(res.error); return; }
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [t]);

  const handleCancel = useCallback(async () => {
    if (!cancelModal) return;
    setUpdatingId(cancelModal.orderId);
    try {
      const res = await updateOrderStatus(cancelModal.orderId, 'cancelled', cancelReason || undefined);
      if (res?.error === 'PAID_ORDER_NEEDS_REFUND') {
        // Server refuses to cancel a paid order without refunding — switch the
        // modal to the refund-and-cancel flow instead of a dead-end error.
        setRefundRequired(true);
        return;
      }
      if (res?.error) { showError(res.error); return; }
      setCancelModal(null);
      setCancelReason('');
      if (res.notification) showNotif(res.notification, cancelModal.orderId);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [cancelModal, cancelReason, t, showNotif]);

  const handleRefundAndCancel = useCallback(async () => {
    if (!cancelModal) return;
    setUpdatingId(cancelModal.orderId);
    try {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: cancelModal.orderId, reason: 'requested_by_customer', cancellation_reason: cancelReason || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showError(data.error ?? (t.en ? 'Refund failed' : 'El reembolso falló')); return; }
      setCancelModal(null);
      setCancelReason('');
      setRefundRequired(false);
      showSuccess(t.en ? 'Order refunded and cancelled' : 'Orden reembolsada y cancelada');
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [cancelModal, cancelReason, t]);

  const handleAssignDriver = useCallback(async () => {
    if (!driverModal) return;
    setAssigningDriver(true);
    try {
      const res = await assignDriver(driverModal.orderId, driverName, driverPhone, selectedDriverId);
      if (res?.error) { showError(res.error); return; }
      // Update modal with new tracking token returned by server so print sheet works
      const newToken = (res as any)?.trackingToken ?? driverModal.trackingToken;
      setDriverModal(prev => prev ? { ...prev, trackingToken: newToken } : null);
      setDriverName(''); setDriverPhone(''); setSelectedDriverId(null);
      showSuccess(t.en ? 'Driver assigned' : 'Repartidor asignado');
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setAssigningDriver(false); }
  }, [driverModal, driverName, driverPhone, selectedDriverId, t]);

  const doPause = useCallback(async (mins: number) => {
    let ms = mins * 60_000;
    if (mins === 9999) {
      const n = new Date();
      ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime();
    }
    const until = Date.now() + ms;
    const prev = pausedUntil;
    setPausedUntil(until);
    setPauseModalOpen(false);
    // Si no se guarda, la tienda sigue recibiendo pedidos: no mostrar "Pausado".
    const res = await setPauseOrders(new Date(until).toISOString()).catch(() => ({ error: 'network' }));
    if (res?.error) { setPausedUntil(prev); showError(t.pauseFailed); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausedUntil, t]);

  const doUnpause = useCallback(async () => {
    const prev = pausedUntil;
    setPausedUntil(null);
    const res = await setPauseOrders(null).catch(() => ({ error: 'network' }));
    if (res?.error) { setPausedUntil(prev); showError(t.pauseFailed); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausedUntil, t]);

  const toggleStock = useCallback(async (productId: string, currentInStock: boolean) => {
    setStockUpdating(productId);
    try {
      const res = await fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, in_stock: !currentInStock }),
      });
      if (res.ok) {
        setStockProducts(prev => prev.map(p => p.id === productId ? { ...p, in_stock: !currentInStock } : p));
      }
    } catch { /* ignore */ }
    finally { setStockUpdating(null); }
  }, []);

  // ── Shift handlers ──
  const handleOpenShift = useCallback(async () => {
    setShiftSaving(true);
    try {
      const result = await openShift(parseFloat(shiftOpenCash) || 0);
      if (result.error) { showError(result.error); return; }
      const shift = result.shift as ActiveShift;
      setActiveShift(shift);
      localStorage.setItem(`counter-shift-${restaurantId}`, JSON.stringify(shift));
      setShiftModal(null);
      showSuccess(t.en ? 'Shift opened' : 'Turno abierto');
    } catch { showError(t.en ? 'Error opening shift' : 'Error al abrir turno'); }
    finally { setShiftSaving(false); }
  }, [shiftOpenCash, restaurantId, t]);

  const handleCloseShift = useCallback(async () => {
    setShiftSaving(true);
    try {
      const result = await closeShift(parseFloat(shiftCloseCash) || 0, shiftNotes || undefined);
      if (result.error) { showError(result.error); return; }
      setActiveShift(null);
      localStorage.removeItem(`counter-shift-${restaurantId}`);
      const s = result.summary as any;
      const shift = result.shift as any;
      setShiftReport({
        totalOrders: s.totalOrders,
        totalRevenue: s.totalRevenue,
        totalCash: s.totalCash,
        totalCard: s.totalCard,
        expectedCash: s.expectedCash,
        cashDifference: s.cashDifference,
        openingCash: s.openingCash,
        closingCash: s.closingCash,
        openedAt: shift.opened_at,
        closedAt: shift.closed_at,
      });
      setShiftModal('report');
    } catch { showError(t.en ? 'Error closing shift' : 'Error al cerrar turno'); }
    finally { setShiftSaving(false); }
  }, [shiftCloseCash, shiftNotes, restaurantId, t]);

  const shiftDuration = activeShift
    ? (() => {
        const ms = Date.now() - new Date(activeShift.opened_at).getTime();
        const h = Math.floor(ms / 3_600_000);
        const m = Math.floor((ms % 3_600_000) / 60_000);
        return `${h}h ${String(m).padStart(2, '0')}m`;
      })()
    : null;

  // Cola de la alerta con el estado VIVO de cada pedido: si otra tablet ya lo
  // aceptó, desaparece de la alerta (antes la cola guardaba fotos viejas).
  const alertQueue = useMemo(
    () => splashQueue
      .map(o => ordersView.find(x => x.id === o.id) ?? o)
      .filter(o => o.status === 'pending'),
    [splashQueue, ordersView],
  );
  useEffect(() => {
    if (alertQueue.length === 0 || alertAck || !isLeader) return;
    const id = setInterval(playNewOrderSound, 4000);
    return () => clearInterval(id);
  }, [alertQueue.length, alertAck, isLeader]);

  // "Sin conexión" solo si de verdad no llegan pedidos: sin red, o el canal en
  // vivo caído Y el sondeo de 10 s sin responder hace más de 35 s. Antes bastaba
  // con que el canal en vivo parpadeara (pantalla apagada, app en segundo plano,
  // renovación de sesión) para pintar la franja roja aunque todo funcionara.
  const offline = !isOnline || (rtStatus !== 'connected' && Date.now() - lastSyncAt > 35_000);
  const storeState: StoreState =
    offline ? { kind: 'offline' }
      : isPaused ? { kind: 'paused', minsLeft: pauseLeftMins }
      : busyExtra > 0 ? { kind: 'busy', extra: busyExtra }
      : { kind: 'open' };

  const sheetOrder = sheetId ? ordersView.find(o => o.id === sheetId) ?? null : null;
  const busyIds = useMemo(() => new Set(updatingId ? [updatingId] : []), [updatingId]);

  // ── Tab change helper ──
  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setShowDetailMobile(false);
    setSidebarOpen(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // Audio unlock gate — required by all browsers before playing sound.
  // The Android app allows playback without a gesture (mediaPlaybackRequiresUserGesture
  // = false), so there the gate is skipped: an unattended till must ring on its own.
  if (!audioUnlocked && !inApp) {
    const steps = t.en
      ? [
          { icon: '🔔', label: 'New order arrives', desc: 'Sound alert + splash screen' },
          { icon: '👨‍🍳', label: 'Confirm & prepare', desc: 'Set ETA and move to kitchen' },
          { icon: '✅', label: 'Ready & delivered', desc: 'Notify customer, close order' },
        ]
      : [
          { icon: '🔔', label: 'Llega una orden nueva', desc: 'Alerta de sonido + pantalla emergente' },
          { icon: '👨‍🍳', label: 'Confirmar y preparar', desc: 'Establece el tiempo y pasa a cocina' },
          { icon: '✅', label: 'Lista y entregada', desc: 'Notifica al cliente, cierra la orden' },
        ];
    return (
      <div
        className="h-screen w-full flex flex-col items-center justify-center cursor-pointer px-6"
        style={{ background: '#111' }}
        onClick={() => unlockAudio()}
      >
        <div className="w-16 h-16 rounded-2xl bg-[#06C167]/20 flex items-center justify-center mb-6 border border-[#06C167]/30">
          <Bell className="w-8 h-8 text-[#06C167]" />
        </div>

        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">
          {restaurantName}
        </p>
        <h1 className="text-white text-2xl font-black mb-8">Counter</h1>

        {/* Flow steps */}
        <div className="w-full max-w-sm space-y-3 mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-white text-sm font-bold">{s.label}</p>
                <p className="text-white/40 text-xs">{s.desc}</p>
              </div>
              <div className="ml-auto w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center text-white/30 text-xs font-black flex-shrink-0">
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => unlockAudio()}
          className="w-full max-w-sm h-16 rounded-2xl text-black text-lg font-black bg-[#06C167] shadow-xl active:scale-[0.97] transition-transform"
        >
          {t.en ? 'Start Counter →' : 'Iniciar Counter →'}
        </button>
        <p className="text-white/20 text-xs mt-4">
          {t.en ? 'Tap anywhere to activate sound' : 'Toca para activar las notificaciones de sonido'}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden select-none">

      {/* ── Alerta de pedidos nuevos (una sola, con cola) ── */}
      {alertQueue.length > 0 && (
        <NewOrdersAlert
          queue={alertQueue}
          T={T}
          currency={currency}
          defaultMins={defaultMinsFor}
          autoAcceptSecs={autoAcceptOn ? 30 : null}
          soundOn={!alertAck}
          onAcknowledge={() => setAlertAck(true)}
          onAccept={(o, m) => handleAccept(o, m)}
          onReject={(o) => {
            setSplashQueue(q => q.filter(x => x.id !== o.id));
            setCancelModal({ orderId: o.id, type: 'reject' });
            setCancelReason('');
          }}
          onSeeAll={() => { setSplashQueue([]); setView('board'); }}
        />
      )}

      {/* ── Sin conexión: banda fija, lo más importante que puede pasar ── */}
      {offline && (
        <div role="alert" className="flex-none bg-red-600 text-white text-[15px] font-bold py-2.5 px-4 flex items-center justify-center gap-2 z-20">
          <WifiOff className="w-4 h-4" />
          {t.offlineBanner}
        </div>
      )}

      {/* ── Turno de caja abierto ── */}
      {activeShift && (
        <div className="flex-none bg-[#F2F4F3] text-[#0E1412] text-[15px] font-semibold py-2 px-4 flex items-center gap-3 z-20 border-b border-[#E1E6E3]">
          <span>{t.shiftOpened} · {shiftDuration}</span>
          <span className="text-[#55605C]">{t.shiftOpeningCash}: {fmt(Number(activeShift.opening_cash), currency)}</span>
          <button
            onClick={() => { setShiftCloseCash(''); setShiftNotes(''); setShiftModal('close'); }}
            className="ml-auto h-10 px-4 rounded-lg bg-white border border-[#E1E6E3] font-bold"
          >
            {t.shiftClose}
          </button>
        </div>
      )}

      <CounterTopBar
        T={T}
        restaurantName={restaurantName}
        state={storeState}
        view={view}
        scheduledCount={scheduledOrders.length}
        onStatus={() => setStatusOpen(true)}
        onView={setView}
        onMenu={() => setSidebarOpen(true)}
      />

      {view === 'board' ? (
        <CounterBoard
          T={T}
          currency={currency}
          newOrders={newOrders}
          prepOrders={prepOrders}
          readyOrders={readyOrders}
          busyIds={busyIds}
          acceptMinsFor={defaultMinsFor}
          onOpen={(o) => setSheetId(o.id)}
          onPrimary={onPrimary}
        />
      ) : (
        <OrdersListView
          key={view}
          T={T}
          currency={currency}
          orders={view === 'scheduled' ? scheduledOrders : historyOrders}
          mode={view}
          busyIds={busyIds}
          acceptMinsFor={defaultMinsFor}
          onOpen={(o) => setSheetId(o.id)}
          onPrimary={onPrimary}
        />
      )}

      {sheetOrder && (
        <OrderSheet
          key={sheetOrder.id}
          order={sheetOrder}
          T={T}
          currency={currency}
          taxLabel={taxLabel}
          busy={updatingId === sheetOrder.id}
          acceptMins={defaultMinsFor(sheetOrder)}
          onClose={() => setSheetId(null)}
          onPrint={() => PrinterService.printOrder(
            sheetOrder, sheetOrder.estimated_ready_minutes ?? effectiveEta, restaurantName, currency, locale, taxLabel, taxIncluded,
          ).catch(() => {})}
          onAccept={(o, m) => handleAccept(o, m)}
          onPrimary={onPrimary}
          onAdjustEta={(o, m) => { updateOrderLocally(o.id, { estimated_ready_minutes: m }); void handleAdjustEta(o, m); }}
          more={{
            onResendNotice: sheetOrder.customer_email && ['confirmed', 'preparing', 'almost_ready', 'ready', 'out_for_delivery'].includes(sheetOrder.status)
              ? () => resendNotice(sheetOrder) : undefined,
            onEditItems: !['delivered', 'completed', 'cancelled'].includes(sheetOrder.status)
              ? () => openEditItems(sheetOrder.id) : undefined,
            onAssignDriver: sheetOrder.order_type === 'delivery' && !['delivered', 'completed', 'cancelled'].includes(sheetOrder.status)
              ? () => {
                  const o = sheetOrder as Order & { driver_tracking_token?: string | null };
                  setDriverModal({ orderId: o.id, address: o.delivery_address ?? undefined, trackingToken: o.driver_tracking_token ?? undefined });
                  setDriverName(o.driver_name ?? '');
                  setDriverPhone(o.driver_phone ?? '');
                  setSelectedDriverId(o.driver_id ?? null);
                }
              : undefined,
            // served no se puede cancelar (transición inválida): la mesa ya comió.
            onCancel: !['delivered', 'completed', 'cancelled', 'served'].includes(sheetOrder.status)
              ? () => { setCancelModal({ orderId: sheetOrder.id, type: sheetOrder.status === 'pending' ? 'reject' : 'cancel' }); setCancelReason(''); }
              : undefined,
          }}
          historySlot={<StatusHistory orderId={sheetOrder.id} t={t} />}
        />
      )}

      {statusOpen && (
        <StoreStatusSheet
          T={T}
          isPaused={isPaused}
          pauseLeft={pauseLeftMins}
          busyExtra={busyExtra}
          onBusy={(m) => setBusyExtra(m)}
          onPause={(m) => { void doPause(m); setStatusOpen(false); }}
          onResume={() => { void doUnpause(); setStatusOpen(false); }}
          onClose={() => setStatusOpen(false)}
        />
      )}

      {/* ══ SIDEBAR ══ */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-[340px] max-w-[90vw] bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
              <div>
                <p className="text-base font-black text-[#111]">{restaurantName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={cn('w-2 h-2 rounded-full', isPaused ? 'bg-amber-400' : 'bg-[#06C167] animate-pulse')} />
                  <span className="text-xs font-semibold text-[#888]">
                    {isPaused ? `${t.paused_status} (${pauseLeftMins} min)` : t.online_status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg text-[#AAAAAA] hover:text-[#111] hover:bg-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Pedidos de esta tablet */}
              <SidebarSection title={t.en ? 'Orders on this tablet' : 'Pedidos en esta tablet'} icon={<Bell className="w-4 h-4" />}>
                <label className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl border border-[#EEEEEE] cursor-pointer">
                  <div className="min-w-0">
                    <span className="text-[15px] font-semibold text-[#111]">{t.en ? 'Auto-accept orders' : 'Aceptar pedidos solos'}</span>
                    <p className="text-[13px] text-[#55605C] mt-0.5">{t.en ? 'After 30 s, with the default time. Turn on in one tablet only.' : 'A los 30 s, con el tiempo por defecto. Actívalo en una sola tablet.'}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoAcceptOn}
                    onChange={e => {
                      setAutoAcceptOn(e.target.checked);
                      try { localStorage.setItem('counter-auto-accept', String(e.target.checked)); } catch { /* sin storage */ }
                    }}
                    style={{ accentColor: '#047A67', width: 22, height: 22 }}
                  />
                </label>
                <button
                  onClick={() => {
                    const bridge = getCounterAppBridge();
                    if (bridge?.openPrinterSettings) bridge.openPrinterSettings();
                    else setPrinterModalOpen(true);
                    setSidebarOpen(false);
                  }}
                  className="w-full mt-1 flex items-center gap-3 px-3 py-3 rounded-xl border border-[#EEEEEE] hover:border-[#CCCCCC] transition-colors text-left"
                >
                  <Printer className="w-4 h-4 text-[#555]" />
                  <span className="text-[15px] font-semibold text-[#111]">{t.en ? 'Printer' : 'Impresora'}</span>
                </button>
                {!tabletMode && !isDevice && (
                  <a href="/app/counter/tablet" className="w-full mt-1 flex items-center gap-3 px-3 py-3 rounded-xl border border-[#EEEEEE] hover:border-[#CCCCCC] transition-colors text-left">
                    <Settings2 className="w-4 h-4 text-[#555]" />
                    <span className="text-[15px] font-semibold text-[#111]">{t.en ? 'Full-screen tablet mode' : 'Modo tablet a pantalla completa'}</span>
                  </a>
                )}
              </SidebarSection>

              {/* Auto-print */}
              <SidebarSection title={t.autoPrint} icon={<Printer className="w-4 h-4" />}>
                <label className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#EEEEEE] cursor-pointer">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-[#111]">{t.autoPrint}</span>
                    <p className="text-[10px] text-[#888] mt-0.5">{t.en ? 'Print when accepting' : 'Imprimir al aceptar'}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={e => {
                      setAutoPrint(e.target.checked);
                      localStorage.setItem('counter-auto-print', String(e.target.checked));
                    }}
                    style={{ accentColor: GREEN, width: 18, height: 18 }}
                  />
                </label>
                <label className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[#EEEEEE] cursor-pointer mt-1">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-[#111]">{t.en ? 'Print on arrival' : 'Imprimir al recibir'}</span>
                    <p className="text-[10px] text-[#888] mt-0.5">{t.en ? 'Instant print when order arrives' : 'Ticket inmediato al llegar la orden'}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={printOnArrival}
                    onChange={e => {
                      setPrintOnArrival(e.target.checked);
                      localStorage.setItem('counter-print-on-arrival', String(e.target.checked));
                    }}
                    style={{ accentColor: GREEN, width: 18, height: 18 }}
                  />
                </label>
              </SidebarSection>

              {/* 86 / Stock */}
              <SidebarSection title={t.en ? 'Out of stock' : 'Agotados'} icon={<Ban className="w-4 h-4" />}>
                {stockLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="w-4 h-4 border-2 border-[#DDD] border-t-[#06C167] rounded-full animate-spin" />
                  </div>
                ) : stockProducts.length === 0 ? (
                  <p className="text-xs text-[#AAAAAA] text-center py-2">{t.en ? 'No products found' : 'Sin productos'}</p>
                ) : (
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {stockProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => toggleStock(p.id, p.in_stock)}
                        disabled={stockUpdating === p.id}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-colors text-left',
                          p.in_stock
                            ? 'border-[#EEEEEE] hover:border-[#CCCCCC]'
                            : 'border-red-200 bg-red-50'
                        )}
                      >
                        <span className={cn('text-sm font-medium truncate', p.in_stock ? 'text-[#111]' : 'text-red-600 line-through')}>{p.name}</span>
                        <span className={cn(
                          'flex-shrink-0 ml-2 text-[10px] font-black px-1.5 py-0.5 rounded',
                          p.in_stock ? 'bg-[#06C167]/10 text-[#06C167]' : 'bg-red-500 text-white'
                        )}>
                          {stockUpdating === p.id ? '…' : p.in_stock ? (t.en ? 'OK' : 'OK') : '86'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </SidebarSection>

              {/* Today summary */}
              <SidebarSection title={t.todaySummary} icon={<History className="w-4 h-4" />}>
                <div className="px-3 py-3 rounded-xl bg-[#F5F5F5] space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#888]">{t.todayOrders}</span>
                    <span className="font-bold text-[#111]">{todayOrders.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#888]">{t.en ? 'Sales' : 'Ventas'}</span>
                    <span className="font-bold text-[#111]">{fmt(todayRevenue, currency)}</span>
                  </div>
                </div>
              </SidebarSection>

              {/* Cash Register / Shift */}
              <SidebarSection title={t.shiftTitle} icon={<span className="text-base">💰</span>}>
                {activeShift ? (
                  <div className="space-y-2">
                    <div className="px-3 py-3 rounded-xl bg-green-50 border border-green-200 space-y-1">
                      <p className="text-xs font-bold text-green-700">{t.shiftOpened} · {shiftDuration}</p>
                      <p className="text-xs text-green-600">{t.shiftOpeningCash}: {fmt(Number(activeShift.opening_cash), currency)}</p>
                    </div>
                    <button
                      onClick={() => { setShiftCloseCash(''); setShiftNotes(''); setShiftModal('close'); }}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      {t.shiftClose}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShiftOpenCash('0'); setShiftModal('open'); }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-[#06C167] hover:bg-[#05a857] transition-colors"
                  >
                    {t.shiftOpen}
                  </button>
                )}
              </SidebarSection>

              {/* This tablet — only inside the Android app */}
              {inApp && (
                <SidebarSection title={t.en ? 'This tablet' : 'Esta tablet'} icon={<Settings2 className="w-4 h-4" />}>
                  <button
                    onClick={() => getCounterAppBridge()?.openPrinterSettings?.()}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-[#EEEEEE] hover:border-[#CCCCCC] transition-colors text-left"
                  >
                    <Printer className="w-4 h-4 text-[#555]" />
                    <span className="text-sm font-medium text-[#111]">{t.en ? 'Printer' : 'Impresora'}</span>
                  </button>
                  {/* Two taps instead of confirm(): JS dialogs need a WebChromeClient the
                      app doesn't install, and a stray tap must not unpair the till. */}
                  <button
                    onClick={() => {
                      if (!confirmDisconnect) {
                        setConfirmDisconnect(true);
                        window.setTimeout(() => setConfirmDisconnect(false), 4000);
                        return;
                      }
                      // Revoke THIS session server-side first ('local' = only this
                      // tablet; the default 'global' would sign the owner out
                      // everywhere). Then the app wipes cookies/storage → /connect.
                      void getSupabaseBrowser().auth.signOut({ scope: 'local' })
                        .catch(() => { /* offline: the local wipe still happens */ })
                        .finally(() => getCounterAppBridge()?.disconnectDevice?.());
                    }}
                    className={cn(
                      'w-full mt-1 py-3 rounded-xl text-sm font-bold transition-colors border',
                      confirmDisconnect ? 'bg-red-500 text-white border-red-500' : 'text-red-600 border-red-200 hover:bg-red-50'
                    )}
                  >
                    {confirmDisconnect
                      ? (t.en ? 'Tap again to disconnect' : 'Toca otra vez para desconectar')
                      : (t.en ? 'Disconnect this tablet' : 'Desconectar esta tablet')}
                  </button>
                </SidebarSection>
              )}
            </div>
          </aside>
        </>
      )}

      {/* ══ PRINTER MODAL ══ */}
      {printerModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setPrinterModalOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl z-50 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                  <Printer className="w-4 h-4 text-[#555]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111]">
                    {t.en ? 'Printer Settings' : 'Configuración de impresora'}
                  </p>
                  <p className="text-[11px] text-[#888]">
                    {t.en ? 'Settings saved on this device' : 'Configuración guardada en este dispositivo'}
                  </p>
                </div>
              </div>
              <button onClick={() => setPrinterModalOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F5F5F5]">
                <X className="w-4 h-4 text-[#555]" />
              </button>
            </div>

            {/* Toggles */}
            <div className="px-5 py-4 space-y-4">
              {/* Receipt toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111]">
                    {t.en ? 'Customer receipt' : 'Recibo del cliente'}
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">
                    {t.en ? 'Full ticket with prices' : 'Ticket completo con precios'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = { ...printerConfig, receiptEnabled: !printerConfig.receiptEnabled };
                    PrinterConfig.update(next);
                    setPrinterConfig(next);
                  }}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    printerConfig.receiptEnabled ? 'bg-[#06C167]' : 'bg-[#DDD]'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    printerConfig.receiptEnabled && 'translate-x-6'
                  )} />
                </button>
              </div>

              {/* Kitchen toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111]">
                    {t.en ? 'Kitchen ticket' : 'Ticket de cocina'}
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">
                    {t.en ? 'Items only, no prices' : 'Solo artículos, sin precios'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = { ...printerConfig, kitchenEnabled: !printerConfig.kitchenEnabled };
                    PrinterConfig.update(next);
                    setPrinterConfig(next);
                  }}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    printerConfig.kitchenEnabled ? 'bg-[#06C167]' : 'bg-[#DDD]'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    printerConfig.kitchenEnabled && 'translate-x-6'
                  )} />
                </button>
              </div>
            </div>

            {/* Auto-print */}
            <div className="px-5 pb-4 border-t border-[#F5F5F5] pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111]">
                    {t.en ? 'Auto-print on accept' : 'Imprimir al aceptar'}
                  </p>
                  <p className="text-xs text-[#888] mt-0.5">
                    {t.en ? 'Automatically prints when you confirm an order' : 'Imprime automáticamente al confirmar una orden'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !autoPrint;
                    setAutoPrint(next);
                    localStorage.setItem('counter-auto-print', String(next));
                  }}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    autoPrint ? 'bg-[#06C167]' : 'bg-[#DDD]'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                    autoPrint && 'translate-x-6'
                  )} />
                </button>
              </div>
            </div>

            {/* Test print button */}
            <div className="px-5 pb-5">
              <button
                onClick={() => {
                  const dummyOrder: any = {
                    id: 'test',
                    order_number: 'TEST',
                    customer_name: t.en ? 'Test Customer' : 'Cliente Prueba',
                    customer_phone: null,
                    order_type: 'pickup',
                    payment_method: 'cash',
                    delivery_address: null,
                    notes: t.en ? 'Test print — printer working correctly' : 'Impresión de prueba — impresora funcionando',
                    total: 0,
                    tip_amount: 0,
                    tax_amount: 0,
                    items: [],
                    created_at: new Date().toISOString(),
                  };
                  PrinterService.printOrder(dummyOrder, 0, restaurantName, currency, locale).catch(() => {});
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E8E8E8] text-sm font-semibold text-[#555] hover:bg-[#F5F5F5] transition-colors"
              >
                <Printer className="w-4 h-4" />
                {t.en ? 'Print test ticket' : 'Imprimir ticket de prueba'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ EDIT ORDER ITEMS MODAL ══ */}
      {editItemsModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setEditItemsModal(null)} />
          <div className="fixed inset-x-3 top-[5%] bottom-[5%] max-w-md mx-auto bg-white rounded-2xl z-50 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0] flex-shrink-0">
              <p className="text-base font-bold text-[#111]">{t.en ? 'Add items to order' : 'Agregar productos a la orden'}</p>
              <button onClick={() => setEditItemsModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888] hover:bg-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-[#F5F5F5] flex-shrink-0">
              <input
                type="search"
                value={editSearch}
                onChange={e => setEditSearch(e.target.value)}
                placeholder={t.en ? 'Search products…' : 'Buscar productos…'}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#E8E8E8] bg-[#F8F8F8] focus:outline-none focus:ring-2 focus:ring-[#05c8a7]/30"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {editLoading ? (
                <div className="flex items-center justify-center h-32 text-[#AAAAAA] text-sm">{t.en ? 'Loading…' : 'Cargando…'}</div>
              ) : (
                <div className="space-y-2">
                  {editProducts
                    .filter(p => editSearch.trim() === '' || p.name.toLowerCase().includes(editSearch.toLowerCase()))
                    .map(p => (
                      <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white ${p.in_stock === false ? 'border-[#F5F5F5] opacity-60' : 'border-[#F0F0F0]'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-[#111] truncate">{p.name}</p>
                            {p.in_stock === false && (
                              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide bg-red-100 text-red-500 px-1.5 py-0.5 rounded">86</span>
                            )}
                          </div>
                          <p className="text-xs text-[#888]">{fmt(Number(p.price), currency)}</p>
                        </div>
                        <button
                          onClick={() => handleAddItem(editItemsModal.orderId, p.id)}
                          disabled={editSaving}
                          className="w-8 h-8 rounded-full bg-[#05c8a7] text-white flex items-center justify-center hover:bg-[#04b096] transition-colors disabled:opacity-40 flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  {editProducts.filter(p => editSearch.trim() === '' || p.name.toLowerCase().includes(editSearch.toLowerCase())).length === 0 && (
                    <p className="text-center text-sm text-[#AAAAAA] py-8">{t.en ? 'No products found' : 'Sin resultados'}</p>
                  )}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[#F0F0F0] flex-shrink-0">
              <button
                onClick={() => setEditItemsModal(null)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-[#555] border border-[#E8E8E8] hover:bg-[#F5F5F5] transition-colors"
              >
                {t.en ? 'Done' : 'Listo'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ CANCEL MODAL ══ */}
      {cancelModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => { setCancelModal(null); setRefundRequired(false); }} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl z-50 p-5 shadow-2xl">
            <p className="text-base font-bold text-[#111] mb-1">
              {cancelModal.type === 'reject' ? t.rejectOrder : t.cancelOrder}
            </p>
            {refundRequired && (
              <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-900">
                  {isDevice
                    ? (t.en
                      ? 'This order was paid online. Refunds are only made from MENIUS on your phone or computer (Orders).'
                      : 'Esta orden fue pagada online. Los reembolsos solo se hacen desde MENIUS en tu celular o computadora (Pedidos).')
                    : (t.en
                      ? 'This order was paid online. Cancelling it will refund the customer via Stripe.'
                      : 'Esta orden fue pagada online. Cancelarla reembolsará al cliente vía Stripe.')}
                </p>
              </div>
            )}
            <p className="text-xs text-[#888] mb-4">{t.rejectReason}</p>
            <div className="space-y-2 mb-4">
              {t.reasons.map(r => (
                <label key={r} className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer text-sm transition-colors',
                  cancelReason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-[#EEE] text-[#555] hover:border-[#CCC]'
                )}>
                  <input type="radio" name="cancel-reason" checked={cancelReason === r} onChange={() => setCancelReason(r)} className="accent-red-500" />
                  {r}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setCancelModal(null); setRefundRequired(false); }} className="flex-1 py-3 rounded-xl text-sm text-[#888] border border-[#EEEEEE]">
                {t.no}
              </button>
              {refundRequired && isDevice ? null : refundRequired ? (
                <button
                  onClick={handleRefundAndCancel}
                  disabled={updatingId === cancelModal.orderId}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-50"
                >
                  {t.en ? '💸 Refund & cancel' : '💸 Reembolsar y cancelar'}
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  disabled={!cancelReason || updatingId === cancelModal.orderId}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50"
                >
                  {t.confirmCancel}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══ DELIVERY GUARD MODAL ══ */}
      {deliveryGuardModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setDeliveryGuardModal(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl z-50 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <p className="text-base font-black text-[#111]">⚠️ {t.deliveryGuardTitle}</p>
              <p className="text-xs text-[#888] mt-0.5 leading-relaxed">{t.deliveryGuardBody}</p>
            </div>
            <div className="px-5 py-4 flex gap-2">
              <button
                onClick={() => setDeliveryGuardModal(null)}
                className="flex-1 py-3 rounded-xl text-sm text-[#888] border border-[#EEEEEE]"
              >
                {t.no}
              </button>
              <button
                onClick={() => {
                  const order = deliveryGuardModal.order;
                  setDeliveryGuardModal(null);
                  commitStatus(order, 'deliver', true);
                }}
                className="flex-1 py-3 rounded-xl text-white text-sm font-black bg-amber-500 hover:bg-amber-600 transition-colors"
              >
                {t.deliveryGuardConfirm}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ SHIFT MODALS ══ */}
      {shiftModal === 'open' && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShiftModal(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl z-50 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <p className="text-base font-black text-[#111]">💰 {t.shiftOpen}</p>
              <p className="text-xs text-[#888] mt-0.5">{t.en ? 'Enter opening cash in the register' : 'Ingresa el efectivo inicial en caja'}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#888] uppercase tracking-wide mb-1 block">{t.shiftOpeningCash}</label>
                <input
                  type="number" min="0" step="0.01"
                  value={shiftOpenCash}
                  onChange={e => setShiftOpenCash(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8E8E8] text-sm text-[#111] focus:outline-none focus:border-[#06C167] bg-white"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setShiftModal(null)} className="flex-1 py-3 rounded-xl text-sm text-[#888] border border-[#EEEEEE]">{t.no}</button>
              <button
                onClick={handleOpenShift}
                disabled={shiftSaving}
                className="flex-1 py-3 rounded-xl text-white text-sm font-black transition-all disabled:opacity-50 bg-[#06C167]"
              >
                {shiftSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : t.shiftOpen}
              </button>
            </div>
          </div>
        </>
      )}

      {shiftModal === 'close' && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShiftModal(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl z-50 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <p className="text-base font-black text-[#111]">🔒 {t.shiftClose}</p>
              <p className="text-xs text-[#888] mt-0.5">{t.en ? 'Count the cash in the register' : 'Cuenta el efectivo en la caja'}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#888] uppercase tracking-wide mb-1 block">💵 {t.shiftClosingCash}</label>
                <input
                  type="number" min="0" step="0.01"
                  value={shiftCloseCash}
                  onChange={e => setShiftCloseCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8E8E8] text-sm text-[#111] focus:outline-none focus:border-[#06C167] bg-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#888] uppercase tracking-wide mb-1 block">{t.shiftNotes}</label>
                <textarea
                  value={shiftNotes}
                  onChange={e => setShiftNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E8E8] text-sm text-[#111] focus:outline-none focus:border-[#06C167] bg-white resize-none"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setShiftModal(null)} className="flex-1 py-3 rounded-xl text-sm text-[#888] border border-[#EEEEEE]">{t.no}</button>
              <button
                onClick={handleCloseShift}
                disabled={shiftSaving}
                className="flex-1 py-3 rounded-xl text-white text-sm font-black transition-all disabled:opacity-50 bg-red-500"
              >
                {shiftSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : t.shiftClose}
              </button>
            </div>
          </div>
        </>
      )}

      {shiftModal === 'report' && shiftReport && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShiftModal(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl z-50 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-base font-black text-[#111]">📋 {t.shiftReportZ}</p>
                <p className="text-xs text-[#888] mt-0.5">
                  {new Date(shiftReport.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {new Date(shiftReport.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setShiftModal(null)} className="p-1.5 rounded-lg hover:bg-[#F5F5F5]"><X className="w-5 h-5 text-[#AAAAAA]" /></button>
            </div>
            <div className="px-5 py-4 space-y-2 overflow-y-auto flex-1">
              {[
                { label: t.shiftOrders, value: String(shiftReport.totalOrders) },
                { label: t.shiftRevenue, value: fmt(shiftReport.totalRevenue, currency) },
                { label: t.shiftCash, value: fmt(shiftReport.totalCash, currency) },
                { label: t.shiftCard, value: fmt(shiftReport.totalCard, currency) },
                { label: t.shiftOpeningCash, value: fmt(shiftReport.openingCash, currency) },
                { label: t.shiftExpected, value: fmt(shiftReport.expectedCash, currency) },
                { label: t.shiftClosingCash, value: fmt(shiftReport.closingCash, currency) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-[#F0F0F0]">
                  <span className="text-sm text-[#888]">{label}</span>
                  <span className="text-sm font-bold text-[#111]">{value}</span>
                </div>
              ))}
              <div className={cn('flex justify-between items-center py-2.5 px-3 rounded-xl font-bold',
                Math.abs(shiftReport.cashDifference) < 0.01 ? 'bg-green-50 text-green-700' : shiftReport.cashDifference < 0 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
              )}>
                <span className="text-sm">{t.shiftDiff}</span>
                <span className="text-sm">{shiftReport.cashDifference >= 0 ? '+' : ''}{fmt(shiftReport.cashDifference, currency)}</span>
              </div>
            </div>
            <div className="px-5 pb-5 flex-shrink-0">
              <button
                onClick={() => { window.print(); }}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#111]"
              >
                🖨️ {t.shiftPrint}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ DRIVER MODAL ══ */}
      {driverModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setDriverModal(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-xs mx-auto bg-white rounded-2xl z-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#111]">🛵 {t.assignDriver}</h2>
              <button onClick={() => setDriverModal(null)} className="p-1 text-[#AAAAAA] hover:text-[#111]"><X className="w-5 h-5" /></button>
            </div>
            {/* Driver pool quick-select */}
            {driverPool.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#888] mb-2">{t.en ? 'Select from your team:' : 'Elige de tu equipo:'}</p>
                <div className="flex flex-wrap gap-2">
                  {driverPool.map(d => (
                    <button key={d.id}
                      onClick={() => { setDriverName(d.name); setDriverPhone(d.phone); setSelectedDriverId(d.id); }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors',
                        driverName === d.name
                          ? 'border-[#06C167] bg-[#06C167]/10 text-[#06C167]'
                          : 'border-[#E8E8E8] text-[#555] hover:border-[#06C167]'
                      )}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3 mb-5">
              <input
                value={driverName}
                onChange={e => { setDriverName(e.target.value); setSelectedDriverId(null); }}
                placeholder={t.en ? 'Driver name' : 'Nombre del repartidor'}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#06C167]"
              />
              <input
                value={driverPhone}
                onChange={e => setDriverPhone(e.target.value)}
                placeholder={t.en ? 'Phone' : 'Teléfono'}
                type="tel"
                className="w-full px-4 py-3 rounded-xl border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#06C167]"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDriverModal(null)} className="flex-1 py-3 rounded-xl text-sm text-[#888] border border-[#EEEEEE]">
                {t.no}
              </button>
              <button
                onClick={handleAssignDriver}
                disabled={assigningDriver || !driverName.trim()}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: GREEN }}
              >
                {assigningDriver ? '…' : t.assignDriver}
              </button>
            </div>
            {/* Print driver sheet with QR */}
            {driverModal?.trackingToken && (
              <button
                onClick={async () => {
                  const appUrl = window.location.origin;
                  const baseToken = `${appUrl}/driver/track/${driverModal.trackingToken}`;
                  const trackingUrl = locale === 'en' ? `${baseToken}?lang=en` : baseToken;

                  // Generate QR locally — no internet required
                  let qrSrc = '';
                  try {
                    const { generateQRDataUrl } = await import('@/lib/styled-qr');
                    qrSrc = await generateQRDataUrl(trackingUrl, 200);
                  } catch {
                    qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&data=${encodeURIComponent(trackingUrl)}`;
                  }

                  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Driver Sheet</title>
                    <style>@page{size:80mm auto;margin:6mm}body{font-family:monospace;font-size:11px;text-align:center;width:70mm}
                    .title{font-size:14px;font-weight:bold;margin-bottom:8px}.qr img{margin:8px auto;display:block}
                    .url{font-size:7px;word-break:break-all;margin-top:4px;color:#333}
                    .hint{font-size:9px;color:#555;margin-top:6px}</style></head>
                    <body><div class="title">🛵 ${t.en ? 'DRIVER SHEET' : 'FICHA DEL REPARTIDOR'}</div>
                    <div>${driverModal.address ?? ''}</div>
                    <div class="qr"><img src="${qrSrc}" width="180" height="180" /></div>
                    <div class="url">${trackingUrl}</div>
                    <div class="hint">${t.en ? 'Scan to start live tracking' : 'Escanea para activar rastreo'}</div>
                    <script>window.onload=()=>{window.print();window.close();}</script></body></html>`;
                  const w = window.open('', '_blank', 'width=320,height=480');
                  if (w) { w.document.write(html); w.document.close(); }
                }}
                className="mt-2 w-full py-2.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 flex items-center justify-center gap-1.5"
              >
                🖨️ {t.en ? 'Print driver sheet (QR)' : 'Imprimir ficha del driver (QR)'}
              </button>
            )}
          </div>
        </>
      )}

      {/* ══ PHOTO LIGHTBOX ══ */}
      {photoLightbox && (
        <>
          <div className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm" onClick={() => setPhotoLightbox(null)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4" onClick={() => setPhotoLightbox(null)}>
            <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
              {/* Close button */}
              <button
                onClick={() => setPhotoLightbox(null)}
                className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm font-semibold"
              >
                <X className="w-5 h-5" /> {t.en ? 'Close' : 'Cerrar'}
              </button>
              {/* Photo — square 1:1 */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <Image
                  src={photoLightbox}
                  alt="Delivery proof"
                  fill
                  className="object-contain bg-black"
                  sizes="(max-width: 640px) 100vw, 512px"
                />
              </div>
              {/* Download link */}
              <a
                href={photoLightbox}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 text-white/60 hover:text-white text-xs font-semibold transition-colors"
              >
                ↗ {t.en ? 'Open original' : 'Abrir original'}
              </a>
            </div>
          </div>
        </>
      )}

      {/* ══ AVISOS ══ abajo a la izquierda, nunca encima del botón principal */}
      {errorToast && <CounterToast text={errorToast} tone="error" />}
      {!errorToast && successToast && (
        <CounterToast text={successToast} tone="ok" actionLabel={toastAction?.label} onAction={toastAction?.run} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TabBtn
// ══════════════════════════════════════════════════════════════════════════════
// OrderRow — left panel row
// ══════════════════════════════════════════════════════════════════════════════
// HistoryRow
// ══════════════════════════════════════════════════════════════════════════════
// StatusHistory — collapsible audit trail per order
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', preparing: 'En preparación',
  almost_ready: 'Casi lista', ready: 'Lista', out_for_delivery: 'En camino',
  served: 'Servida', delivered: 'Entregada', completed: 'Completada', cancelled: 'Cancelada',
};

function StatusHistory({ orderId, t }: { orderId: string; t: ReturnType<typeof getT> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; from_status: string | null; to_status: string; note: string | null; created_at: string }>>([]);

  const load = async () => {
    if (history.length > 0) { setOpen(o => !o); return; }
    setOpen(true);
    setLoading(true);
    const res = await fetchOrderStatusHistory(orderId);
    setLoading(false);
    if (res.history) setHistory(res.history as typeof history);
  };

  return (
    <div className="flex-none border-t border-[#F0F0F0]">
      <button
        onClick={load}
        className="w-full flex items-center justify-between px-5 py-3 text-[11px] font-bold text-[#AAAAAA] uppercase tracking-widest hover:bg-[#FAFAFA] transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          {t.en ? 'Status history' : 'Historial de estados'}
        </span>
        <span className={cn('transition-transform duration-200', open ? 'rotate-180' : '')}>▾</span>
      </button>
      {open && (
        <div className="px-5 pb-3">
          {loading ? (
            <div className="flex justify-center py-3">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-[#CCCCCC] text-center py-2">{t.en ? 'No history yet' : 'Sin historial aún'}</p>
          ) : (
            <ol className="space-y-2">
              {history.map((row, i) => {
                const label = t.en
                  ? row.to_status.replace(/_/g, ' ')
                  : (STATUS_LABEL[row.to_status] ?? row.to_status);
                const ts = new Date(row.created_at).toLocaleTimeString(t.en ? 'en' : 'es', { hour: '2-digit', minute: '2-digit' });
                return (
                  <li key={row.id} className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                      <div className={cn('w-2 h-2 rounded-full', i === history.length - 1 ? 'bg-[#06C167]' : 'bg-gray-300')} />
                      {i < history.length - 1 && <div className="w-px h-4 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#333]">{label}</span>
                      {row.note && <span className="text-xs text-[#888] ml-1.5 italic">· {row.note}</span>}
                      <span className="block text-[10px] text-[#BBBBBB]">{ts}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EmptyState
// ══════════════════════════════════════════════════════════════════════════════
// OrderDetail — right panel
// ══════════════════════════════════════════════════════════════════════════════
// ItemRow
// ══════════════════════════════════════════════════════════════════════════════
// SidebarSection
// ══════════════════════════════════════════════════════════════════════════════

function SidebarSection({
  title, icon, children,
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#888]">{icon}</span>
        <p className="text-xs font-bold text-[#888] uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  );
}

// Un programado que vence dentro de este margen se trata como pedido inmediato.
const SCHEDULED_SPLASH_LEAD_MS = SCHEDULED_LEAD_MS;
