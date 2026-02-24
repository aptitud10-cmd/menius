'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Bell, BellOff, Printer, CheckCircle, ChefHat, Package, Clock,
  ArrowRight, XCircle, X, Search, Wifi, WifiOff, Volume2, VolumeX,
  Maximize2, Minimize2, Pause, Play, Utensils, ShoppingBag, Truck,
  CreditCard, Banknote, Phone, StickyNote, ChevronDown, ChevronUp,
  Undo2, AlertTriangle, User, MapPin, History, FileDown,
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
  online: { icon: CreditCard, label: 'Pagado online', color: 'bg-indigo-500/20 text-indigo-400' },
};

function getUrgencyColor(createdAt: string): { border: string; badge: string; label: string } {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (mins < 5) return { border: 'border-l-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400', label: `${Math.floor(mins)}m` };
  if (mins < 15) return { border: 'border-l-amber-500', badge: 'bg-amber-500/20 text-amber-400', label: `${Math.floor(mins)}m` };
  return { border: 'border-l-red-500', badge: 'bg-red-500/20 text-red-400', label: `${Math.floor(mins)}m` };
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

  // Auto-confirm
  const [autoConfirm, setAutoConfirm] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('kds-auto-confirm') === 'true';
  });

  // Auto-print
  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('menius-auto-print') === 'true';
  });

  // Pause orders
  const [pausedUntil, setPausedUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('kds-paused-until');
    if (!stored) return null;
    const ts = parseInt(stored, 10);
    return ts > Date.now() ? ts : null;
  });
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseOption, setPauseOption] = useState<number>(30);

  // Undo
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Prep times (local state per order)
  const [prepTimes, setPrepTimes] = useState<Record<string, number>>({});

  // SMS toggle
  const [smsEnabled, setSmsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('kds-sms-enabled') !== 'false';
  });

  // Clock
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Connection status
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setOnline(navigator.onLine);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Pause countdown
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

  // Urgency timer refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const {
    soundEnabled, setSoundEnabled, hasPermission, requestPermission, notifyNewOrder, updateTabTitle,
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

  const toggleAutoConfirm = (on: boolean) => {
    setAutoConfirm(on);
    localStorage.setItem('kds-auto-confirm', String(on));
  };

  const toggleAutoPrint = (on: boolean) => {
    setAutoPrint(on);
    localStorage.setItem('menius-auto-print', String(on));
  };

  const toggleSms = (on: boolean) => {
    setSmsEnabled(on);
    localStorage.setItem('kds-sms-enabled', String(on));
  };

  const adjustPrepTime = (orderId: string, delta: number) => {
    setPrepTimes((prev) => {
      const current = prev[orderId] ?? 15;
      return { ...prev, [orderId]: Math.max(5, current + delta) };
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMarkOutOfStock = async (productId: string) => {
    try {
      const res = await fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, in_stock: false }),
      });
      if (!res.ok) return;
    } catch {}
  };

  return (
    <>
      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        {/* Left: name + connection + clock */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-bold text-white truncate">{restaurantName}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {online ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
          </div>
          <span className="text-sm text-gray-400 tabular-nums font-mono">
            {clock.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Center: stats */}
        <div className="flex-1 flex items-center justify-center gap-4">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 animate-pulse">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
            </div>
          )}
          {pausedUntil && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 animate-pulse">
              <Pause className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-red-400">PAUSADO {pauseRemaining}</span>
              <button onClick={handleResume} className="ml-1 text-xs text-red-300 underline">Reanudar</button>
            </div>
          )}
          <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-400">
            <span>Hoy: <span className="font-bold text-white">{formatPrice(todayTotal, currency)}</span></span>
            <span className="text-gray-600">·</span>
            <span>{todayOrders.length} orden{todayOrders.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleAutoConfirm(!autoConfirm)}
            className={cn('flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              autoConfirm ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:bg-gray-800'
            )}
            title="Auto-confirmar"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Auto</span>
          </button>

          <button
            onClick={() => toggleAutoPrint(!autoPrint)}
            className={cn('flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              autoPrint ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:bg-gray-800'
            )}
            title="Auto-imprimir"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn('flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:bg-gray-800'
            )}
            title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => toggleSms(!smsEnabled)}
            className={cn('flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              smsEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:bg-gray-800'
            )}
            title="SMS al cliente"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowPauseModal(true)}
            className={cn('flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              pausedUntil ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:bg-gray-800'
            )}
            title="Pausar ordenes"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => { setShowSearch((s) => !s); if (showSearch) setSearch(''); }}
            className="px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-800 transition-colors"
            title="Buscar"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <Link
            href="/app/orders"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:bg-gray-800 transition-colors ml-1"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </Link>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-gray-900/80 border-b border-gray-800 flex-shrink-0">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar orden, cliente, telefono..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
            'flex-1 py-3.5 text-center text-sm font-bold transition-colors relative',
            tab === 'active' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          )}
        >
          Pendientes ({activeOrders.length})
          {tab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn(
            'flex-1 py-3.5 text-center text-sm font-bold transition-colors relative',
            tab === 'history' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <History className="w-4 h-4" />
            Historial ({historyOrders.length})
          </span>
          {tab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {tab === 'active' ? (
          activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Package className="w-16 h-16 mb-4 text-gray-700" />
              <p className="text-lg font-semibold">No hay ordenes pendientes</p>
              <p className="text-sm mt-1">Las nuevas ordenes apareceran aqui en tiempo real</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {activeOrders.map((order) => (
                <KDSCard
                  key={order.id}
                  order={order}
                  currency={currency}
                  isNew={newOrderIds.has(order.id)}
                  expanded={expandedCards.has(order.id)}
                  prepTime={prepTimes[order.id] ?? 15}
                  onAdvance={() => {
                    const next = NEXT_STATUS[order.status];
                    if (next) handleStatusChange(order.id, next);
                  }}
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
          /* ── HISTORY TAB ── */
          historyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <History className="w-16 h-16 mb-4 text-gray-700" />
              <p className="text-lg font-semibold">Sin historial</p>
              <p className="text-sm mt-1">Las ordenes completadas apareceran aqui</p>
            </div>
          ) : (
            <div className="space-y-1.5">
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-800 border border-gray-700 text-white shadow-2xl animate-in slide-in-from-bottom">
          <span className="text-sm">
            Orden <span className="font-bold">#{undoAction.orderNumber}</span> →{' '}
            {ORDER_STATUS_CONFIG[undoAction.newStatus]?.label ?? undoAction.newStatus}
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" /> DESHACER
          </button>
          <div className="w-16 h-1 rounded-full bg-gray-700 overflow-hidden">
            <div className="h-full bg-amber-500 animate-[shrink_5s_linear_forwards]" />
          </div>
        </div>
      )}

      {/* ── PAUSE MODAL ── */}
      {showPauseModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowPauseModal(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-gray-900 border border-gray-700 rounded-2xl z-50 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Pausar recepcion de ordenes</h2>
              <button onClick={() => setShowPauseModal(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {[
                { value: 30, label: '30 minutos' },
                { value: 60, label: '1 hora' },
                { value: 120, label: '2 horas' },
                { value: 9999, label: 'Hoy (reanudar manana)' },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all',
                    pauseOption === opt.value ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:border-gray-600'
                  )}
                >
                  <input
                    type="radio"
                    name="pause"
                    value={opt.value}
                    checked={pauseOption === opt.value}
                    onChange={() => setPauseOption(opt.value)}
                    className="w-4 h-4 accent-red-500"
                  />
                  <span className="text-sm font-medium text-white">{opt.label}</span>
                </label>
              ))}
            </div>

            {pauseOption === 9999 && (
              <p className="text-xs text-gray-400 mb-4">Volveras a recibir ordenes <span className="font-bold text-white">manana</span>.</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPauseModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors"
              >
                Ahora no
              </button>
              <button
                onClick={handlePause}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
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

  return (
    <div className={cn(
      'bg-gray-800/90 rounded-2xl border-l-4 border border-gray-700/50 overflow-hidden transition-all',
      urgency.border,
      isNew && 'ring-2 ring-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-pulse',
    )}>
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white font-mono">{order.order_number}</span>
            {isNew && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                Nueva
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', statusConfig?.bg, statusConfig?.color)}>
              {statusConfig?.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold tabular-nums', urgency.badge)}>
            <Clock className="w-3 h-3 inline mr-0.5" />{urgency.label}
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {typeMeta && (
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold', typeMeta.color)}>
            <typeMeta.icon className="w-3 h-3" /> {typeMeta.label}
          </span>
        )}
        {payMeta && (
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold', payMeta.color)}>
            <payMeta.icon className="w-3 h-3" /> {payMeta.label}
          </span>
        )}
      </div>

      {/* Customer */}
      <div className="px-4 pb-2 space-y-1">
        {order.customer_name && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <User className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">{order.customer_name}</span>
          </div>
        )}
        {order.customer_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-3.5 h-3.5 text-gray-500" />
            <a href={`tel:${order.customer_phone}`} className="text-emerald-400 hover:underline">{order.customer_phone}</a>
            <a
              href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-semibold"
            >
              WA
            </a>
          </div>
        )}
        {order.delivery_address && (
          <div className="flex items-start gap-2 text-sm text-gray-400">
            <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
            <span>{order.delivery_address}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="px-4 pb-2">
        <div className="bg-gray-900/60 rounded-xl p-2.5 space-y-1">
          {(order.items ?? []).map((item: any, idx: number) => {
            const prodName = item.product?.name ?? 'Producto';
            const variantName = item.variant?.name;
            const extras: any[] = item.order_item_extras ?? [];
            const modifiers: any[] = item.order_item_modifiers ?? [];
            const hasDetails = variantName || extras.length > 0 || modifiers.length > 0 || item.notes;

            return (
              <div key={idx}>
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => item.product?.id && onMarkOutOfStock(item.product.id)}
                    className="text-left group"
                    title="Marcar agotado"
                  >
                    <span className="text-[15px] text-white group-hover:text-red-400 transition-colors">
                      <span className="font-bold text-emerald-400">{item.qty}x</span>{' '}
                      {prodName}
                      {variantName && <span className="text-gray-500"> · {variantName}</span>}
                    </span>
                  </button>
                  <span className="text-sm font-semibold text-gray-400 tabular-nums ml-2 flex-shrink-0">
                    {formatPrice(Number(item.line_total), currency)}
                  </span>
                </div>
                {hasDetails && (expanded || isNew) && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {extras.map((ex: any, i: number) => (
                      <p key={i} className="text-xs text-gray-500">+ {ex.product_extras?.name ?? 'Extra'}</p>
                    ))}
                    {modifiers.map((mod: any, i: number) => (
                      <p key={i} className="text-xs text-gray-500">{mod.group_name}: {mod.option_name}</p>
                    ))}
                    {item.notes && <p className="text-xs text-amber-400 italic">&quot;{item.notes}&quot;</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {order.items?.some((item: any) =>
          item.variant || (item.order_item_extras?.length ?? 0) > 0 || (item.order_item_modifiers?.length ?? 0) > 0 || item.notes
        ) && !isNew && (
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 mt-1 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Menos' : 'Detalles'}
          </button>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-4 mb-2 flex items-start gap-2 text-sm text-amber-300 bg-amber-500/10 rounded-xl px-3 py-2">
          <StickyNote className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <span className="italic">{order.notes}</span>
        </div>
      )}

      {/* Prep time */}
      {['pending', 'confirmed', 'preparing'].includes(order.status) && (
        <div className="mx-4 mb-2 flex items-center justify-between bg-gray-900/60 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-400">Listo en:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAdjustPrep(-5)}
              className="w-7 h-7 rounded-lg bg-gray-700 text-white text-sm font-bold hover:bg-gray-600 transition-colors flex items-center justify-center"
            >
              -
            </button>
            <span className="text-sm font-bold text-white tabular-nums w-12 text-center">{prepTime} min</span>
            <button
              onClick={() => onAdjustPrep(5)}
              className="w-7 h-7 rounded-lg bg-gray-700 text-white text-sm font-bold hover:bg-gray-600 transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Footer: total + actions */}
      <div className="px-4 pb-3.5 pt-1 border-t border-gray-700/50">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-lg font-bold text-white tabular-nums">{formatPrice(Number(order.total), currency)}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrint}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-700 hover:text-white transition-colors"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
            </button>
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <button
                onClick={onCancel}
                className="p-2 rounded-lg text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Cancelar"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {nextStatus && action && (
          <button
            onClick={onAdvance}
            className={cn(
              'w-full py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
              action.color
            )}
          >
            {action.label} <ArrowRight className="w-5 h-5" />
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
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/90 transition-colors"
        onClick={onToggle}
      >
        <span className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          isDelivered ? 'bg-emerald-500' : 'bg-red-500'
        )} />

        <span className="text-sm font-bold text-white font-mono w-32 flex-shrink-0">{order.order_number}</span>

        <span className="text-sm text-gray-300 truncate flex-1 min-w-0">
          {order.customer_name || 'Sin nombre'}
        </span>

        <span className="text-xs text-gray-500 hidden sm:block">
          {(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? 's' : ''}
        </span>

        {typeMeta && (
          <span className={cn('hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold', typeMeta.color)}>
            <typeMeta.icon className="w-3 h-3" /> {typeMeta.label}
          </span>
        )}

        {payMeta && (
          <span className={cn('hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold', payMeta.color)}>
            <payMeta.icon className="w-3 h-3" /> {payMeta.label}
          </span>
        )}

        <span className="text-sm font-bold text-white tabular-nums w-24 text-right flex-shrink-0">
          {formatPrice(Number(order.total), currency)}
        </span>

        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded font-bold flex-shrink-0',
          isDelivered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        )}>
          {isDelivered ? 'Entregado' : 'Cancelado'}
        </span>

        <span className="text-xs text-gray-600 w-20 text-right flex-shrink-0 hidden sm:block">
          {timeAgo(order.created_at)}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); onPrint(); }}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700 hover:text-white transition-colors flex-shrink-0"
          title="Reimprimir"
        >
          <Printer className="w-4 h-4" />
        </button>

        <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform flex-shrink-0', expanded && 'rotate-180')} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-700/30 space-y-2">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{new Date(order.created_at).toLocaleString('es-MX')}</span>
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`} className="text-emerald-400 hover:underline">{order.customer_phone}</a>
            )}
            {order.customer_email && <span>{order.customer_email}</span>}
          </div>
          {order.delivery_address && (
            <div className="flex items-start gap-1.5 text-xs text-gray-400">
              <MapPin className="w-3 h-3 text-gray-600 flex-shrink-0 mt-0.5" />
              {order.delivery_address}
            </div>
          )}
          <div className="bg-gray-900/50 rounded-lg p-2.5 space-y-1">
            {(order.items ?? []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
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
            <div className="text-xs text-amber-400 italic bg-amber-500/10 rounded-lg px-2.5 py-1.5">
              {order.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
