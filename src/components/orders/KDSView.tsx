'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Printer, CheckCircle, Package, Clock,
  ArrowRight, XCircle, X, Search, Wifi, WifiOff, Volume2, VolumeX,
  Pause, Utensils, ShoppingBag, Truck,
  CreditCard, Banknote, Phone, StickyNote, ChevronDown, ChevronUp,
  Undo2, AlertTriangle, User, MapPin, History, LogOut,
  Hash, MessageSquare, PhoneCall, Send, Loader2,
} from 'lucide-react';
import { updateOrderStatus, updateOrderETA } from '@/lib/actions/restaurant';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG, cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { OrderReceipt } from './OrderReceipt';
import type { Order, OrderStatus } from '@/types';

/* ── Status flow ── */
const NEXT: Record<string, OrderStatus> = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered' };
const BUMP: Record<string, { label: string }> = {
  pending:   { label: 'ACEPTAR'  },
  confirmed: { label: 'PREPARAR' },
  preparing: { label: 'LISTA'    },
  ready:     { label: 'ENTREGAR' },
};

const TYPE_META: Record<string, { icon: typeof Utensils; label: string }> = {
  dine_in:  { icon: Utensils,    label: 'Mesa' },
  pickup:   { icon: ShoppingBag, label: 'Pickup' },
  delivery: { icon: Truck,       label: 'Delivery' },
};

const PAY_META: Record<string, { icon: typeof Banknote; label: string }> = {
  cash:   { icon: Banknote,   label: 'Efectivo' },
  online: { icon: CreditCard, label: 'En linea' },
};

const AUTO_ARCHIVE_MIN = 120;

const DIET_BADGE: Record<string, { label: string; cls: string }> = {
  vegetarian: { label: '🥬 VEG', cls: 'bg-green-500/20 text-green-300 border-green-500/30' },
  vegan: { label: '🌱 VEGAN', cls: 'bg-green-600/20 text-green-300 border-green-600/30' },
  gluten_free: { label: '🚫 GLUTEN', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  spicy: { label: '🌶️ PICANTE', cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  dairy_free: { label: '🥛 LÁCTEOS', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

/* ── Urgency: returns header color based on elapsed minutes.
   busyExtra shifts thresholds forward so tickets stay green longer when busy. ── */
function urgency(createdAt: string, busyExtra = 0) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const m = Math.floor(sec / 60), s = sec % 60;
  const timer = m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const greenThreshold = 7 + busyExtra;
  const amberThreshold = 15 + busyExtra;

  if (m < greenThreshold)  return { timer, header: '#06c167', late: false };
  if (m < amberThreshold) return { timer, header: '#f59e0b', late: false };
  return { timer, header: '#dc2626', late: true };
}

/* ── Types ── */
type Tab = 'active' | 'history';
type Filter = 'all' | 'dine_in' | 'pickup' | 'delivery';

interface Props {
  initialOrders: Order[];
  restaurantId: string;
  restaurantName: string;
  currency: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantSlug: string;
}

interface Undo { orderId: string; num: string; prev: OrderStatus; next: OrderStatus; ts: number }

/* ══════════════════════════════════════════════════════════════════════
   KDSView — Toast / Fresh KDS style
   ══════════════════════════════════════════════════════════════════════ */
export function KDSView({ initialOrders, restaurantId, restaurantName, currency, restaurantPhone, restaurantAddress, restaurantSlug }: Props) {
  const { t } = useDashboardLocale();
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [smsOrder, setSmsOrder] = useState<Order | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<Undo | null>(null);
  const undoRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayCount, setOverlayCount] = useState(0);
  const [busyExtra, setBusyExtra] = useState(0);
  const [showBusy, setShowBusy] = useState(false);

  /* Persisted settings */
  const ls = (k: string, def: boolean) => typeof window !== 'undefined' ? localStorage.getItem(k) !== (def ? 'false' : 'true') : def;
  const [autoConfirm, setAutoConfirm] = useState(() => typeof window !== 'undefined' && localStorage.getItem('kds-auto-confirm') === 'true');
  const [autoPrint, setAutoPrint] = useState(() => typeof window !== 'undefined' && localStorage.getItem('menius-auto-print') === 'true');
  const [smsEnabled, setSmsEnabled] = useState(() => ls('kds-sms-enabled', true));
  const [pausedUntil, setPausedUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const t = parseInt(localStorage.getItem('kds-paused-until') ?? '', 10);
    return t > Date.now() ? t : null;
  });
  const [showPause, setShowPause] = useState(false);
  const [pauseOpt, setPauseOpt] = useState(30);

  /* Clock tick every second */
  const [clock, setClock] = useState(new Date());
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => { setClock(new Date()); tick(p => p + 1); }, 1000); return () => clearInterval(t); }, []);

  /* Online status */
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const off = () => setOnline(false);
    const on = () => {
      setOnline(true);
      const q = offlineQueue.current.splice(0);
      q.forEach(({ id, status }) => updateOrderStatus(id, status as any));
    };
    window.addEventListener('online', on); window.addEventListener('offline', off); setOnline(navigator.onLine);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* Wake Lock */
  const wl = useRef<any>(null);
  const offlineQueue = useRef<{ id: string; status: string }[]>([]);
  useEffect(() => {
    let ok = true;
    const acq = async () => { try { if ('wakeLock' in navigator && ok) wl.current = await (navigator as any).wakeLock.request('screen'); } catch {} };
    acq(); const vis = () => { if (document.visibilityState === 'visible') acq(); };
    document.addEventListener('visibilitychange', vis);
    return () => { ok = false; document.removeEventListener('visibilitychange', vis); wl.current?.release().catch(() => {}); };
  }, []);

  /* Pause timer */
  const [pauseLeft, setPauseLeft] = useState('');
  useEffect(() => {
    if (!pausedUntil) { setPauseLeft(''); return; }
    const t = setInterval(() => {
      const d = pausedUntil - Date.now();
      if (d <= 0) { setPausedUntil(null); localStorage.removeItem('kds-paused-until'); setPauseLeft(''); return; }
      const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
      setPauseLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(t);
  }, [pausedUntil]);

  /* Notifications & realtime */
  const { soundEnabled, setSoundEnabled, notifyNewOrder, updateTabTitle, playSound } = useNotifications({ defaultTitle: 'KDS — MENIUS' });
  const localRef = useRef<(id: string, u: Partial<Order>) => void>(() => {});
  const { orders, updateOrderLocally } = useRealtimeOrders({
    restaurantId, initialOrders,
    onNewOrder: useCallback((o: Order) => {
      notifyNewOrder(o.order_number, formatPrice(Number(o.total), currency), o.order_type ?? undefined);
      setNewIds(p => { const n = new Set(p); n.add(o.id); return n; });
      setTimeout(() => setNewIds(p => { const n = new Set(p); n.delete(o.id); return n; }), 8000);
      setOverlayCount(c => c + 1);
      setShowOverlay(true);
      const isPaused = pausedUntil && Date.now() < pausedUntil;
      if (autoConfirm && !isPaused && o.status === 'pending') {
        localRef.current(o.id, { status: 'confirmed' });
        updateOrderStatus(o.id, 'confirmed');
        // Busy Mode: extend default ETA by the busy extra minutes
        if (busyExtra > 0) updateOrderETA(o.id, 15 + busyExtra);
      }
      if (autoPrint) import('./OrderReceipt').then(({ quickPrintOrder }) => quickPrintOrder(o, restaurantName, restaurantPhone, restaurantAddress, currency));
    }, [autoConfirm, autoPrint, busyExtra, pausedUntil, currency, notifyNewOrder, restaurantName, restaurantPhone, restaurantAddress]),
  });
  localRef.current = updateOrderLocally;

  /* Derived lists */
  const active = useMemo(() => {
    let r = orders.filter(o => !['delivered', 'cancelled'].includes(o.status) && (Date.now() - new Date(o.created_at).getTime()) / 60000 <= AUTO_ARCHIVE_MIN);
    if (filter !== 'all') r = r.filter(o => o.order_type === filter);
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(o => o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(q)); }
    return r;
  }, [orders, search, filter]);

  const history = useMemo(() => {
    let r = orders.filter(o => ['delivered', 'cancelled'].includes(o.status) || (Date.now() - new Date(o.created_at).getTime()) / 60000 > AUTO_ARCHIVE_MIN);
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(o => o.order_number?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q)); }
    return r;
  }, [orders, search]);

  const pending = orders.filter(o => o.status === 'pending').length;
  const today = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString() && o.status !== 'cancelled');
  const todayTotal = today.reduce((s, o) => s + Number(o.total), 0);
  const avgTime = useMemo(() => {
    const done = today.filter(o => o.status === 'delivered');
    if (!done.length) return null;
    const avg = done.reduce((s, o) => s + (new Date(o.updated_at ?? o.created_at).getTime() - new Date(o.created_at).getTime()), 0) / done.length / 60000;
    return Math.round(avg);
  }, [today]);
  useEffect(() => { updateTabTitle(pending); }, [pending, updateTabTitle]);

  /* Actions */
  const bump = useCallback((id: string, next: OrderStatus) => {
    const o = orders.find(x => x.id === id); if (!o) return;
    updateOrderLocally(id, { status: next });
    if (navigator.onLine) { updateOrderStatus(id, next); }
    else { offlineQueue.current.push({ id, status: next }); }
    if (next === 'ready') playSound('success');
    if (undoRef.current) clearTimeout(undoRef.current);
    setUndo({ orderId: id, num: o.order_number, prev: o.status, next, ts: Date.now() });
    undoRef.current = setTimeout(() => setUndo(null), 5000);
  }, [orders, updateOrderLocally, playSound]);

  const doUndo = useCallback(() => {
    if (!undo) return;
    updateOrderLocally(undo.orderId, { status: undo.prev }); updateOrderStatus(undo.orderId, undo.prev);
    setUndo(null); if (undoRef.current) clearTimeout(undoRef.current);
  }, [undo, updateOrderLocally]);

  const doPause = () => {
    let ms = pauseOpt * 60000;
    if (pauseOpt === 9999) { const n = new Date(); ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime(); }
    const u = Date.now() + ms; setPausedUntil(u); localStorage.setItem('kds-paused-until', String(u)); setShowPause(false);
  };

  const tog = (k: string, set: (v: boolean) => void, v: boolean) => { set(v); localStorage.setItem(k, String(v)); };

  const recall = useCallback((id: string) => { updateOrderLocally(id, { status: 'ready' }); updateOrderStatus(id, 'ready'); }, [updateOrderLocally]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case ' ':
        case 'Enter': {
          e.preventDefault();
          const o = active[selectedIdx];
          if (o) { const n = NEXT[o.status]; if (n) bump(o.id, n); }
          break;
        }
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIdx(i => Math.min(i + 1, active.length - 1));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIdx(i => Math.max(i - 1, 0));
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); setShowSearch(s => { if (s) setSearch(''); return !s; }); }
          break;
        case 'p':
        case 'P':
          if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); setShowPause(true); }
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const lastDone = orders.find(o => o.status === 'delivered');
            if (lastDone) recall(lastDone.id);
          }
          break;
        case 'Escape':
          setShowSearch(false); setShowPause(false); setSearch('');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, selectedIdx, bump, orders, recall]);

  const markOOS = async (pid: string) => { try { await fetch('/api/products/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: pid, in_stock: false }) }); } catch {} };

  const toggleExp = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      {/* ════ NEW ORDER OVERLAY ════ */}
      {showOverlay && (
        <NewOrderOverlay
          count={overlayCount}
          onDismiss={() => { setShowOverlay(false); setOverlayCount(0); }}
        />
      )}

      {/* ════ TOP BAR ════ */}
      <header className="flex items-center gap-2 px-3 h-14 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-black">M</span>
        </div>
        <span className="text-xs font-bold text-white truncate max-w-[120px] hidden sm:block">{restaurantName}</span>
        {online ? <Wifi className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}

        <div className="flex-1" />

        <span className="text-base font-black text-white tabular-nums font-mono tracking-wider">
          {clock.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>

        {pending > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-xs font-black animate-pulse">{pending}</span>
        )}
        {busyExtra > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-bold" style={{ backgroundColor: '#06c167' }}>
            +{busyExtra}min
          </span>
        )}
        {pausedUntil && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
            <Pause className="w-3 h-3" /> {pauseLeft}
            <button onClick={() => { setPausedUntil(null); localStorage.removeItem('kds-paused-until'); }} className="underline ml-0.5 text-[10px]">X</button>
          </span>
        )}

        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <Ctrl on={autoConfirm} onClick={() => tog('kds-auto-confirm', setAutoConfirm, !autoConfirm)} icon={CheckCircle} title={t.kds_autoConfirm} />
          <Ctrl on={autoPrint} onClick={() => tog('menius-auto-print', setAutoPrint, !autoPrint)} icon={Printer} title={t.kds_autoPrint} />
          <Ctrl on={soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)} icon={soundEnabled ? Volume2 : VolumeX} title={t.kds_sound} />
          <Ctrl on={smsEnabled} onClick={() => tog('kds-sms-enabled', setSmsEnabled, !smsEnabled)} icon={MessageSquare} title="SMS" />
          <Ctrl on={!!pausedUntil} onClick={() => setShowPause(true)} icon={Pause} title={t.kds_pause} danger />
          <button onClick={() => setShowBusy(true)} className={cn('p-2.5 rounded-lg transition-colors touch-manipulation text-xs font-black', busyExtra > 0 ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800')} style={busyExtra > 0 ? { backgroundColor: '#06c167' } : undefined} title="Busy Mode">🔥</button>
          <button onClick={() => { setShowSearch(s => !s); if (showSearch) setSearch(''); }} className="p-2.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 touch-manipulation"><Search className="w-5 h-5" /></button>
          <Link href="/app/orders" className="p-2.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 touch-manipulation"><LogOut className="w-5 h-5" /></Link>
        </div>
      </header>

      {/* Search */}
      {showSearch && (
        <div className="px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.kds_searchPlaceholder}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" autoFocus />
          </div>
        </div>
      )}

      {/* ════ TABS + FILTER ════ */}
      <div className="flex items-center h-12 border-b border-gray-800 flex-shrink-0 px-3 bg-gray-900/50">
        <button onClick={() => setTab('active')} className={cn('px-4 h-full text-sm font-bold relative touch-manipulation', tab === 'active' ? 'text-white' : 'text-gray-500')}>
          {t.kds_activeTab} ({active.length}){tab === 'active' && <div className="absolute bottom-0 inset-x-0 h-[2px] bg-emerald-500" />}
        </button>
        <button onClick={() => setTab('history')} className={cn('px-4 h-full text-sm font-bold relative flex items-center gap-1.5 touch-manipulation', tab === 'history' ? 'text-white' : 'text-gray-500')}>
          <History className="w-4 h-4" /> {t.kds_history} ({history.length}){tab === 'history' && <div className="absolute bottom-0 inset-x-0 h-[2px] bg-emerald-500" />}
        </button>
        {tab === 'active' && (
          <div className="ml-auto flex items-center gap-1">
            {(['all', 'dine_in', 'pickup', 'delivery'] as const).map(f => {
              const m = f !== 'all' ? TYPE_META[f] : null;
              return (
                <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation', filter === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300')}>
                  {f === 'all' ? t.kds_all : f === 'dine_in' ? t.kds_table : f === 'pickup' ? t.kds_pickup : t.kds_delivery}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ════ GRID ════ */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide bg-gray-100">
        {tab === 'active' ? (
          active.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Package className="w-14 h-14 mb-2 text-gray-700" />
              <p className="text-base font-semibold text-gray-500">{t.kds_empty}</p>
              <p className="text-xs mt-1">{t.kds_emptyDesc}</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {active.map((o, idx) => (
                <div key={o.id} style={{ gridColumn: (o.items?.reduce((s: number, i: any) => s + i.qty, 0) ?? 0) >= 8 ? 'span 2' : undefined }}
                  onClick={() => setSelectedIdx(idx)}>
                  <Ticket order={o} currency={currency} busyExtra={busyExtra} isNew={newIds.has(o.id)} isExpanded={expanded.has(o.id)} isSelected={idx === selectedIdx}
                    onBump={() => { const n = NEXT[o.status]; if (n) bump(o.id, n); }}
                    onCancel={() => bump(o.id, 'cancelled')} onPrint={() => setPrintOrder(o)}
                    onExpand={() => toggleExp(o.id)} onOOS={markOOS}
                    onSMS={() => o.customer_phone ? setSmsOrder(o) : undefined} />
                </div>
              ))}
            </div>
          )
        ) : (
          history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <History className="w-14 h-14 mb-2 text-gray-700" /><p className="text-base font-semibold text-gray-500">{t.kds_noHistory}</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-w-6xl mx-auto">
              {history.map(o => (
                <HRow key={o.id} order={o} currency={currency} open={expanded.has(o.id)}
                  onToggle={() => toggleExp(o.id)} onPrint={() => setPrintOrder(o)} onRecall={() => recall(o.id)} />
              ))}
            </div>
          )
        )}
      </div>

      {/* ════ BOTTOM STATS BAR ════ */}
      <div className="h-10 flex items-center justify-center gap-6 px-3 bg-gray-900 border-t border-gray-800 flex-shrink-0 text-xs text-gray-500">
        <span>{t.kds_today}: <span className="font-bold text-white">{formatPrice(todayTotal, currency)}</span></span>
        <span>{today.length} {today.length !== 1 ? t.kds_orderPlural : t.kds_orderSingular}</span>
        {avgTime !== null && <span>{t.kds_avgTime}: <span className="font-bold text-white">{avgTime} min</span></span>}
        <span className="hidden sm:inline">{clock.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <span className="hidden lg:flex items-center gap-2 text-gray-600">
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">Space</kbd>BUMP
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">←→</kbd>Nav
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">F</kbd>{t.kds_searchKey}
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">R</kbd>Recall
        </span>
        {!online && offlineQueue.current.length > 0 && (
          <span className="text-red-400 font-bold">📴 {offlineQueue.current.length} {t.kds_queued}</span>
        )}
      </div>

      {/* Undo */}
      {undo && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-800/95 backdrop-blur border border-gray-700 text-white shadow-2xl animate-in slide-in-from-bottom">
          <span className="text-xs">#{undo.num} &rarr; {ORDER_STATUS_CONFIG[undo.next]?.label ?? undo.next}</span>
          <button onClick={doUndo} className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-black text-[11px] font-bold"><Undo2 className="w-3 h-3" /> {t.kds_undo}</button>
          <div className="w-12 h-1 rounded-full bg-gray-700 overflow-hidden"><div className="h-full bg-amber-500 animate-[shrink_5s_linear_forwards]" /></div>
        </div>
      )}

      {/* Busy Mode modal */}
      {showBusy && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowBusy(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-gray-900 border border-gray-700 rounded-2xl z-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white">🔥 {t.kds_busyMode}</h2>
              <button onClick={() => setShowBusy(false)} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">{t.kds_busyModeDesc}</p>
            <div className="space-y-1.5 mb-4">
              {[{ v: 0, l: t.kds_busyNormal }, { v: 10, l: '+10 min extra' }, { v: 20, l: '+20 min extra' }, { v: 30, l: '+30 min extra' }].map(o => (
                <label key={o.v} className={cn('flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer', busyExtra === o.v ? 'border-[#06c167] bg-[#06c167]/10' : 'border-gray-700')}>
                  <input type="radio" name="busy" checked={busyExtra === o.v} onChange={() => setBusyExtra(o.v)} style={{ accentColor: '#06c167' }} />
                  <span className="text-sm text-white">{o.l}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowBusy(false)} className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800">{t.general_cancel}</button>
              <button onClick={() => setShowBusy(false)} className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: '#06c167' }}>✓</button>
            </div>
          </div>
        </>
      )}

      {/* Pause modal */}
      {showPause && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowPause(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-gray-900 border border-gray-700 rounded-2xl z-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">{t.kds_pauseOrders}</h2>
              <button onClick={() => setShowPause(false)} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-1.5 mb-4">
              {[{ v: 30, l: t.kds_30min }, { v: 60, l: t.kds_1hour }, { v: 120, l: t.kds_2hours }, { v: 9999, l: t.kds_today }].map(o => (
                <label key={o.v} className={cn('flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer', pauseOpt === o.v ? 'border-red-500 bg-red-500/10' : 'border-gray-700')}>
                  <input type="radio" name="p" checked={pauseOpt === o.v} onChange={() => setPauseOpt(o.v)} className="accent-red-500" />
                  <span className="text-sm text-white">{o.l}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPause(false)} className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800">{t.general_cancel}</button>
              <button onClick={doPause} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold">{t.kds_pause}</button>
            </div>
          </div>
        </>
      )}

      {printOrder && <OrderReceipt order={printOrder} restaurantName={restaurantName} restaurantPhone={restaurantPhone} restaurantAddress={restaurantAddress} currency={currency} onClose={() => setPrintOrder(null)} />}

      {smsOrder && <SMSQuickSend order={smsOrder} restaurantName={restaurantName} onClose={() => setSmsOrder(null)} />}
    </>
  );
}

/* ── Toolbar control ── */
function Ctrl({ on, onClick, icon: I, title, danger }: { on: boolean; onClick: () => void; icon: any; title: string; danger?: boolean }) {
  return <button onClick={onClick} title={title} className={cn('p-2.5 rounded-lg transition-colors touch-manipulation', on ? danger ? 'text-red-400 bg-red-500/15' : 'text-white' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800')} style={on && !danger ? { backgroundColor: '#06c167' } : undefined}><I className="w-5 h-5" /></button>;
}

/* ══════════════════════════════════════════════════════════════════════
   NEW ORDER OVERLAY — Uber Eats style full-screen green flash
   ══════════════════════════════════════════════════════════════════════ */
function NewOrderOverlay({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  const { t } = useDashboardLocale();
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center kds-overlay-flash cursor-pointer select-none"
      style={{ backgroundColor: '#06c167' }}
    >
      <span className="text-white font-black tabular-nums" style={{ fontSize: '6rem', lineHeight: 1 }}>{count}</span>
      <span className="text-white font-black text-3xl mt-3 tracking-widest uppercase">
        {count === 1 ? t.kds_newOrderTitle : t.kds_newOrdersTitle}
      </span>
      <span className="text-white/70 text-sm mt-5">{t.kds_tapToView}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TICKET — Toast/Fresh KDS style card
   Full-color header (green → yellow → red) + items-focused body + bump
   ══════════════════════════════════════════════════════════════════════ */
function Ticket({ order, currency, busyExtra = 0, isNew, isExpanded, isSelected, onBump, onCancel, onPrint, onExpand, onOOS, onSMS }: {
  order: Order; currency: string; busyExtra?: number; isNew: boolean; isExpanded: boolean; isSelected: boolean;
  onBump: () => void; onCancel: () => void; onPrint: () => void; onExpand: () => void;
  onOOS: (pid: string) => void; onSMS: () => void;
}) {
  const { t } = useDashboardLocale();
  const bumpLabel: Record<string, string> = { pending: t.kds_accept, confirmed: t.kds_prepare, preparing: t.kds_markReady, ready: t.kds_deliver };
  const typeLabel: Record<string, string> = { dine_in: t.kds_table, pickup: t.kds_pickup, delivery: t.kds_delivery };
  const payLabel: Record<string, string> = { cash: t.kds_cash, online: t.kds_online };
  const dietLabel: Record<string, string> = { spicy: `🌶️ ${t.kds_spicy}`, dairy_free: `🥛 ${t.kds_dairyFree}` };
  const u = urgency(order.created_at, busyExtra);
  const bmp = BUMP[order.status];
  const nxt = NEXT[order.status];
  const tm = TYPE_META[order.order_type ?? ''];
  const pm = PAY_META[order.payment_method ?? ''];
  const table = (order as any).table?.name;
  const items = order.items ?? [];
  const count = items.reduce((s, i: any) => s + i.qty, 0);
  const created = new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const hasDetails = items.some((i: any) => i.variant || (i.order_item_extras?.length ?? 0) > 0 || (i.order_item_modifiers?.length ?? 0) > 0 || i.notes);

  return (
    <div className={cn(
      'rounded-xl overflow-hidden bg-white border flex flex-col transition-all shadow-sm',
      isSelected ? 'ring-2' : 'border-gray-200',
      isNew && 'kds-card-enter',
      u.late && !isNew && 'kds-late',
    )}
      style={isSelected ? { borderColor: '#06c167', boxShadow: '0 0 0 2px #06c16720' } : undefined}
    >
      {/* ── HEADER — full-color bar ── */}
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ backgroundColor: u.header }}>
        <div className="flex items-center gap-2 min-w-0">
          {tm && <tm.icon className="w-4 h-4 text-white/80 flex-shrink-0" />}
          <span className="text-lg font-black text-white font-mono tracking-wide truncate">{order.order_number}</span>
          {table && <span className="text-xs font-bold text-white/90 bg-white/20 px-1.5 py-0.5 rounded"><Hash className="w-2.5 h-2.5 inline" /> {table}</span>}
          {isNew && <span className="text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded uppercase">{t.kds_new}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-white/70" />
          <span className="text-lg font-black text-white tabular-nums font-mono">{u.timer}</span>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] text-gray-500 border-b border-gray-100">
        {typeLabel[order.order_type ?? ''] && <span>{typeLabel[order.order_type ?? '']}</span>}
        {payLabel[order.payment_method ?? ''] && <><span className="text-gray-300">·</span><span>{payLabel[order.payment_method ?? '']}</span></>}
        <span className="text-gray-300">·</span>
        <span>{count} item{count !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">·</span>
        <span>{created}</span>
        <span className="ml-auto font-bold text-gray-900 text-sm tabular-nums">{formatPrice(Number(order.total), currency)}</span>
      </div>

      {/* ── Customer ── */}
      {(order.customer_name || order.customer_phone) && (
        <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-100">
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">{order.customer_name || order.customer_phone}</span>
          {order.customer_phone && (
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onSMS(); }} className="p-2 rounded-lg bg-violet-50 text-violet-500 hover:bg-violet-100 touch-manipulation" title={t.kds_sendSms}><StickyNote className="w-4 h-4" /></button>
              <a href={`tel:${order.customer_phone}`} className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 touch-manipulation"><PhoneCall className="w-4 h-4" /></a>
              <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 touch-manipulation"><MessageSquare className="w-4 h-4" /></a>
            </div>
          )}
        </div>
      )}

      {/* Delivery address */}
      {order.delivery_address && (
        <div className="px-3 py-1.5 flex items-start gap-2 border-b border-gray-100">
          <MapPin className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-violet-600">{order.delivery_address}</span>
        </div>
      )}

      {/* ── ITEMS — the main focus ── */}
      <div className="flex-1 px-3 py-2 space-y-0.5">
        {items.map((item: any, idx: number) => {
          const name = item.product?.name ?? t.kds_product;
          const variant = item.variant?.name;
          const extras: any[] = item.order_item_extras ?? [];
          const mods: any[] = item.order_item_modifiers ?? [];
          const showSub = (isExpanded || isNew) && (variant || extras.length > 0 || mods.length > 0 || item.notes);
          return (
            <div key={idx} className="py-0.5">
              <div className="flex items-baseline justify-between">
                <button onClick={() => item.product?.id && onOOS(item.product.id)} className="text-left group">
                  <span className="text-sm text-gray-900 group-hover:text-red-500">
                    <span className="font-black mr-1" style={{ color: '#06c167' }}>{item.qty}x</span>
                    <span className="font-semibold">{name}</span>
                    {variant && <span className="text-gray-400 font-normal ml-1">· {variant}</span>}
                  </span>
                  {item.product?.dietary_tags?.length > 0 && (
                    <div className="flex gap-0.5 ml-1 flex-shrink-0">
                      {(item.product.dietary_tags as string[]).map((tag: string) => {
                        const d = DIET_BADGE[tag];
                        return d ? <span key={tag} className={cn('text-[8px] font-bold px-1 py-0.5 rounded border', d.cls)}>{dietLabel[tag] ?? d.label}</span> : null;
                      })}
                    </div>
                  )}
                </button>
                <span className="text-xs text-gray-400 tabular-nums ml-2">{formatPrice(Number(item.line_total), currency)}</span>
              </div>
              {showSub && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {extras.map((e: any, i: number) => <p key={i} className="text-[11px] text-cyan-600">+ {e.product_extras?.name ?? 'Extra'}</p>)}
                  {mods.map((m: any, i: number) => <p key={i} className="text-[11px] text-gray-400">{m.group_name}: <span className="text-gray-600">{m.option_name}</span></p>)}
                  {item.notes && <p className="text-[11px] text-amber-700 font-medium bg-amber-50 rounded px-1.5 py-0.5 inline-block">&quot;{item.notes}&quot;</p>}
                </div>
              )}
            </div>
          );
        })}

        {hasDetails && !isNew && (
          <button onClick={onExpand} className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-600 pt-0.5">
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {isExpanded ? t.kds_less : t.kds_details}
          </button>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-3 mb-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-amber-700 italic">{order.notes}</span>
        </div>
      )}

      {/* ── BUMP BUTTON ── */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-2">
        <button onClick={onPrint} className="p-3 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 touch-manipulation"><Printer className="w-5 h-5" /></button>
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button onClick={onCancel} className="p-3 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 touch-manipulation"><XCircle className="w-5 h-5" /></button>
        )}
        {nxt && bmp && (
          <button
            onClick={onBump}
            className="flex-1 py-5 rounded-xl text-white font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] touch-manipulation tracking-wide"
            style={{ backgroundColor: order.status === 'pending' ? '#06c167' : order.status === 'confirmed' ? '#3b82f6' : order.status === 'preparing' ? '#7c3aed' : '#06c167' }}
          >
            {bumpLabel[order.status] ?? bmp.label} <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── History row — expands to full card on click ── */
function HRow({ order, currency, open, onToggle, onPrint, onRecall }: {
  order: Order; currency: string; open: boolean; onToggle: () => void; onPrint: () => void; onRecall: () => void;
}) {
  const { t } = useDashboardLocale();
  const typeLabel: Record<string, string> = { dine_in: t.kds_table, pickup: t.kds_pickup, delivery: t.kds_delivery };
  const payLabel: Record<string, string> = { cash: t.kds_cash, online: t.kds_online };
  const tm = TYPE_META[order.order_type ?? ''];
  const pm = PAY_META[order.payment_method ?? ''];
  const ok = order.status === 'delivered';
  const items = order.items ?? [];
  const count = items.reduce((s, i: any) => s + i.qty, 0);
  const created = new Date(order.created_at);
  const elapsed = order.updated_at
    ? Math.round((new Date(order.updated_at).getTime() - created.getTime()) / 60000)
    : null;

  if (!open) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700/30 overflow-hidden cursor-pointer hover:bg-gray-800/80 touch-manipulation transition-all" onClick={onToggle}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', ok ? 'bg-emerald-500' : 'bg-red-500')} />
          <span className="text-xs font-bold text-white font-mono w-28 flex-shrink-0">{order.order_number}</span>
          <span className="text-xs text-gray-300 truncate flex-1">{order.customer_name || '—'}</span>
          {tm && <span className="hidden md:inline text-[10px] text-gray-500">{typeLabel[order.order_type ?? '']}</span>}
          <span className="text-xs font-bold text-white tabular-nums w-20 text-right flex-shrink-0">{formatPrice(Number(order.total), currency)}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold', ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>{ok ? 'OK' : 'X'}</span>
          <span className="text-[10px] text-gray-600 w-16 text-right hidden sm:block">{timeAgo(order.created_at)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-white border border-gray-200 transition-all shadow-sm">
      {/* Color header like active tickets */}
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ backgroundColor: ok ? '#06c167' : '#dc2626' }}>
        <div className="flex items-center gap-2 min-w-0">
          {tm && <tm.icon className="w-4 h-4 text-white/80 flex-shrink-0" />}
          <span className="text-lg font-black text-white font-mono tracking-wide">{order.order_number}</span>
          <span className={cn('text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded uppercase')}>{ok ? t.kds_delivered : t.kds_cancelled}</span>
        </div>
        <button onClick={onToggle} className="p-1 rounded hover:bg-white/20 touch-manipulation">
          <ChevronUp className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Meta row */}
      <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] text-gray-500 border-b border-gray-100">
        {tm && <span>{typeLabel[order.order_type ?? '']}</span>}
        {pm && <><span className="text-gray-300">·</span><span>{payLabel[order.payment_method ?? '']}</span></>}
        <span className="text-gray-300">·</span>
        <span>{count} item{count !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">·</span>
        <span>{created.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
        {elapsed !== null && <><span className="text-gray-300">·</span><span>{elapsed} min</span></>}
        <span className="ml-auto font-bold text-gray-900 text-sm tabular-nums">{formatPrice(Number(order.total), currency)}</span>
      </div>

      {/* Customer */}
      {(order.customer_name || order.customer_phone) && (
        <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-100">
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">{order.customer_name || order.customer_phone}</span>
          {order.customer_phone && (
            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              <a href={`tel:${order.customer_phone}`} className="p-1.5 rounded bg-blue-50 text-blue-500 hover:bg-blue-100 touch-manipulation"><PhoneCall className="w-3.5 h-3.5" /></a>
              <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100 touch-manipulation"><MessageSquare className="w-3.5 h-3.5" /></a>
            </div>
          )}
        </div>
      )}

      {/* Delivery address */}
      {order.delivery_address && (
        <div className="px-3 py-1.5 flex items-start gap-2 border-b border-gray-100">
          <MapPin className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-violet-600">{order.delivery_address}</span>
        </div>
      )}

      {/* Items */}
      <div className="px-3 py-2 space-y-0.5">
        {items.map((i: any, idx: number) => {
          const extras: any[] = i.order_item_extras ?? [];
          const mods: any[] = i.order_item_modifiers ?? [];
          return (
            <div key={idx} className="py-0.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-900">
                  <span className="font-black mr-1" style={{ color: '#06c167' }}>{i.qty}x</span>
                  <span className="font-semibold">{i.product?.name ?? t.kds_product}</span>
                  {i.variant?.name && <span className="text-gray-400 font-normal ml-1">· {i.variant.name}</span>}
                </span>
                <span className="text-xs text-gray-400 tabular-nums ml-2">{formatPrice(Number(i.line_total), currency)}</span>
              </div>
              {(extras.length > 0 || mods.length > 0 || i.notes) && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {extras.map((e: any, j: number) => <p key={j} className="text-[11px] text-cyan-600">+ {e.product_extras?.name ?? 'Extra'}</p>)}
                  {mods.map((m: any, j: number) => <p key={j} className="text-[11px] text-gray-400">{m.group_name}: <span className="text-gray-600">{m.option_name}</span></p>)}
                  {i.notes && <p className="text-[11px] text-amber-700 font-medium bg-amber-50 rounded px-1.5 py-0.5 inline-block">&quot;{i.notes}&quot;</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-3 mb-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-amber-700 italic">{order.notes}</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-2 border-t border-gray-100">
        <button onClick={onPrint} className="p-3 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 touch-manipulation" title={t.kds_reprint}><Printer className="w-5 h-5" /></button>
        <button onClick={onRecall} className="flex-1 py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 touch-manipulation active:scale-[0.97] transition-all" style={{ backgroundColor: '#3b82f6' }}>
          <Undo2 className="w-5 h-5" /> {t.kds_recover}
        </button>
        <button onClick={onToggle} className="p-3 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 touch-manipulation" title={t.kds_collapse}><ChevronUp className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SMS Quick Send — send predefined messages without leaving KDS
   ══════════════════════════════════════════════════════════════════════ */

const SMS_TEMPLATES = [
  { id: 'ready', label: '✅ Tu orden está lista', msg: 'Tu orden #{order} está lista para recoger. ¡Te esperamos!' },
  { id: 'preparing', label: '👨‍🍳 Estamos preparando', msg: 'Tu orden #{order} se está preparando. Tiempo estimado: ~15 min.' },
  { id: 'delay', label: '⏰ Demora', msg: 'Tu orden #{order} tiene un pequeño retraso. Gracias por tu paciencia, estará lista pronto.' },
  { id: 'arrive', label: '🏪 Ya puedes pasar', msg: 'Tu orden #{order} te espera. Ya puedes pasar a recogerla.' },
  { id: 'thanks', label: '🙏 Gracias', msg: '¡Gracias por tu compra! Esperamos verte pronto. - #{restaurant}' },
];

function SMSQuickSend({ order, restaurantName, onClose }: { order: Order; restaurantName: string; onClose: () => void }) {
  const { t } = useDashboardLocale();
  const smsLabels: Record<string, string> = {
    ready: t.kds_smsReadyLabel, preparing: t.kds_smsPreparingLabel,
    delay: t.kds_smsDelayLabel, arrive: t.kds_smsArriveLabel, thanks: t.kds_smsThanksLabel,
  };
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const send = async (templateId: string, rawMsg: string) => {
    if (!order.customer_phone) return;
    setSending(templateId);
    setError('');
    const message = `[${restaurantName}] ${rawMsg
      .replace('#{order}', order.order_number)
      .replace('#{restaurant}', restaurantName)}`;
    try {
      const res = await fetch('/api/orders/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: order.customer_phone, message }),
      });
      if (res.ok) {
        setSent(p => { const n = new Set(p); n.add(templateId); return n; });
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || t.kds_sendError);
      }
    } catch {
      setError(t.kds_connError);
    }
    setSending(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-gray-900 border border-gray-700 rounded-2xl z-50 shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">{t.kds_sendSms}</h2>
            <p className="text-xs text-gray-500">#{order.order_number} · {order.customer_name || order.customer_phone}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
          {SMS_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => send(tmpl.id, tmpl.msg)}
              disabled={sending !== null}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all touch-manipulation',
                sent.has(tmpl.id)
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : 'bg-gray-800 border border-gray-700/50 hover:bg-gray-750 hover:border-gray-600',
                sending === tmpl.id && 'opacity-70'
              )}
            >
              <span className="flex-1">
                <span className="text-sm font-medium text-white block">{smsLabels[tmpl.id] ?? tmpl.label}</span>
                <span className="text-[11px] text-gray-500 block mt-0.5">{tmpl.msg.replace('#{order}', order.order_number).replace('#{restaurant}', restaurantName)}</span>
              </span>
              {sending === tmpl.id ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
              ) : sent.has(tmpl.id) ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <Send className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
            </button>
          ))}

          {/* Custom message */}
          {showCustom ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder={t.kds_customMsgPlaceholder}
                rows={2}
                maxLength={300}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowCustom(false)} className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800">{t.general_cancel}</button>
                <button
                  onClick={() => custom.trim() && send('custom', custom.trim())}
                  disabled={!custom.trim() || sending !== null}
                  className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sending === 'custom' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {t.kds_send}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 text-sm text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
            >
              {t.kds_customMsg}
            </button>
          )}
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {sent.size > 0 && (
          <div className="px-4 py-2 bg-emerald-500/10 border-t border-emerald-500/20">
            <p className="text-xs text-emerald-400">{sent.size} {sent.size !== 1 ? t.kds_msgsSent : t.kds_msgSent}</p>
          </div>
        )}
      </div>
    </>
  );
}
