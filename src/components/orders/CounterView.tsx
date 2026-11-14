'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Menu, X, Bell, Check, CheckCircle, Clock, ChevronLeft,
  Truck, ShoppingBag, Utensils, MessageCircle, Phone,
  MapPin, Pause, Flame, Printer, History, AlertTriangle,
  Wifi, WifiOff, ChevronRight, ChevronDown, User, Settings2, Calendar, Plus, Ban, BellOff, Palette, Wallet,
} from 'lucide-react';
import { useRealtimeOrders, type RealtimeConnectionStatus } from '@/hooks/use-realtime-orders';
import { useLeaderTab } from '@/hooks/use-leader-tab';
import {
  updateOrderStatus, updateOrderETA, setPauseOrders, assignDriver, updateOrderTip,
  sendOrderNotification, openShift, closeShift, getActiveShift, getTodaySummary,
  fetchOrderStatusHistory, getFlaggedCustomers,
} from '@/lib/actions/restaurant';
import { isOrderIncident, type CustomerFlag } from '@/lib/customer-incidents';
import { PrinterService } from '@/lib/printing/PrinterService';
import { getCounterAppBridge, isMeniusNativePrintAvailable } from '@/lib/printing/native-bridge';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { PrinterConfig } from '@/lib/printing/PrinterConfig';
import type { PrinterConfigData } from '@/lib/printing/PrinterConfig';
import type { Order, OrderItem } from '@/types';
import { cn } from '@/lib/utils';
import { isRevenueStatus } from '@/lib/order-state';
import { C, RAISED, counterText, nearestChoice, suggestedPrep, waitingSince, SCHEDULED_LEAD_MS } from './counter/ui';
import {
  getAudioCtx, unlockWithGesture, loadTheme, setSoundTheme, setVolume as setAudioVolume, resumeAudio,
  playRing, stopRing, playAccepted, ringKind, loopIntervalMs, msUntilNextRing,
} from './counter/audio';
import { CustomizePanel, type AppearancePreview } from './counter/CustomizePanel';
import { useCounterDemo, isDemoId, DEMO_URGENT_AFTER_SECONDS } from './counter/demo';
import { useCounterSettings } from '@/hooks/use-counter-settings';
import { DEFAULT_COUNTER_SETTINGS, type CounterSettings } from '@/lib/counter-settings';
import { getScreenTheme, resolveThemeTokens, themeCssVars } from '@/lib/counter-themes';
import { CounterBoard, type PrimaryKind } from './counter/CounterBoard';
import { NewOrdersAlert } from './counter/NewOrdersAlert';
import { OrderSheet } from './counter/OrderSheet';
import { OwnerPanelButton } from './counter/OwnerPanelButton';
import {
  CounterTopBar, StoreStatusSheet, OrdersListView, CounterToast, DemoBanner,
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
    // Clientes problema (customer-incidents): marcan al cliente para su próximo pedido.
    incidentTitle: en ? 'Customer problem (flags the customer)' : 'Problema con el cliente (lo marca)',
    incidentNotHome: en ? "Customer wasn't there / didn't take it" : 'No estaba / no lo recibió',
    incidentNoShow: en ? 'Customer never picked it up' : 'Nunca vino a buscarlo',
    incidentNotPaid: en ? "Customer didn't pay" : 'No pagó',
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
    soundOffBanner: en
      ? 'Sound is off — tap here to turn on new-order alerts'
      : 'Sonido apagado — toca aquí para activar el aviso de pedidos',
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
// El motor (Web Audio: temas, volumen, alerta en loop, urgente, aceptadas al
// azar, respaldo a new-order.mp3 / order-accepted.mp3) vive en ./counter/audio.

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
  /** Counter a pantalla completa (/counter): muestra "Panel del dueño" al final del menú. */
  ownerPanel?: boolean;
  /** Solo para la vista previa de desarrollo: pedidos que arrancan en la alerta. */
  previewAlertIds?: string[];
  /** Solo para la vista previa de desarrollo: arranca mostrando este reporte Z. */
  previewShiftReport?: ShiftReport;
  /** Solo para la vista previa de desarrollo: abre un modal que no se puede abrir sin datos reales. */
  previewModal?: 'deliver' | 'history';
  /** counter_settings del restaurante (sonido, colores, volumen). Sin fila → defaults. */
  initialSettings?: CounterSettings;
  /** false = vista previa de desarrollo: la configuración no se guarda ni se sincroniza. */
  settingsLive?: boolean;
}

export interface ShiftReport {
  totalOrders: number; totalRevenue: number; totalCash: number;
  totalCard: number; expectedCash: number; cashDifference: number;
  openingCash: number; closingCash: number;
  openedAt: string; closedAt: string;
  cashByDriver: { name: string | null; orders: number; cash: number }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CounterView — main component
// ══════════════════════════════════════════════════════════════════════════════

export function CounterView({
  initialOrders, restaurantId, restaurantName, currency, locale = 'es',
  restaurantLat, restaurantLng, taxLabel, taxIncluded, tabletMode = false, isDevice = false,
  initialPausedUntil = null, ownerPanel = false, previewAlertIds, previewShiftReport, previewModal,
  initialSettings = DEFAULT_COUNTER_SETTINGS, settingsLive = true,
}: CounterViewProps) {
  const t = getT(locale);

  // ── Sonido, colores y volumen (counter_settings, en vivo entre tablets) ──
  const { settings, save: saveSettings } = useCounterSettings(restaurantId, initialSettings, settingsLive);
  const soundThemeRef = useRef(settings.soundTheme);
  soundThemeRef.current = settings.soundTheme;
  useEffect(() => { setSoundTheme(settings.soundTheme); }, [settings.soundTheme]);
  useEffect(() => { setAudioVolume(settings.soundVolume); }, [settings.soundVolume]);
  // Vista previa de colores mientras el panel está abierto (no guardada).
  const [appearancePreview, setAppearancePreview] = useState<AppearancePreview | null>(null);
  const themeId = appearancePreview?.screenTheme ?? settings.screenTheme;
  // color-scheme: checkboxes, radios, inputs y scrollbars nativos siguen a la apariencia.
  const themeVars = useMemo(
    () => ({ ...themeCssVars(resolveThemeTokens(themeId)), colorScheme: getScreenTheme(themeId).mode }),
    [themeId],
  );
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // ── Audio unlock gate ──
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  // Running inside the MENIUS Counter Android app (>= 1.0.2). Set after mount so
  // server and first client render match.
  const [inApp, setInApp] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const unlockAudio = useCallback((silent = false) => {
    // Resume (or create) the AudioContext during the user-gesture tap + a silent
    // buffer. On iOS Safari this is the ONLY moment the context can be started.
    unlockWithGesture();

    // Decode the theme's 5 MP3s (+ the 2 fallbacks) in the background. Once
    // decoded, playRing()/playAccepted() work from any timer.
    void loadTheme(soundThemeRef.current).then(() => {
      if (!silent) playRing('alert'); // first chime confirms a manual unlock
    });

    setAudioUnlocked(true);
    try { localStorage.setItem('counter-started', '1'); } catch { /* sin storage */ }
  }, []);

  // Inside the app there is no gate to tap: unlock silently on mount (a chime every
  // time the app opens would just be noise).
  useEffect(() => {
    if (!getCounterAppBridge()) return;
    setInApp(true);
    unlockAudio(true);
  }, [unlockAudio]);

  // La pantalla "Iniciar Counter" es solo la primera vez en este dispositivo.
  // Antes salía en cada recarga y TAPABA el tablero: los pedidos seguían
  // entrando sin sonido y sin que nadie los viera. Ahora, tras recargar, se ve
  // el tablero; si el navegador no deja sonar sin un toque, una banda lo avisa
  // y el primer toque en cualquier parte lo activa.
  const [introSeen, setIntroSeen] = useState(true);
  useEffect(() => {
    try { setIntroSeen(localStorage.getItem('counter-started') === '1'); } catch { /* sin storage */ }
  }, []);
  useEffect(() => {
    if (audioUnlocked || inApp) return;
    // Chrome deja sonar sin toque en sitios de uso frecuente o PWA instalada.
    const ctx = getAudioCtx();
    ctx?.resume().then(() => { if (ctx.state === 'running') unlockAudio(true); }).catch(() => {});
    const onGesture = () => unlockAudio(true);
    const evs = ['click', 'touchend', 'keydown'] as const;
    evs.forEach(e => window.addEventListener(e, onGesture, { capture: true }));
    return () => evs.forEach(e => window.removeEventListener(e, onGesture, { capture: true }));
  }, [audioUnlocked, inApp, unlockAudio]);

  // iOS suspende el AudioContext al volver de segundo plano: se reanuda solo.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') resumeAudio(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

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

  const [deliveryGuardModal, setDeliveryGuardModal] = useState<{ order: Order } | null>(() => {
    // Vista previa: un delivery con repartidor asignado que todavía no retiró.
    if (previewModal !== 'deliver') return null;
    const o = initialOrders.find((x) => x.order_type === 'delivery' && ['ready', 'out_for_delivery'].includes(x.status));
    return o ? { order: { ...o, driver_name: o.driver_name ?? 'Carlos Mendez', driver_picked_up_at: null } as Order } : null;
  });

  // ── Shift management ──
  interface ActiveShift { id: string; opening_cash: number; opened_at: string }
  // Arranca en null y la copia local se lee después de montar: leerla en el
  // useState hacía que el servidor y la tablet pintaran distinto (error de hidratación).
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [shiftModal, setShiftModal] = useState<'open' | 'close' | 'report' | null>(previewShiftReport ? 'report' : null);
  const [shiftOpenCash, setShiftOpenCash] = useState('0');
  const [shiftCloseCash, setShiftCloseCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftReport, setShiftReport] = useState<ShiftReport | null>(previewShiftReport ?? null);
  // El turno vive en la DB; el localStorage es solo para pintar rápido. Se
  // sincroniza al abrir y al volver a la pestaña: así una tablet ve el turno
  // que abrió o cerró otra (antes cada una creía en su propia copia).
  useEffect(() => {
    let alive = true;
    try {
      const raw = localStorage.getItem(`counter-shift-${restaurantId}`);
      if (raw) setActiveShift(JSON.parse(raw) as ActiveShift);
    } catch { /* sin storage o JSON roto */ }
    const sync = () => {
      getActiveShift().then(r => {
        if (!alive || !r || ('error' in r && r.error)) return; // sin red: se queda lo que había
        const shift = (r.shift ?? null) as ActiveShift | null;
        setActiveShift(shift);
        try {
          if (shift) localStorage.setItem(`counter-shift-${restaurantId}`, JSON.stringify(shift));
          else localStorage.removeItem(`counter-shift-${restaurantId}`);
        } catch { /* sin storage */ }
      }).catch(() => {});
    };
    sync();
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); };
  }, [restaurantId]);

  // ── Toasts ──
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [notifToast, setNotifToast] = useState<{ text: string; ok: boolean } | null>(null);

  // Edit order items
  const [editItemsModal, setEditItemsModal] = useState<{ orderId: string } | null>(null);
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
  // Pedidos que suenan: la alerta NO se calla tocando la pantalla ni cerrándola con
  // "Ver todos" — suena hasta que cada uno se acepta o se rechaza (como Uber Eats;
  // Pedro 2026-11-13). Antes un toque la callaba y el pedido podía quedar 5 min mudo.
  const [ringIds, setRingIds] = useState<string[]>(() => previewAlertIds ?? []);
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
  const showSuccess = (msg: string, action?: { label: string; run: () => void }, ms?: number) => {
    setErrorToast(null);
    setSuccessToast(msg);
    setToastAction(action ?? null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setSuccessToast(null); setToastAction(null); }, ms ?? (action ? 4500 : 3000));
  };

  // Imprime y AVISA si falló. printOrder nunca rechaza (devuelve el trabajo en
  // 'failed'), así que los `.catch(() => {})` de antes no veían ningún fallo:
  // la impresora apagada no dejaba rastro y "imprimir al llegar" daba el ticket
  // por impreso. Devuelve true solo si salió.
  const printTicket = async (order: Order, etaMin?: number): Promise<boolean> => {
    let err: string | undefined;
    try {
      const job = await PrinterService.printOrder(order, etaMin, restaurantName, currency, locale, taxLabel, taxIncluded);
      if (job.state !== 'failed') return true;
      err = job.error;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    const num = order.order_number?.split('-').pop() ?? '';
    const noPrinter = (err ?? '').startsWith('NO_PRINTER');
    showError(noPrinter
      ? (t.en ? `Ticket #${num} not printed: no printer set up (menu → Printer)` : `No se imprimió el #${num}: no hay impresora configurada (menú → Impresora)`)
      : (t.en ? `Ticket #${num} not printed: check the printer is on and connected` : `No se imprimió el #${num}: revisa que la impresora esté encendida y conectada`));
    if (!noPrinter) {
      import('@sentry/nextjs').then(S => S.captureMessage('Counter print failed', {
        level: 'warning', extra: { orderId: order.id, error: err },
      })).catch(() => {});
    }
    return false;
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

  // Reloj de la pantalla: todo lo que muestra es en minutos ("hace 3 min",
  // pausa, aviso urgente a los 5 min). Antes era cada 1 s y re-renderizaba el
  // Counter entero 60 veces por minuto; la cuenta regresiva de auto-aceptar
  // tiene su propio reloj en NewOrdersAlert.
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 15_000);
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
    // Un pedido nuevo no se tapa: el panel de sonido y colores se cierra solo.
    setCustomizeOpen(false);
    if (isLeaderRef.current) {
      playRing('alert');
      try { getCounterAppBridge()?.vibrateNewOrder?.(); } catch { /* not in the app */ }
      sendPushNotification(
        `🔔 ${isFutureScheduled ? t.newScheduledOrder : t.newOrder} · ${restaurantName}`,
        `${order.customer_name || 'Cliente'} · #${order.order_number} · ${fmt(order.total, currency)}`
      );
      // Print immediately on arrival if enabled
      if (printOnArrivalRef.current && !isFutureScheduled) {
        // Se marca solo si salió: si la impresora falló al llegar, aceptar reimprime.
        void printTicket(order).then(ok => { if (ok) printedOnArrivalRef.current.add(order.id); });
      }
    }
    if (isFutureScheduled) {
      const when = new Date(scheduledMs).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      showSuccess(`${t.newScheduledOrder} #${order.order_number} · ${when}`);
      return;
    }
    promotedRef.current?.add(order.id);
    setSplashQueue(q => (q.some(x => x.id === order.id) ? q : [...q, order]));
    setRingIds(r => (r.includes(order.id) ? r : [...r, order.id]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantName, currency, locale, taxLabel, taxIncluded, t.newOrder, t.newScheduledOrder]);

  const { orders, updateOrderLocally, rtStatus, lastSyncAt, refetch } = useRealtimeOrders({ restaurantId, initialOrders, onNewOrder: handleNewOrder });

  // ── Modo demo: pedidos falsos SOLO en memoria (ver counter/demo.ts) ──
  // Suenan y se ven como reales, pero toda acción de servidor (estado, impresión,
  // avisos, push, reembolsos) se corta antes para los ids demo-*.
  const onDemoArrive = useCallback((o: Order) => {
    setCustomizeOpen(false);
    playRing('alert');
    setSplashQueue(q => (q.some(x => x.id === o.id) ? q : [...q, o]));
    setRingIds(r => (r.includes(o.id) ? r : [...r, o.id]));
  }, []);
  const demo = useCounterDemo(locale === 'en', onDemoArrive);
  const demoExit = demo.exit;
  const demoUpdate = demo.update;
  const exitDemo = useCallback(() => {
    demoExit();
    setSplashQueue(q => q.filter(o => !isDemoId(o.id)));
    setRingIds(r => r.filter(id => !isDemoId(id)));
    setSheetId(cur => (isDemoId(cur) ? null : cur));
    stopRing();
  }, [demoExit]);

  // Clientes marcados (customer-incidents): una consulta chica aparte, cruzada
  // por customer_id, en vez de sumar un join a las 6 consultas de pedidos.
  const [customerFlags, setCustomerFlags] = useState<Map<string, CustomerFlag>>(() => new Map());
  const loadCustomerFlags = useCallback(async () => {
    try {
      const res = await getFlaggedCustomers();
      if ('customers' in res) setCustomerFlags(new Map(res.customers.map((c) => [c.id, c])));
    } catch { /* sin alerta antes que romper el tablero */ }
  }, []);
  useEffect(() => {
    void loadCustomerFlags();
    const id = window.setInterval(() => { void loadCustomerFlags(); }, 120_000);
    return () => window.clearInterval(id);
  }, [loadCustomerFlags]);

  // Pedidos con los cambios "en espera de deshacer" aplicados, la marca del
  // cliente y (en modo demo) los pedidos de prueba delante.
  const ordersView = useMemo(() => {
    const base = (Object.keys(pendingStatus).length === 0 && customerFlags.size === 0)
      ? orders
      : orders.map((o) => {
        const pend = pendingStatus[o.id];
        const flag = o.customer_id ? customerFlags.get(o.customer_id) : undefined;
        if (!pend && !flag) return o;
        return { ...o, ...(pend ? { status: pend } : {}), ...(flag ? { customer_flag: flag } : {}) };
      });
    return demo.orders.length > 0 ? [...demo.orders, ...base] : base;
  }, [orders, pendingStatus, customerFlags, demo.orders]);

  // Pickup: el cliente tocó "Ya llegué" en su seguimiento → suena y avisa.
  // La primera pasada solo registra (al abrir la tablet no suenan los viejos).
  const arrivedSeenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const arrived = orders.filter(o => o.order_type === 'pickup' && o.customer_arrived_at && !['delivered', 'completed', 'cancelled'].includes(o.status));
    if (!arrivedSeenRef.current) { arrivedSeenRef.current = new Set(arrived.map(o => o.id)); return; }
    for (const o of arrived) {
      if (arrivedSeenRef.current.has(o.id)) continue;
      arrivedSeenRef.current.add(o.id);
      if (isLeaderRef.current) playRing('alert');
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
      if (isLeaderRef.current) playRing('alert');
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
    if (isLeaderRef.current) playRing('alert');
    setSplashQueue(q => [...q, ...fresh.filter(o => !q.some(x => x.id === o.id))]);
    setRingIds(r => [...r, ...fresh.map(o => o.id).filter(id => !r.includes(id))]);
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

  // Ruta del repartidor: "parada 2 de 3" (los pedidos del mismo batch_id).
  const routeStops = useMemo(() => {
    const groups = new Map<string, { id: string; seq: number }[]>();
    for (const o of ordersView as (Order & { batch_id?: string | null; batch_seq?: number | null })[]) {
      if (!o.batch_id || o.status === 'cancelled') continue;
      const g = groups.get(o.batch_id) ?? [];
      g.push({ id: o.id, seq: o.batch_seq ?? 99 });
      groups.set(o.batch_id, g);
    }
    const out = new Map<string, { stop: number; of: number }>();
    groups.forEach((g) => {
      if (g.length < 2) return;
      g.sort((a, b) => a.seq - b.seq).forEach((x, i) => out.set(x.id, { stop: i + 1, of: g.length }));
    });
    return out;
  }, [ordersView]);

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

  // SLA: 5 min sin respuesta → sonido urgente + push. Cubre también los pedidos
  // que ya estaban pendientes al abrir el Counter (esos no entran al loop).
  useEffect(() => {
    newOrders.forEach(o => {
      if (isDemoId(o.id)) return;
      if (elapsedMins(waitingSinceIso(o)) >= SLA_WARN_MINS && !urgentRef.current.has(o.id)) {
        urgentRef.current.add(o.id);
        // Solo la pestaña principal suena (con dos pestañas sonaba doble).
        if (isLeaderRef.current) playRing('urgent');
        sendPushNotification(
          `⚠️ ${t.urgent} · ${restaurantName}`,
          `#${o.order_number} — ${SLA_WARN_MINS} min ${t.en ? 'without response' : 'sin respuesta'}`
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
  // Resumen de hoy: lo calcula el servidor con la regla del dashboard (día del
  // restaurante completo). Mientras carga, lo que hay en memoria.
  const [todaySummary, setTodaySummary] = useState<{ orders: number; sales: number } | null>(null);
  useEffect(() => {
    if (!sidebarOpen) return;
    let alive = true;
    getTodaySummary().then(r => {
      if (alive && r && !('error' in r && r.error) && 'orders' in r) setTodaySummary({ orders: r.orders ?? 0, sales: r.sales ?? 0 });
    }).catch(() => {});
    return () => { alive = false; };
  }, [sidebarOpen]);
  const localToday = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayOrdersCount = todaySummary?.orders ?? localToday.length;
  const todayRevenue = todaySummary?.sales ?? localToday.filter(o => isRevenueStatus(o.status)).reduce((s, o) => s + Number(o.total), 0);

  // ── Actions ──
  const handleAccept = useCallback(async (order: Order, mins?: number) => {
    // Guard against double-fire: auto-accept (countdown) and a manual tap can
    // both target the same order in the same tick. The ref is synchronous, so the
    // second caller sees it immediately — prevents duplicate status updates and
    // printer tickets. (React state would still be stale within the same tick.)
    if (isDemoId(order.id)) {
      // Demo: todo local. Sin servidor, sin impresión, sin avisos.
      if (order.status !== 'pending') return;
      const effDemo = mins ?? eta + busyExtra;
      setSplashQueue(q => q.filter(x => x.id !== order.id));
      demoUpdate(order.id, { status: 'preparing', estimated_ready_minutes: effDemo, prepared_at: new Date().toISOString() } as Partial<Order>);
      stopRing();
      playAccepted();
      setSheetId(prev => (prev === order.id ? null : prev));
      showSuccess(T.accepted(order.order_number?.split('-').pop() ?? '', effDemo));
      return;
    }
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
    // Al aceptar se corta en seco la alerta que esté sonando (si quedan otros
    // pendientes, el loop vuelve a sonar en la próxima vuelta).
    stopRing();
    try {
      // Una sola escritura: estado + tiempo (antes eran 2 acciones en serie y el
      // evento realtime de la primera devolvía la tarjeta a Nuevos un instante).
      const res = await updateOrderStatus(order.id, 'preparing', undefined, { etaMinutes: eff });
      if (res?.error) {
        updateOrderLocally(order.id, { status: order.status }); // revert
        showError(res.error);
        return;
      }
      playAccepted(); // una de las 3 del tema, sin repetir la anterior
      // Si ya salió el ticket al llegar ("imprimir al llegar"), no se imprime otro al aceptar.
      // Mesa imprime sola solo con impresora nativa (app Android); en el
      // navegador abría el diálogo de impresión en CADA pedido de mesa.
      const shouldPrint = (autoPrint || (order.order_type === 'dine_in' && isMeniusNativePrintAvailable()))
        && !printedOnArrivalRef.current.has(order.id);
      if (shouldPrint) void printTicket(order, eff);
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
  }, [eta, busyExtra, restaurantName, currency, autoPrint, t, updateOrderLocally, locale, taxLabel, taxIncluded, showNotif, demoUpdate]);


  // ── Rediseño: acción principal de cada tarjeta ──────────────────────────
  const statusFor = (o: Order, kind: PrimaryKind): Order['status'] =>
    kind === 'ready' ? 'ready'
      : kind === 'dispatch' ? 'out_for_delivery'
      : kind === 'serve' ? 'served'
      : kind === 'complete' ? 'completed'
      : (o.order_type === 'dine_in' ? 'completed' : 'delivered');

  const commitStatus = useCallback((order: Order, kind: PrimaryKind, bypassGuard = false) => {
    if (isDemoId(order.id)) {
      demoUpdate(order.id, { status: statusFor(order, kind) });
      setSheetId(cur => (cur === order.id ? null : cur));
      return;
    }
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
  }, [T, t, updateOrderLocally, showNotif, demoUpdate]);

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
      const incident = cancelReason.startsWith('incident:') ? cancelReason.slice(9) : null;
      const res = await updateOrderStatus(
        cancelModal.orderId,
        'cancelled',
        cancelReason || undefined,
        isOrderIncident(incident) ? { incident } : undefined,
      );
      if (res?.error === 'PAID_ORDER_NEEDS_REFUND') {
        // Server refuses to cancel a paid order without refunding — switch the
        // modal to the refund-and-cancel flow instead of a dead-end error.
        setRefundRequired(true);
        return;
      }
      if (res?.error) { showError(res.error); return; }
      setCancelModal(null);
      setCancelReason('');
      if (incident) void loadCustomerFlags();
      if (res.notification) showNotif(res.notification, cancelModal.orderId);
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  }, [cancelModal, cancelReason, t, showNotif, loadCustomerFlags]);

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
      const manual = data.manual_refund as { provider: string; transaction_id: string | null; amount: number } | undefined;
      if (manual) {
        // Wompi / Mercado Pago: no hay reembolso automático; lo hace el restaurante.
        const tx = manual.transaction_id ? (t.en ? ` (transaction ${manual.transaction_id})` : ` (transacción ${manual.transaction_id})`) : '';
        const ok = { label: t.en ? 'Got it' : 'Entendido', run: () => { setSuccessToast(null); setToastAction(null); } };
        showSuccess(t.en
          ? `Order cancelled. Refund ${fmt(manual.amount, currency)} to the customer from your ${manual.provider} dashboard${tx}.`
          : `Pedido cancelado. Devuelve ${fmt(manual.amount, currency)} al cliente desde tu panel de ${manual.provider}${tx}.`, ok, 20_000);
      } else {
        showSuccess(t.en ? 'Order refunded and cancelled' : 'Orden reembolsada y cancelada');
      }
    } catch {
      showError(t.en ? 'Unexpected error' : 'Error inesperado');
    } finally { setUpdatingId(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelModal, cancelReason, t, currency]);

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
      } else {
        // Antes fallaba en silencio: el cajero creía que el plato quedó agotado
        // y la tienda lo seguía vendiendo.
        showError(t.en ? 'Could not update the item. Try again.' : 'No se pudo cambiar el plato. Intenta de nuevo.');
      }
    } catch {
      showError(t.en ? 'No connection — the item was not updated.' : 'Sin conexión: el plato no se cambió.');
    }
    finally { setStockUpdating(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // ── Shift handlers ──
  const handleOpenShift = useCallback(async () => {
    setShiftSaving(true);
    try {
      const result = await openShift(parseFloat(shiftOpenCash) || 0);
      if (result.error) { showError(result.error); return; }
      const shift = result.shift as ActiveShift;
      setActiveShift(shift);
      try { localStorage.setItem(`counter-shift-${restaurantId}`, JSON.stringify(shift)); } catch { /* sin storage */ }
      setShiftModal(null);
      if ('existing' in result && result.existing) {
        const since = new Date(shift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        showSuccess(t.en ? `A shift was already open (since ${since})` : `Ya había un turno abierto (desde las ${since})`);
      } else {
        showSuccess(t.en ? 'Shift opened' : 'Turno abierto');
      }
    } catch { showError(t.en ? 'Error opening shift' : 'Error al abrir turno'); }
    finally { setShiftSaving(false); }
  }, [shiftOpenCash, restaurantId, t]);

  const handleCloseShift = useCallback(async () => {
    setShiftSaving(true);
    try {
      const result = await closeShift(parseFloat(shiftCloseCash) || 0, shiftNotes || undefined);
      if ('noOpenShift' in result && result.noOpenShift) {
        setActiveShift(null);
        try { localStorage.removeItem(`counter-shift-${restaurantId}`); } catch { /* sin storage */ }
        setShiftModal(null);
        showError(t.en ? 'This shift was already closed on another device' : 'Este turno ya se cerró en otro dispositivo');
        return;
      }
      if (result.error) { showError(result.error); return; }
      setActiveShift(null);
      try { localStorage.removeItem(`counter-shift-${restaurantId}`); } catch { /* sin storage */ }
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
        cashByDriver: Array.isArray(s.cashByDriver) ? s.cashByDriver : [],
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
  // Suena mientras quede alguno sin aceptar ni rechazar (aunque se haya cerrado la alerta).
  // UN solo loop para todos: la alerta del tema cada 3.5 s (o al terminar el clip,
  // si dura más); pasa a la urgente cuando el pendiente más viejo supera
  // urgent_after_seconds (10 s en el demo).
  const ringingOrders = useMemo(
    () => ringIds.map(id => ordersView.find(x => x.id === id)).filter((o): o is Order => o?.status === 'pending'),
    [ringIds, ordersView],
  );
  const ringingCount = ringingOrders.length;
  const oldestRingRef = useRef<number | null>(null);
  oldestRingRef.current = ringingCount > 0
    ? Math.min(...ringingOrders.map(o => waitingSince(o as Order & { updated_at?: string | null })))
    : null;
  const urgentAfterRef = useRef(settings.urgentAfterSeconds);
  urgentAfterRef.current = demo.active ? DEMO_URGENT_AFTER_SECONDS : settings.urgentAfterSeconds;
  const ringsHere = isLeader || demo.active;
  useEffect(() => {
    if (ringingCount === 0 || !ringsHere) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      const oldest = oldestRingRef.current;
      const dur = playRing(ringKind(oldest == null ? null : Date.now() - oldest, urgentAfterRef.current));
      timer = setTimeout(tick, loopIntervalMs(dur));
    };
    timer = setTimeout(tick, msUntilNextRing());
    return () => { alive = false; clearTimeout(timer); };
  }, [ringingCount, ringsHere]);
  // Nadie esperando: se corta lo que esté sonando (aceptado en otra tablet, rechazado…).
  useEffect(() => { if (ringingCount === 0) stopRing(); }, [ringingCount]);
  // Los que ya se resolvieron salen de la lista (que no crezca en un turno largo).
  useEffect(() => {
    setRingIds(r => {
      const next = r.filter(id => ordersView.find(x => x.id === id)?.status === 'pending');
      return next.length === r.length ? r : next;
    });
  }, [ordersView]);

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
  if (!audioUnlocked && !inApp && !introSeen) {
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
        data-theme={themeId}
        style={{ ...themeVars, background: C.bg, color: C.ink } as React.CSSProperties}
        onClick={() => unlockAudio()}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: C.accent, color: C.onAccent }}>
          <Bell className="w-8 h-8" />
        </div>

        <p className="text-[16px] font-medium mb-1" style={{ color: C.sub }}>
          {restaurantName}
        </p>
        <h1 className="text-[34px] font-bold tracking-[-0.02em] mb-8">Counter</h1>

        {/* Flow steps */}
        <div className="w-full max-w-sm space-y-3 mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-4 rounded-[22px] px-4 py-3.5" style={{ background: C.surface }}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-[16px] font-semibold">{s.label}</p>
                <p className="text-[14px]" style={{ color: C.sub }}>{s.desc}</p>
              </div>
              <div className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-[14px] font-semibold tabular-nums flex-shrink-0" style={{ background: C.fill, color: C.sub }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => unlockAudio()}
          className="w-full max-w-sm h-16 rounded-[20px] text-[20px] font-semibold active:scale-[0.97] transition-transform"
          style={{ background: C.accent, color: C.onAccent }}
        >
          {t.en ? 'Start Counter →' : 'Iniciar Counter →'}
        </button>
        <p className="text-[14px] mt-4" style={{ color: C.sub }}>
          {t.en ? 'Tap anywhere to activate sound' : 'Toca para activar las notificaciones de sonido'}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none"
      data-theme={themeId}
      style={{
        ...themeVars,
        // Con el demo activo, la banda fija ocupa arriba: todo baja (también la alerta).
        '--demo-offset': demo.active ? 'calc(48px + env(safe-area-inset-top))' : '0px',
        paddingTop: 'var(--demo-offset)',
        background: C.bg, color: C.ink,
      } as React.CSSProperties}>

      {/* ── Modo demo: banda fija + resumen al terminar ── */}
      {demo.active && <DemoBanner T={T} onExit={exitDemo} />}
      {demo.finished && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-6" style={{ background: C.scrim }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-[460px] rounded-[28px] p-7 flex flex-col items-center gap-2 text-center" style={RAISED}>
            <span className="w-16 h-16 rounded-2xl inline-flex items-center justify-center mb-2" style={{ background: C.accent, color: C.onAccent }}>
              <CheckCircle className="w-9 h-9" />
            </span>
            <p className="text-[30px] font-bold tracking-[-0.02em] leading-tight tabular-nums">
              {T.demoSummary(demo.orders.length, fmt(demo.orders.reduce((sum, o) => sum + Number(o.total), 0), currency))}
            </p>
            <p className="text-[20px] font-semibold" style={{ color: C.accentText }}>{T.demoReady}</p>
            <div className="w-full grid grid-cols-2 gap-3 mt-5">
              <button type="button" onClick={() => { exitDemo(); demo.start(); }} className="h-14 rounded-2xl font-semibold text-[17px]" style={{ background: C.fill, color: C.ink }}>
                {T.demoAgain}
              </button>
              <button type="button" onClick={exitDemo} className="h-14 rounded-2xl font-semibold text-[17px]" style={{ background: C.fill, color: C.ink }}>
                {T.demoExit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Alerta de pedidos nuevos (una sola, con cola) ── */}
      {alertQueue.length > 0 && (
        <NewOrdersAlert
          queue={alertQueue}
          T={T}
          currency={currency}
          defaultMins={defaultMinsFor}
          autoAcceptSecs={autoAcceptOn ? 30 : null}
          onAccept={(o, m) => handleAccept(o, m)}
          onReject={(o) => {
            setSplashQueue(q => q.filter(x => x.id !== o.id));
            if (isDemoId(o.id)) { demoUpdate(o.id, { status: 'cancelled' }); stopRing(); return; }
            setCancelModal({ orderId: o.id, type: 'reject' });
            setCancelReason('');
          }}
          onSeeAll={() => { setSplashQueue([]); setView('board'); }}
        />
      )}

      {/* ── Sin conexión: banda fija, lo más importante que puede pasar ── */}
      {offline && (
        <div role="alert" className="flex-none text-[16px] font-semibold py-2.5 px-4 flex items-center justify-center gap-2 z-20" style={{ background: C.critical, color: C.onCritical }}>
          <WifiOff className="w-4 h-4" />
          {t.offlineBanner}
        </div>
      )}

      {/* ── Sonido bloqueado por el navegador (tras recargar) ── */}
      {!audioUnlocked && !inApp && (
        <button
          type="button"
          onClick={() => unlockAudio()}
          className="flex-none w-full text-[16px] font-semibold py-2.5 px-4 flex items-center justify-center gap-2 z-20"
          style={{ background: C.warnBg, color: C.warnText, boxShadow: `inset 0 -1px 0 ${C.warnBar}` }}
        >
          <BellOff className="w-4 h-4" />
          {t.soundOffBanner}
        </button>
      )}

      {/* ── Turno de caja abierto ── */}
      {activeShift && (
        <div className="flex-none text-[15px] font-semibold py-2 px-4 flex items-center gap-3 z-20" style={{ background: C.surface, color: C.ink, boxShadow: `inset 0 -1px 0 ${C.line}` }}>
          <span>{t.shiftOpened} · {shiftDuration}</span>
          <span className="font-medium" style={{ color: C.sub }}>{t.shiftOpeningCash}: {fmt(Number(activeShift.opening_cash), currency)}</span>
          <button
            onClick={() => { setShiftCloseCash(''); setShiftNotes(''); setShiftModal('close'); }}
            className="ml-auto h-10 px-4 rounded-full font-semibold"
            style={{ background: C.fill, color: C.ink }}
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
          routeStops={routeStops}
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

      {sheetOrder && isDemoId(sheetOrder.id) && (
        <OrderSheet
          key={sheetOrder.id}
          order={sheetOrder}
          T={T}
          currency={currency}
          taxLabel={taxLabel}
          busy={false}
          acceptMins={defaultMinsFor(sheetOrder)}
          onClose={() => setSheetId(null)}
          onPrint={() => {}}
          onAccept={(o, m) => handleAccept(o, m)}
          onPrimary={onPrimary}
          onAdjustEta={(o, m) => demoUpdate(o.id, { estimated_ready_minutes: m })}
          more={{ onCancel: ['pending', 'confirmed', 'preparing', 'almost_ready'].includes(sheetOrder.status)
            ? () => { demoUpdate(sheetOrder.id, { status: 'cancelled' }); setSheetId(null); }
            : undefined }}
        />
      )}

      {sheetOrder && !isDemoId(sheetOrder.id) && (
        <OrderSheet
          key={sheetOrder.id}
          order={sheetOrder}
          T={T}
          currency={currency}
          taxLabel={taxLabel}
          busy={updatingId === sheetOrder.id}
          acceptMins={defaultMinsFor(sheetOrder)}
          onClose={() => setSheetId(null)}
          onPrint={() => { void printTicket(sheetOrder, sheetOrder.estimated_ready_minutes ?? effectiveEta); }}
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
          historySlot={<StatusHistory orderId={sheetOrder.id} t={t} preview={previewModal === 'history' ? PREVIEW_HISTORY : undefined} />}
        />
      )}

      {customizeOpen && (
        <CustomizePanel
          T={T}
          lang={locale === 'en' ? 'en' : 'es'}
          settings={settings}
          canCustomize={!isDevice || settings.staffCanCustomize}
          isOwner={!isDevice}
          onPreviewAppearance={setAppearancePreview}
          onSave={saveSettings}
          onVolumeLive={setAudioVolume}
          onClose={() => setCustomizeOpen(false)}
          onStartDemo={() => { setCustomizeOpen(false); setView('board'); if (demo.active) exitDemo(); demo.start(); }}
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
          <div className="fixed inset-0 z-40" style={{ background: C.scrim }} onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-[340px] max-w-[90vw] z-50 flex flex-col"
            style={{ background: C.raised, color: C.ink, boxShadow: `1px 0 0 ${C.raisedEdge}, 24px 0 48px rgba(0,0,0,.28)`, paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--kds-line)]">
              <div>
                <p className="text-[19px] font-bold tracking-[-0.01em] text-[color:var(--kds-ink)]">{restaurantName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={cn('w-2 h-2 rounded-full', !isPaused && 'animate-pulse')} style={{ background: isPaused ? C.warnBar : C.status }} />
                  <span className="text-[15px] font-medium text-[color:var(--kds-sub)]">
                    {isPaused ? `${t.paused_status} (${pauseLeftMins} min)` : t.online_status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} aria-label={T.close} className="w-11 h-11 -mr-1.5 rounded-full inline-flex items-center justify-center" style={{ background: C.fill, color: C.ink }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* Pedidos de esta tablet */}
              <SidebarSection title={t.en ? 'Orders on this tablet' : 'Pedidos en esta tablet'} icon={<Bell className="w-4 h-4" />}>
                <div className="px-3 rounded-xl border border-[color:var(--kds-line)]">
                  <ToggleRow
                    label={t.en ? 'Auto-accept orders' : 'Aceptar pedidos solos'}
                    desc={t.en ? 'After 30 s, with the default time. Turn on in one tablet only.' : 'A los 30 s, con el tiempo por defecto. Actívalo en una sola tablet.'}
                    on={autoAcceptOn}
                    onChange={() => {
                      const v = !autoAcceptOn;
                      setAutoAcceptOn(v);
                      try { localStorage.setItem('counter-auto-accept', String(v)); } catch { /* sin storage */ }
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const bridge = getCounterAppBridge();
                    if (bridge?.openPrinterSettings) bridge.openPrinterSettings();
                    else setPrinterModalOpen(true);
                    setSidebarOpen(false);
                  }}
                  className="w-full mt-2 flex items-center gap-3 px-3 min-h-[52px] rounded-xl border border-[color:var(--kds-line)] hover:border-[color:var(--kds-line-strong)] transition-colors text-left"
                >
                  <Printer className="w-5 h-5 text-[color:var(--kds-sub)]" />
                  <span className="text-[16px] font-semibold text-[color:var(--kds-ink)]">{t.en ? 'Printer' : 'Impresora'}</span>
                </button>
                {/* Sonido y colores: se usa poco, vive en el menú y no en la barra de arriba (Pedro 2026-11-14). */}
                <button
                  onClick={() => { setSidebarOpen(false); setCustomizeOpen(true); }}
                  className="w-full mt-2 flex items-center gap-3 px-3 min-h-[52px] rounded-xl border border-[color:var(--kds-line)] hover:border-[color:var(--kds-line-strong)] transition-colors text-left"
                >
                  <Palette className="w-5 h-5 text-[color:var(--kds-sub)]" />
                  <span className="text-[16px] font-semibold text-[color:var(--kds-ink)]">{T.customize}</span>
                </button>
                {!tabletMode && !isDevice && (
                  <a href="/app/counter/tablet" className="w-full mt-2 flex items-center gap-3 px-3 min-h-[52px] rounded-xl border border-[color:var(--kds-line)] hover:border-[color:var(--kds-line-strong)] transition-colors text-left">
                    <Settings2 className="w-5 h-5 text-[color:var(--kds-sub)]" />
                    <span className="text-[16px] font-semibold text-[color:var(--kds-ink)]">{t.en ? 'Full-screen tablet mode' : 'Modo tablet a pantalla completa'}</span>
                  </a>
                )}
              </SidebarSection>

              {/* Auto-print */}
              <SidebarSection title={t.autoPrint} icon={<Printer className="w-4 h-4" />}>
                <div className="px-3 rounded-xl border border-[color:var(--kds-line)]">
                  <ToggleRow
                    label={t.autoPrint}
                    desc={t.en ? 'Print when accepting' : 'Imprimir al aceptar'}
                    on={autoPrint}
                    onChange={() => {
                      const v = !autoPrint;
                      setAutoPrint(v);
                      try { localStorage.setItem('counter-auto-print', String(v)); } catch { /* sin storage */ }
                    }}
                  />
                  <ToggleRow
                    label={t.en ? 'Print on arrival' : 'Imprimir al recibir'}
                    desc={t.en ? 'Instant print when order arrives' : 'Ticket inmediato al llegar la orden'}
                    on={printOnArrival}
                    onChange={() => {
                      const v = !printOnArrival;
                      setPrintOnArrival(v);
                      try { localStorage.setItem('counter-print-on-arrival', String(v)); } catch { /* sin storage */ }
                    }}
                  />
                </div>
              </SidebarSection>

              {/* 86 / Stock */}
              <SidebarSection title={t.en ? 'Out of stock' : 'Agotados'} icon={<Ban className="w-4 h-4" />}>
                {stockLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="w-4 h-4 border-2 border-[color:var(--kds-line)] border-t-[color:var(--kds-accent)] rounded-full animate-spin" />
                  </div>
                ) : stockProducts.length === 0 ? (
                  <p className="text-[15px] text-[color:var(--kds-sub)] text-center py-2">{t.en ? 'No products found' : 'Sin productos'}</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {stockProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => toggleStock(p.id, p.in_stock)}
                        disabled={stockUpdating === p.id}
                        className={cn(
                          'w-full flex items-center justify-between px-3 min-h-[48px] rounded-xl border transition-colors text-left',
                          p.in_stock
                            ? 'border-[color:var(--kds-line)] hover:border-[color:var(--kds-line-strong)]'
                            : 'border-[color:var(--kds-line)] bg-[var(--kds-fill)]'
                        )}
                      >
                        <span className={cn('text-[16px] font-medium truncate', p.in_stock ? 'text-[color:var(--kds-ink)]' : 'line-through')} style={p.in_stock ? undefined : { color: C.destructive }}>{p.name}</span>
                        <span className="flex-shrink-0 ml-2 text-[15px] font-bold tabular-nums"
                          style={{ color: p.in_stock ? C.accentText : C.destructive }}>
                          {stockUpdating === p.id ? '…' : p.in_stock ? (t.en ? 'OK' : 'OK') : '86'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </SidebarSection>

              {/* Today summary */}
              <SidebarSection title={t.todaySummary} icon={<History className="w-4 h-4" />}>
                <div className="px-3 py-3 rounded-xl bg-[var(--kds-fill)] space-y-1">
                  <div className="flex justify-between text-[16px]">
                    <span className="text-[color:var(--kds-sub)]">{t.todayOrders}</span>
                    <span className="font-bold text-[color:var(--kds-ink)]">{todayOrdersCount}</span>
                  </div>
                  <div className="flex justify-between text-[16px]">
                    <span className="text-[color:var(--kds-sub)]">{t.en ? 'Sales' : 'Ventas'}</span>
                    <span className="font-bold text-[color:var(--kds-ink)]">{fmt(todayRevenue, currency)}</span>
                  </div>
                </div>
              </SidebarSection>

              {/* Cash Register / Shift */}
              <SidebarSection title={t.shiftTitle} icon={<Wallet className="w-4 h-4" />}>
                {activeShift ? (
                  <div className="space-y-2">
                    <div className="px-3 py-3 rounded-xl bg-[var(--kds-fill)] space-y-1">
                      <p className="text-[16px] font-semibold flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: C.status }} />{t.shiftOpened} · {shiftDuration}</p>
                      <p className="text-[15px] text-[color:var(--kds-sub)]">{t.shiftOpeningCash}: {fmt(Number(activeShift.opening_cash), currency)}</p>
                    </div>
                    <button
                      onClick={() => { setShiftCloseCash(''); setShiftNotes(''); setShiftModal('close'); }}
                      className="w-full h-[52px] rounded-xl text-[17px] font-semibold transition-colors"
                      style={{ background: C.fill, color: C.destructive }}
                    >
                      {t.shiftClose}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShiftOpenCash('0'); setShiftModal('open'); }}
                    className="w-full h-[52px] rounded-xl text-[17px] font-semibold transition-colors"
                    style={{ background: C.accent, color: C.onAccent }}
                  >
                    {t.shiftOpen}
                  </button>
                )}
              </SidebarSection>

              {/* Panel del dueño: escondido al final del menú; en la tablet pide PIN. */}
              {(ownerPanel || tabletMode) && (
                <OwnerPanelButton needsPin={isDevice} en={t.en} />
              )}

              {/* This tablet — only inside the Android app */}
              {inApp && (
                <SidebarSection title={t.en ? 'This tablet' : 'Esta tablet'} icon={<Settings2 className="w-4 h-4" />}>
                  <button
                    onClick={() => getCounterAppBridge()?.openPrinterSettings?.()}
                    className="w-full flex items-center gap-3 px-3 min-h-[52px] rounded-xl border border-[color:var(--kds-line)] hover:border-[color:var(--kds-line-strong)] transition-colors text-left"
                  >
                    <Printer className="w-5 h-5 text-[color:var(--kds-sub)]" />
                    <span className="text-[16px] font-semibold text-[color:var(--kds-ink)]">{t.en ? 'Printer' : 'Impresora'}</span>
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
                    className="w-full mt-2 h-[52px] rounded-xl text-[17px] font-semibold transition-colors"
                    style={confirmDisconnect ? { background: C.critical, color: C.onCritical } : { background: C.fill, color: C.destructive }}
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
        <CounterModal label={t.en ? 'Printer settings' : 'Configuración de impresora'} onClose={() => setPrinterModalOpen(false)}>
          <ModalHeader
            title={t.en ? 'Printer settings' : 'Configuración de impresora'}
            subtitle={t.en ? 'Settings saved on this device' : 'Configuración guardada en este dispositivo'}
            onClose={() => setPrinterModalOpen(false)}
            closeLabel={t.en ? 'Close' : 'Cerrar'}
          />
          <div className="px-6 flex flex-col">
            <ToggleRow
              label={t.en ? 'Customer receipt' : 'Recibo del cliente'}
              desc={t.en ? 'Full ticket with prices' : 'Ticket completo con precios'}
              on={printerConfig.receiptEnabled}
              onChange={() => {
                const next = { ...printerConfig, receiptEnabled: !printerConfig.receiptEnabled };
                PrinterConfig.update(next);
                setPrinterConfig(next);
              }}
            />
            <ToggleRow
              label={t.en ? 'Kitchen ticket' : 'Ticket de cocina'}
              desc={t.en ? 'Items only, no prices' : 'Solo artículos, sin precios'}
              on={printerConfig.kitchenEnabled}
              onChange={() => {
                const next = { ...printerConfig, kitchenEnabled: !printerConfig.kitchenEnabled };
                PrinterConfig.update(next);
                setPrinterConfig(next);
              }}
            />
            <ToggleRow
              label={t.en ? 'Auto-print on accept' : 'Imprimir al aceptar'}
              desc={t.en ? 'Automatically prints when you confirm an order' : 'Imprime automáticamente al confirmar una orden'}
              on={autoPrint}
              onChange={() => {
                const next = !autoPrint;
                setAutoPrint(next);
                localStorage.setItem('counter-auto-print', String(next));
              }}
            />
          </div>
          <div className="px-6 pt-4 pb-6">
            <ModalButton
              tone="fill"
              className="w-full"
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
                  void printTicket(dummyOrder, 0).then(ok => { if (ok) showSuccess(t.en ? 'Test ticket sent' : 'Ticket de prueba enviado'); });
                }}
            >
              <Printer className="w-5 h-5" />
              {t.en ? 'Print test ticket' : 'Imprimir ticket de prueba'}
            </ModalButton>
          </div>
        </CounterModal>
      )}

      {/* ══ EDIT ORDER ITEMS MODAL ══ */}
      {editItemsModal && (
        <CounterModal label={t.en ? 'Add items to order' : 'Agregar productos a la orden'} onClose={() => setEditItemsModal(null)} tall>
          <ModalHeader
            title={t.en ? 'Add items to order' : 'Agregar productos a la orden'}
            onClose={() => setEditItemsModal(null)}
            closeLabel={t.en ? 'Close' : 'Cerrar'}
          />
          <div className="px-6 pb-3 flex-shrink-0">
            <input
              type="search"
              value={editSearch}
              onChange={e => setEditSearch(e.target.value)}
              placeholder={t.en ? 'Search products…' : 'Buscar productos…'}
              className={MODAL_INPUT}
              style={MODAL_INPUT_STYLE}
              autoFocus
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6">
            {editLoading ? (
              <p className="flex items-center justify-center h-32 text-[16px] font-medium" style={{ color: C.sub }}>{t.en ? 'Loading…' : 'Cargando…'}</p>
            ) : (
              <ul className="flex flex-col">
                {editProducts
                  .filter(p => editSearch.trim() === '' || p.name.toLowerCase().includes(editSearch.toLowerCase()))
                  .map((p, i) => (
                    <li key={p.id} className={cn('flex items-center gap-3 py-3', i > 0 && 'border-t')} style={{ borderColor: C.line }}>
                      <div className="flex-1 min-w-0">
                        <p className="flex items-center gap-2 text-[17px] font-semibold" style={p.in_stock === false ? { color: C.sub } : undefined}>
                          <span className="truncate">{p.name}</span>
                          {p.in_stock === false && (
                            <span className="flex-shrink-0 text-[15px] font-bold" style={{ color: C.destructive }}>86</span>
                          )}
                        </p>
                        <p className="text-[15px] tabular-nums" style={{ color: C.sub }}>{fmt(Number(p.price), currency)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItem(editItemsModal.orderId, p.id)}
                        disabled={editSaving}
                        aria-label={`${t.en ? 'Add' : 'Agregar'} ${p.name}`}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 flex-shrink-0"
                        style={p.in_stock === false ? { background: C.fill, color: C.ink } : { background: C.accent, color: C.onAccent }}
                      >
                        <Plus className="w-5 h-5" strokeWidth={2.4} />
                      </button>
                    </li>
                  ))}
                {editProducts.filter(p => editSearch.trim() === '' || p.name.toLowerCase().includes(editSearch.toLowerCase())).length === 0 && (
                  <li className="text-center text-[16px] font-medium py-8" style={{ color: C.sub }}>{t.en ? 'No products found' : 'Sin resultados'}</li>
                )}
              </ul>
            )}
          </div>
          <div className="px-6 pt-3 pb-6 flex-shrink-0" style={{ boxShadow: `0 -1px 0 ${C.line}` }}>
            <ModalButton tone="fill" className="w-full" onClick={() => setEditItemsModal(null)}>
              {t.en ? 'Done' : 'Listo'}
            </ModalButton>
          </div>
        </CounterModal>
      )}

      {/* ══ CANCEL MODAL ══ */}
      {cancelModal && (
        <CounterModal
          label={cancelModal.type === 'reject' ? t.rejectOrder : t.cancelOrder}
          onClose={() => { setCancelModal(null); setRefundRequired(false); }}
        >
          <ModalHeader
            title={cancelModal.type === 'reject' ? t.rejectOrder : t.cancelOrder}
            subtitle={t.rejectReason}
            onClose={() => { setCancelModal(null); setRefundRequired(false); }}
            closeLabel={t.en ? 'Close' : 'Cerrar'}
          />
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 flex flex-col gap-2">
            {refundRequired && (
              <p className="mb-1 rounded-xl px-4 py-3 text-[15px] font-semibold leading-snug"
                style={{ background: C.warnBg, color: C.warnText, boxShadow: `inset 3px 0 0 ${C.warnBar}` }}>
                {isDevice
                  ? (t.en
                    ? 'This order was paid online. Refunds are only made from MENIUS on your phone or computer (Orders).'
                    : 'Esta orden fue pagada online. Los reembolsos solo se hacen desde MENIUS en tu celular o computadora (Pedidos).')
                  : (t.en
                    ? 'This order was paid online. Cancelling it will refund the customer via Stripe.'
                    : 'Esta orden fue pagada online. Cancelarla reembolsará al cliente vía Stripe.')}
              </p>
            )}
            {t.reasons.map(r => (
              <ReasonOption key={r} name="cancel-reason" label={r} checked={cancelReason === r} onSelect={() => setCancelReason(r)} />
            ))}
            {(() => {
              // Solo para llevar / delivery, y solo si no se pagó online (lo
              // pagado se reembolsa por el otro camino).
              const o = orders.find((x) => x.id === cancelModal.orderId);
              // Solo cuando ya salió o estaba esperando que lo buscaran: rechazar
              // un pedido nuevo nunca es culpa del cliente.
              if (!o || refundRequired || !['delivery', 'pickup'].includes(o.order_type ?? '')) return null;
              if (!['ready', 'out_for_delivery'].includes(o.status)) return null;
              const opts: [string, string][] = [
                ['incident:not_received', o.order_type === 'delivery' ? t.incidentNotHome : t.incidentNoShow],
                ['incident:not_paid', t.incidentNotPaid],
              ];
              return (
                <>
                  <p className="mt-3 mb-0.5 text-[15px] font-semibold" style={{ color: C.sub }}>{t.incidentTitle}</p>
                  {opts.map(([value, label]) => (
                    <ReasonOption key={value} name="cancel-reason" label={label} checked={cancelReason === value} onSelect={() => setCancelReason(value)} />
                  ))}
                </>
              );
            })()}
          </div>
          <div className="px-6 pt-4 pb-6 flex gap-3 flex-shrink-0">
            <ModalButton tone="fill" onClick={() => { setCancelModal(null); setRefundRequired(false); }} className={refundRequired && isDevice ? 'flex-1' : 'flex-none min-w-[96px]'}>
              {t.no}
            </ModalButton>
            {refundRequired && isDevice ? null : refundRequired ? (
              <ModalButton tone="destructive" className="flex-1" onClick={handleRefundAndCancel} disabled={updatingId === cancelModal.orderId}>
                {t.en ? 'Refund & cancel' : 'Reembolsar y cancelar'}
              </ModalButton>
            ) : (
              <ModalButton tone="destructive" className="flex-1" onClick={handleCancel} disabled={!cancelReason || updatingId === cancelModal.orderId}>
                {t.confirmCancel}
              </ModalButton>
            )}
          </div>
        </CounterModal>
      )}

      {/* ══ DELIVERY GUARD MODAL ══ */}
      {deliveryGuardModal && (
        <CounterModal label={t.deliveryGuardTitle} onClose={() => setDeliveryGuardModal(null)}>
          <ModalHeader
            icon={<AlertTriangle className="w-6 h-6" strokeWidth={2.2} style={{ color: C.amber }} />}
            title={t.deliveryGuardTitle}
            subtitle={t.deliveryGuardBody}
            onClose={() => setDeliveryGuardModal(null)}
            closeLabel={t.en ? 'Close' : 'Cerrar'}
          />
          <div className="px-6 pt-2 pb-6 flex gap-3">
            <ModalButton tone="fill" className="flex-none min-w-[96px]" onClick={() => setDeliveryGuardModal(null)}>{t.no}</ModalButton>
            <ModalButton
              tone="accent"
              className="flex-1"
              onClick={() => {
                const order = deliveryGuardModal.order;
                setDeliveryGuardModal(null);
                commitStatus(order, 'deliver', true);
              }}
            >
              {t.deliveryGuardConfirm}
            </ModalButton>
          </div>
        </CounterModal>
      )}

      {/* ══ SHIFT MODALS ══ */}
      {shiftModal === 'open' && (
        <CounterModal label={t.shiftOpen} onClose={() => setShiftModal(null)}>
          <ModalHeader
            title={t.shiftOpen}
            subtitle={t.en ? 'Enter opening cash in the register' : 'Ingresa el efectivo inicial en caja'}
            onClose={() => setShiftModal(null)}
            closeLabel={t.en ? 'Close' : 'Cerrar'}
          />
          <div className="px-6 pb-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[15px] font-semibold" style={{ color: C.sub }}>{t.shiftOpeningCash}</span>
              <input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={shiftOpenCash}
                onChange={e => setShiftOpenCash(e.target.value)}
                className={`${MODAL_INPUT} ${NO_SPIN}`}
                style={MODAL_INPUT_STYLE}
                autoFocus
              />
            </label>
          </div>
          <div className="px-6 pt-4 pb-6 flex gap-3">
            <ModalButton tone="fill" className="flex-none min-w-[96px]" onClick={() => setShiftModal(null)}>{t.no}</ModalButton>
            <ModalButton tone="accent" className="flex-1" onClick={handleOpenShift} disabled={shiftSaving}>
              {shiftSaving ? <Spinner /> : t.shiftOpen}
            </ModalButton>
          </div>
        </CounterModal>
      )}

      {shiftModal === 'close' && (
        <CounterModal label={t.shiftClose} onClose={() => setShiftModal(null)}>
          <ModalHeader
            title={t.shiftClose}
            subtitle={t.en ? 'Count the cash in the register' : 'Cuenta el efectivo en la caja'}
            onClose={() => setShiftModal(null)}
            closeLabel={t.en ? 'Close' : 'Cerrar'}
          />
          <div className="px-6 pb-2 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[15px] font-semibold" style={{ color: C.sub }}>{t.shiftClosingCash}</span>
              <input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={shiftCloseCash}
                onChange={e => setShiftCloseCash(e.target.value)}
                placeholder="0.00"
                className={`${MODAL_INPUT} ${NO_SPIN}`}
                style={MODAL_INPUT_STYLE}
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[15px] font-semibold" style={{ color: C.sub }}>{t.shiftNotes}</span>
              <textarea
                value={shiftNotes}
                onChange={e => setShiftNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-[17px] outline-none focus:ring-2 resize-none"
                style={MODAL_INPUT_STYLE}
              />
            </label>
          </div>
          <div className="px-6 pt-4 pb-6 flex gap-3">
            <ModalButton tone="fill" className="flex-none min-w-[96px]" onClick={() => setShiftModal(null)}>{t.no}</ModalButton>
            <ModalButton tone="destructive" className="flex-1" onClick={handleCloseShift} disabled={shiftSaving}>
              {shiftSaving ? <Spinner /> : t.shiftClose}
            </ModalButton>
          </div>
        </CounterModal>
      )}

      {shiftModal === 'report' && shiftReport && (
        <CounterModal label={t.shiftReportZ} onClose={() => setShiftModal(null)} tall>
          <ModalHeader
            title={t.shiftReportZ}
            subtitle={`${new Date(shiftReport.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → ${new Date(shiftReport.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            onClose={() => setShiftModal(null)}
            closeLabel={t.en ? 'Close' : 'Cerrar'}
          />
          <div className="px-6 flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <dl className="flex flex-col">
              {[
                { label: t.shiftOrders, value: String(shiftReport.totalOrders) },
                { label: t.shiftRevenue, value: fmt(shiftReport.totalRevenue, currency) },
                { label: t.shiftCash, value: fmt(shiftReport.totalCash, currency) },
                { label: t.shiftCard, value: fmt(shiftReport.totalCard, currency) },
                { label: t.shiftOpeningCash, value: fmt(shiftReport.openingCash, currency) },
                { label: t.shiftExpected, value: fmt(shiftReport.expectedCash, currency) },
                { label: t.shiftClosingCash, value: fmt(shiftReport.closingCash, currency) },
              ].map(({ label, value }, i) => (
                <div key={label} className={cn('flex justify-between items-baseline gap-4 py-3', i > 0 && 'border-t')} style={{ borderColor: C.line }}>
                  <dt className="text-[16px]" style={{ color: C.sub }}>{label}</dt>
                  <dd className="text-[17px] font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 flex justify-between items-baseline gap-4 py-3 px-4 rounded-xl"
              style={{ background: C.fill, color: Math.abs(shiftReport.cashDifference) < 0.01 ? C.accentText : shiftReport.cashDifference < 0 ? C.destructive : C.blue }}>
              <span className="text-[17px] font-semibold">{t.shiftDiff}</span>
              <span className="text-[19px] font-bold tabular-nums">{shiftReport.cashDifference >= 0 ? '+' : ''}{fmt(shiftReport.cashDifference, currency)}</span>
            </div>
            {shiftReport.cashByDriver.length > 0 && (
              <div className="pt-5">
                <p className="text-[15px] font-semibold mb-1" style={{ color: C.sub }}>
                  {t.en ? 'Delivery cash by driver' : 'Efectivo de delivery por repartidor'}
                </p>
                {shiftReport.cashByDriver.map((d, i) => (
                  <div key={d.name ?? '—'} className={cn('flex justify-between items-baseline gap-4 py-3', i > 0 && 'border-t')} style={{ borderColor: C.line }}>
                    <span className="text-[16px] min-w-0">
                      {d.name ?? (t.en ? 'No driver name' : 'Sin repartidor')}
                      <span style={{ color: C.sub }}> · {d.orders} {d.orders === 1 ? (t.en ? 'order' : 'pedido') : (t.en ? 'orders' : 'pedidos')}</span>
                    </span>
                    <span className="text-[17px] font-semibold tabular-nums">{fmt(d.cash, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-6 pt-4 pb-6 flex-shrink-0" style={{ boxShadow: `0 -1px 0 ${C.line}` }}>
            <ModalButton tone="fill" className="w-full" onClick={() => { window.print(); }}>
              <Printer className="w-5 h-5" /> {t.shiftPrint}
            </ModalButton>
          </div>
        </CounterModal>
      )}

      {/* ══ DRIVER MODAL ══ */}
      {driverModal && (
        <CounterModal label={t.assignDriver} onClose={() => setDriverModal(null)}>
          <ModalHeader title={t.assignDriver} onClose={() => setDriverModal(null)} closeLabel={t.en ? 'Close' : 'Cerrar'} />
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 flex flex-col gap-4">
            {/* Driver pool quick-select */}
            {driverPool.length > 0 && (
              <div>
                <p className="text-[15px] font-semibold mb-2" style={{ color: C.sub }}>{t.en ? 'Select from your team:' : 'Elige de tu equipo:'}</p>
                <div className="flex flex-wrap gap-2">
                  {driverPool.map(d => {
                    const on = driverName === d.name;
                    return (
                      <button key={d.id} type="button" aria-pressed={on}
                        onClick={() => { setDriverName(d.name); setDriverPhone(d.phone); setSelectedDriverId(d.id); }}
                        className="h-11 px-4 rounded-full text-[16px] font-semibold"
                        style={on
                          ? { background: C.fill, color: C.ink, boxShadow: `inset 0 0 0 2px ${C.accent}` }
                          : { background: C.fill, color: C.ink }}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <input
              value={driverName}
              onChange={e => { setDriverName(e.target.value); setSelectedDriverId(null); }}
              placeholder={t.en ? 'Driver name' : 'Nombre del repartidor'}
              aria-label={t.en ? 'Driver name' : 'Nombre del repartidor'}
              className={MODAL_INPUT}
              style={MODAL_INPUT_STYLE}
            />
            <input
              value={driverPhone}
              onChange={e => setDriverPhone(e.target.value)}
              placeholder={t.en ? 'Phone' : 'Teléfono'}
              aria-label={t.en ? 'Phone' : 'Teléfono'}
              type="tel"
              className={MODAL_INPUT}
              style={MODAL_INPUT_STYLE}
            />
          </div>
          <div className="px-6 pt-5 pb-6 flex flex-col gap-3">
            <div className="flex gap-3">
              <ModalButton tone="fill" className="flex-none min-w-[96px]" onClick={() => setDriverModal(null)}>{t.no}</ModalButton>
              <ModalButton tone="accent" className="flex-1" onClick={handleAssignDriver} disabled={assigningDriver || !driverName.trim()}>
                {assigningDriver ? '…' : t.assignDriver}
              </ModalButton>
            </div>
            {/* Print driver sheet with QR */}
            {driverModal?.trackingToken && (
              <ModalButton
                tone="fill"
                className="w-full"
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
              >
                <Printer className="w-5 h-5" />
                {t.en ? 'Print driver sheet (QR)' : 'Imprimir ficha del repartidor (QR)'}
              </ModalButton>
            )}
          </div>
        </CounterModal>
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

type StatusHistoryRow = { id: string; from_status: string | null; to_status: string; note: string | null; created_at: string };

/** Solo para la vista previa de desarrollo (previewModal='history'). */
const PREVIEW_HISTORY: StatusHistoryRow[] = [
  { id: 'h1', from_status: null, to_status: 'pending', note: null, created_at: new Date(Date.now() - 20 * 60_000).toISOString() },
  { id: 'h2', from_status: 'pending', to_status: 'confirmed', note: '15 min', created_at: new Date(Date.now() - 18 * 60_000).toISOString() },
  { id: 'h3', from_status: 'confirmed', to_status: 'ready', note: null, created_at: new Date(Date.now() - 4 * 60_000).toISOString() },
];

function StatusHistory({ orderId, t, preview }: { orderId: string; t: ReturnType<typeof getT>; preview?: StatusHistoryRow[] }) {
  const [open, setOpen] = useState(!!preview);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<StatusHistoryRow[]>(preview ?? []);

  const load = async () => {
    if (history.length > 0) { setOpen(o => !o); return; }
    setOpen(true);
    setLoading(true);
    const res = await fetchOrderStatusHistory(orderId);
    setLoading(false);
    if (res.history) setHistory(res.history as typeof history);
  };

  return (
    <section className="rounded-[22px] px-4" style={{ background: C.surface }}>
      <button
        type="button"
        onClick={load}
        aria-expanded={open}
        className="w-full min-h-[52px] flex items-center justify-between gap-3 text-[16px] font-semibold"
        style={{ color: C.ink }}
      >
        <span className="flex items-center gap-2">
          <History className="w-5 h-5" style={{ color: C.sub }} />
          {t.en ? 'Status history' : 'Historial de estados'}
        </span>
        <ChevronDown className={cn('w-5 h-5 transition-transform duration-200', open && 'rotate-180')} style={{ color: C.sub }} />
      </button>
      {open && (
        <div className="pb-4">
          {loading ? (
            <div className="flex justify-center py-3">
              <span className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: C.line, borderTopColor: C.accent }} />
            </div>
          ) : history.length === 0 ? (
            <p className="text-[16px] text-center py-2" style={{ color: C.sub }}>{t.en ? 'No history yet' : 'Sin historial aún'}</p>
          ) : (
            <ol className="flex flex-col">
              {history.map((row, i) => {
                const label = t.en
                  ? row.to_status.replace(/_/g, ' ')
                  : (STATUS_LABEL[row.to_status] ?? row.to_status);
                const ts = new Date(row.created_at).toLocaleTimeString(t.en ? 'en' : 'es', { hour: '2-digit', minute: '2-digit' });
                const last = i === history.length - 1;
                return (
                  <li key={row.id} className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center flex-shrink-0 pt-[7px]">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: last ? C.accent : C.lineStrong }} />
                      {!last && <div className="w-px flex-1 mt-1" style={{ background: C.line }} />}
                    </div>
                    <div className={cn('flex-1 min-w-0 flex items-baseline justify-between gap-3', !last && 'pb-3')}>
                      <span className="min-w-0">
                        <span className="text-[16px] font-semibold first-letter:uppercase inline-block">{label}</span>
                        {row.note && <span className="text-[15px] ml-1.5" style={{ color: C.sub }}>· {row.note}</span>}
                      </span>
                      <span className="text-[15px] tabular-nums flex-shrink-0" style={{ color: C.sub }}>{ts}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
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
        <span className="text-[color:var(--kds-sub)]">{icon}</span>
        <p className="text-[15px] font-semibold text-[color:var(--kds-sub)]">{title}</p>
      </div>
      {children}
    </div>
  );
}

// Un programado que vence dentro de este margen se trata como pedido inmediato.
const SCHEDULED_SPLASH_LEAD_MS = SCHEDULED_LEAD_MS;

// ══════════════════════════════════════════════════════════════════════════════
// Modales del Counter: misma escala que la hoja del pedido y la alerta
// (título 22/700, cuerpo 16–17, botones 52 px 17/600, inputs 17 px para que iOS no haga zoom).
// ══════════════════════════════════════════════════════════════════════════════

const MODAL_INPUT = 'w-full h-[52px] px-4 rounded-xl text-[17px] outline-none focus:ring-2';
/** Sin las flechitas del input numérico (en una tablet no sirven y ocupan lugar). */
const NO_SPIN = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const MODAL_INPUT_STYLE = {
  background: C.surface,
  color: C.ink,
  boxShadow: `inset 0 0 0 1px ${C.lineStrong}`,
  '--tw-ring-color': C.accent,
} as React.CSSProperties;

function CounterModal({ label, onClose, tall = false, children }: {
  label: string; onClose: () => void; tall?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={label}
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div aria-hidden className="absolute inset-0" style={{ background: C.scrim }} onClick={onClose} />
      <div className={cn('relative w-full max-w-[480px] rounded-[28px] flex flex-col overflow-hidden', tall ? 'h-[min(720px,100%)]' : 'max-h-full')} style={RAISED}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, icon, onClose, closeLabel }: {
  title: string; subtitle?: string; icon?: React.ReactNode; onClose: () => void; closeLabel: string;
}) {
  return (
    <div className="flex items-start gap-3 px-6 pt-6 pb-4 flex-shrink-0">
      {icon && <span className="flex-none pt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <h2 className="text-[22px] font-bold tracking-[-0.015em] leading-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-[16px] leading-snug" style={{ color: C.sub }}>{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label={closeLabel}
        className="flex-none w-11 h-11 -mt-1.5 -mr-2 rounded-full inline-flex items-center justify-center" style={{ background: C.fill, color: C.ink }}>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function ModalButton({ tone, className, children, ...rest }: {
  tone: 'fill' | 'accent' | 'destructive';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const look = tone === 'accent' ? { background: C.accent, color: C.onAccent }
    : tone === 'destructive' ? { background: C.fill, color: C.destructive }
    : { background: C.fill, color: C.ink };
  return (
    <button type="button" {...rest}
      className={cn('min-h-[52px] px-4 py-2 rounded-2xl text-[17px] font-semibold leading-tight text-center inline-flex items-center justify-center gap-2 transition-transform active:scale-[.98] disabled:opacity-50', className)}
      style={look}>
      {children}
    </button>
  );
}

/** Interruptor estilo iOS. Apagado = riel `lineStrong` (≥ 1.5:1 contra el modal en los dos modos). */
function ToggleRow({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-t first:border-t-0" style={{ borderColor: C.line }}>
      <div className="min-w-0">
        <p className="text-[17px] font-semibold">{label}</p>
        <p className="text-[15px] leading-snug mt-0.5" style={{ color: C.sub }}>{desc}</p>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
        className="flex-none h-11 w-[60px] -mr-1 inline-flex items-center justify-center">
        <span className="relative block w-[52px] h-8 rounded-full transition-colors" style={{ background: on ? C.accent : C.lineStrong }}>
          <span className={cn('absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform', on && 'translate-x-5')}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
        </span>
      </button>
    </div>
  );
}

/** Motivo de rechazo / cancelación: el elegido lleva fondo rojo suave + borde. */
function ReasonOption({ name, label, checked, onSelect }: { name: string; label: string; checked: boolean; onSelect: () => void }) {
  return (
    <label className="flex items-center gap-3 min-h-[52px] px-4 py-2.5 rounded-xl cursor-pointer text-[17px] leading-snug"
      style={checked
        ? { background: `color-mix(in srgb, ${C.destructive} 12%, ${C.raised})`, boxShadow: `inset 0 0 0 2px ${C.destructive}`, color: C.ink, fontWeight: 600 }
        : { background: C.surface, boxShadow: `inset 0 0 0 1px ${C.line}`, color: C.ink }}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="w-5 h-5 flex-none" style={{ accentColor: C.destructive }} />
      {label}
    </label>
  );
}

function Spinner() {
  return <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}
