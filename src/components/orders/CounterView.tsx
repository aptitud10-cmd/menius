'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import {
  Menu, X, Bell, Check, CheckCircle, Clock, ChevronLeft,
  Truck, ShoppingBag, Utensils, MessageCircle, Phone,
  MapPin, Pause, Flame, Printer, History, AlertTriangle,
  Wifi, WifiOff, ChevronRight, User, Settings2, Calendar, Plus,
} from 'lucide-react';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import {
  updateOrderStatus, updateOrderETA, setPauseOrders, assignDriver, updateOrderTip,
  sendOrderNotification, updatePaymentBreakdown, openShift, closeShift,
} from '@/lib/actions/restaurant';
import { AutoAcceptService } from '@/lib/counter/AutoAcceptService';
import { PrinterService } from '@/lib/printing/PrinterService';
import { PrinterConfig } from '@/lib/printing/PrinterConfig';
import type { PrinterConfigData } from '@/lib/printing/PrinterConfig';
import { fetchSuggestedEta, clampEta } from '@/lib/utils/eta';
import type { Order, OrderItem } from '@/types';
import { cn } from '@/lib/utils';

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
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
}

// ══════════════════════════════════════════════════════════════════════════════
// CounterView — main component
// ══════════════════════════════════════════════════════════════════════════════

export function CounterView({
  initialOrders, restaurantId, restaurantName, currency, locale = 'es',
  restaurantLat, restaurantLng, taxLabel, taxIncluded, tabletMode = false,
}: CounterViewProps) {
  const t = getT(locale);

  // ── Audio unlock gate ──
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const unlockAudio = useCallback(() => {
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
      if (b) { _newOrderBuffer = b; playBuffer(b); } // play first chime on unlock
    });
    loadAudioBuffer('/sounds/order-accepted.mp3').then(b => {
      if (b) _acceptedBuffer = b;
    });

    setAudioUnlocked(true);
  }, []);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // On mobile/portrait: when an order is selected we show detail fullscreen
  const [showDetailMobile, setShowDetailMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Order actions state ──
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [eta, setEta] = useState(15);
  const [suggestedEta, setSuggestedEta] = useState<number | null>(null);
  const [busyExtra, setBusyExtra] = useState(0);

  // ── Pause state ──
  const [pausedUntil, setPausedUntil] = useState<number | null>(null);
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

  // ── Cancel/reject ──
  const [cancelModal, setCancelModal] = useState<{ orderId: string; type: 'reject' | 'cancel' } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // ── Driver modal ──
  const [driverModal, setDriverModal] = useState<{ orderId: string; address?: string; trackingToken?: string } | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
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

  // ── Split payment ──
  const [splitPayModal, setSplitPayModal] = useState<{ order: Order } | null>(null);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [savingSplit, setSavingSplit] = useState(false);

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
  const [splashQueue, setSplashQueue] = useState<Order[]>([]);

  // ── Connection / misc ──
  const [isOnline, setIsOnline] = useState(true);
  const [, tick] = useState(0);
  const urgentRef = useRef<Set<string>>(new Set());
  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState<'all' | 'delivery' | 'pickup' | 'dine_in'>('all');
  const [historyStatus, setHistoryStatus] = useState<'all' | 'delivered' | 'cancelled'>('all');

  // ── History search ──

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };
  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };
  const showNotif = (result: { channel: string; success: boolean; error?: string }, orderId?: string) => {
    let text: string;
    if (result.channel === 'whatsapp' && result.success) text = t.notifSentWa;
    else if (result.channel === 'sms' && result.success) text = t.notifSentSms;
    else if (result.channel === 'email' && result.success && result.error?.includes('fallback')) text = t.notifFallback;
    else if (result.channel === 'email' && result.success) text = t.notifSentEmail;
    else if (result.error === 'no_contact_info' || result.error === 'notifications_disabled') text = t.notifNoContact;
    else text = t.notifFailed;
    setNotifToast({ text, ok: result.success });
    setTimeout(() => setNotifToast(null), 4000);
    if (orderId) {
      setNotifStatus(prev => ({ ...prev, [orderId]: { ...result, time: Date.now() } }));
    }
  };

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
    let lock: any = null;
    const acquire = async () => {
      try { lock = await (navigator as any).wakeLock.request('screen'); } catch { /* denied */ }
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

  // Auto-accept subscription
  useEffect(() => { return AutoAcceptService.subscribe(() => {}); }, []);

  // Load driver pool
  useEffect(() => {
    fetch('/api/tenant/drivers')
      .then(r => r.json())
      .then(d => { if (d.drivers) setDriverPool(d.drivers.filter((dr: any) => dr.is_active)); })
      .catch(() => {});
  }, []);

  // ── New order handler ──
  const handleNewOrder = useCallback((order: Order) => {
    playNewOrderSound();
    sendPushNotification(
      `🔔 ${t.newOrder} · ${restaurantName}`,
      `${order.customer_name || 'Cliente'} · #${order.order_number} · ${fmt(order.total, currency)}`
    );
    setSplashQueue(q => [...q, order]);
    // Print immediately on arrival if enabled
    if (printOnArrivalRef.current) {
      PrinterService.printOrder(order, undefined, restaurantName, currency, locale, taxLabel, taxIncluded).catch(() => {});
    }
  }, [restaurantName, currency, locale, taxLabel, taxIncluded, t.newOrder]);

  const { orders, updateOrderLocally } = useRealtimeOrders({ restaurantId, initialOrders, onNewOrder: handleNewOrder });

  // ── Derived lists ──
  const scheduledOrders = useMemo(() =>
    orders.filter(o => o.status === 'pending' && o.scheduled_for)
      .sort((a, b) => new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime()),
    [orders]);

  const newOrders = useMemo(() =>
    orders.filter(o => o.status === 'pending' && !o.scheduled_for)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]);

  const overdueCount = useMemo(() =>
    newOrders.filter(o => elapsedMins(o.created_at) >= SLA_WARN_MINS).length,
    [newOrders]);

  const prepOrders = useMemo(() =>
    orders.filter(o => ['confirmed', 'preparing'].includes(o.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]);

  const readyOrders = useMemo(() =>
    orders.filter(o => o.status === 'ready')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]);

  const historyOrders = useMemo(() => {
    let r = orders.filter(o => ['delivered', 'cancelled'].includes(o.status))
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
  }, [orders, historySearch, historyType, historyStatus]);

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
      if (elapsedMins(o.created_at) >= SLA_WARN_MINS && !urgentRef.current.has(o.id)) {
        urgentRef.current.add(o.id);
        playUrgentSound();
        sendPushNotification(
          `⚠️ ${t.urgent} · ${restaurantName}`,
          `#${o.order_number} — ${SLA_WARN_MINS} min without response`
        );
      }
    });
  });

  // Auto-accept
  useEffect(() => {
    const firstNew = newOrders[0];
    if (!firstNew || !AutoAcceptService.shouldAutoAccept(firstNew, orders)) return;
    const effectiveEta = eta + busyExtra;
    (async () => {
      await updateOrderETA(firstNew.id, effectiveEta).catch(() => {});
      await updateOrderStatus(firstNew.id, 'confirmed').catch(() => {});
      PrinterService.printOrder(firstNew, effectiveEta, restaurantName, currency, locale, taxLabel, taxIncluded).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOrders.map(o => o.id).join(',')]);

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

  // Dynamic ETA suggestion for delivery orders (must be after selectedOrder is defined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSuggestedEta(null);
    if (!selectedOrder || selectedOrder.order_type !== 'delivery') {
      // For non-delivery: set eta default from max prep_time_minutes in the order items
      if (selectedOrder?.items?.length) {
        const maxPrepTime = Math.max(...selectedOrder.items.map(i => (i.product as any)?.prep_time_minutes ?? 0));
        if (maxPrepTime > 0) setEta(clampEta(maxPrepTime));
      }
      return;
    }
    if (!restaurantLat || !restaurantLng || !selectedOrder.delivery_address) {
      // Still use prep time for delivery ETA default
      if (selectedOrder.items?.length) {
        const maxPrepTime = Math.max(...selectedOrder.items.map(i => (i.product as any)?.prep_time_minutes ?? 0));
        if (maxPrepTime > 0) setEta(clampEta(maxPrepTime));
      }
      return;
    }
    fetchSuggestedEta(restaurantLat, restaurantLng, selectedOrder.delivery_address)
      .then(mins => { if (mins) setSuggestedEta(clampEta(mins)); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.id, restaurantLat, restaurantLng]);
  const isPaused = !!pausedUntil && Date.now() < pausedUntil;
  const pauseLeftMins = pausedUntil ? Math.max(0, Math.ceil((pausedUntil - Date.now()) / 60_000)) : 0;
  const effectiveEta = eta + busyExtra;
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);

  // ── Actions ──
  const handleAccept = useCallback(async (order: Order) => {
    setUpdatingId(order.id);
    const eff = eta + busyExtra;
    try {
      const etaRes = await updateOrderETA(order.id, eff);
      if (etaRes?.error) { showError(etaRes.error); return; }
      const res = await updateOrderStatus(order.id, 'confirmed');
      if (res?.error) { showError(res.error); return; }
      playAcceptSound();
      // dine_in always prints so the kitchen gets the ticket even if global auto-print is off
      const shouldPrint = autoPrint || order.order_type === 'dine_in';
      if (shouldPrint) PrinterService.printOrder(order, eff, restaurantName, currency, locale, taxLabel, taxIncluded).catch(() => {});
      setActiveTab('prep');
      setSelectedId(order.id);
      setShowDetailMobile(true);
      showSuccess(`#${order.order_number} → ${t.tabPrep}`);
      if (res.notification) showNotif(res.notification, order.id);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [eta, busyExtra, restaurantName, currency, autoPrint, t]);

  const handleMarkPreparing = useCallback(async (order: Order) => {
    setUpdatingId(order.id);
    try {
      const res = await updateOrderStatus(order.id, 'preparing');
      if (res?.error) { showError(res.error); return; }
      if (res.notification) showNotif(res.notification, order.id);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [t]);

  const handleMarkReady = useCallback(async (order: Order) => {
    setUpdatingId(order.id);
    try {
      const res = await updateOrderStatus(order.id, 'ready');
      if (res?.error) { showError(res.error); return; }
      setActiveTab('ready');
      setSelectedId(order.id);
      setShowDetailMobile(true);
      if (res.notification) showNotif(res.notification, order.id);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [t]);

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
  }, [t.en]);

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
  }, [t.en]);

  const handleDeliver = useCallback(async (order: Order) => {
    // For cash or unset payment, offer split/mixed payment before marking delivered
    if (order.payment_method === 'cash' || !order.payment_method) {
      setSplitCash('');
      setSplitCard('');
      setSavingSplit(false);
      setSplitPayModal({ order });
      return;
    }
    setUpdatingId(order.id);
    try {
      const res = await updateOrderStatus(order.id, 'delivered');
      if (res?.error) { showError(res.error); return; }
      setActiveTab('history');
      setSelectedId(null);
      setShowDetailMobile(false);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [t]);

  const doDeliver = useCallback(async (order: Order) => {
    setUpdatingId(order.id);
    try {
      const res = await updateOrderStatus(order.id, 'delivered');
      if (res?.error) { showError(res.error); return; }
      setActiveTab('history');
      setSelectedId(null);
      setShowDetailMobile(false);
      setSplitPayModal(null);
      setSavingSplit(false);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [t]);

  const handleSplitDeliver = useCallback(async () => {
    if (!splitPayModal) return;
    const order = splitPayModal.order;
    const cash = parseFloat(splitCash) || 0;
    const card = parseFloat(splitCard) || 0;
    setSavingSplit(true);
    try {
      if (cash > 0 || card > 0) {
        await updatePaymentBreakdown(order.id, { cash: cash || undefined, card: card || undefined });
      }
      await doDeliver(order);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
      setSavingSplit(false);
    }
  }, [splitPayModal, splitCash, splitCard, doDeliver, t]);

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
      if (res?.error) { showError(res.error); return; }
      setCancelModal(null);
      setCancelReason('');
      if (res.notification) showNotif(res.notification, cancelModal.orderId);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [cancelModal, cancelReason, t]);

  const handleAssignDriver = useCallback(async () => {
    if (!driverModal) return;
    setAssigningDriver(true);
    try {
      const res = await assignDriver(driverModal.orderId, driverName, driverPhone);
      if (res?.error) { showError(res.error); return; }
      // Update modal with new tracking token returned by server so print sheet works
      const newToken = (res as any)?.trackingToken ?? driverModal.trackingToken;
      setDriverModal(prev => prev ? { ...prev, trackingToken: newToken } : null);
      setDriverName(''); setDriverPhone('');
      showSuccess(t.en ? 'Driver assigned' : 'Repartidor asignado');
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setAssigningDriver(false); }
  }, [driverModal, driverName, driverPhone, t]);

  const doPause = useCallback(async (mins: number) => {
    let ms = mins * 60_000;
    if (mins === 9999) {
      const n = new Date();
      ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime();
    }
    const until = Date.now() + ms;
    setPausedUntil(until);
    setPauseModalOpen(false);
    await setPauseOrders(new Date(until).toISOString()).catch(() => {});
  }, []);

  const doUnpause = useCallback(async () => {
    setPausedUntil(null);
    await setPauseOrders(null).catch(() => {});
  }, []);

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

  // ── Tab change helper ──
  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setShowDetailMobile(false);
    setSidebarOpen(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // Audio unlock gate — required by all browsers before playing sound
  if (!audioUnlocked) {
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
        onClick={unlockAudio}
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
          onClick={unlockAudio}
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
    <div className="h-screen w-full bg-[#F2F2F2] flex flex-col overflow-hidden select-none">

      {/* ── New order splash ── */}
      {splashQueue.length > 0 && (
        <NewOrderSplash
          order={splashQueue[0]}
          currency={currency}
          queueCount={splashQueue.length}
          eta={effectiveEta}
          t={t}
          onView={() => {
            const current = splashQueue[0];
            setSplashQueue(q => q.slice(1));
            changeTab('new');
            setSelectedId(current.id);
            setShowDetailMobile(true);
          }}
          onAutoAccept={() => {
            const current = splashQueue[0];
            setSplashQueue(q => q.slice(1));
            handleAccept(current);
          }}
          onReject={() => {
            const current = splashQueue[0];
            setSplashQueue(q => q.slice(1));
            setCancelModal({ orderId: current.id, type: 'reject' });
            setCancelReason('');
          }}
        />
      )}

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div className="flex-none bg-red-500 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 z-20">
          <WifiOff className="w-3.5 h-3.5" />
          {t.offlineBanner}
        </div>
      )}

      {/* ── Paused banner ── */}
      {isPaused && (
        <div className="flex-none bg-amber-500 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 z-20">
          <Pause className="w-3.5 h-3.5" />
          {t.paused_status} — {pauseLeftMins} min
          <button onClick={doUnpause} className="ml-2 underline">{t.resumeOrders}</button>
        </div>
      )}

      {/* ── Active shift banner ── */}
      {activeShift && (
        <div className="flex-none bg-[#06C167] text-white text-xs font-bold py-1.5 px-4 flex items-center gap-2 z-20">
          <span>💰</span>
          <span>{t.shiftOpened} · {shiftDuration}</span>
          <span className="opacity-60">·</span>
          <span>{t.shiftOpeningCash}: {fmt(Number(activeShift.opening_cash), currency)}</span>
          <button
            onClick={() => { setShiftCloseCash(''); setShiftNotes(''); setShiftModal('close'); }}
            className="ml-auto underline text-white/80 hover:text-white"
          >
            {t.shiftClose}
          </button>
        </div>
      )}

      {/* ══ TOP BAR ══ */}
      <header className="flex-none h-14 bg-white border-b border-[#E8E8E8] flex items-center px-3 gap-2 z-10 shadow-sm">
        {/* Hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[#555] hover:bg-[#F5F5F5] transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Restaurant name */}
        <span className="text-sm font-bold text-[#111] truncate max-w-[120px] flex-shrink-0 hidden sm:block">
          {restaurantName}
        </span>

        {/* Tabs */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto px-1">
          <TabBtn
            label={t.tabNew} count={newOrders.length}
            active={activeTab === 'new'} urgent={newOrders.length > 0}
            badgeColor="#EF4444" onClick={() => changeTab('new')}
          />
          <TabBtn
            label={t.tabPrep} count={prepOrders.length}
            active={activeTab === 'prep'} urgent={false}
            badgeColor="#F59E0B" onClick={() => changeTab('prep')}
          />
          <TabBtn
            label={t.tabReady} count={readyOrders.length}
            active={activeTab === 'ready'} urgent={false}
            badgeColor={GREEN} onClick={() => changeTab('ready')}
          />
          <TabBtn
            label={t.en ? 'Sched.' : 'Program.'} count={scheduledOrders.length || null}
            active={activeTab === 'scheduled'} urgent={false}
            badgeColor="#8B5CF6" onClick={() => changeTab('scheduled')}
            icon={<Clock className="w-3.5 h-3.5" />}
          />
          <TabBtn
            label={t.tabHistory} count={null}
            active={activeTab === 'history'} urgent={false}
            badgeColor="#9CA3AF" onClick={() => changeTab('history')}
            icon={<History className="w-3.5 h-3.5" />}
          />
        </nav>

        {/* Online indicator */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-[#06C167] animate-pulse' : 'bg-red-400')} />
          <span className="text-[11px] font-semibold text-[#888] hidden md:block">
            {isOnline ? t.online_status : 'Offline'}
          </span>
        </div>

        {/* Tablet mode link (only in normal mode) */}
        {!tabletMode && (
          <a
            href="/app/counter/tablet"
            title={t.en ? 'Tablet mode' : 'Modo tablet'}
            className="w-9 h-9 rounded-xl items-center justify-center text-[#555] hover:bg-[#F5F5F5] transition-colors flex-shrink-0 hidden lg:flex"
          >
            <Settings2 className="w-4 h-4" />
          </a>
        )}

        {/* Printer settings button */}
        <button
          onClick={() => setPrinterModalOpen(true)}
          title={t.en ? 'Printer settings' : 'Configurar impresora'}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#555] hover:bg-[#F5F5F5] transition-colors flex-shrink-0"
        >
          <Printer className="w-4 h-4" />
        </button>
      </header>

      {/* ══ MAIN LAYOUT ══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Order list (always visible on sm+, hidden on mobile when detail open) ── */}
        <div className={cn(
          'bg-white border-r border-[#E8E8E8] flex flex-col overflow-hidden flex-shrink-0',
          // Mobile: full width list, hidden when viewing detail
          showDetailMobile ? 'hidden sm:flex' : 'flex w-full',
          // Tablet/desktop: fixed sidebar width
          'sm:w-72 lg:w-80',
        )}>
          {/* SLA overdue banner */}
          {activeTab === 'new' && overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
              {t.en
                ? `${overdueCount} order${overdueCount > 1 ? 's' : ''} waiting +${SLA_WARN_MINS} min — respond now!`
                : `${overdueCount} orden${overdueCount > 1 ? 'es' : ''} esperando +${SLA_WARN_MINS} min — ¡responde ya!`
              }
            </div>
          )}

          {/* History search + filters */}
          {activeTab === 'history' && (
            <div className="border-b border-[#F0F0F0]">
              {/* Search */}
              <div className="px-3 pt-3 pb-2">
                <input
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder={t.search}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F5F5F5] text-sm text-[#111] placeholder-[#BBBBBB] focus:outline-none"
                />
              </div>
              {/* Status filter */}
              <div className="flex gap-1.5 px-3 pb-2">
                {(['all', 'delivered', 'cancelled'] as const).map(s => (
                  <button key={s}
                    onClick={() => setHistoryStatus(s)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
                      historyStatus === s
                        ? 'bg-[#111] text-white'
                        : 'bg-[#F5F5F5] text-[#777] hover:bg-[#EBEBEB]'
                    )}
                  >
                    {s === 'all' ? t.filterAll : s === 'delivered' ? t.filterDelivered : t.filterCancelled}
                  </button>
                ))}
              </div>
              {/* Type filter */}
              <div className="flex gap-1.5 px-3 pb-2.5">
                {(['all', 'delivery', 'pickup', 'dine_in'] as const).map(tp => (
                  <button key={tp}
                    onClick={() => setHistoryType(tp)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
                      historyType === tp
                        ? 'bg-[#06C167] text-white'
                        : 'bg-[#F5F5F5] text-[#777] hover:bg-[#EBEBEB]'
                    )}
                  >
                    {tp === 'all' ? t.filterAll : tp === 'delivery' ? t.filterDelivery : tp === 'pickup' ? t.filterPickup : t.filterDineIn}
                  </button>
                ))}
              </div>
              {/* Results count */}
              <div className="px-3 pb-2 text-[11px] text-[#AAAAAA] font-medium">
                {t.results(historyOrders.length)}
              </div>
            </div>
          )}

          {/* Order list */}
          <div className="flex-1 overflow-y-auto">
            {currentList.length === 0 ? (
              <EmptyState tab={activeTab} t={t} />
            ) : (
              currentList.map(o =>
                activeTab === 'history' ? (
                  <HistoryRow
                    key={o.id} order={o} currency={currency} t={t}
                    selected={selectedId === o.id}
                    onClick={() => { setSelectedId(o.id); setShowDetailMobile(true); }}
                  />
                ) : (
                  <OrderRow
                    key={o.id} order={o} currency={currency} tab={activeTab} t={t}
                    selected={selectedId === o.id}
                    isUrgent={activeTab === 'new' && elapsedMins(o.created_at) >= SLA_WARN_MINS}
                    onClick={() => { setSelectedId(o.id); setShowDetailMobile(true); }}
                  />
                )
              )
            )}
          </div>

          {/* Day summary */}
          <div className="flex-none px-4 py-2.5 border-t border-[#F0F0F0] bg-[#FAFAFA]">
            <div className="flex justify-between text-[11px] text-[#AAAAAA]">
              <span>
                {t.todaySummary}:{' '}
                <span className="font-bold text-[#555]">{todayOrders.length} {t.todayOrders}</span>
              </span>
              <span className="font-bold text-[#555]">{fmt(todayRevenue, currency)}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Detail panel ── */}
        <div className={cn(
          'flex-1 flex flex-col overflow-hidden',
          // Mobile: full width when viewing detail, hidden otherwise
          showDetailMobile ? 'flex' : 'hidden sm:flex',
        )}>
          {selectedOrder ? (
            <OrderDetail
              order={selectedOrder}
              currency={currency}
              restaurantName={restaurantName}
              tab={activeTab}
              eta={eta}
              busyExtra={busyExtra}
              suggestedEta={suggestedEta}
              isUpdating={updatingId === selectedOrder.id}
              t={t}
              onBack={() => setShowDetailMobile(false)}
              onSetEta={setEta}
              onAdjustEta={handleAdjustEta}
              onAccept={handleAccept}
              onMarkPreparing={handleMarkPreparing}
              onMarkReady={handleMarkReady}
              onDeliver={handleDeliver}
              onCancelRequest={(type) => {
                setCancelModal({ orderId: selectedOrder.id, type });
                setCancelReason('');
              }}
              onPrint={() => PrinterService.printOrder(
                selectedOrder, selectedOrder.estimated_ready_minutes ?? effectiveEta, restaurantName, currency, locale, taxLabel, taxIncluded
              ).catch(() => {})}
              onAssignDriver={() => {
                const o = selectedOrder as any;
                setDriverModal({
                  orderId: selectedOrder.id,
                  address: selectedOrder.delivery_address ?? undefined,
                  trackingToken: o.driver_tracking_token ?? undefined,
                });
                setDriverName(o.driver_name ?? '');
                setDriverPhone(o.driver_phone ?? '');
              }}
              onTipSaved={() => showSuccess(t.en ? 'Tip saved' : 'Propina guardada')}
              onNotify={async (order) => {
                const res = await sendOrderNotification(order.id, 'ready');
                if (res?.notification) showNotif(res.notification, order.id);
              }}
              lastNotif={notifStatus[selectedOrder.id]}
              taxLabel={taxLabel}
              onEditItems={openEditItems}
              onRemoveItem={handleRemoveItem}
              editSaving={editSaving}
              onPhotoClick={setPhotoLightbox}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-sm">
                {activeTab === 'new' && <Bell className="w-12 h-12 text-[#DDDDDD]" />}
                {activeTab === 'prep' && <Clock className="w-12 h-12 text-[#DDDDDD]" />}
                {activeTab === 'ready' && <CheckCircle className="w-12 h-12 text-[#DDDDDD]" />}
                {activeTab === 'scheduled' && <Clock className="w-12 h-12 text-purple-200" />}
                {activeTab === 'history' && <History className="w-12 h-12 text-[#DDDDDD]" />}
              </div>
              <div>
                <p className="text-[#888] text-xl font-bold">
                  {activeTab === 'new' ? t.waitingOrders :
                   activeTab === 'prep' ? t.noPrepping :
                   activeTab === 'ready' ? t.noReady :
                   activeTab === 'scheduled' ? (t.en ? 'No scheduled orders' : 'Sin órdenes programadas') :
                   t.selectOrder}
                </p>
                {activeTab === 'new' && (
                  <p className="text-[#BBBBBB] text-sm mt-1 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: GREEN }} />
                    {t.connectedRt}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ SIDEBAR ══ */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl">
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

              {/* Busy mode */}
              <SidebarSection title={t.busyMode} icon={<Flame className="w-4 h-4" />}>
                <div className="space-y-1.5">
                  {[{ v: 0, l: t.busyNormal }, { v: 10, l: t.busyAdd10 }, { v: 20, l: t.busyAdd20 }].map(opt => (
                    <label key={opt.v} className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors',
                      busyExtra === opt.v ? 'border-[#06C167] bg-[#06C167]/5' : 'border-[#EEEEEE] hover:border-[#CCCCCC]'
                    )}>
                      <input type="radio" name="busy" checked={busyExtra === opt.v} onChange={() => setBusyExtra(opt.v)} style={{ accentColor: GREEN }} />
                      <span className="text-sm font-medium text-[#111]">{opt.l}</span>
                    </label>
                  ))}
                </div>
              </SidebarSection>

              {/* Pause orders */}
              <SidebarSection title={t.pauseOrders} icon={<Pause className="w-4 h-4" />}>
                {isPaused ? (
                  <button
                    onClick={doUnpause}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-[#06C167]"
                  >
                    {t.resumeOrders}
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {[{ v: 30, l: t.pause30 }, { v: 60, l: t.pause60 }, { v: 120, l: t.pause120 }, { v: 9999, l: t.pauseTomorrow }].map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => doPause(opt.v)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#EEEEEE] hover:border-red-300 hover:bg-red-50 transition-colors text-left"
                      >
                        <span className="text-sm font-medium text-[#111]">{opt.l}</span>
                      </button>
                    ))}
                  </div>
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
              <SidebarSection title="86 / Stock" icon={<span className="text-[11px] font-black text-red-400">86</span>}>
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
                    <span className="text-[#888]">Revenue</span>
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
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setCancelModal(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl z-50 p-5 shadow-2xl">
            <p className="text-base font-bold text-[#111] mb-1">
              {cancelModal.type === 'reject' ? t.rejectOrder : t.cancelOrder}
            </p>
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
              <button onClick={() => setCancelModal(null)} className="flex-1 py-3 rounded-xl text-sm text-[#888] border border-[#EEEEEE]">
                {t.no}
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason || updatingId === cancelModal.orderId}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {t.confirmCancel}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ SPLIT PAYMENT MODAL ══ */}
      {splitPayModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSplitPayModal(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-2xl z-50 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <p className="text-base font-black text-[#111]">{t.en ? '💳 Payment at delivery' : '💳 Cobro al entregar'}</p>
              <p className="text-xs text-[#888] mt-0.5">{t.en ? 'Enter amounts (optional — split if mixed)' : 'Ingresa montos (opcional — divide si es mixto)'}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between items-center py-2 px-3 bg-[#F5F5F5] rounded-xl">
                <span className="text-sm font-bold text-[#111]">{t.total}</span>
                <span className="text-xl font-black text-[#111]">{fmt(Number(splitPayModal.order.total), currency)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#888] uppercase tracking-wide mb-1 block">💵 {t.en ? 'Cash' : 'Efectivo'}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitCash}
                    onChange={e => setSplitCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8E8E8] text-sm text-[#111] focus:outline-none focus:border-[#06C167] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#888] uppercase tracking-wide mb-1 block">💳 {t.en ? 'Card' : 'Tarjeta'}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitCard}
                    onChange={e => setSplitCard(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8E8E8] text-sm text-[#111] focus:outline-none focus:border-[#06C167] bg-white"
                  />
                </div>
              </div>
              {(parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0) > 0 && (
                <div className={cn(
                  'flex justify-between text-xs px-3 py-2 rounded-lg font-semibold',
                  Math.abs(((parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0)) - Number(splitPayModal.order.total)) < 0.01
                    ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                )}>
                  <span>{t.en ? 'Sum' : 'Suma'}</span>
                  <span>{fmt((parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0), currency)}</span>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setSplitPayModal(null)}
                className="flex-1 py-3 rounded-xl text-sm text-[#888] border border-[#EEEEEE]"
              >
                {t.no}
              </button>
              <button
                onClick={handleSplitDeliver}
                disabled={savingSplit || !!updatingId}
                className="flex-1 py-3 rounded-xl text-white text-sm font-black transition-all disabled:opacity-50"
                style={{ background: savingSplit || updatingId ? '#AAA' : '#111' }}
              >
                {savingSplit || updatingId
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  : <>{t.deliveredBtn} ✓</>}
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
                      onClick={() => { setDriverName(d.name); setDriverPhone(d.phone); }}
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
                onChange={e => setDriverName(e.target.value)}
                placeholder={t.en ? 'Driver name' : 'Nombre del repartidor'}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E8E8] text-sm focus:outline-none focus:border-[#06C167]"
              />
              <input
                value={driverPhone}
                onChange={e => setDriverPhone(e.target.value)}
                placeholder="WhatsApp"
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
                {assigningDriver ? '…' : driverPhone ? `📲 ${t.assignDriver}` : t.assignDriver}
              </button>
            </div>
            {/* Print driver sheet with QR */}
            {driverModal?.trackingToken && (
              <button
                onClick={async () => {
                  const appUrl = window.location.origin;
                  const trackingUrl = `${appUrl}/driver/track/${driverModal.trackingToken}`;

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

      {/* ══ TOASTS ══ */}
      {errorToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold shadow-xl animate-in fade-in slide-in-from-bottom-4 max-w-sm text-center">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errorToast}
        </div>
      )}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-bold shadow-xl animate-in fade-in slide-in-from-bottom-4" style={{ background: GREEN }}>
          <Check className="w-4 h-4" /> {successToast}
        </div>
      )}
      {notifToast && (
        <div className={cn(
          'fixed bottom-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-semibold shadow-xl animate-in fade-in slide-in-from-bottom-4 max-w-xs',
          notifToast.ok ? 'bg-[#0A8A47]' : 'bg-amber-500'
        )}>
          <MessageCircle className="w-4 h-4 flex-shrink-0" /> {notifToast.text}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TabBtn
// ══════════════════════════════════════════════════════════════════════════════

function TabBtn({
  label, count, active, urgent, badgeColor, onClick, icon,
}: {
  label: string; count: number | null; active: boolean; urgent: boolean;
  badgeColor: string; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0',
        active ? 'bg-[#111] text-white shadow-sm' : 'text-[#888] hover:text-[#111] hover:bg-[#F5F5F5]'
      )}
    >
      {icon && <span className={active ? 'text-white' : 'text-[#BBBBBB]'}>{icon}</span>}
      {label}
      {count !== null && count > 0 && (
        <span
          className={cn(
            'text-[11px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
            urgent && !active ? 'animate-pulse' : ''
          )}
          style={{
            background: active ? 'rgba(255,255,255,0.25)' : badgeColor + '22',
            color: active ? '#fff' : badgeColor,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OrderRow — left panel row
// ══════════════════════════════════════════════════════════════════════════════

function OrderRow({
  order, currency, tab, t, selected, isUrgent, onClick,
}: {
  order: Order; currency: string; tab: Tab; t: ReturnType<typeof getT>;
  selected: boolean; isUrgent: boolean; onClick: () => void;
}) {
  const TypeIcon = TYPE_ICON[order.order_type ?? 'dine_in'] ?? Utensils;
  const mins = elapsedMins(order.created_at);
  const secs = elapsedSecs(order.created_at);
  const etaMins = order.estimated_ready_minutes;
  const countdownSecs = etaMins != null ? etaMins * 60 - secs : null;
  const isLate = countdownSecs !== null && countdownSecs < 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-4 border-b border-[#F5F5F5] transition-all border-l-4',
        selected ? 'bg-[#F0FDF4] border-l-[#06C167]' : 'hover:bg-[#FAFAFA] border-l-transparent',
        isUrgent && !selected ? 'bg-red-50 border-l-red-400' : ''
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <TypeIcon className="w-3.5 h-3.5 text-[#AAAAAA] flex-shrink-0" />
            <span className="text-[13px] font-black text-[#111]">#{order.order_number}</span>
            <span className={cn(
              'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
              order.order_type === 'delivery' ? 'bg-blue-100 text-blue-600' :
              order.order_type === 'pickup' ? 'bg-purple-100 text-purple-600' :
              'bg-orange-100 text-orange-600'
            )}>
              {getTypeLabel(order.order_type, t).toUpperCase()}
            </span>
            {isUrgent && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-500">
                {t.urgent}
              </span>
            )}
          </div>
          <p className="text-xs text-[#888] truncate">{order.customer_name || 'Cliente'}</p>
          <p className="text-xs font-bold text-[#111] mt-1">{fmt(Number(order.total), currency)}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          {tab === 'prep' && countdownSecs !== null ? (
            <div className={cn('text-xs font-black tabular-nums', isLate ? 'text-red-500' : 'text-[#06C167]')}>
              {isLate ? '−' : ''}{fmtCountdown(countdownSecs)}
            </div>
          ) : tab === 'scheduled' && order.scheduled_for ? (
            <div className="text-[10px] font-bold text-purple-500 text-right">
              {new Date(order.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <div className="text-[9px] text-purple-300">{new Date(order.scheduled_for).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
            </div>
          ) : (
            <div className={cn('text-xs font-semibold tabular-nums', isUrgent ? 'text-red-500' : 'text-[#AAAAAA]')}>
              {mins}m
            </div>
          )}
          {tab === 'ready' && (
            <div className="text-[10px] text-[#06C167] font-bold mt-0.5">✓</div>
          )}
        </div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HistoryRow
// ══════════════════════════════════════════════════════════════════════════════

function HistoryRow({
  order, currency, t, selected, onClick,
}: {
  order: Order; currency: string; t: ReturnType<typeof getT>;
  selected: boolean; onClick: () => void;
}) {
  const ok = order.status === 'delivered';
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 border-b border-[#F5F5F5] transition-all',
        selected ? 'bg-[#F5F5F5]' : 'hover:bg-[#FAFAFA]'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', ok ? 'bg-[#06C167]' : 'bg-red-400')} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#111]">#{order.order_number}</span>
            <span className="text-xs font-bold text-[#111]">{fmt(Number(order.total), currency)}</span>
          </div>
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-xs text-[#888] truncate">{order.customer_name || '—'}</span>
            <span className={cn('text-[10px] font-semibold ml-2 flex-shrink-0', ok ? 'text-[#06C167]' : 'text-red-400')}>
              {ok ? t.delivered : t.cancelled}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EmptyState
// ══════════════════════════════════════════════════════════════════════════════

function EmptyState({ tab, t }: { tab: Tab; t: ReturnType<typeof getT> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-[#CCCCCC] py-16">
      {tab === 'new' && <Bell className="w-10 h-10" />}
      {tab === 'prep' && <Clock className="w-10 h-10" />}
      {tab === 'ready' && <CheckCircle className="w-10 h-10" />}
      {tab === 'scheduled' && <Calendar className="w-10 h-10" />}
      {tab === 'history' && <History className="w-10 h-10" />}
      <p className="text-sm text-[#BBBBBB]">
        {tab === 'new' ? t.waitingOrders :
         tab === 'prep' ? t.noPrepping :
         tab === 'ready' ? t.noReady :
         tab === 'scheduled' ? (t.en ? 'No scheduled orders' : 'Sin órdenes programadas') :
         t.noHistory}
      </p>
      {tab === 'new' && (
        <p className="text-xs text-[#DDDDDD] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: '#06C167' }} />
          {t.connectedRt}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OrderDetail — right panel
// ══════════════════════════════════════════════════════════════════════════════

function OrderDetail({
  order, currency, restaurantName, tab, eta, busyExtra, suggestedEta, isUpdating, t,
  onBack, onSetEta, onAdjustEta, onAccept, onMarkPreparing, onMarkReady, onDeliver,
  onCancelRequest, onPrint, onAssignDriver, onTipSaved, onNotify, lastNotif,
  taxLabel, onEditItems, onRemoveItem, editSaving, onPhotoClick,
}: {
  order: Order; currency: string; restaurantName: string; tab: Tab;
  eta: number; busyExtra: number; suggestedEta?: number | null; isUpdating: boolean;
  t: ReturnType<typeof getT>;
  onBack: () => void;
  onSetEta: (v: number) => void;
  onAdjustEta: (o: Order, v: number) => void;
  onAccept: (o: Order) => void;
  onMarkPreparing: (o: Order) => void;
  onMarkReady: (o: Order) => void;
  onDeliver: (o: Order) => void;
  onCancelRequest: (type: 'reject' | 'cancel') => void;
  onPrint: () => void;
  onAssignDriver: () => void;
  onTipSaved?: (orderId: string, tip: number) => void;
  onNotify: (order: Order) => Promise<void>;
  lastNotif?: { channel: string; success: boolean; error?: string; time: number };
  taxLabel?: string;
  onEditItems?: (orderId: string) => void;
  onRemoveItem?: (orderId: string, itemId: string) => void;
  editSaving?: boolean;
  onPhotoClick?: (url: string) => void;
}) {
  const secs = elapsedSecs(order.created_at);
  const mins = elapsedMins(order.created_at);
  const etaMins = order.estimated_ready_minutes;
  const countdownSecs = etaMins != null ? etaMins * 60 - secs : null;
  const isLate = countdownSecs !== null && countdownSecs < 0;
  const isUrgent = tab === 'new' && mins >= SLA_WARN_MINS;
  const effectiveEta = eta + busyExtra;
  const TypeIcon = TYPE_ICON[order.order_type ?? 'dine_in'] ?? Utensils;
  const table = (order as any).table?.name ?? (order as any).table_name ?? null;
  const subtotal = (order.items ?? []).reduce((s, i) => s + (i.line_total ?? i.unit_price * i.qty), 0);
  const [tipInput, setTipInput] = useState('');
  const [savingTip, setSavingTip] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);

  // Header bg color
  const headerBg =
    tab === 'ready' ? GREEN :
    isUrgent ? '#EF4444' :
    '#111111';

  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [notifying, setNotifying] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Detail Header ── */}
      <div
        className="flex-none px-5 py-4 transition-colors duration-300"
        style={{ background: headerBg }}
      >
        {/* Back button (mobile) + order info */}
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="sm:hidden w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0 mt-0.5"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-black text-2xl leading-tight truncate">{order.customer_name || 'Cliente'}</span>
              <span className="text-white/60 text-base">·</span>
              <span className="text-white font-bold text-base">#{order.order_number}</span>
              {isUrgent && (
                <span className="text-white bg-white/20 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {t.urgent}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <TypeIcon className="w-3 h-3" />
                <span>{getTypeLabel(order.order_type, t)}</span>
                {table && <span>· {table}</span>}
              </div>
              <span className="text-white/50 text-xs">·</span>
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <Clock className="w-3 h-3" />
                <span>{timeAgo(order.created_at, t)}</span>
              </div>
            </div>
            {lastNotif && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  lastNotif.success
                    ? 'bg-white/20 text-white/90'
                    : 'bg-white/10 text-white/50'
                )}>
                  <MessageCircle className="w-2.5 h-2.5" />
                  {lastNotif.channel === 'whatsapp' && 'WhatsApp'}
                  {lastNotif.channel === 'sms' && 'SMS'}
                  {lastNotif.channel === 'email' && 'Email'}
                  {lastNotif.channel === 'none' && (t.en ? 'Not sent' : 'No enviado')}
                  {lastNotif.success ? ` · ${t.en ? 'sent' : 'enviado'}` : ` · ${t.en ? 'failed' : 'fallido'}`}
                  {' · '}{Math.round((Date.now() - lastNotif.time) / 60_000) < 1
                    ? (t.en ? 'just now' : 'ahora')
                    : `${Math.round((Date.now() - lastNotif.time) / 60_000)}m`}
                </span>
              </div>
            )}
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1.5 flex-shrink-0 relative">
            <button onClick={onPrint}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Print">
              <Printer className="w-4 h-4 text-white" />
            </button>
            {/* More actions (call / WhatsApp manual override) */}
            {order.customer_phone && (
              <div className="relative">
                <button
                  onClick={() => setMoreActionsOpen(v => !v)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  title={t.moreActions}
                >
                  <Settings2 className="w-4 h-4 text-white" />
                </button>
                {moreActionsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMoreActionsOpen(false)} />
                    <div className="absolute right-0 top-11 z-50 bg-white rounded-xl shadow-2xl border border-[#E8E8E8] overflow-hidden min-w-[180px]">
                      <a
                        href={`tel:${order.customer_phone}`}
                        onClick={() => setMoreActionsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[#111] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <Phone className="w-4 h-4 text-[#888]" /> {t.callCustomer}
                      </a>
                      <a
                        href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={() => setMoreActionsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[#111] hover:bg-[#F5F5F5] transition-colors border-t border-[#F5F5F5]"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25D366]" /> WhatsApp
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
            {/* Cancel/Reject button */}
            <button
              onClick={() => onCancelRequest(tab === 'new' ? 'reject' : 'cancel')}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-red-500/70 flex items-center justify-center transition-colors"
              title={tab === 'new' ? t.rejectOrder : t.cancelOrder}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Order flow progress ── */}
      {tab !== 'history' && (
        <div className="flex-none px-5 py-2.5 bg-[#FAFAFA] border-b border-[#F0F0F0]">
          <div className="flex items-center gap-1">
            {[
              { key: 'pending',   label: t.tabNew,  color: '#EF4444' },
              { key: 'confirmed', label: t.en ? 'Confirmed' : 'Confirmada', color: '#F59E0B' },
              { key: 'preparing', label: t.tabPrep, color: '#8B5CF6' },
              { key: 'ready',     label: t.tabReady, color: '#06C167' },
              { key: 'delivered', label: t.deliveredBtn, color: '#111' },
            ].map((step, i, arr) => {
              const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
              const currentIdx = statuses.indexOf(order.status);
              const stepIdx = statuses.indexOf(step.key);
              const isDone = stepIdx < currentIdx;
              const isActive = stepIdx === currentIdx;
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all"
                      style={{
                        background: isDone ? '#06C167' : isActive ? step.color : '#E5E7EB',
                        color: isDone || isActive ? '#fff' : '#9CA3AF',
                      }}
                    >
                      {isDone ? '✓' : i + 1}
                    </div>
                    <p
                      className="text-[9px] font-semibold mt-0.5 leading-tight text-center max-w-[48px] truncate"
                      style={{ color: isActive ? step.color : isDone ? '#06C167' : '#9CA3AF' }}
                    >
                      {step.label}
                    </p>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-1 rounded-full transition-all"
                      style={{ background: isDone ? '#06C167' : '#E5E7EB' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-4">

          {/* ETA bar (prep tab only) — compact, no giant clock */}
          {tab === 'prep' && (
            <div className="bg-white rounded-2xl border-2 border-[#E8E8E8] px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#888] flex-shrink-0" />
                <span className="text-sm font-semibold text-[#888]">{t.eta}</span>
                <span className={cn('text-sm font-black tabular-nums', isLate ? 'text-red-500' : 'text-[#111]')}>
                  {etaMins ?? effectiveEta} min
                  {isLate && <span className="ml-1 text-[10px] font-bold text-red-400 uppercase">{t.overdue}</span>}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[-5, +5].map(delta => {
                  const current = etaMins ?? effectiveEta;
                  const newVal = Math.max(1, current + delta);
                  return (
                    <button
                      key={delta}
                      onClick={() => onAdjustEta(order, newVal)}
                      disabled={isUpdating}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-black border transition-all active:scale-95 disabled:opacity-40',
                        delta < 0
                          ? 'border-[#E8E8E8] text-[#888] bg-white hover:bg-[#F5F5F5]'
                          : 'border-[#E8E8E8] text-[#888] bg-white hover:bg-[#F5F5F5]'
                      )}
                    >
                      {delta > 0 ? '+' : ''}{delta}m
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ETA selector (new tab only) */}
          {tab === 'new' && (
            <div className="bg-white rounded-2xl p-5 border-2 border-[#E8E8E8]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-widest">{t.eta}</p>
                {suggestedEta && (
                  <button
                    onClick={() => onSetEta(suggestedEta)}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    <MapPin className="w-2.5 h-2.5" />
                    {t.en ? `~${suggestedEta} min suggested` : `~${suggestedEta} min sugerido`}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => onSetEta(Math.max(5, eta - 5))}
                  className="w-12 h-12 rounded-xl border-2 border-[#E8E8E8] text-[#555] font-black text-lg hover:border-[#CCC] active:scale-95 transition-all"
                >
                  −
                </button>
                <div className="text-center min-w-[80px]">
                  <span className="text-4xl font-black text-[#111] tabular-nums">{effectiveEta}</span>
                  <p className="text-xs text-[#888] font-semibold mt-0.5">min</p>
                </div>
                <button
                  onClick={() => onSetEta(Math.min(60, eta + 5))}
                  className="w-12 h-12 rounded-xl border-2 border-[#E8E8E8] text-[#555] font-black text-lg hover:border-[#CCC] active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
              {busyExtra > 0 && (
                <p className="text-xs text-center text-[#F59E0B] font-semibold mt-2">
                  +{busyExtra} min {t.busyMode} → {effectiveEta} min
                </p>
              )}
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-2xl border-2 border-[#E8E8E8] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F5F5F5] flex items-center justify-between">
              <p className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-widest">
                {t.items((order.items ?? []).reduce((s, i) => s + i.qty, 0))}
              </p>
              {onEditItems && !['delivered', 'completed', 'cancelled'].includes(order.status) && (
                <div className="flex items-center gap-1.5">
                  {isEditingItems ? (
                    <>
                      <button
                        onClick={() => { onEditItems(order.id); }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#06C167]/10 text-[#06C167] text-[11px] font-semibold hover:bg-[#06C167]/20 transition-colors"
                      >
                        <span className="text-xs font-bold">+</span>
                        {t.en ? 'Add' : 'Agregar'}
                      </button>
                      <button
                        onClick={() => setIsEditingItems(false)}
                        className="px-2.5 py-1 rounded-lg bg-[#111] text-white text-[11px] font-semibold hover:bg-[#333] transition-colors"
                      >
                        {t.en ? 'Done' : 'Listo'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingItems(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F5F5] text-[#555] text-[11px] font-semibold hover:bg-[#EAEAEA] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      {t.en ? 'Edit' : 'Editar'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 divide-y divide-[#F5F5F5]">
              {(order.items ?? []).map((item, idx) => (
                <ItemRow
                  key={item.id ?? idx}
                  item={item}
                  currency={currency}
                  canRemove={isEditingItems && !!onRemoveItem && !['delivered', 'completed', 'cancelled'].includes(order.status) && (order.items ?? []).length > 1}
                  onRemove={() => item.id && onRemoveItem?.(order.id, item.id)}
                  removing={editSaving}
                />
              ))}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="mx-5 mb-4 mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-700 italic">{order.notes}</p>
              </div>
            )}

            {/* Delivery address + driver */}
            {order.order_type === 'delivery' && (
              <div className="mx-5 mb-4 mt-2 space-y-2">
                {order.delivery_address && (
                  <div className="flex items-start gap-2 bg-[#F5F5F5] rounded-xl px-3 py-2.5">
                    <MapPin className="w-3.5 h-3.5 text-[#888] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-bold underline"
                        style={{ color: GREEN }}
                      >
                        {t.viewOnMap}
                      </a>
                      <p className="text-xs text-[#555] mt-0.5 break-words">{order.delivery_address}</p>
                    </div>
                  </div>
                )}
                {(order as any).driver_name ? (
                  <>
                    <button onClick={onAssignDriver} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-[#06C167]/30 bg-[#06C167]/5 hover:bg-[#06C167]/10 transition-colors text-left">
                      <span className="text-base">🛵</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#06C167]">{t.driver}</p>
                        <p className="text-xs text-[#555] truncate">
                          {(order as any).driver_name}
                          {(order as any).driver_phone ? ` · ${(order as any).driver_phone}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#888]">{t.editDriver}</span>
                    </button>
                    {(order as any).delivery_photo_url && (
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => onPhotoClick?.((order as any).delivery_photo_url)}
                          className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-[#E8E8E8] hover:border-[#06C167] transition-colors flex-shrink-0 group"
                          title={t.en ? 'View delivery proof' : 'Ver foto de entrega'}
                        >
                          <Image src={(order as any).delivery_photo_url} alt="Delivery proof" fill className="object-cover group-hover:scale-105 transition-transform" sizes="56px" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider">📷 {t.en ? 'Delivery proof' : 'Foto de entrega'}</p>
                          <button onClick={() => onPhotoClick?.((order as any).delivery_photo_url)} className="text-xs text-[#06C167] font-semibold mt-0.5">
                            {t.en ? 'View full photo →' : 'Ver foto completa →'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button onClick={onAssignDriver} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-[#DDDDDD] text-[#888] hover:border-[#06C167] hover:text-[#06C167] transition-colors text-sm font-semibold">
                    🛵 {t.assignDriver}
                  </button>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="px-5 py-3 border-t border-[#F5F5F5] bg-[#FAFAFA] space-y-1">
              {subtotal !== Number(order.total) && (
                <div className="flex justify-between text-xs text-[#888]">
                  <span>Subtotal</span><span>{fmt(subtotal, currency)}</span>
                </div>
              )}
              {(order.tax_amount ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-[#888]">
                  <span>{taxLabel ?? (t.en ? 'Tax' : 'Impuestos')}</span>
                  <span>{fmt(order.tax_amount!, currency)}</span>
                </div>
              )}
              {(order.delivery_fee ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-[#888]">
                  <span>{t.en ? 'Delivery fee' : 'Envío'}</span>
                  <span>{fmt(order.delivery_fee!, currency)}</span>
                </div>
              )}
              {(order.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-xs" style={{ color: GREEN }}>
                  <span>{t.en ? 'Discount' : 'Descuento'}</span>
                  <span>−{fmt(order.discount_amount!, currency)}</span>
                </div>
              )}
              {(order.tip_amount ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-[#888]">
                  <span>💵 {t.en ? 'Tip' : 'Propina'}</span>
                  <span>{fmt(order.tip_amount!, currency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-[#EEEEEE]">
                <span className="text-sm font-bold text-[#111]">{t.total}</span>
                <span className="text-2xl font-black text-[#111]">{fmt(Number(order.total), currency)}</span>
              </div>
              {order.payment_method && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#AAAAAA] uppercase tracking-wide font-semibold">{t.payment}:</span>
                  <span className="text-[11px] font-bold text-[#555]">
                    {order.payment_method === 'cash' ? `💵 ${t.cash}` :
                     order.payment_method === 'online' ? `💳 ${t.online}` :
                     `📱 ${t.wallet}`}
                  </span>
                </div>
              )}
              {/* Cash tip input — only for cash payment orders in active tabs */}
              {order.payment_method === 'cash' && tab !== 'history' && (
                <div className="pt-2 border-t border-[#EEEEEE]">
                  <p className="text-[10px] text-[#AAAAAA] uppercase tracking-wide font-semibold mb-1.5">
                    {t.en ? 'Add tip' : 'Agregar propina'}
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888] text-xs font-medium">
                        {currency === 'USD' ? '$' : currency === 'MXN' ? '$' : currency}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={tipInput}
                        onChange={e => setTipInput(e.target.value)}
                        placeholder={order.tip_amount ? String(order.tip_amount) : '0.00'}
                        className="w-full pl-6 pr-2 py-2 rounded-lg border border-[#E8E8E8] bg-white text-sm text-[#111] focus:outline-none focus:border-[#06C167]"
                      />
                    </div>
                    <button
                      disabled={savingTip || !tipInput}
                      onClick={async () => {
                        const val = parseFloat(tipInput);
                        if (isNaN(val) || val < 0) return;
                        setSavingTip(true);
                        const res = await updateOrderTip(order.id, val);
                        setSavingTip(false);
                        if (!res?.error) {
                          setTipInput('');
                          onTipSaved?.(order.id, val);
                        }
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-40"
                      style={{ background: savingTip ? '#AAA' : GREEN }}
                    >
                      {savingTip ? '…' : t.en ? 'Save' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex-none p-4 bg-white border-t border-[#E8E8E8] space-y-2">

        {/* NEW tab: confirm button */}
        {tab === 'new' && (
          <button
            disabled={isUpdating}
            onClick={() => onAccept(order)}
            className="w-full h-16 rounded-2xl text-white text-lg font-black flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: isUpdating ? '#AAA' : GREEN }}
          >
            {isUpdating
              ? <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Check className="w-6 h-6" /> {t.confirmBtn(effectiveEta)}</>}
          </button>
        )}

        {/* PREP tab: mark preparing (only if still confirmed) + mark ready */}
        {tab === 'prep' && (
          <>
            {order.status === 'confirmed' && (
              <button
                disabled={isUpdating}
                onClick={() => onMarkPreparing(order)}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border-2 transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: '#EDE9FE', borderColor: '#C4B5FD', color: '#6D28D9' }}
              >
                {isUpdating
                  ? <span className="w-4 h-4 border-2 border-violet-400/40 border-t-violet-600 rounded-full animate-spin" />
                  : <>{t.en ? '👨‍🍳 Start preparing' : '👨‍🍳 Iniciar preparación'}</>}
              </button>
            )}
            <button
              disabled={isUpdating}
              onClick={() => onMarkReady(order)}
              className="w-full h-16 rounded-2xl text-white text-lg font-black flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: isUpdating ? '#AAA' : GREEN }}
            >
              {isUpdating
                ? <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CheckCircle className="w-6 h-6" /> {t.readyBtn(order.order_type)} <ChevronRight className="w-5 h-5" /></>}
            </button>
          </>
        )}

        {/* READY tab: resend notification + delivered */}
        {tab === 'ready' && (
          <>
            {order.customer_phone && (
              <button
                disabled={notifying}
                onClick={async () => {
                  setNotifying(true);
                  await onNotify(order);
                  setNotifying(false);
                }}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border-2 transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: '#DCFCE7', borderColor: '#86EFAC', color: '#15803D' }}
              >
                {notifying
                  ? <span className="w-4 h-4 border-2 border-green-400/40 border-t-green-600 rounded-full animate-spin" />
                  : <><MessageCircle className="w-4 h-4" /> {t.notifyCustomer}</>}
              </button>
            )}
            <button
              disabled={isUpdating}
              onClick={() => onDeliver(order)}
              className="w-full h-14 rounded-xl text-white text-base font-black flex items-center justify-center gap-2 shadow transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: isUpdating ? '#AAA' : '#111' }}
            >
              {isUpdating
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Check className="w-5 h-5" /> {t.deliveredBtn}</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ItemRow
// ══════════════════════════════════════════════════════════════════════════════

function ItemRow({ item, currency, canRemove, onRemove, removing }: {
  item: OrderItem; currency: string;
  canRemove?: boolean; onRemove?: () => void; removing?: boolean;
}) {
  const raw = item as any;
  const variantName = item.variant?.name ?? null;

  const rawExtras: any[] = item.extras ?? raw.order_item_extras ?? [];
  const extras = rawExtras
    .map((ex: any) => ({ name: ex.extra?.name ?? ex.product_extras?.name ?? null, price: Number(ex.price ?? 0) }))
    .filter((ex: any) => ex.name);

  const rawMods: any[] = raw.order_item_modifiers ?? [];
  const modGroups = new Map<string, Array<{ option: string; delta: number }>>();
  for (const m of rawMods) {
    if (!m.option_name) continue;
    const grp = m.group_name ?? 'Options';
    if (!modGroups.has(grp)) modGroups.set(grp, []);
    modGroups.get(grp)!.push({ option: m.option_name, delta: Number(m.price_delta ?? 0) });
  }

  const hasCustomization = variantName || extras.length > 0 || modGroups.size > 0;

  return (
    <div className="flex items-start gap-3 py-3.5">
      {/* Qty badge always visible */}
      <span className="flex-none w-8 h-8 rounded-lg border-2 border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-center text-sm font-black text-[#111]">
        {item.qty}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[#111] text-sm font-bold leading-tight">{item.product?.name ?? '—'}</p>
        {hasCustomization && (
          <div className="mt-1 space-y-0.5">
            {variantName && <p className="text-[#666] text-xs">↳ {variantName}</p>}
            {Array.from(modGroups.entries()).map(([grpName, options]) => (
              <div key={grpName}>
                <p className="text-[#AAAAAA] text-[10px] uppercase font-bold tracking-wide mt-1">{grpName}</p>
                {options.map((opt, i) => (
                  <p key={i} className="text-[#666] text-xs flex justify-between">
                    <span>• {opt.option}</span>
                    {opt.delta > 0 && <span className="text-[#888]">+{fmt(opt.delta, currency)}</span>}
                  </p>
                ))}
              </div>
            ))}
            {extras.map((ex, i) => (
              <p key={i} className="text-[#666] text-xs flex justify-between">
                <span>+ {ex.name}</span>
                {ex.price > 0 && <span className="text-[#888]">+{fmt(ex.price, currency)}</span>}
              </p>
            ))}
          </div>
        )}
        {item.notes && <p className="text-amber-600 text-xs mt-1 italic font-medium">★ {item.notes}</p>}
      </div>
      <div className="flex-none flex items-center gap-2">
        <span className="text-sm font-bold text-[#111]">
          {fmt(item.line_total ?? item.unit_price * item.qty, currency)}
        </span>
        {/* Remove button — only visible in edit mode, on the right */}
        {canRemove && (
          <button
            onClick={onRemove}
            disabled={removing}
            className="w-7 h-7 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
            title="Remove item"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

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

// ══════════════════════════════════════════════════════════════════════════════
// NewOrderSplash — full screen flash identical to Uber Eats
// ══════════════════════════════════════════════════════════════════════════════

const SPLASH_SECS = 30; // seconds before auto-accept
const RING_SIZE = 72;
const RING_R = 30;
const RING_CIRC = 2 * Math.PI * RING_R;

function NewOrderSplash({
  order, currency, queueCount, eta, t, onView, onAutoAccept, onReject,
}: {
  order: Order; currency: string; queueCount: number; eta: number;
  t: ReturnType<typeof getT>; onView: () => void; onAutoAccept: () => void;
  onReject?: () => void;
}) {
  const totalQty = (order.items ?? []).reduce((s, i) => s + i.qty, 0);
  const [secsLeft, setSecsLeft] = useState(SPLASH_SECS);
  const autoAcceptFired = useRef(false);

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => setSecsLeft(s => s - 1), 1_000);
    return () => clearInterval(id);
  }, []);

  // Fire auto-accept when countdown hits 0
  useEffect(() => {
    if (secsLeft <= 0 && !autoAcceptFired.current) {
      autoAcceptFired.current = true;
      onAutoAccept();
    }
  }, [secsLeft, onAutoAccept]);

  // Repeat sound every 3 seconds until dismissed — identical to Uber Eats
  useEffect(() => {
    const id = setInterval(playNewOrderSound, 3_000);
    return () => clearInterval(id);
  }, []);

  const progress = Math.max(0, secsLeft / SPLASH_SECS);
  const dash = RING_CIRC * progress;

  // Top 3 items for preview
  const previewItems = (order.items ?? []).slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: GREEN }}
    >
      {/* Countdown ring */}
      <div className="relative mb-4" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
            fill="none" stroke="white" strokeWidth="5"
            strokeDasharray={`${dash} ${RING_CIRC}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-black text-2xl">{secsLeft}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <p className="text-white/80 text-lg font-bold uppercase tracking-widest">{t.newOrder}</p>
        {queueCount > 1 && (
          <span className="bg-white/25 text-white text-sm font-black px-3 py-1 rounded-full">
            +{queueCount - 1}
          </span>
        )}
      </div>

      <p className="text-white font-black mb-1 text-center px-6" style={{ fontSize: 48, lineHeight: 1.1 }}>
        {order.customer_name || 'Cliente'}
      </p>
      <p className="text-white/80 text-2xl font-bold mb-1">#{order.order_number}</p>

      <div className="flex items-center gap-3 text-white/70 text-base mt-1 mb-3">
        <span>{t.items(totalQty)}</span>
        {order.order_type && (
          <><span>·</span><span>{getTypeLabel(order.order_type, t)}</span></>
        )}
      </div>

      {/* Item preview cards */}
      {previewItems.length > 0 && (
        <div className="flex gap-2 mb-4 px-4 max-w-sm w-full">
          {previewItems.map((item, i) => {
            const img = (item as any).product?.image_url;
            const name = (item as any).product?.name ?? 'Item';
            return (
              <div key={i} className="flex-1 bg-white/20 rounded-xl p-2.5 flex items-center gap-2 min-w-0">
                {img ? (
                  <img src={img} alt={name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/30 flex-shrink-0 flex items-center justify-center text-base">🍽️</div>
                )}
                <div className="min-w-0">
                  <p className="text-white text-[11px] font-bold truncate">{item.qty}x {name}</p>
                </div>
              </div>
            );
          })}
          {(order.items ?? []).length > 3 && (
            <div className="bg-white/20 rounded-xl px-3 flex items-center">
              <span className="text-white text-sm font-bold">+{(order.items ?? []).length - 3}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-white font-black mb-6" style={{ fontSize: 40 }}>
        {fmt(order.total, currency)}
      </p>

      {/* Accept / Reject buttons — Uber Eats style */}
      <div className="flex gap-4 px-6 w-full max-w-sm">
        {onReject && (
          <button
            onClick={e => { e.stopPropagation(); onReject(); }}
            className="flex-1 h-16 rounded-2xl bg-black/30 font-extrabold text-lg text-white border-2 border-white/30 active:scale-[0.97] transition-transform"
          >
            {t.en ? 'Reject' : 'Rechazar'}
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onView(); }}
          className="flex-[2] h-16 rounded-2xl bg-white font-extrabold text-xl flex items-center justify-center gap-3 shadow-xl active:scale-[0.97] transition-transform"
          style={{ color: GREEN }}
        >
          {queueCount > 1 ? `${t.viewOrder} (${queueCount - 1}+)` : t.viewOrder}
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <p className="text-white/50 text-xs mt-5">
        {t.tapAnywhere} {secsLeft}s
      </p>
    </div>
  );
}
