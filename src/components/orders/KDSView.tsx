'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Printer, CheckCircle, Package, Clock,
  ArrowRight, XCircle, X, Search, Wifi, WifiOff, Volume2, VolumeX,
  Pause, Utensils, ShoppingBag, Truck,
  CreditCard, Banknote, Phone, StickyNote, ChevronDown, ChevronUp,
  Undo2, AlertTriangle, User, MapPin, History, LogOut,
  Calendar, Hash, MessageSquare, PhoneCall,
} from 'lucide-react';
import { updateOrderStatus } from '@/lib/actions/restaurant';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG, cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
import { OrderReceipt } from './OrderReceipt';
import type { Order, OrderStatus } from '@/types';

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered',
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'ACEPTAR', color: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-500/25' },
  confirmed: { label: 'PREPARANDO', color: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25' },
  preparing: { label: 'LISTA', color: 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 shadow-lg shadow-violet-500/25' },
  ready: { label: 'ENTREGADA', color: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-500/25' },
};

const ORDER_TYPE_META: Record<string, { icon: typeof Utensils; label: string; short: string; color: string; bg: string }> = {
  dine_in: { icon: Utensils, label: 'En restaurante', short: 'Mesa', color: 'text-blue-400', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  pickup: { icon: ShoppingBag, label: 'Para recoger', short: 'Pickup', color: 'text-amber-400', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  delivery: { icon: Truck, label: 'Delivery', short: 'Delivery', color: 'text-violet-400', bg: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
};

const PAYMENT_META: Record<string, { icon: typeof Banknote; label: string; bg: string }> = {
  cash: { icon: Banknote, label: 'Efectivo', bg: 'bg-green-500/20 text-green-400 border-green-500/30' },
  online: { icon: CreditCard, label: 'En linea', bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
};

const MAX_ACTIVE_MINUTES = 120;

function formatElapsed(createdAt: string): { text: string; color: string; borderColor: string; glow: string } {
  const totalSec = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (totalSec < 0) return { text: '00:00', color: 'text-emerald-400', borderColor: 'border-l-emerald-500', glow: '' };
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const text = mins >= 60 ? `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;

  if (mins < 5) return { text, color: 'text-emerald-400', borderColor: 'border-l-emerald-500', glow: '' };
  if (mins < 10) return { text, color: 'text-amber-400', borderColor: 'border-l-amber-500', glow: '' };
  if (mins < 20) return { text, color: 'text-orange-400', borderColor: 'border-l-orange-500', glow: 'shadow-[inset_0_0_30px_rgba(251,146,60,0.08)]' };
  return { text, color: 'text-red-400', borderColor: 'border-l-red-500', glow: 'shadow-[inset_0_0_30px_rgba(239,68,68,0.1)]' };
}

type KDSTab = 'active' | 'history';
type OrderTypeFilter = 'all' | 'dine_in' | 'pickup' | 'delivery';

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
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const [autoConfirm, setAutoConfirm] = useState(() => typeof window !== 'undefined' && localStorage.getItem('kds-auto-confirm') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => typeof window !== 'undefined' && localStorage.getItem('menius-auto-print') === 'true');
  const [smsEnabled, setSmsEnabled] = useState(() => typeof window === 'undefined' || localStorage.getItem('kds-sms-enabled') !== 'false');
  const [pausedUntil, setPausedUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const ts = parseInt(localStorage.getItem('kds-paused-until') ?? '', 10);
    return ts > Date.now() ? ts : null;
  });
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseOption, setPauseOption] = useState<number>(30);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [prepTimes, setPrepTimes] = useState<Record<string, number>>({});

  const [clock, setClock] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    setOnline(navigator.onLine);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Wake Lock
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    let active = true;
    const acquire = async () => { try { if ('wakeLock' in navigator && active) wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch {} };
    acquire();
    const vis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', vis);
    return () => { active = false; document.removeEventListener('visibilitychange', vis); wakeLockRef.current?.release().catch(() => {}); };
  }, []);

  const [pauseRemaining, setPauseRemaining] = useState('');
  useEffect(() => {
    if (!pausedUntil) { setPauseRemaining(''); return; }
    const t = setInterval(() => {
      const diff = pausedUntil - Date.now();
      if (diff <= 0) { setPausedUntil(null); localStorage.removeItem('kds-paused-until'); setPauseRemaining(''); return; }
      const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); const s = Math.floor((diff % 60000) / 1000);
      setPauseRemaining(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(t);
  }, [pausedUntil]);

  // Tick every 1s to update elapsed timers
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((p) => p + 1), 1000); return () => clearInterval(t); }, []);

  const { soundEnabled, setSoundEnabled, notifyNewOrder, updateTabTitle } = useNotifications({ defaultTitle: 'KDS — MENIUS' });
  const updateLocalRef = useRef<(id: string, u: Partial<Order>) => void>(() => {});

  const { orders, updateOrderLocally } = useRealtimeOrders({
    restaurantId, initialOrders,
    onNewOrder: useCallback((order: Order) => {
      notifyNewOrder(order.order_number, formatPrice(Number(order.total), currency));
      setNewOrderIds((prev) => { const next = new Set(prev); next.add(order.id); return next; });
      setTimeout(() => setNewOrderIds((prev) => { const next = new Set(prev); next.delete(order.id); return next; }), 12000);
      if (localStorage.getItem('kds-auto-confirm') === 'true' && order.status === 'pending') {
        updateLocalRef.current(order.id, { status: 'confirmed' });
        updateOrderStatus(order.id, 'confirmed');
      }
      if (localStorage.getItem('menius-auto-print') === 'true') {
        import('./OrderReceipt').then(({ quickPrintOrder }) => { quickPrintOrder(order, restaurantName, restaurantPhone, restaurantAddress, currency); });
      }
    }, [currency, notifyNewOrder, restaurantName, restaurantPhone, restaurantAddress]),
  });
  updateLocalRef.current = updateOrderLocally;

  const activeOrders = useMemo(() => {
    let result = orders.filter((o) => {
      if (['delivered', 'cancelled'].includes(o.status)) return false;
      const mins = (Date.now() - new Date(o.created_at).getTime()) / 60000;
      if (mins > MAX_ACTIVE_MINUTES) return false;
      return true;
    });
    if (typeFilter !== 'all') result = result.filter((o) => o.order_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(q));
    }
    return result;
  }, [orders, search, typeFilter]);

  const historyOrders = useMemo(() => {
    let result = orders.filter((o) => {
      if (['delivered', 'cancelled'].includes(o.status)) return true;
      const mins = (Date.now() - new Date(o.created_at).getTime()) / 60000;
      return mins > MAX_ACTIVE_MINUTES;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q));
    }
    return result;
  }, [orders, search]);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString() && o.status !== 'cancelled');
  const todayTotal = todayOrders.reduce((s, o) => s + Number(o.total), 0);
  useEffect(() => { updateTabTitle(pendingCount); }, [pendingCount, updateTabTitle]);

  const handleStatusChange = useCallback((orderId: string, newStatus: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId); if (!order) return;
    updateOrderLocally(orderId, { status: newStatus }); updateOrderStatus(orderId, newStatus);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoAction({ orderId, orderNumber: order.order_number, previousStatus: order.status, newStatus, timestamp: Date.now() });
    undoTimerRef.current = setTimeout(() => setUndoAction(null), 5000);
  }, [orders, updateOrderLocally]);

  const handleUndo = useCallback(() => {
    if (!undoAction) return;
    updateOrderLocally(undoAction.orderId, { status: undoAction.previousStatus }); updateOrderStatus(undoAction.orderId, undoAction.previousStatus);
    setUndoAction(null); if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, [undoAction, updateOrderLocally]);

  const handlePause = () => {
    let ms = pauseOption * 60 * 1000;
    if (pauseOption === 9999) { const now = new Date(); ms = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime(); }
    const until = Date.now() + ms; setPausedUntil(until); localStorage.setItem('kds-paused-until', String(until)); setShowPauseModal(false);
  };
  const handleResume = () => { setPausedUntil(null); localStorage.removeItem('kds-paused-until'); };

  const toggle = (key: string, setter: (v: boolean) => void, value: boolean) => { setter(value); localStorage.setItem(key, String(value)); };

  const handleMarkOutOfStock = async (productId: string) => {
    try { await fetch('/api/products/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, in_stock: false }) }); } catch {}
  };

  const handleRecall = useCallback((orderId: string) => {
    updateOrderLocally(orderId, { status: 'ready' }); updateOrderStatus(orderId, 'ready');
  }, [updateOrderLocally]);

  const gridCols = activeOrders.length <= 1 ? 'grid-cols-1 max-w-2xl mx-auto' : activeOrders.length <= 2 ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

  return (
    <>
      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-900/95 border-b border-gray-700/50 flex-shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white text-sm font-black">M</span>
          </div>
          <span className="text-sm font-bold text-white hidden sm:block truncate max-w-[140px]">{restaurantName}</span>
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg border', online ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30')}>
            {online ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
          </div>
        </div>

        {/* Center */}
        <div className="flex-1 flex items-center justify-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold hidden md:block">
            <Calendar className="w-3 h-3 inline mr-1" />
            {clock.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-lg font-black text-white tabular-nums font-mono tracking-widest">
            {clock.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>

          {pendingCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 animate-pulse">
              <span className="text-sm font-black text-amber-400">{pendingCount}</span>
              <span className="text-xs font-bold text-amber-400/70">pendiente{pendingCount > 1 ? 's' : ''}</span>
            </span>
          )}
          {pausedUntil && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 animate-pulse">
              <Pause className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-red-400">PAUSADO {pauseRemaining}</span>
              <button onClick={handleResume} className="text-xs text-red-300 underline font-bold ml-1">Reanudar</button>
            </span>
          )}

          <span className="hidden lg:inline text-sm text-gray-500">
            Hoy: <span className="font-bold text-white">{formatPrice(todayTotal, currency)}</span>
            <span className="text-gray-700 mx-1">·</span>
            {todayOrders.length} orden{todayOrders.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <TopBtn on={autoConfirm} onClick={() => toggle('kds-auto-confirm', setAutoConfirm, !autoConfirm)} icon={CheckCircle} label="Auto" color="emerald" />
          <TopBtn on={autoPrint} onClick={() => toggle('menius-auto-print', setAutoPrint, !autoPrint)} icon={Printer} color="indigo" />
          <TopBtn on={soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)} icon={soundEnabled ? Volume2 : VolumeX} color="emerald" />
          <TopBtn on={smsEnabled} onClick={() => toggle('kds-sms-enabled', setSmsEnabled, !smsEnabled)} icon={MessageSquare} color="cyan" />
          <TopBtn on={!!pausedUntil} onClick={() => setShowPauseModal(true)} icon={Pause} color="red" />

          <button onClick={() => { setShowSearch((s) => !s); if (showSearch) setSearch(''); }} className="p-2 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white transition-colors" title="Buscar">
            <Search className="w-5 h-5" />
          </button>
          <Link href="/app/orders" className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-800 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Salir</span>
          </Link>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="px-4 py-2 bg-gray-900/80 border-b border-gray-800 flex-shrink-0">
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar orden, cliente, telefono..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" autoFocus />
          </div>
        </div>
      )}

      {/* ── TABS + FILTER ── */}
      <div className="flex items-center border-b border-gray-800 flex-shrink-0 px-4">
        <button onClick={() => setTab('active')} className={cn('py-3 px-4 text-sm font-bold transition-colors relative', tab === 'active' ? 'text-white' : 'text-gray-500 hover:text-gray-300')}>
          Pendientes ({activeOrders.length})
          {tab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-500 rounded-t" />}
        </button>
        <button onClick={() => setTab('history')} className={cn('py-3 px-4 text-sm font-bold transition-colors relative', tab === 'history' ? 'text-white' : 'text-gray-500 hover:text-gray-300')}>
          <History className="w-4 h-4 inline mr-1" />Historial ({historyOrders.length})
          {tab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-500 rounded-t" />}
        </button>

        {tab === 'active' && (
          <div className="ml-auto flex items-center gap-1">
            {(['all', 'dine_in', 'pickup', 'delivery'] as const).map((f) => {
              const meta = f === 'all' ? null : ORDER_TYPE_META[f];
              const Icon = meta?.icon;
              const isActive = typeFilter === f;
              return (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                    isActive ? (meta?.bg ?? 'bg-gray-700 text-white border-gray-600') : 'text-gray-500 border-transparent hover:bg-gray-800'
                  )}>
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {f === 'all' ? 'Todos' : meta?.short}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MAIN ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'active' ? (
          activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Package className="w-16 h-16 mb-3" />
              <p className="text-lg font-semibold text-gray-500">No hay ordenes pendientes</p>
              <p className="text-sm mt-1 text-gray-600">Las nuevas ordenes apareceran aqui en tiempo real</p>
            </div>
          ) : (
            <div className={cn('grid gap-4', gridCols)}>
              {activeOrders.map((order) => (
                <KDSCard key={order.id} order={order} currency={currency} isNew={newOrderIds.has(order.id)} expanded={expandedCards.has(order.id)} prepTime={prepTimes[order.id] ?? 15}
                  onAdvance={() => { const n = NEXT_STATUS[order.status]; if (n) handleStatusChange(order.id, n); }}
                  onCancel={() => handleStatusChange(order.id, 'cancelled')} onPrint={() => setPrintOrder(order)}
                  onToggleExpand={() => { setExpandedCards((p) => { const n = new Set(p); n.has(order.id) ? n.delete(order.id) : n.add(order.id); return n; }); }}
                  onAdjustPrep={(d) => setPrepTimes((p) => ({ ...p, [order.id]: Math.max(5, (p[order.id] ?? 15) + d) }))}
                  onMarkOutOfStock={handleMarkOutOfStock} />
              ))}
            </div>
          )
        ) : (
          historyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <History className="w-16 h-16 mb-3" /><p className="text-lg font-semibold text-gray-500">Sin historial</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-w-6xl mx-auto">
              {historyOrders.map((order) => (
                <HistoryRow key={order.id} order={order} currency={currency} expanded={expandedCards.has(order.id)}
                  onToggle={() => { setExpandedCards((p) => { const n = new Set(p); n.has(order.id) ? n.delete(order.id) : n.add(order.id); return n; }); }}
                  onPrint={() => setPrintOrder(order)} onRecall={() => handleRecall(order.id)} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Undo toast */}
      {undoAction && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-800/95 backdrop-blur border border-gray-700 text-white shadow-2xl animate-in slide-in-from-bottom">
          <span className="text-sm">#{undoAction.orderNumber} &rarr; {ORDER_STATUS_CONFIG[undoAction.newStatus]?.label ?? undoAction.newStatus}</span>
          <button onClick={handleUndo} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"><Undo2 className="w-3.5 h-3.5" /> DESHACER</button>
          <div className="w-14 h-1 rounded-full bg-gray-700 overflow-hidden"><div className="h-full bg-amber-500 animate-[shrink_5s_linear_forwards]" /></div>
        </div>
      )}

      {/* Pause modal */}
      {showPauseModal && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowPauseModal(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-gray-900 border border-gray-700 rounded-2xl z-50 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Pausar ordenes</h2>
              <button onClick={() => setShowPauseModal(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 mb-6">
              {[{ value: 30, label: '30 minutos' }, { value: 60, label: '1 hora' }, { value: 120, label: '2 horas' }, { value: 9999, label: 'Hoy' }].map((opt) => (
                <label key={opt.value} className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer', pauseOption === opt.value ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:border-gray-600')}>
                  <input type="radio" name="pause" checked={pauseOption === opt.value} onChange={() => setPauseOption(opt.value)} className="w-4 h-4 accent-red-500" />
                  <span className="text-sm font-medium text-white">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPauseModal(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:bg-gray-800">Ahora no</button>
              <button onClick={handlePause} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">Pausar</button>
            </div>
          </div>
        </>
      )}

      {printOrder && <OrderReceipt order={printOrder} restaurantName={restaurantName} restaurantPhone={restaurantPhone} restaurantAddress={restaurantAddress} currency={currency} onClose={() => setPrintOrder(null)} />}
    </>
  );
}

// ── Top bar button ──
function TopBtn({ on, onClick, icon: Icon, label, color }: { on: boolean; onClick: () => void; icon: any; label?: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return (
    <button onClick={onClick} className={cn('flex items-center gap-1 px-2 py-2 rounded-lg text-sm font-semibold transition-colors border', on ? colors[color] : 'text-gray-600 border-transparent hover:bg-gray-800 hover:text-gray-400')} >
      <Icon className="w-4 h-4" />{label && <span className="hidden xl:inline text-xs">{label}</span>}
    </button>
  );
}

// ── KDS Card ──
function KDSCard({
  order, currency, isNew, expanded, prepTime,
  onAdvance, onCancel, onPrint, onToggleExpand, onAdjustPrep, onMarkOutOfStock,
}: {
  order: Order; currency: string; isNew: boolean; expanded: boolean; prepTime: number;
  onAdvance: () => void; onCancel: () => void; onPrint: () => void;
  onToggleExpand: () => void; onAdjustPrep: (delta: number) => void;
  onMarkOutOfStock: (productId: string) => void;
}) {
  const elapsed = formatElapsed(order.created_at);
  const typeMeta = ORDER_TYPE_META[order.order_type ?? ''];
  const payMeta = PAYMENT_META[order.payment_method ?? ''];
  const action = ACTION_LABELS[order.status];
  const nextStatus = NEXT_STATUS[order.status];
  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const tableName = (order as any).table?.name;
  const itemCount = (order.items ?? []).reduce((s, i: any) => s + i.qty, 0);
  const createdTime = new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn(
      'bg-gradient-to-b from-gray-800/95 to-gray-850/95 rounded-2xl border-l-[5px] border border-gray-700/40 overflow-hidden transition-all',
      elapsed.borderColor, elapsed.glow,
      isNew && 'ring-2 ring-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.15)] animate-pulse',
    )}>
      {/* Header: order number + timer */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div>
          <span className="text-2xl font-black text-white font-mono tracking-wide">{order.order_number}</span>
          {isNew && <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">Nueva</span>}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn('px-1.5 py-0.5 rounded text-[11px] font-bold', statusConfig?.bg, statusConfig?.color)}>{statusConfig?.label}</span>
            {tableName && <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[11px] font-bold"><Hash className="w-2.5 h-2.5 inline" /> {tableName}</span>}
            <span className="text-[11px] text-gray-500">{createdTime}</span>
            <span className="text-[11px] text-gray-600">·</span>
            <span className="text-[11px] text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className={cn('px-3 py-1.5 rounded-xl text-lg font-black tabular-nums font-mono', elapsed.color, 'bg-gray-900/80')}>
          {elapsed.text}
        </div>
      </div>

      {/* Type + payment badges */}
      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {typeMeta && <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border', typeMeta.bg)}><typeMeta.icon className="w-3 h-3" /> {typeMeta.label}</span>}
        {payMeta && <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border', payMeta.bg)}><payMeta.icon className="w-3 h-3" /> {payMeta.label}</span>}
      </div>

      {/* Customer + contact buttons */}
      <div className="px-4 pb-2">
        <div className="bg-gray-900/50 rounded-xl p-3 space-y-2">
          {order.customer_name && (
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-lg font-bold text-white">{order.customer_name}</span>
            </div>
          )}
          {order.customer_phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-300 font-medium">{order.customer_phone}</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/30 transition-colors touch-manipulation">
                  <PhoneCall className="w-3.5 h-3.5" /> Llamar
                </a>
                <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/30 transition-colors touch-manipulation">
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            </div>
          )}
          {order.customer_email && <div className="flex items-center gap-2 text-xs text-gray-500"><span>@</span><span>{order.customer_email}</span></div>}
          {order.delivery_address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-violet-300 font-medium">{order.delivery_address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="px-4 pb-2">
        <div className="bg-gray-900/40 rounded-xl p-3 space-y-1">
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
                    <span className="text-sm text-white group-hover:text-red-400 transition-colors">
                      <span className="font-black text-emerald-400">{item.qty}x</span>{' '}<span className="font-semibold">{prodName}</span>
                      {variantName && <span className="text-gray-500"> · {variantName}</span>}
                    </span>
                  </button>
                  <span className="text-sm font-semibold text-gray-400 tabular-nums ml-2 flex-shrink-0">{formatPrice(Number(item.line_total), currency)}</span>
                </div>
                {hasDetails && (expanded || isNew) && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {extras.map((ex: any, i: number) => <p key={i} className="text-xs text-gray-500">+ {ex.product_extras?.name ?? 'Extra'}</p>)}
                    {modifiers.map((mod: any, i: number) => <p key={i} className="text-xs text-gray-500">{mod.group_name}: {mod.option_name}</p>)}
                    {item.notes && <p className="text-xs text-amber-400 font-semibold bg-amber-500/10 rounded px-1.5 py-0.5 inline-block">&quot;{item.notes}&quot;</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {order.items?.some((i: any) => i.variant || (i.order_item_extras?.length ?? 0) > 0 || (i.order_item_modifiers?.length ?? 0) > 0 || i.notes) && !isNew && (
          <button onClick={onToggleExpand} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 mt-1 transition-colors">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {expanded ? 'Menos' : 'Detalles'}
          </button>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-4 mb-2 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          <StickyNote className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300 italic">{order.notes}</span>
        </div>
      )}

      {/* Prep time */}
      {['pending', 'confirmed', 'preparing'].includes(order.status) && (
        <div className="mx-4 mb-2 flex items-center justify-between bg-gray-900/50 rounded-xl px-3 py-2">
          <span className="text-xs font-semibold text-gray-400">Listo en:</span>
          <div className="flex items-center gap-2">
            <button onClick={() => onAdjustPrep(-5)} className="w-8 h-8 rounded-lg bg-gray-700 text-white font-bold hover:bg-gray-600 flex items-center justify-center active:scale-95 touch-manipulation">-</button>
            <span className="text-sm font-bold text-white tabular-nums w-14 text-center">{prepTime} min</span>
            <button onClick={() => onAdjustPrep(5)} className="w-8 h-8 rounded-lg bg-gray-700 text-white font-bold hover:bg-gray-600 flex items-center justify-center active:scale-95 touch-manipulation">+</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-700/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xl font-black text-white tabular-nums">{formatPrice(Number(order.total), currency)}</span>
          <div className="flex items-center gap-1">
            <button onClick={onPrint} className="p-2 rounded-lg text-gray-500 hover:bg-gray-700 hover:text-white transition-colors touch-manipulation"><Printer className="w-4 h-4" /></button>
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <button onClick={onCancel} className="p-2 rounded-lg text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors touch-manipulation"><XCircle className="w-4 h-4" /></button>
            )}
          </div>
        </div>
        {nextStatus && action && (
          <button onClick={onAdvance} className={cn('w-full py-3.5 rounded-xl text-white font-black text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] touch-manipulation', action.color)}>
            {action.label} <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── History Row ──
function HistoryRow({ order, currency, expanded, onToggle, onPrint, onRecall }: {
  order: Order; currency: string; expanded: boolean; onToggle: () => void; onPrint: () => void; onRecall: () => void;
}) {
  const typeMeta = ORDER_TYPE_META[order.order_type ?? ''];
  const isDelivered = order.status === 'delivered';
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/40 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-800/80 transition-colors touch-manipulation" onClick={onToggle}>
        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', isDelivered ? 'bg-emerald-500' : 'bg-red-500')} />
        <span className="text-sm font-bold text-white font-mono w-32 flex-shrink-0">{order.order_number}</span>
        <span className="text-sm text-gray-300 truncate flex-1 min-w-0">{order.customer_name || 'Sin nombre'}</span>
        {typeMeta && <span className={cn('hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border', typeMeta.bg)}><typeMeta.icon className="w-3 h-3" /> {typeMeta.short}</span>}
        <span className="text-sm font-bold text-white tabular-nums w-24 text-right flex-shrink-0">{formatPrice(Number(order.total), currency)}</span>
        <span className={cn('text-[10px] px-2 py-0.5 rounded font-bold flex-shrink-0', isDelivered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>{isDelivered ? 'Entregado' : 'Cancelado'}</span>
        <span className="text-xs text-gray-600 w-20 text-right flex-shrink-0 hidden sm:block">{timeAgo(order.created_at)}</span>
        <button onClick={(e) => { e.stopPropagation(); onRecall(); }} className="p-1.5 rounded-lg text-gray-600 hover:bg-blue-500/20 hover:text-blue-400 transition-colors flex-shrink-0 touch-manipulation" title="Recuperar"><Undo2 className="w-4 h-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onPrint(); }} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-700 hover:text-white transition-colors flex-shrink-0 touch-manipulation" title="Reimprimir"><Printer className="w-4 h-4" /></button>
        <ChevronDown className={cn('w-4 h-4 text-gray-600 transition-transform flex-shrink-0', expanded && 'rotate-180')} />
      </div>
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-700/30 space-y-2">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{new Date(order.created_at).toLocaleString('es-MX')}</span>
            {order.customer_phone && <a href={`tel:${order.customer_phone}`} className="text-emerald-400 hover:underline">{order.customer_phone}</a>}
            {order.customer_email && <span>{order.customer_email}</span>}
          </div>
          {order.delivery_address && <div className="flex items-start gap-1.5 text-xs text-gray-400"><MapPin className="w-3 h-3 text-gray-600 flex-shrink-0 mt-0.5" />{order.delivery_address}</div>}
          <div className="bg-gray-900/40 rounded-lg p-2.5 space-y-1">
            {(order.items ?? []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-300"><span className="font-bold text-emerald-400">{item.qty}x</span> {item.product?.name ?? 'Producto'}</span>
                <span className="text-gray-500 tabular-nums">{formatPrice(Number(item.line_total), currency)}</span>
              </div>
            ))}
          </div>
          {order.notes && <div className="text-xs text-amber-400 italic bg-amber-500/10 rounded-lg px-2 py-1.5">{order.notes}</div>}
        </div>
      )}
    </div>
  );
}
