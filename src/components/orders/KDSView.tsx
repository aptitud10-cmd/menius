'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Printer, Volume2, VolumeX, MoreVertical, X, History, Pause, Flame, LogOut, Check, Undo2, AlertTriangle, WifiOff,
} from 'lucide-react';
import { updateOrderStatus, undoOrderStatus, setPauseOrders } from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
import { useLeaderTab } from '@/hooks/use-leader-tab';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { isAllergyText, stripNoteLabel } from './counter/ui';
import {
  kitchenItems, counterItems, kitchenTiming, shortOrderNumber, shortCustomerName,
  type KitchenItem, type KitchenRawItem,
} from '@/lib/kitchen';
import { OrderReceipt } from './OrderReceipt';
import type { Order, OrderStatus } from '@/types';

/*
 * Pantalla de cocina (rediseño 2026-11-13, investigación Toast/Square/Fresh/Oracle):
 * - La cocina ve SOLO lo que cocina (categories.send_to_kitchen); lo del mostrador queda
 *   como una línea al pie del ticket.
 * - Nada de caja: sin precios, pago ni teléfono.
 * - Un toque: LISTO. El Counter ya deja el pedido en preparación al aceptarlo.
 * - Color solo cuando hay que actuar: ámbar al 75% del tiempo prometido, rojo al pasarse.
 * - Alergias arriba de todo, en rojo. Opciones siempre visibles, con el formato del ticket.
 * - "All Day": cuántos de cada plato hay pendientes.
 */

/** Estados que están en la cocina. 'pending' lo acepta el Counter; 'ready' ya salió. */
const KITCHEN_STATUSES = new Set(['confirmed', 'preparing', 'almost_ready']);
const AUTO_ARCHIVE_MIN = 120;
const DEFAULT_ETA_MIN = 15;
const CANCELLED_SHOW_MS = 120_000;

const C = {
  bg: '#0c0d0f', card: '#17191d', line: '#262a30', ink: '#f4f5f7', sub: '#a3a9b3', mute: '#6b717c',
  ok: '#22c55e', warn: '#f5a524', late: '#ef4444', no: '#ff6b6b', note: '#fbbf24',
};

const TXT = {
  es: {
    kitchen: 'Cocina', inKitchen: 'en cocina', late: (n: number): string => (n === 1 ? 'atrasado' : 'atrasados'),
    waitingCounter: (n: number) => `${n} esperando en Counter`, online: 'En línea',
    offline: 'Sin conexión', queued: (n: number) => `${n} cambio${n === 1 ? '' : 's'} se envía${n === 1 ? '' : 'n'} al volver la conexión`,
    upcoming: (n: number): string => (n === 1 ? 'programado' : 'programados'), ready: 'LISTO', readyAt: 'listo', lateBy: (m: number) => `+${m} min tarde`, scheduled: 'programado',
    atCounter: 'en mostrador', table: 'MESA', allergy: 'ALERGIA', note: 'Nota', allDay: 'ALL DAY',
    recall: 'Recuperar', empty: 'Cocina al día', emptyDesc: 'Los pedidos aparecen acá cuando el Counter los acepta.',
    undone: 'Deshacer', markedReady: 'listo', cancelled: 'CANCELADO', ok: 'OK', history: 'Historial',
    historyDesc: 'Pedidos que salieron de la cocina en las últimas 6 horas.', noHistory: 'Todavía no salió ningún pedido.',
    autoPrint: 'Imprimir al entrar a cocina', sound: 'Sonido', pause: 'Pausar pedidos online', busy: 'Modo ocupado',
    busyDesc: 'Suma minutos al tiempo prometido para que los tickets no se pongan rojos en un pico.',
    stations: 'Estación', all: 'Todas', exit: 'Salir de la cocina', paused: 'Pausado', resume: 'Reanudar',
    oosTitle: (n: string) => `¿Marcar "${n}" como agotado?`, oosDesc: 'Se oculta del menú online hasta que lo vuelvas a activar.',
    oosOk: 'Agotado (86)', cancel: 'Cancelar', oosDone: 'Marcado como agotado', oosErr: 'No se pudo marcar como agotado',
    pauseFor: 'Pausar por', p30: '30 min', p60: '1 hora', p120: '2 horas', pToday: 'Hasta mañana',
    pauseFailed: 'No se pudo cambiar la pausa. Revisá la conexión.',
    paidRefund: 'Este pedido está pagado: cancelalo desde el Counter para devolverle el dinero al cliente',
    status: { ready: 'Listo', served: 'Servido', out_for_delivery: 'En camino', delivered: 'Entregado', completed: 'Cerrado', cancelled: 'Cancelado' } as Record<string, string>,
    reprint: 'Reimprimir', longPressHint: 'Mantené apretado un plato para marcarlo agotado (86).',
  },
  en: {
    kitchen: 'Kitchen', inKitchen: 'in kitchen', late: () => 'late',
    waitingCounter: (n: number) => `${n} waiting at Counter`, online: 'Online',
    offline: 'Offline', queued: (n: number) => `${n} change${n === 1 ? '' : 's'} will sync when back online`,
    upcoming: (): string => 'scheduled', ready: 'READY', readyAt: 'due', lateBy: (m: number) => `+${m} min late`, scheduled: 'scheduled',
    atCounter: 'at the counter', table: 'TABLE', allergy: 'ALLERGY', note: 'Note', allDay: 'ALL DAY',
    recall: 'Recall', empty: 'All caught up', emptyDesc: 'Orders show up here once the Counter accepts them.',
    undone: 'Undo', markedReady: 'ready', cancelled: 'CANCELLED', ok: 'OK', history: 'History',
    historyDesc: 'Orders that left the kitchen in the last 6 hours.', noHistory: 'No orders have left the kitchen yet.',
    autoPrint: 'Print when it reaches the kitchen', sound: 'Sound', pause: 'Pause online orders', busy: 'Busy mode',
    busyDesc: 'Adds minutes to the promised time so tickets don’t turn red during a rush.',
    stations: 'Station', all: 'All', exit: 'Leave kitchen', paused: 'Paused', resume: 'Resume',
    oosTitle: (n: string) => `Mark "${n}" as sold out?`, oosDesc: 'It’s hidden from the online menu until you turn it back on.',
    oosOk: 'Sold out (86)', cancel: 'Cancel', oosDone: 'Marked as sold out', oosErr: 'Couldn’t mark it as sold out',
    pauseFor: 'Pause for', p30: '30 min', p60: '1 hour', p120: '2 hours', pToday: 'Until tomorrow',
    pauseFailed: 'Couldn’t change the pause. Check the connection.',
    paidRefund: 'This order is paid — cancel it from the Counter to refund the customer',
    status: { ready: 'Ready', served: 'Served', out_for_delivery: 'On the way', delivered: 'Delivered', completed: 'Closed', cancelled: 'Cancelled' } as Record<string, string>,
    reprint: 'Reprint', longPressHint: 'Press and hold a dish to mark it sold out (86).',
  },
};
type T = typeof TXT.es;

interface KDSStation { id: string; name: string; color: string; position: number }

interface Props {
  initialOrders: Order[];
  restaurantId: string;
  restaurantName: string;
  currency: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantSlug: string;
  taxLabel?: string;
  taxIncluded?: boolean;
  kdsStations?: KDSStation[];
  /** restaurants.orders_paused_until al cargar — la pausa vive en la DB. */
  initialPausedUntil?: string | null;
}

interface Bumped { orderId: string; num: string; prev: OrderStatus; ts: number }

interface View {
  order: Order;
  items: KitchenItem[];
  counter: { qty: number; name: string }[];
  allergies: string[];
  timing: ReturnType<typeof kitchenTiming>;
  eta: number;
}

const etaOf = (o: Order, busyExtra: number) => (Number(o.estimated_ready_minutes) || DEFAULT_ETA_MIN) + busyExtra;
/** Programado: entra a cocina a la hora de retiro menos el tiempo de preparación. */
const fireAtOf = (o: Order, eta: number) => (o.scheduled_for ? new Date(o.scheduled_for).getTime() - eta * 60_000 : null);
/** Desde cuándo corre el timer: la hora de disparo (programados) o cuando el Counter lo aceptó. */
const startOf = (o: Order, eta: number) => {
  const fire = fireAtOf(o, eta);
  if (fire !== null && Number.isFinite(fire)) return new Date(fire).toISOString();
  return ((o as unknown as { prepared_at?: string | null }).prepared_at) || o.created_at;
};

export function KDSView({ initialOrders, restaurantId, restaurantName, currency, restaurantPhone, restaurantAddress, taxLabel, taxIncluded, kdsStations = [], initialPausedUntil = null }: Props) {
  const { locale } = useDashboardLocale();
  const isEn = locale === 'en';
  const T: T = isEn ? TXT.en : TXT.es;

  const [stationFilter, setStationFilter] = useState<string>('all');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [struck, setStruck] = useState<Record<string, number[]>>({});
  const [bumps, setBumps] = useState<Bumped[]>([]);
  const [undoFor, setUndoFor] = useState<Bumped | null>(null);
  const undoTimer = useRef<NodeJS.Timeout | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [kbUsed, setKbUsed] = useState(false);
  const [busyExtra, setBusyExtra] = useState(0);
  const [sheet, setSheet] = useState<null | 'menu' | 'history' | 'pause' | 'busy'>(null);
  const [oos, setOos] = useState<{ productId: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((msg: string, ok: boolean, ms = 4000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  const [autoPrint, setAutoPrint] = useState(() => typeof window !== 'undefined' && localStorage.getItem('menius-auto-print') === 'true');
  // La pausa es la misma del Counter (restaurants.orders_paused_until).
  const [pausedUntil, setPausedUntil] = useState<number | null>(() => {
    const ms = initialPausedUntil ? new Date(initialPausedUntil).getTime() : NaN;
    return Number.isFinite(ms) && ms > Date.now() ? ms : null;
  });

  /* Reloj: un tick por segundo mueve timers y colores. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (pausedUntil && now >= pausedUntil) setPausedUntil(null); }, [now, pausedUntil]);

  /* Conexión */
  const [online, setOnline] = useState(true);
  const offlineQueue = useRef<{ id: string; status: OrderStatus; prev: OrderStatus; num: string }[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    const off = () => setOnline(false);
    const on = () => { setOnline(true); void flushRef.current(); };
    window.addEventListener('online', on); window.addEventListener('offline', off); setOnline(navigator.onLine);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* La pantalla no se apaga */
  useEffect(() => {
    let alive = true;
    let lock: { release: () => Promise<void> } | null = null;
    const acq = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (wl && alive) lock = await wl.request('screen');
      } catch { /* sin wake lock */ }
    };
    void acq();
    const vis = () => { if (document.visibilityState === 'visible') void acq(); };
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => {}); };
  }, []);

  /* Tiempo real. El aviso no es al entrar el pedido (todavía 'pending', es del Counter)
     sino cuando llega a la cocina — ver más abajo. */
  const { soundEnabled, setSoundEnabled, updateTabTitle, playSound } = useNotifications({ defaultTitle: 'KDS — MENIUS' });
  const isLeader = useLeaderTab(`menius-kds-leader:${restaurantId}`);
  const { orders, updateOrderLocally } = useRealtimeOrders({ restaurantId, initialOrders });

  /* Lo que está en la cocina, el más urgente primero (orden estable: la hora prometida no cambia). */
  const kitchenAll = useMemo(() => orders.filter((o) =>
    KITCHEN_STATUSES.has(o.status) && kitchenItems(o.items as unknown as KitchenRawItem[]).length > 0,
  ), [orders]);
  const kitchen = useMemo(() => kitchenAll.filter((o) => {
    const age = (now - new Date(startOf(o, etaOf(o, busyExtra))).getTime()) / 60000;
    return age >= 0 && age <= AUTO_ARCHIVE_MIN;
  }), [kitchenAll, now, busyExtra]);
  /** Programados que todavía no entran a cocina. */
  const upcoming = kitchenAll.filter((o) => new Date(startOf(o, etaOf(o, busyExtra))).getTime() > now).length;

  const views: View[] = useMemo(() => kitchen
    .map((o) => {
      const raw = o.items as unknown as KitchenRawItem[];
      const items = kitchenItems(raw, stationFilter);
      const eta = etaOf(o, busyExtra);
      const allergies: string[] = [];
      if (isAllergyText(o.notes)) allergies.push(stripNoteLabel(o.notes));
      for (const it of items) if (it.note && isAllergyText(it.note)) allergies.push(`${stripNoteLabel(it.note)} — ${it.name}`);
      return { order: o, items, counter: counterItems(raw), allergies, eta, timing: kitchenTiming(startOf(o, eta), eta, now) };
    })
    .filter((v) => v.items.length > 0)
    .sort((a, b) => a.timing.dueAt - b.timing.dueAt), [kitchen, stationFilter, busyExtra, now]);

  /* Pedidos que llegan a la cocina: brillo + sonido (+ impresión si está activada).
     Pedidos cancelados mientras estaban en pantalla: se marcan, no desaparecen de golpe. */
  const seen = useRef<Map<string, Order> | null>(null);
  const recalled = useRef<Set<string>>(new Set());
  const [cancelledShown, setCancelledShown] = useState<{ order: Order; ts: number }[]>([]);
  const isLeaderRef = useRef(isLeader); isLeaderRef.current = isLeader;
  const printCfg = useRef({ autoPrint, restaurantName, restaurantPhone, restaurantAddress, currency, taxLabel, taxIncluded, locale });
  printCfg.current = { autoPrint, restaurantName, restaurantPhone, restaurantAddress, currency, taxLabel, taxIncluded, locale };
  useEffect(() => {
    const current = new Map(kitchen.map((o) => [o.id, o]));
    if (seen.current === null) { seen.current = current; return; }
    const fresh = kitchen.filter((o) => !seen.current!.has(o.id) && !recalled.current.has(o.id));
    for (const o of kitchen) recalled.current.delete(o.id);
    if (fresh.length > 0) {
      setNewIds((p) => { const n = new Set(p); fresh.forEach((o) => n.add(o.id)); return n; });
      setTimeout(() => setNewIds((p) => { const n = new Set(p); fresh.forEach((o) => n.delete(o.id)); return n; }), 10_000);
      if (isLeaderRef.current) {
        playSound(fresh.some((o) => o.order_type === 'delivery') ? 'urgent' : 'normal');
        const c = printCfg.current;
        if (c.autoPrint) {
          void import('./OrderReceipt').then(({ quickPrintOrder }) => {
            for (const o of fresh) quickPrintOrder(o, c.restaurantName, c.restaurantPhone, c.restaurantAddress, c.currency, c.taxLabel, c.taxIncluded, c.locale);
          });
        }
      }
    }
    const gone: Order[] = [];
    seen.current.forEach((prev, id) => {
      if (current.has(id)) return;
      const nowOrder = orders.find((o) => o.id === id);
      if (nowOrder?.status === 'cancelled') gone.push(nowOrder ?? prev);
    });
    if (gone.length > 0) {
      setCancelledShown((p) => [...p.filter((c) => !gone.some((g) => g.id === c.order.id)), ...gone.map((order) => ({ order, ts: Date.now() }))]);
      if (isLeaderRef.current) playSound('urgent');
    }
    seen.current = current;
  }, [kitchen, orders, playSound]);
  useEffect(() => {
    if (cancelledShown.some((c) => now - c.ts > CANCELLED_SHOW_MS)) setCancelledShown((p) => p.filter((c) => now - c.ts <= CANCELLED_SHOW_MS));
  }, [now, cancelledShown]);

  useEffect(() => { updateTabTitle(views.length); }, [views.length, updateTabTitle]);
  useEffect(() => { setSelectedIdx((i) => Math.min(i, Math.max(0, views.length - 1))); }, [views.length]);

  /* All Day: cuántos de cada plato faltan (los tachados ya salieron). */
  const allDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of views) {
      const done = new Set(struck[v.order.id] ?? []);
      for (const it of v.items) if (!done.has(it.index)) m.set(it.name, (m.get(it.name) ?? 0) + it.qty);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [views, struck]);

  const lateCount = views.filter((v) => v.timing.state === 'late').length;
  const pendingInCounter = orders.filter((o) => o.status === 'pending').length;

  /* ── Acciones ── */
  const friendlyError = useCallback((e: string) => (e === 'PAID_ORDER_NEEDS_REFUND' ? T.paidRefund : e), [T]);
  // 'network' = no llegó al servidor (se encola); {error} = el servidor lo rechazó.
  const sendStatus = useCallback(async (id: string, next: OrderStatus): Promise<{ error?: string } | 'network'> => {
    try { return (await updateOrderStatus(id, next)) ?? {}; } catch { return 'network'; }
  }, []);
  const flushing = useRef(false);
  const flushQueue = useCallback(async () => {
    // Un solo reenvío a la vez, en el orden en que se hicieron los cambios.
    if (!navigator.onLine || flushing.current) return;
    flushing.current = true;
    try {
      while (offlineQueue.current.length) {
        const item = offlineQueue.current[0];
        const r = await sendStatus(item.id, item.status);
        if (r === 'network') break;
        const at = offlineQueue.current.indexOf(item);
        if (at !== -1) offlineQueue.current.splice(at, 1);
        if (r.error) {
          updateOrderLocally(item.id, { status: item.prev });
          showToast(`#${shortOrderNumber(item.num)}: ${friendlyError(r.error)}`, false, 5000);
        }
      }
    } finally { flushing.current = false; }
    setQueuedCount(offlineQueue.current.length);
  }, [sendStatus, updateOrderLocally, friendlyError, showToast]);
  flushRef.current = flushQueue;
  // El evento 'online' no garantiza que el servidor responda: reintento cada 15 s.
  useEffect(() => {
    if (!queuedCount) return;
    const iv = setInterval(() => { void flushRef.current(); }, 15_000);
    return () => clearInterval(iv);
  }, [queuedCount]);

  const bump = useCallback(async (o: Order) => {
    const prev = o.status as OrderStatus;
    const next: OrderStatus = 'ready';
    updateOrderLocally(o.id, { status: next });
    const enqueue = () => {
      offlineQueue.current.push({ id: o.id, status: next, prev, num: o.order_number });
      setQueuedCount(offlineQueue.current.length);
    };
    if (navigator.onLine && offlineQueue.current.length === 0) {
      const result = await sendStatus(o.id, next);
      if (result === 'network') enqueue();
      else if (result.error) {
        updateOrderLocally(o.id, { status: prev });
        showToast(friendlyError(result.error), false);
        return;
      }
    } else enqueue();
    playSound('success');
    const b: Bumped = { orderId: o.id, num: o.order_number, prev, ts: Date.now() };
    setBumps((p) => [b, ...p.filter((x) => x.orderId !== o.id)].slice(0, 20));
    setStruck((p) => { const n = { ...p }; delete n[o.id]; return n; });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoFor(b);
    undoTimer.current = setTimeout(() => setUndoFor(null), 6000);
  }, [updateOrderLocally, sendStatus, friendlyError, showToast, playSound]);

  /** Vuelve un pedido a la cocina (deshacer o recuperar). */
  const recall = useCallback(async (orderId: string, prev: OrderStatus = 'preparing') => {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    const cur = o.status as OrderStatus;
    setUndoFor(null); if (undoTimer.current) clearTimeout(undoTimer.current);
    recalled.current.add(orderId);
    updateOrderLocally(orderId, { status: prev });
    setBumps((p) => p.filter((x) => x.orderId !== orderId));
    // Si el cambio todavía no salió (en cola), alcanza con sacarlo de la cola.
    const qi = offlineQueue.current.findIndex((q) => q.id === orderId && q.status === cur);
    if (qi !== -1 && !(qi === 0 && flushing.current) && !offlineQueue.current.slice(qi + 1).some((q) => q.id === orderId)) {
      offlineQueue.current.splice(qi, 1);
      setQueuedCount(offlineQueue.current.length);
      return;
    }
    // undoOrderStatus, no updateOrderStatus: la máquina de estados no tiene vuelta atrás.
    const result = await undoOrderStatus(orderId, prev).catch(() => ({ error: T.offline }));
    if (result?.error) {
      recalled.current.delete(orderId);
      updateOrderLocally(orderId, { status: cur });
      showToast(friendlyError(result.error), false);
    }
  }, [orders, updateOrderLocally, friendlyError, showToast, T]);

  const lastRecallable = bumps.find((b) => orders.find((o) => o.id === b.orderId)?.status === 'ready') ?? null;

  const toggleItem = (orderId: string, index: number) => setStruck((p) => {
    const cur = new Set(p[orderId] ?? []);
    if (cur.has(index)) cur.delete(index); else cur.add(index);
    return { ...p, [orderId]: Array.from(cur) };
  });

  const markOOS = async () => {
    if (!oos) return;
    const { productId } = oos;
    setOos(null);
    try {
      const res = await fetch('/api/products/stock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, in_stock: false }),
      });
      showToast(res.ok ? T.oosDone : T.oosErr, res.ok, 3000);
    } catch { showToast(T.oosErr, false, 3000); }
  };

  const doPause = async (min: number) => {
    let ms = min * 60000;
    if (min === 9999) { const n = new Date(); ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime(); }
    const prev = pausedUntil;
    const u = Date.now() + ms; setPausedUntil(u); setSheet(null);
    const res = await setPauseOrders(new Date(u).toISOString()).catch(() => ({ error: 'network' }));
    if (res?.error) { setPausedUntil(prev); showToast(T.pauseFailed, false); }
  };
  const doUnpause = async () => {
    const prev = pausedUntil;
    setPausedUntil(null);
    const res = await setPauseOrders(null).catch(() => ({ error: 'network' }));
    if (res?.error) { setPausedUntil(prev); showToast(T.pauseFailed, false); }
  };

  /* Teclado / bump bar: Espacio o Enter = LISTO, flechas = elegir, R = recuperar el último. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') { setSheet(null); setOos(null); return; }
      if (sheet || oos) return;
      switch (e.key) {
        case ' ': case 'Enter': {
          e.preventDefault(); setKbUsed(true);
          const v = views[selectedIdx]; if (v) void bump(v.order);
          break;
        }
        case 'ArrowRight': case 'ArrowDown': e.preventDefault(); setKbUsed(true); setSelectedIdx((i) => Math.min(i + 1, views.length - 1)); break;
        case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); setKbUsed(true); setSelectedIdx((i) => Math.max(i - 1, 0)); break;
        case 'r': case 'R':
          if (!e.ctrlKey && !e.metaKey && lastRecallable) { e.preventDefault(); void recall(lastRecallable.orderId, lastRecallable.prev); }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [views, selectedIdx, bump, recall, lastRecallable, sheet, oos]);

  // Todo depende de la hora: hasta montar en el navegador no se pinta nada (si no, la hora
  // del servidor y la del cliente no coinciden y React descarta el HTML).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pauseLeft = pausedUntil ? Math.max(0, Math.ceil((pausedUntil - now) / 60000)) : 0;
  const clock = new Date(now).toLocaleTimeString(isEn ? 'en-US' : 'es-MX', { hour: 'numeric', minute: '2-digit' });

  if (!mounted) return <div className="flex-1" style={{ background: C.bg }} />;

  return (
    <div className="flex-1 min-h-0 flex flex-col select-none" style={{ background: C.bg, color: C.ink }}>
      {/* ── Barra superior ── */}
      <header className="flex items-center gap-[clamp(10px,1.4vw,22px)] px-[clamp(12px,1.5vw,24px)] h-[clamp(56px,4.6vw,72px)] border-b flex-shrink-0" style={{ borderColor: C.line }}>
        <div className="leading-tight min-w-0">
          <p className="text-[clamp(17px,1.4vw,24px)] font-extrabold tracking-tight">{T.kitchen}</p>
          <p className="text-[12px] font-semibold truncate max-w-[180px]" style={{ color: C.mute }}>{restaurantName}</p>
        </div>
        <Stat n={views.length} label={T.inKitchen} />
        {lateCount > 0 && <Stat n={lateCount} label={T.late(lateCount)} color={C.late} />}
        {upcoming > 0 && <Stat n={upcoming} label={T.upcoming(upcoming)} color={C.sub} />}
        {pendingInCounter > 0 && (
          <Link href="/counter" className="hidden md:inline-flex items-center h-9 px-3 rounded-full text-[13px] font-bold" style={{ background: '#1d2a22', color: C.ok }}>
            {T.waitingCounter(pendingInCounter)}
          </Link>
        )}
        {pausedUntil && (
          <button onClick={doUnpause} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-bold" style={{ background: '#3a0d0d', color: '#ffb4b4' }}>
            <Pause className="w-3.5 h-3.5" /> {T.paused} · {pauseLeft} min · <span className="underline">{T.resume}</span>
          </button>
        )}
        {busyExtra > 0 && (
          <button onClick={() => setSheet('busy')} className="inline-flex items-center gap-1 h-9 px-3 rounded-full text-[13px] font-bold" style={{ background: '#3a2a0a', color: C.warn }}>
            <Flame className="w-3.5 h-3.5" /> +{busyExtra} min
          </button>
        )}
        <div className="flex-1" />
        {kdsStations.length > 0 && (
          <div className="hidden lg:flex items-center gap-1">
            {[{ id: 'all', name: T.all, color: C.ink }, ...kdsStations].map((s) => (
              <button key={s.id} onClick={() => setStationFilter(s.id)}
                className="h-9 px-3 rounded-full text-[13px] font-bold border"
                style={stationFilter === s.id ? { background: s.color, color: '#0c0d0f', borderColor: s.color } : { borderColor: C.line, color: C.sub }}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        <span className="hidden sm:inline-flex items-center gap-2 text-[13px] font-bold" style={{ color: online ? C.sub : C.late }}>
          <i className="w-2.5 h-2.5 rounded-full" style={{ background: online ? C.ok : C.late, boxShadow: `0 0 0 4px ${online ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.2)'}` }} />
          {online ? T.online : T.offline}
        </span>
        <span className="text-[clamp(20px,1.7vw,30px)] font-extrabold tabular-nums tracking-tight">{clock}</span>
        <IconBtn onClick={() => setSoundEnabled(!soundEnabled)} label={T.sound} active={!soundEnabled} danger>
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </IconBtn>
        <IconBtn onClick={() => setSheet('menu')} label="Menu"><MoreVertical className="w-5 h-5" /></IconBtn>
      </header>

      {(!online || queuedCount > 0) && (
        <div className="flex items-center justify-center gap-2 py-2 text-[15px] font-bold flex-shrink-0" style={{ background: C.late, color: '#fff' }}>
          <WifiOff className="w-4 h-4" /> {!online ? T.offline : ''}{!online && queuedCount > 0 ? ' — ' : ''}{queuedCount > 0 ? T.queued(queuedCount) : ''}
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* ── Tickets ── */}
        <main className="flex-1 min-w-0 overflow-y-auto p-[clamp(10px,1.1vw,18px)]">
          {views.length === 0 && cancelledShown.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <Check className="w-14 h-14" style={{ color: C.ok }} />
              <p className="text-[clamp(22px,2vw,34px)] font-extrabold">{T.empty}</p>
              <p className="text-[16px] font-medium" style={{ color: C.mute }}>{T.emptyDesc}</p>
            </div>
          ) : (
            <div className="grid items-start gap-[clamp(10px,1.1vw,18px)]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(280px, 19vw, 420px), 1fr))' }}>
              {cancelledShown.map(({ order }) => (
                <CancelledTicket key={`x-${order.id}`} order={order} T={T}
                  onDismiss={() => setCancelledShown((p) => p.filter((c) => c.order.id !== order.id))} />
              ))}
              {views.map((v, idx) => (
                <Ticket key={v.order.id} v={v} T={T} isEn={isEn}
                  isNew={newIds.has(v.order.id)}
                  isSelected={kbUsed && idx === selectedIdx}
                  struck={struck[v.order.id] ?? []}
                  onToggleItem={(i) => toggleItem(v.order.id, i)}
                  onLongPress={(it) => it.productId && setOos({ productId: it.productId, name: it.name })}
                  onBump={() => { setSelectedIdx(idx); void bump(v.order); }} />
              ))}
            </div>
          )}
        </main>

        {/* ── All Day ── */}
        <aside className="hidden md:flex flex-col w-[clamp(210px,17vw,320px)] flex-shrink-0 border-l px-[clamp(12px,1.2vw,20px)] py-4" style={{ borderColor: C.line }}>
          <p className="text-[12px] font-extrabold tracking-[0.14em] mb-2" style={{ color: C.mute }}>{T.allDay}</p>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {allDay.map(([name, qty]) => (
              <div key={name} className="flex items-baseline gap-3 py-2.5 border-b" style={{ borderColor: C.line }}>
                <b className="text-[clamp(20px,1.7vw,30px)] font-black tabular-nums min-w-[1.6em]" style={{ color: qty > 1 ? C.warn : C.ink }}>{qty}</b>
                <span className="text-[clamp(15px,1.2vw,20px)] font-semibold leading-snug">{name}</span>
              </div>
            ))}
          </div>
          {lastRecallable && (
            <button onClick={() => void recall(lastRecallable.orderId, lastRecallable.prev)}
              className="mt-3 h-12 rounded-xl border flex items-center justify-center gap-2 text-[15px] font-bold active:scale-[0.98]"
              style={{ borderColor: C.line, color: C.sub }}>
              <Undo2 className="w-4 h-4" /> {T.recall} #{shortOrderNumber(lastRecallable.num)}
            </button>
          )}
        </aside>
      </div>

      {/* Deshacer */}
      {undoFor && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 pl-5 pr-2 py-2 rounded-2xl shadow-2xl" style={{ background: '#23262b', border: `1px solid ${C.line}` }}>
          <span className="text-[16px] font-bold">#{shortOrderNumber(undoFor.num)} {T.markedReady}</span>
          <button onClick={() => void recall(undoFor.orderId, undoFor.prev)} className="h-11 px-4 rounded-xl text-[15px] font-extrabold flex items-center gap-1.5" style={{ background: C.ink, color: C.bg }}>
            <Undo2 className="w-4 h-4" /> {T.undone}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-[15px] font-bold shadow-2xl max-w-[90vw] text-center" style={{ background: toast.ok ? '#14532d' : '#7f1d1d', color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Menú ── */}
      {sheet === 'menu' && (
        <Sheet onClose={() => setSheet(null)}>
          <MenuRow icon={<History className="w-5 h-5" />} label={T.history} onClick={() => setSheet('history')} />
          <MenuRow icon={<Printer className="w-5 h-5" />} label={T.autoPrint} toggle={autoPrint}
            onClick={() => { const v = !autoPrint; setAutoPrint(v); localStorage.setItem('menius-auto-print', String(v)); }} />
          <MenuRow icon={<Flame className="w-5 h-5" />} label={T.busy} value={busyExtra ? `+${busyExtra} min` : undefined} onClick={() => setSheet('busy')} />
          <MenuRow icon={<Pause className="w-5 h-5" />} label={T.pause} value={pausedUntil ? `${pauseLeft} min` : undefined} onClick={() => (pausedUntil ? void doUnpause() : setSheet('pause'))} />
          {kdsStations.length > 0 && (
            <div className="py-3 border-b lg:hidden" style={{ borderColor: C.line }}>
              <p className="text-[13px] font-bold mb-2" style={{ color: C.mute }}>{T.stations}</p>
              <div className="flex flex-wrap gap-2">
                {[{ id: 'all', name: T.all, color: C.ink }, ...kdsStations].map((s) => (
                  <button key={s.id} onClick={() => { setStationFilter(s.id); setSheet(null); }} className="h-10 px-4 rounded-full text-[14px] font-bold border"
                    style={stationFilter === s.id ? { background: s.color, color: '#0c0d0f', borderColor: s.color } : { borderColor: C.line, color: C.sub }}>{s.name}</button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[13px] font-medium py-3" style={{ color: C.mute }}>{T.longPressHint}</p>
          <Link href="/app/orders" className="flex items-center gap-3 h-14 text-[16px] font-bold" style={{ color: C.late }}>
            <LogOut className="w-5 h-5" /> {T.exit}
          </Link>
        </Sheet>
      )}

      {sheet === 'busy' && (
        <Sheet onClose={() => setSheet(null)} title={T.busy}>
          <p className="text-[14px] mb-4" style={{ color: C.sub }}>{T.busyDesc}</p>
          <div className="grid grid-cols-4 gap-2">
            {[0, 10, 20, 30].map((v) => (
              <button key={v} onClick={() => { setBusyExtra(v); setSheet(null); }} className="h-16 rounded-2xl text-[20px] font-extrabold"
                style={busyExtra === v ? { background: C.ink, color: C.bg } : { background: '#23262b', color: C.ink }}>
                {v === 0 ? '—' : `+${v}`}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === 'pause' && (
        <Sheet onClose={() => setSheet(null)} title={T.pause}>
          <p className="text-[14px] mb-4" style={{ color: C.sub }}>{T.pauseFor}</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: 30, l: T.p30 }, { v: 60, l: T.p60 }, { v: 120, l: T.p120 }, { v: 9999, l: T.pToday }].map((o) => (
              <button key={o.v} onClick={() => void doPause(o.v)} className="h-16 rounded-2xl text-[18px] font-extrabold" style={{ background: '#23262b', color: C.ink }}>{o.l}</button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === 'history' && (
        <HistorySheet orders={orders} now={now} T={T} isEn={isEn} onClose={() => setSheet(null)}
          onRecall={(id) => { setSheet(null); void recall(id, 'preparing'); }}
          onPrint={(o) => setPrintOrder(o)} />
      )}

      {oos && (
        <Sheet onClose={() => setOos(null)} title={T.oosTitle(oos.name)}>
          <p className="text-[15px] mb-5" style={{ color: C.sub }}>{T.oosDesc}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setOos(null)} className="h-14 rounded-2xl text-[17px] font-bold" style={{ background: '#23262b' }}>{T.cancel}</button>
            <button onClick={() => void markOOS()} className="h-14 rounded-2xl text-[17px] font-extrabold" style={{ background: C.late, color: '#fff' }}>{T.oosOk}</button>
          </div>
        </Sheet>
      )}

      {printOrder && <OrderReceipt order={printOrder} restaurantName={restaurantName} restaurantPhone={restaurantPhone} restaurantAddress={restaurantAddress} currency={currency} taxLabel={taxLabel} taxIncluded={taxIncluded} onClose={() => setPrintOrder(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Ticket
   ══════════════════════════════════════════════════════════════════════ */
function Ticket({ v, T, isEn, isNew, isSelected, struck, onToggleItem, onLongPress, onBump }: {
  v: View; T: T; isEn: boolean; isNew: boolean; isSelected: boolean; struck: number[];
  onToggleItem: (index: number) => void; onLongPress: (it: KitchenItem) => void; onBump: () => void;
}) {
  const { order, items, counter, allergies, timing } = v;
  const done = new Set(struck);
  const headStyle = timing.state === 'late'
    ? { background: C.late, color: '#fff' }
    : timing.state === 'warn' ? { background: C.warn, color: '#1a1200' } : undefined;
  const chipBg = timing.state === 'ok' ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.18)';
  const table = (order as unknown as { table?: { name?: string } | null; table_name?: string | null }).table?.name
    ?? (order as unknown as { table_name?: string | null }).table_name ?? null;
  // "Mesa 4" ya dice mesa: no repetir "MESA Mesa 4".
  const tableLabel = table ? (/^(mesa|table)\b/i.test(table.trim()) ? table.trim() : `${T.table} ${table}`) : T.table;
  const channel = order.order_type === 'dine_in' ? tableLabel.toUpperCase() : order.order_type === 'delivery' ? 'DELIVERY' : 'PICKUP';
  const who = shortCustomerName(order.customer_name);
  const scheduled = !!order.scheduled_for;
  const timeFmt = (ms: number) => new Date(ms).toLocaleTimeString(isEn ? 'en-US' : 'es-MX', { hour: 'numeric', minute: '2-digit' });
  const orderNote = order.notes?.trim() && !isAllergyText(order.notes) ? stripNoteLabel(order.notes.trim()) : null;

  return (
    <article
      className={cn('rounded-2xl overflow-hidden flex flex-col border transition-shadow', isNew && 'kds-card-enter')}
      style={{
        background: C.card, borderColor: isSelected ? C.ink : C.line,
        boxShadow: isNew ? `0 0 0 2px ${C.ok}, 0 0 32px rgba(34,197,94,.28)` : isSelected ? `0 0 0 2px ${C.ink}` : undefined,
      }}
    >
      <header className="flex justify-between items-start gap-3 px-4 pt-3 pb-3" style={headStyle}>
        <div className="min-w-0">
          <p className="text-[clamp(26px,2.3vw,40px)] font-black tracking-tight leading-none tabular-nums">#{shortOrderNumber(order.order_number)}</p>
          <p className="mt-1.5 flex items-center gap-2 text-[clamp(13px,1vw,16px)] font-bold min-w-0">
            <span className="text-[11px] font-extrabold tracking-[0.06em] px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: chipBg }}>{channel}</span>
            {who && <span className="truncate opacity-90">{who}</span>}
          </p>
        </div>
        <div className="text-right leading-none flex-shrink-0">
          <p className="text-[clamp(26px,2.3vw,40px)] font-black tabular-nums tracking-tight" style={timing.state === 'ok' ? { color: C.ok } : undefined}>{timing.timer}</p>
          <p className="mt-1.5 text-[13px] font-bold opacity-85">
            {timing.state === 'late' ? T.lateBy(timing.lateMin)
              : scheduled ? `${T.scheduled} ${timeFmt(new Date(order.scheduled_for!).getTime())}`
              : `${T.readyAt} ${timeFmt(timing.dueAt)}`}
          </p>
        </div>
      </header>

      {allergies.length > 0 && (
        <div className="flex gap-2 items-start px-4 py-2.5 text-[clamp(15px,1.15vw,19px)] font-extrabold leading-snug border-y" style={{ background: '#3a0d0d', color: '#ffb4b4', borderColor: '#5c1414' }}>
          <span className="text-[11px] font-black tracking-[0.06em] px-1.5 py-1 rounded-md flex-shrink-0 mt-0.5 flex items-center gap-1" style={{ background: C.late, color: '#fff' }}>
            <AlertTriangle className="w-3 h-3" /> {T.allergy}
          </span>
          <span className="min-w-0">{allergies.join(' · ')}</span>
        </div>
      )}

      <div className="px-4 py-1">
        {items.map((it) => (
          <ItemRow key={it.index} it={it} done={done.has(it.index)} T={T}
            onTap={() => onToggleItem(it.index)} onLong={() => onLongPress(it)} />
        ))}
      </div>

      {orderNote && (
        <p className="mx-4 mb-2 pl-2.5 border-l-[3px] text-[clamp(15px,1.15vw,19px)] font-bold" style={{ color: C.note, borderColor: C.note }}>
          {T.note}: {orderNote}
        </p>
      )}

      <footer className="mt-auto px-4 pb-4 pt-2 flex flex-col gap-2.5">
        {counter.length > 0 && (
          <p className="text-[clamp(13px,1vw,17px)] font-semibold leading-snug" style={{ color: C.mute }}>
            + <b style={{ color: C.sub }}>{counter.map((c) => `${c.qty} ${c.name}`).join(' · ')}</b> {T.atCounter}
          </p>
        )}
        <button onClick={onBump}
          className="h-[clamp(56px,4.4vw,72px)] rounded-[14px] text-[clamp(18px,1.5vw,24px)] font-black tracking-[0.05em] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform touch-manipulation"
          style={{ background: C.ink, color: C.bg }}>
          {T.ready} <Check className="w-6 h-6" strokeWidth={3} />
        </button>
      </footer>
    </article>
  );
}

/** Tocar = tachar (ya salió). Mantener apretado = agotado (86). */
function ItemRow({ it, done, T, onTap, onLong }: { it: KitchenItem; done: boolean; T: T; onTap: () => void; onLong: () => void }) {
  const timer = useRef<NodeJS.Timeout | null>(null);
  const longFired = useRef(false);
  const start = () => { longFired.current = false; timer.current = setTimeout(() => { longFired.current = true; onLong(); }, 650); };
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const note = it.note ? stripNoteLabel(it.note) : null;
  const allergy = isAllergyText(it.note);
  return (
    <div
      role="button" tabIndex={-1}
      onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (!longFired.current) onTap(); }}
      className="py-2.5 border-b last:border-b-0 cursor-pointer touch-manipulation"
      style={{ borderColor: C.line, opacity: done ? 0.35 : 1 }}
    >
      <div className="flex gap-3 items-baseline">
        <span className="text-[clamp(20px,1.7vw,30px)] font-black tabular-nums min-w-[1.4em]" style={{ color: it.qty > 1 ? C.warn : C.ink }}>{it.qty}</span>
        <span className={cn('text-[clamp(20px,1.7vw,30px)] font-bold tracking-tight leading-tight', done && 'line-through')}>{it.name}</span>
      </div>
      {it.lines.map((l, k) => (
        <p key={k}
          className={cn('leading-[1.45] text-[clamp(16px,1.3vw,22px)]', done && 'line-through', l.kind === 'no' ? 'font-extrabold tracking-[0.02em] uppercase' : 'font-medium')}
          style={{
            marginLeft: l.indent ? 'calc(1.4em + 30px)' : 'calc(1.4em + 12px)',
            color: l.kind === 'no' ? C.no : l.kind === 'side' || l.indent ? C.sub : '#d4d8de',
          }}>
          {l.indent && <span style={{ color: C.mute }}>↳ </span>}{l.text}
        </p>
      ))}
      {note && (
        <p className="mt-1 pl-2.5 border-l-[3px] text-[clamp(15px,1.2vw,20px)] font-bold" style={{ marginLeft: 'calc(1.4em + 12px)', color: allergy ? C.no : C.note, borderColor: allergy ? C.no : C.note }}>
          {allergy ? `${T.allergy}: ` : ''}“{note}”
        </p>
      )}
    </div>
  );
}

function CancelledTicket({ order, T, onDismiss }: { order: Order; T: T; onDismiss: () => void }) {
  const items = kitchenItems(order.items as unknown as KitchenRawItem[]);
  return (
    <article className="rounded-2xl overflow-hidden border-2 flex flex-col" style={{ background: '#1f1012', borderColor: C.late }}>
      <header className="flex justify-between items-center px-4 py-3" style={{ background: C.late, color: '#fff' }}>
        <p className="text-[clamp(26px,2.3vw,40px)] font-black tabular-nums leading-none">#{shortOrderNumber(order.order_number)}</p>
        <p className="text-[clamp(18px,1.5vw,24px)] font-black tracking-[0.08em]">{T.cancelled}</p>
      </header>
      <div className="px-4 py-2">
        {items.map((it) => (
          <p key={it.index} className="py-1.5 text-[clamp(18px,1.5vw,26px)] font-bold line-through" style={{ color: C.sub }}>{it.qty} {it.name}</p>
        ))}
      </div>
      <div className="px-4 pb-4 pt-1 mt-auto">
        <button onClick={onDismiss} className="w-full h-14 rounded-[14px] text-[18px] font-black" style={{ background: C.ink, color: C.bg }}>{T.ok}</button>
      </div>
    </article>
  );
}

function HistorySheet({ orders, now, T, isEn, onClose, onRecall, onPrint }: {
  orders: Order[]; now: number; T: T; isEn: boolean; onClose: () => void; onRecall: (id: string) => void; onPrint: (o: Order) => void;
}) {
  const rows = orders
    .filter((o) => !['pending', 'confirmed', 'preparing', 'almost_ready'].includes(o.status)
      && now - new Date(o.updated_at ?? o.created_at).getTime() < 6 * 3600_000
      && kitchenItems(o.items as unknown as KitchenRawItem[]).length > 0)
    .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime());
  return (
    <Sheet onClose={onClose} title={T.history} wide>
      <p className="text-[14px] mb-3" style={{ color: C.sub }}>{T.historyDesc}</p>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[16px] font-semibold" style={{ color: C.mute }}>{T.noHistory}</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {rows.map((o) => {
            const items = kitchenItems(o.items as unknown as KitchenRawItem[]);
            const at = new Date(o.updated_at ?? o.created_at).toLocaleTimeString(isEn ? 'en-US' : 'es-MX', { hour: 'numeric', minute: '2-digit' });
            const cancelled = o.status === 'cancelled';
            return (
              <div key={o.id} className="flex items-center gap-3 py-3 border-b" style={{ borderColor: C.line }}>
                <span className="text-[20px] font-black tabular-nums w-16 flex-shrink-0" style={{ color: cancelled ? C.late : C.ink }}>#{shortOrderNumber(o.order_number)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold truncate">{items.map((i) => `${i.qty} ${i.name}`).join(' · ')}</p>
                  <p className="text-[13px] font-semibold" style={{ color: C.mute }}>
                    {shortCustomerName(o.customer_name) ?? ''} · {T.status[o.status] ?? o.status} · {at}
                  </p>
                </div>
                <button onClick={() => onPrint(o)} aria-label={T.reprint} className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0" style={{ background: '#23262b', color: C.sub }}>
                  <Printer className="w-5 h-5" />
                </button>
                {o.status === 'ready' && (
                  <button onClick={() => onRecall(o.id)} className="h-11 px-4 rounded-xl text-[14px] font-extrabold flex items-center gap-1.5 flex-shrink-0" style={{ background: C.ink, color: C.bg }}>
                    <Undo2 className="w-4 h-4" /> {T.recall}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

/* ── Piezas chicas ── */
function Stat({ n, label, color }: { n: number; label: string; color?: string }) {
  return (
    <span className="hidden sm:inline-flex items-baseline gap-1.5 text-[14px] font-semibold" style={{ color: C.sub }}>
      <b className="text-[clamp(20px,1.6vw,28px)] font-extrabold tabular-nums" style={{ color: color ?? C.ink }}>{n}</b>{label}
    </span>
  );
}

function IconBtn({ children, onClick, label, active, danger }: { children: React.ReactNode; onClick: () => void; label: string; active?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="w-11 h-11 rounded-xl grid place-items-center border flex-shrink-0 touch-manipulation"
      style={{ background: active && danger ? '#3a0d0d' : '#15171a', borderColor: C.line, color: active && danger ? '#ffb4b4' : C.sub }}>
      {children}
    </button>
  );
}

function Sheet({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title?: string; wide?: boolean }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" onClick={onClose} />
      <div className={cn('fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] rounded-3xl p-5 shadow-2xl border', wide ? 'max-w-2xl' : 'max-w-md')}
        style={{ background: '#17191d', borderColor: C.line, color: C.ink }}>
        <div className="flex items-start justify-between gap-3 mb-2">
          {title ? <h2 className="text-[20px] font-extrabold leading-snug">{title}</h2> : <span />}
          <button onClick={onClose} className="w-10 h-10 -mt-1 -mr-1 rounded-xl grid place-items-center flex-shrink-0" style={{ color: C.sub }} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </>
  );
}

function MenuRow({ icon, label, value, toggle, onClick }: { icon: React.ReactNode; label: string; value?: string; toggle?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 h-14 border-b text-left" style={{ borderColor: C.line }}>
      <span style={{ color: C.sub }}>{icon}</span>
      <span className="flex-1 text-[16px] font-bold">{label}</span>
      {value && <span className="text-[14px] font-bold" style={{ color: C.warn }}>{value}</span>}
      {toggle !== undefined && (
        <span className="w-12 h-7 rounded-full p-1 transition-colors" style={{ background: toggle ? C.ok : '#3a3f46' }}>
          <span className="block w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: toggle ? 'translateX(20px)' : 'none' }} />
        </span>
      )}
    </button>
  );
}
