'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Bell, BellOff, Printer, CheckCircle, ChefHat, Package, Clock,
  ArrowRight, XCircle, X, Search, Wifi, WifiOff, Volume2, VolumeX,
  Pause, Play, Utensils, ShoppingBag, Truck,
  CreditCard, Banknote, Phone, StickyNote, ChevronDown, ChevronUp,
  Undo2, AlertTriangle, User, MapPin, History, LogOut,
  Monitor, Calendar, Hash,
} from 'lucide-react';
import { updateOrderStatus } from '@/lib/actions/restaurant';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG, cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
import { OrderReceipt } from './OrderReceipt';
import type { Order, OrderStatus } from '@/types';

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'ACEPTAR', color: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' },
  confirmed: { label: 'PREPARANDO', color: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' },
  preparing: { label: 'LISTA', color: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800' },
  ready: { label: 'ENTREGADA', color: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' },
};

const ORDER_TYPE_META: Record<string, { icon: typeof Utensils; label: string; color: string }> = {
  dine_in: { icon: Utensils, label: 'En restaurante', color: 'bg-blue-500/20 text-blue-400' },
  pickup: { icon: ShoppingBag, label: 'Para recoger', color: 'bg-amber-500/20 text-amber-400' },
  delivery: { icon: Truck, label: 'Delivery', color: 'bg-violet-500/20 text-violet-400' },
};

const PAYMENT_META: Record<string, { icon: typeof Banknote; label: string; color: string }> = {
  cash: { icon: Banknote, label: 'Efectivo', color: 'bg-green-500/20 text-green-400' },
  online: { icon: CreditCard, label: 'En linea', color: 'bg-indigo-500/20 text-indigo-400' },
};

function getUrgencyColor(createdAt: string): { border: string; badge: string; label: string } {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (mins < 5) return { border: 'border-l-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400', label: `${Math.floor(mins)}m` };
  if (mins < 15) return { border: 'border-l-amber-500', badge: 'bg-amber-500/20 text-amber-400', label: `${Math.floor(mins)}m` };
  if (mins < 60) return { border: 'border-l-red-500', badge: 'bg-red-500/20 text-red-400', label: `${Math.floor(mins)}m` };
  const hrs = Math.floor(mins / 60);
  return { border: 'border-l-red-500', badge: 'bg-red-500/20 text-red-400', label: `${hrs}h ${Math.floor(mins % 60)}m` };
}

type KDSTab = 'active' | 'history';

interface KDSViewProps {
  initialOrders: Order[];
  restaurantId: string;
  restaurantName: string;
  currency: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantSlug: string;
}

interface UndoAction {
  orderId: string;
  orderNumber: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  timestamp: number;
}

export function KDSView({
  initialOrders, restaurantId, restaurantName, currency,
  restaurantPhone, restaurantAddress, restaurantSlug,
}: KDSViewProps) {
  const [tab, setTab] = useState<KDSTab>('active');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const [autoConfirm, setAutoConfirm] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('kds-auto-confirm') === 'true';
  });

  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('menius-auto-print') === 'true';
  });

  const [pausedUntil, setPausedUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('kds-paused-until');
    if (!stored) return null;
    const ts = parseInt(stored, 10);
    return ts > Date.now() ? ts : null;
  });
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseOption, setPauseOption] = useState<number>(30);

  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [prepTimes, setPrepTimes] = useState<Record<string, number>>({});

  const [smsEnabled, setSmsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('kds-sms-enabled') !== 'false';
  });

  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setOnline(navigator.onLine);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Wake Lock: keep screen on ──
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    let active = true;
    const acquireWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && active) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };
    acquireWakeLock();
    const onVisChange = () => {
      if (document.visibilityState === 'visible') acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisChange);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  const [pauseRemaining, setPauseRemaining] = useState('');
  useEffect(() => {
    if (!pausedUntil) { setPauseRemaining(''); return; }
    const t = setInterval(() => {
      const diff = pausedUntil - Date.now();
      if (diff <= 0) {
        setPausedUntil(null);
        localStorage.removeItem('kds-paused-until');
        setPauseRemaining('');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setPauseRemaining(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(t);
  }, [pausedUntil]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const {
    soundEnabled, setSoundEnabled, notifyNewOrder, updateTabTitle,
  } = useNotifications({ defaultTitle: 'KDS — MENIUS' });

  const updateLocalRef = useRef<(id: string, u: Partial<Order>) => void>(() => {});

  const { orders, updateOrderLocally } = useRealtimeOrders({
    restaurantId,
    initialOrders,
    onNewOrder: useCallback((order: Order) => {
      const total = formatPrice(Number(order.total), currency);
      notifyNewOrder(order.order_number, total);
      setNewOrderIds((prev) => { const next = new Set(prev); next.add(order.id); return next; });
      setTimeout(() => {
        setNewOrderIds((prev) => { const next = new Set(prev); next.delete(order.id); return next; });
      }, 12000);

      if (localStorage.getItem('kds-auto-confirm') === 'true' && order.status === 'pending') {
        updateLocalRef.current(order.id, { status: 'confirmed' });
        updateOrderStatus(order.id, 'confirmed');
      }

      if (localStorage.getItem('menius-auto-print') === 'true') {
        import('./OrderReceipt').then(({ quickPrintOrder }) => {
          quickPrintOrder(order, restaurantName, restaurantPhone, restaurantAddress, currency);
        });
      }
    }, [currency, notifyNewOrder, restaurantName, restaurantPhone, restaurantAddress]),
  });

  updateLocalRef.current = updateOrderLocally;

  const activeOrders = useMemo(() => {
    let result = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q)
      );
    }
    return result;
  }, [orders, search]);

  const historyOrders = useMemo(() => {
    let result = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, search]);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString() && o.status !== 'cancelled');
  const todayTotal = todayOrders.reduce((s, o) => s + Number(o.total), 0);

  useEffect(() => { updateTabTitle(pendingCount); }, [pendingCount, updateTabTitle]);

  const handleStatusChange = useCallback((orderId: string, newStatus: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const previousStatus = order.status;
    updateOrderLocally(orderId, { status: newStatus });
    updateOrderStatus(orderId, newStatus);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoAction({ orderId, orderNumber: order.order_number, previousStatus, newStatus, timestamp: Date.now() });
    undoTimerRef.current = setTimeout(() => setUndoAction(null), 5000);
  }, [orders, updateOrderLocally]);

  const handleUndo = useCallback(() => {
    if (!undoAction) return;
    updateOrderLocally(undoAction.orderId, { status: undoAction.previousStatus });
    updateOrderStatus(undoAction.orderId, undoAction.previousStatus);
    setUndoAction(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, [undoAction, updateOrderLocally]);

  const handlePause = () => {
    let ms = pauseOption * 60 * 1000;
    if (pauseOption === 9999) {
      const now = new Date();
      const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      ms = eod.getTime() - now.getTime();
    }
    const until = Date.now() + ms;
    setPausedUntil(until);
    localStorage.setItem('kds-paused-until', String(until));
    setShowPauseModal(false);
  };

  const handleResume = () => {
    setPausedUntil(null);
    localStorage.removeItem('kds-paused-until');
  };

  const toggleAutoConfirm = (on: boolean) => { setAutoConfirm(on); localStorage.setItem('kds-auto-confirm', String(on)); };
  const toggleAutoPrint = (on: boolean) => { setAutoPrint(on); localStorage.setItem('menius-auto-print', String(on)); };
  const toggleSms = (on: boolean) => { setSmsEnabled(on); localStorage.setItem('kds-sms-enabled', String(on)); };

  const adjustPrepTime = (orderId: string, delta: number) => {
    setPrepTimes((prev) => ({ ...prev, [orderId]: Math.max(5, (prev[orderId] ?? 15) + delta) }));
  };

  const toggleExpanded = (id: string) => {
    setExpandedCards((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleMarkOutOfStock = async (productId: string) => {
    try {
      await fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, in_stock: false }),
      });
    } catch {}
  };

  const dateStr = clock.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-4 px-5 py-3 bg-gray-900/95 border-b border-gray-800 flex-shrink-0">
        {/* Left: logo + name + connection */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg font-black">M</span>
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className="text-base font-bold text-white truncate leading-tight">{restaurantName}</p>
          </div>
          <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg', online ? 'bg-emerald-500/15' : 'bg-red-500/15')}>
            {online ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            <span className={cn('text-xs font-medium hidden md:inline', online ? 'text-emerald-400' : 'text-red-400')}>
              {online ? 'Conectado' : 'Sin conexion'}
            </span>
          </div>
        </div>

        {/* Center: date + clock + stats */}
        <div className="flex-1 flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-400 uppercase tracking-wide font-semibold">{dateStr}</span>
          </div>
          <span className="text-xl font-bold text-white tabular-nums font-mono tracking-wider">
            {clock.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>

          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 animate-pulse">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
            </div>
          )}
          {pausedUntil && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 animate-pulse">
              <Pause className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-400">PAUSADO {pauseRemaining}</span>
              <button onClick={handleResume} className="ml-1 text-sm text-red-300 underline font-semibold">Reanudar</button>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-3 text-sm text-gray-400">
            <span>Hoy: <span className="font-bold text-white">{formatPrice(todayTotal, currency)}</span></span>
            <span className="text-gray-700">|</span>
            <span>{todayOrders.length} orden{todayOrders.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5">
          <ControlBtn on={autoConfirm} onClick={() => toggleAutoConfirm(!autoConfirm)} icon={CheckCircle} label="Auto" title="Auto-confirmar" />
          <ControlBtn on={autoPrint} onClick={() => toggleAutoPrint(!autoPrint)} icon={Printer} title="Auto-imprimir" />
          <ControlBtn on={soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)} icon={soundEnabled ? Volume2 : VolumeX} title={soundEnabled ? 'Silenciar' : 'Activar sonido'} />
          <ControlBtn on={smsEnabled} onClick={() => toggleSms(!smsEnabled)} icon={Phone} title="SMS al cliente" />
          <ControlBtn on={!!pausedUntil} onClick={() => setShowPauseModal(true)} icon={Pause} title="Pausar ordenes" danger />

          <button
            onClick={() => { setShowSearch((s) => !s); if (showSearch) setSearch(''); }}
            className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-800 transition-colors"
            title="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>

          <Link
            href="/app/orders"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </Link>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-5 py-3 bg-gray-900/80 border-b border-gray-800 flex-shrink-0">
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar orden, cliente, telefono..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        <button
          onClick={() => setTab('active')}
          className={cn(
            'flex-1 py-4 text-center text-base font-bold transition-colors relative',
            tab === 'active' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          )}
        >
          Pendientes ({activeOrders.length})
          {tab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-500 rounded-t" />}
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn(
            'flex-1 py-4 text-center text-base font-bold transition-colors relative',
            tab === 'history' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial ({historyOrders.length})
          </span>
          {tab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-500 rounded-t" />}
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {tab === 'active' ? (
          activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Package className="w-20 h-20 mb-4 text-gray-700" />
              <p className="text-xl font-semibold">No hay ordenes pendientes</p>
              <p className="text-base mt-2">Las nuevas ordenes apareceran aqui en tiempo real</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {activeOrders.map((order) => (
                <KDSCard
                  key={order.id}
                  order={order}
                  currency={currency}
                  isNew={newOrderIds.has(order.id)}
                  expanded={expandedCards.has(order.id)}
                  prepTime={prepTimes[order.id] ?? 15}
                  onAdvance={() => { const next = NEXT_STATUS[order.status]; if (next) handleStatusChange(order.id, next); }}
                  onCancel={() => handleStatusChange(order.id, 'cancelled')}
                  onPrint={() => setPrintOrder(order)}
                  onToggleExpand={() => toggleExpanded(order.id)}
                  onAdjustPrep={(delta) => adjustPrepTime(order.id, delta)}
                  onMarkOutOfStock={handleMarkOutOfStock}
                />
              ))}
            </div>
          )
        ) : (
          historyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <History className="w-20 h-20 mb-4 text-gray-700" />
              <p className="text-xl font-semibold">Sin historial</p>
              <p className="text-base mt-2">Las ordenes completadas apareceran aqui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historyOrders.map((order) => (
                <HistoryRow
                  key={order.id}
                  order={order}
                  currency={currency}
                  expanded={expandedCards.has(order.id)}
                  onToggle={() => toggleExpanded(order.id)}
                  onPrint={() => setPrintOrder(order)}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* ── UNDO TOAST ── */}
      {undoAction && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 rounded-2xl bg-gray-800 border border-gray-700 text-white shadow-2xl animate-in slide-in-from-bottom">
          <span className="text-base">
            Orden <span className="font-bold">#{undoAction.orderNumber}</span> &rarr;{' '}
            {ORDER_STATUS_CONFIG[undoAction.newStatus]?.label ?? undoAction.newStatus}
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 transition-colors"
          >
            <Undo2 className="w-4 h-4" /> DESHACER
          </button>
          <div className="w-20 h-1.5 rounded-full bg-gray-700 overflow-hidden">
            <div className="h-full bg-amber-500 animate-[shrink_5s_linear_forwards]" />
          </div>
        </div>
      )}

      {/* ── PAUSE MODAL ── */}
      {showPauseModal && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowPauseModal(false)} />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-gray-900 border border-gray-700 rounded-2xl z-50 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Pausar recepcion de ordenes</h2>
              <button onClick={() => setShowPauseModal(false)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 mb-8">
              {[
                { value: 30, label: '30 minutos' },
                { value: 60, label: '1 hora' },
                { value: 120, label: '2 horas' },
                { value: 9999, label: 'Hoy (reanudar manana)' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                    pauseOption === opt.value ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:border-gray-600'
                  )}
                >
                  <input type="radio" name="pause" value={opt.value} checked={pauseOption === opt.value} onChange={() => setPauseOption(opt.value)} className="w-5 h-5 accent-red-500" />
                  <span className="text-base font-medium text-white">{opt.label}</span>
                </label>
              ))}
            </div>
            {pauseOption === 9999 && (
              <p className="text-sm text-gray-400 mb-6">Volveras a recibir ordenes <span className="font-bold text-white">manana</span>.</p>
            )}
            <div className="flex gap-4">
              <button onClick={() => setShowPauseModal(false)} className="flex-1 py-4 rounded-xl text-base font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
                Ahora no
              </button>
              <button onClick={handlePause} className="flex-1 py-4 rounded-xl bg-red-600 text-white text-base font-bold hover:bg-red-700 transition-colors">
                Pausar ordenes
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── PRINT MODAL ── */}
      {printOrder && (
        <OrderReceipt
          order={printOrder}
          restaurantName={restaurantName}
          restaurantPhone={restaurantPhone}
          restaurantAddress={restaurantAddress}
          currency={currency}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </>
  );
}

// ─── Control Button ─────────────────────────────────────────────

function ControlBtn({ on, onClick, icon: Icon, label, title, danger }: {
  on: boolean; onClick: () => void; icon: any; label?: string; title: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-colors',
        on
          ? danger
            ? 'bg-red-500/20 text-red-400'
            : 'bg-emerald-500/15 text-emerald-400'
          : 'text-gray-500 hover:bg-gray-800'
      )}
      title={title}
    >
      <Icon className="w-4 h-4" />
      {label && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}

// ─── KDS Order Card ─────────────────────────────────────────────

function KDSCard({
  order, currency, isNew, expanded, prepTime,
  onAdvance, onCancel, onPrint, onToggleExpand, onAdjustPrep, onMarkOutOfStock,
}: {
  order: Order; currency: string; isNew: boolean; expanded: boolean; prepTime: number;
  onAdvance: () => void; onCancel: () => void; onPrint: () => void;
  onToggleExpand: () => void; onAdjustPrep: (delta: number) => void;
  onMarkOutOfStock: (productId: string) => void;
}) {
  const urgency = getUrgencyColor(order.created_at);
  const typeMeta = ORDER_TYPE_META[order.order_type ?? ''];
  const payMeta = PAYMENT_META[order.payment_method ?? ''];
  const action = ACTION_LABELS[order.status];
  const nextStatus = NEXT_STATUS[order.status];
  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const tableName = (order as any).table?.name;
  const dietaryItems = (order.items ?? []).filter((item: any) => item.product?.dietary_tags?.length > 0);

  return (
    <div className={cn(
      'bg-gray-800/90 rounded-2xl border-l-[5px] border border-gray-700/50 overflow-hidden transition-all',
      urgency.border,
      isNew && 'ring-2 ring-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)] animate-pulse',
    )}>
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-black text-white font-mono tracking-wide">{order.order_number}</span>
            {isNew && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                Nueva
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={cn('px-2 py-0.5 rounded text-xs font-bold', statusConfig?.bg, statusConfig?.color)}>
              {statusConfig?.label}
            </span>
            {tableName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                <Hash className="w-3 h-3" /> Mesa {tableName}
              </span>
            )}
          </div>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-sm font-bold tabular-nums', urgency.badge)}>
          <Clock className="w-3.5 h-3.5 inline mr-1" />{urgency.label}
        </span>
      </div>

      {/* Badges */}
      <div className="px-5 pb-2 flex flex-wrap gap-2">
        {typeMeta && (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', typeMeta.color)}>
            <typeMeta.icon className="w-3.5 h-3.5" /> {typeMeta.label}
          </span>
        )}
        {payMeta && (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', payMeta.color)}>
            <payMeta.icon className="w-3.5 h-3.5" /> {payMeta.label}
          </span>
        )}
      </div>

      {/* Customer info -- always visible, large */}
      <div className="px-5 pb-3 space-y-1.5">
        {order.customer_name && (
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-gray-400" />
            <span className="text-lg font-bold text-white">{order.customer_name}</span>
          </div>
        )}
        {order.customer_phone && (
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-gray-500" />
            <a href={`tel:${order.customer_phone}`} className="text-base text-emerald-400 font-semibold hover:underline">{order.customer_phone}</a>
            <a
              href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400 font-bold"
            >
              WhatsApp
            </a>
          </div>
        )}
        {order.customer_email && (
          <div className="flex items-center gap-2.5 text-sm text-gray-400">
            <span className="w-4 h-4 text-center text-gray-500 text-xs font-bold">@</span>
            <span>{order.customer_email}</span>
          </div>
        )}
        {order.delivery_address && (
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <span className="text-base text-violet-300 font-medium">{order.delivery_address}</span>
          </div>
        )}
      </div>

      {/* Dietary alert */}
      {dietaryItems.length > 0 && (
        <div className="mx-5 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-orange-400">
            Dieta: {dietaryItems.flatMap((i: any) => i.product?.dietary_tags ?? []).filter((v: string, idx: number, a: string[]) => a.indexOf(v) === idx).join(', ')}
          </span>
        </div>
      )}

      {/* Items */}
      <div className="px-5 pb-3">
        <div className="bg-gray-900/60 rounded-xl p-3 space-y-1.5">
          {(order.items ?? []).map((item: any, idx: number) => {
            const prodName = item.product?.name ?? 'Producto';
            const variantName = item.variant?.name;
            const extras: any[] = item.order_item_extras ?? [];
            const modifiers: any[] = item.order_item_modifiers ?? [];
            const hasDetails = variantName || extras.length > 0 || modifiers.length > 0 || item.notes;

            return (
              <div key={idx}>
                <div className="flex items-start justify-between">
                  <button onClick={() => item.product?.id && onMarkOutOfStock(item.product.id)} className="text-left group" title="Marcar agotado">
                    <span className="text-base text-white group-hover:text-red-400 transition-colors">
                      <span className="font-black text-emerald-400 text-lg">{item.qty}x</span>{' '}
                      <span className="font-semibold">{prodName}</span>
                      {variantName && <span className="text-gray-500 font-normal"> · {variantName}</span>}
                    </span>
                  </button>
                  <span className="text-base font-semibold text-gray-400 tabular-nums ml-3 flex-shrink-0">
                    {formatPrice(Number(item.line_total), currency)}
                  </span>
                </div>
                {hasDetails && (expanded || isNew) && (
                  <div className="ml-8 mt-1 space-y-0.5">
                    {extras.map((ex: any, i: number) => (
                      <p key={i} className="text-sm text-gray-500">+ {ex.product_extras?.name ?? 'Extra'}</p>
                    ))}
                    {modifiers.map((mod: any, i: number) => (
                      <p key={i} className="text-sm text-gray-500">{mod.group_name}: {mod.option_name}</p>
                    ))}
                    {item.notes && (
                      <p className="text-sm text-amber-400 font-semibold italic bg-amber-500/10 rounded px-2 py-0.5 inline-block">&quot;{item.notes}&quot;</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {order.items?.some((item: any) =>
          item.variant || (item.order_item_extras?.length ?? 0) > 0 || (item.order_item_modifiers?.length ?? 0) > 0 || item.notes
        ) && !isNew && (
          <button onClick={onToggleExpand} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mt-1.5 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? 'Menos' : 'Ver detalles'}
          </button>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-5 mb-3 flex items-start gap-2.5 text-base bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <StickyNote className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
          <span className="font-semibold text-amber-300 italic">{order.notes}</span>
        </div>
      )}

      {/* Prep time */}
      {['pending', 'confirmed', 'preparing'].includes(order.status) && (
        <div className="mx-5 mb-3 flex items-center justify-between bg-gray-900/60 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-gray-400">Listo en:</span>
          <div className="flex items-center gap-3">
            <button onClick={() => onAdjustPrep(-5)} className="w-9 h-9 rounded-xl bg-gray-700 text-white text-lg font-bold hover:bg-gray-600 transition-colors flex items-center justify-center active:scale-95">
              -
            </button>
            <span className="text-lg font-bold text-white tabular-nums w-16 text-center">{prepTime} min</span>
            <button onClick={() => onAdjustPrep(5)} className="w-9 h-9 rounded-xl bg-gray-700 text-white text-lg font-bold hover:bg-gray-600 transition-colors flex items-center justify-center active:scale-95">
              +
            </button>
          </div>
        </div>
      )}

      {/* Footer: total + actions */}
      <div className="px-5 pb-4 pt-2 border-t border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-black text-white tabular-nums">{formatPrice(Number(order.total), currency)}</span>
          <div className="flex items-center gap-2">
            <button onClick={onPrint} className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-700 hover:text-white transition-colors" title="Imprimir">
              <Printer className="w-5 h-5" />
            </button>
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <button onClick={onCancel} className="p-2.5 rounded-xl text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Cancelar">
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        {nextStatus && action && (
          <button
            onClick={onAdvance}
            className={cn(
              'w-full py-4 rounded-xl text-white font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] touch-manipulation',
              action.color
            )}
          >
            {action.label} <ArrowRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── History Row ────────────────────────────────────────────────

function HistoryRow({
  order, currency, expanded, onToggle, onPrint,
}: {
  order: Order; currency: string; expanded: boolean;
  onToggle: () => void; onPrint: () => void;
}) {
  const typeMeta = ORDER_TYPE_META[order.order_type ?? ''];
  const payMeta = PAYMENT_META[order.payment_method ?? ''];
  const isDelivered = order.status === 'delivered';

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-800/90 transition-colors touch-manipulation" onClick={onToggle}>
        <span className={cn('w-3 h-3 rounded-full flex-shrink-0', isDelivered ? 'bg-emerald-500' : 'bg-red-500')} />
        <span className="text-base font-bold text-white font-mono w-36 flex-shrink-0">{order.order_number}</span>
        <span className="text-base text-gray-300 truncate flex-1 min-w-0 font-medium">{order.customer_name || 'Sin nombre'}</span>
        <span className="text-sm text-gray-500 hidden sm:block">{(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? 's' : ''}</span>

        {typeMeta && (
          <span className={cn('hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold', typeMeta.color)}>
            <typeMeta.icon className="w-3.5 h-3.5" /> {typeMeta.label}
          </span>
        )}
        {payMeta && (
          <span className={cn('hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold', payMeta.color)}>
            <payMeta.icon className="w-3.5 h-3.5" /> {payMeta.label}
          </span>
        )}

        <span className="text-base font-bold text-white tabular-nums w-28 text-right flex-shrink-0">{formatPrice(Number(order.total), currency)}</span>
        <span className={cn('text-xs px-2.5 py-1 rounded-lg font-bold flex-shrink-0', isDelivered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
          {isDelivered ? 'Entregado' : 'Cancelado'}
        </span>
        <span className="text-sm text-gray-600 w-24 text-right flex-shrink-0 hidden sm:block">{timeAgo(order.created_at)}</span>

        <button onClick={(e) => { e.stopPropagation(); onPrint(); }} className="p-2 rounded-xl text-gray-500 hover:bg-gray-700 hover:text-white transition-colors flex-shrink-0" title="Reimprimir">
          <Printer className="w-5 h-5" />
        </button>
        <ChevronDown className={cn('w-5 h-5 text-gray-500 transition-transform flex-shrink-0', expanded && 'rotate-180')} />
      </div>

      {expanded && (
        <div className="px-5 pb-4 pt-2 border-t border-gray-700/30 space-y-2.5">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{new Date(order.created_at).toLocaleString('es-MX')}</span>
            {order.customer_phone && <a href={`tel:${order.customer_phone}`} className="text-emerald-400 hover:underline font-semibold">{order.customer_phone}</a>}
            {order.customer_email && <span>{order.customer_email}</span>}
          </div>
          {order.delivery_address && (
            <div className="flex items-start gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
              {order.delivery_address}
            </div>
          )}
          <div className="bg-gray-900/50 rounded-xl p-3 space-y-1.5">
            {(order.items ?? []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-base">
                <span className="text-gray-300">
                  <span className="font-bold text-emerald-400">{item.qty}x</span>{' '}
                  {item.product?.name ?? 'Producto'}
                  {item.variant?.name && <span className="text-gray-500"> · {item.variant.name}</span>}
                </span>
                <span className="text-gray-500 tabular-nums">{formatPrice(Number(item.line_total), currency)}</span>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="text-sm text-amber-400 font-semibold italic bg-amber-500/10 rounded-xl px-3 py-2">
              {order.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
