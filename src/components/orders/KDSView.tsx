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
import { updateOrderStatus } from '@/lib/actions/restaurant';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG, cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
import { OrderReceipt } from './OrderReceipt';
import type { Order, OrderStatus } from '@/types';

/* ── Status flow ── */
const NEXT: Record<string, OrderStatus> = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered' };
const BUMP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'ACEPTAR',   cls: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' },
  confirmed: { label: 'PREPARAR',  cls: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' },
  preparing: { label: 'LISTA',     cls: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800' },
  ready:     { label: 'ENTREGAR',  cls: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' },
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

/* ── Urgency: returns header color class based on elapsed minutes ── */
function urgency(createdAt: string) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const m = Math.floor(sec / 60), s = sec % 60;
  const timer = m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  if (m < 7)  return { timer, header: 'bg-emerald-600', late: false };
  if (m < 15) return { timer, header: 'bg-amber-500',   late: false };
  return { timer, header: 'bg-red-600', late: true };
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
export function KDSView({ initialOrders, restaurantId, restaurantName, currency, restaurantPhone, restaurantAddress }: Props) {
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
      if (localStorage.getItem('kds-auto-confirm') === 'true' && o.status === 'pending') { localRef.current(o.id, { status: 'confirmed' }); updateOrderStatus(o.id, 'confirmed'); }
      if (localStorage.getItem('menius-auto-print') === 'true') import('./OrderReceipt').then(({ quickPrintOrder }) => quickPrintOrder(o, restaurantName, restaurantPhone, restaurantAddress, currency));
    }, [currency, notifyNewOrder, restaurantName, restaurantPhone, restaurantAddress]),
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
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
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
      {/* ════ TOP BAR ════ */}
      <header className="flex items-center gap-2 px-3 h-11 bg-gray-900 border-b border-gray-800 flex-shrink-0">
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
        {pausedUntil && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
            <Pause className="w-3 h-3" /> {pauseLeft}
            <button onClick={() => { setPausedUntil(null); localStorage.removeItem('kds-paused-until'); }} className="underline ml-0.5 text-[10px]">X</button>
          </span>
        )}

        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <Ctrl on={autoConfirm} onClick={() => tog('kds-auto-confirm', setAutoConfirm, !autoConfirm)} icon={CheckCircle} title="Auto-confirmar" />
          <Ctrl on={autoPrint} onClick={() => tog('menius-auto-print', setAutoPrint, !autoPrint)} icon={Printer} title="Auto-imprimir" />
          <Ctrl on={soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)} icon={soundEnabled ? Volume2 : VolumeX} title="Sonido" />
          <Ctrl on={smsEnabled} onClick={() => tog('kds-sms-enabled', setSmsEnabled, !smsEnabled)} icon={MessageSquare} title="SMS" />
          <Ctrl on={!!pausedUntil} onClick={() => setShowPause(true)} icon={Pause} title="Pausar" danger />
          <button onClick={() => { setShowSearch(s => !s); if (showSearch) setSearch(''); }} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-800"><Search className="w-4 h-4" /></button>
          <Link href="/app/orders" className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-800"><LogOut className="w-4 h-4" /></Link>
        </div>
      </header>

      {/* Search */}
      {showSearch && (
        <div className="px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar orden, cliente, telefono..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" autoFocus />
          </div>
        </div>
      )}

      {/* ════ TABS + FILTER ════ */}
      <div className="flex items-center h-9 border-b border-gray-800 flex-shrink-0 px-3 bg-gray-900/50">
        <button onClick={() => setTab('active')} className={cn('px-3 h-full text-xs font-bold relative', tab === 'active' ? 'text-white' : 'text-gray-500')}>
          Activas ({active.length}){tab === 'active' && <div className="absolute bottom-0 inset-x-0 h-[2px] bg-emerald-500" />}
        </button>
        <button onClick={() => setTab('history')} className={cn('px-3 h-full text-xs font-bold relative flex items-center gap-1', tab === 'history' ? 'text-white' : 'text-gray-500')}>
          <History className="w-3 h-3" /> Historial ({history.length}){tab === 'history' && <div className="absolute bottom-0 inset-x-0 h-[2px] bg-emerald-500" />}
        </button>
        {tab === 'active' && (
          <div className="ml-auto flex items-center gap-0.5">
            {(['all', 'dine_in', 'pickup', 'delivery'] as const).map(f => {
              const m = f !== 'all' ? TYPE_META[f] : null;
              return (
                <button key={f} onClick={() => setFilter(f)} className={cn('px-2 py-1 rounded text-[11px] font-bold', filter === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300')}>
                  {f === 'all' ? 'Todos' : m?.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ════ GRID ════ */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        {tab === 'active' ? (
          active.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <Package className="w-14 h-14 mb-2 text-gray-700" />
              <p className="text-base font-semibold text-gray-500">No hay órdenes activas</p>
              <p className="text-xs mt-1">Aparecen en tiempo real</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {active.map((o, idx) => (
                <div key={o.id} style={{ gridColumn: (o.items?.reduce((s: number, i: any) => s + i.qty, 0) ?? 0) >= 8 ? 'span 2' : undefined }}
                  onClick={() => setSelectedIdx(idx)}>
                  <Ticket order={o} currency={currency} isNew={newIds.has(o.id)} isExpanded={expanded.has(o.id)} isSelected={idx === selectedIdx}
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
              <History className="w-14 h-14 mb-2 text-gray-700" /><p className="text-base font-semibold text-gray-500">Sin historial</p>
            </div>
          ) : (
            <div className="space-y-1 max-w-5xl mx-auto">
              {history.map(o => (
                <HRow key={o.id} order={o} currency={currency} open={expanded.has(o.id)}
                  onToggle={() => toggleExp(o.id)} onPrint={() => setPrintOrder(o)} onRecall={() => recall(o.id)} />
              ))}
            </div>
          )
        )}
      </div>

      {/* ════ BOTTOM STATS BAR ════ */}
      <div className="h-8 flex items-center justify-center gap-6 px-3 bg-gray-900 border-t border-gray-800 flex-shrink-0 text-[11px] text-gray-500">
        <span>Hoy: <span className="font-bold text-white">{formatPrice(todayTotal, currency)}</span></span>
        <span>{today.length} orden{today.length !== 1 ? 'es' : ''}</span>
        {avgTime !== null && <span>Tiempo prom: <span className="font-bold text-white">{avgTime} min</span></span>}
        <span className="hidden sm:inline">{clock.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <span className="hidden lg:flex items-center gap-2 text-gray-600">
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">Space</kbd>BUMP
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">←→</kbd>Nav
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">F</kbd>Buscar
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[9px]">R</kbd>Recall
        </span>
        {!online && offlineQueue.current.length > 0 && (
          <span className="text-red-400 font-bold">📴 {offlineQueue.current.length} en cola</span>
        )}
      </div>

      {/* Undo */}
      {undo && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-800/95 backdrop-blur border border-gray-700 text-white shadow-2xl animate-in slide-in-from-bottom">
          <span className="text-xs">#{undo.num} &rarr; {ORDER_STATUS_CONFIG[undo.next]?.label ?? undo.next}</span>
          <button onClick={doUndo} className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-black text-[11px] font-bold"><Undo2 className="w-3 h-3" /> DESHACER</button>
          <div className="w-12 h-1 rounded-full bg-gray-700 overflow-hidden"><div className="h-full bg-amber-500 animate-[shrink_5s_linear_forwards]" /></div>
        </div>
      )}

      {/* Pause modal */}
      {showPause && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setShowPause(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-gray-900 border border-gray-700 rounded-2xl z-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">Pausar órdenes</h2>
              <button onClick={() => setShowPause(false)} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-1.5 mb-4">
              {[{ v: 30, l: '30 min' }, { v: 60, l: '1 hora' }, { v: 120, l: '2 horas' }, { v: 9999, l: 'Hoy' }].map(o => (
                <label key={o.v} className={cn('flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer', pauseOpt === o.v ? 'border-red-500 bg-red-500/10' : 'border-gray-700')}>
                  <input type="radio" name="p" checked={pauseOpt === o.v} onChange={() => setPauseOpt(o.v)} className="accent-red-500" />
                  <span className="text-sm text-white">{o.l}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPause(false)} className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800">Cancelar</button>
              <button onClick={doPause} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold">Pausar</button>
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
  return <button onClick={onClick} title={title} className={cn('p-1.5 rounded transition-colors', on ? danger ? 'text-red-400 bg-red-500/15' : 'text-emerald-400 bg-emerald-500/10' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800')}><I className="w-4 h-4" /></button>;
}

/* ══════════════════════════════════════════════════════════════════════
   TICKET — Toast/Fresh KDS style card
   Full-color header (green → yellow → red) + items-focused body + bump
   ══════════════════════════════════════════════════════════════════════ */
function Ticket({ order, currency, isNew, isExpanded, isSelected, onBump, onCancel, onPrint, onExpand, onOOS, onSMS }: {
  order: Order; currency: string; isNew: boolean; isExpanded: boolean; isSelected: boolean;
  onBump: () => void; onCancel: () => void; onPrint: () => void; onExpand: () => void;
  onOOS: (pid: string) => void; onSMS: () => void;
}) {
  const u = urgency(order.created_at);
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
      'rounded-xl overflow-hidden bg-gray-800 border flex flex-col transition-all',
      isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-gray-700/50',
      isNew && 'kds-flash',
      u.late && !isNew && 'kds-late',
    )}>
      {/* ── HEADER — full-color bar ── */}
      <div className={cn('px-3 py-2.5 flex items-center justify-between', u.header)}>
        <div className="flex items-center gap-2 min-w-0">
          {tm && <tm.icon className="w-4 h-4 text-white/80 flex-shrink-0" />}
          <span className="text-lg font-black text-white font-mono tracking-wide truncate">{order.order_number}</span>
          {table && <span className="text-xs font-bold text-white/90 bg-white/20 px-1.5 py-0.5 rounded"><Hash className="w-2.5 h-2.5 inline" /> {table}</span>}
          {isNew && <span className="text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded uppercase">Nueva</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-white/70" />
          <span className="text-lg font-black text-white tabular-nums font-mono">{u.timer}</span>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] text-gray-400 border-b border-gray-700/30">
        {tm && <span>{tm.label}</span>}
        {pm && <><span className="text-gray-600">·</span><span>{pm.label}</span></>}
        <span className="text-gray-600">·</span>
        <span>{count} item{count !== 1 ? 's' : ''}</span>
        <span className="text-gray-600">·</span>
        <span>{created}</span>
        <span className="ml-auto font-bold text-white text-sm tabular-nums">{formatPrice(Number(order.total), currency)}</span>
      </div>

      {/* ── Customer ── */}
      {(order.customer_name || order.customer_phone) && (
        <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-700/20">
          <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-white truncate">{order.customer_name || order.customer_phone}</span>
          {order.customer_phone && (
            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onSMS(); }} className="p-1.5 rounded bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 touch-manipulation" title="Enviar SMS"><StickyNote className="w-3.5 h-3.5" /></button>
              <a href={`tel:${order.customer_phone}`} className="p-1.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 touch-manipulation"><PhoneCall className="w-3.5 h-3.5" /></a>
              <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 touch-manipulation"><MessageSquare className="w-3.5 h-3.5" /></a>
            </div>
          )}
        </div>
      )}

      {/* Delivery address */}
      {order.delivery_address && (
        <div className="px-3 py-1.5 flex items-start gap-2 border-b border-gray-700/20">
          <MapPin className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-violet-300">{order.delivery_address}</span>
        </div>
      )}

      {/* ── ITEMS — the main focus ── */}
      <div className="flex-1 px-3 py-2 space-y-0.5">
        {items.map((item: any, idx: number) => {
          const name = item.product?.name ?? 'Producto';
          const variant = item.variant?.name;
          const extras: any[] = item.order_item_extras ?? [];
          const mods: any[] = item.order_item_modifiers ?? [];
          const showSub = (isExpanded || isNew) && (variant || extras.length > 0 || mods.length > 0 || item.notes);
          return (
            <div key={idx} className="py-0.5">
              <div className="flex items-baseline justify-between">
                <button onClick={() => item.product?.id && onOOS(item.product.id)} className="text-left group">
                  <span className="text-sm text-white group-hover:text-red-400">
                    <span className="font-black text-emerald-400 mr-1">{item.qty}x</span>
                    <span className="font-semibold">{name}</span>
                    {variant && <span className="text-gray-500 font-normal ml-1">· {variant}</span>}
                  </span>
                  {item.product?.dietary_tags?.length > 0 && (
                    <div className="flex gap-0.5 ml-1 flex-shrink-0">
                      {(item.product.dietary_tags as string[]).map((tag: string) => {
                        const d = DIET_BADGE[tag];
                        return d ? <span key={tag} className={cn('text-[8px] font-bold px-1 py-0.5 rounded border', d.cls)}>{d.label}</span> : null;
                      })}
                    </div>
                  )}
                </button>
                <span className="text-xs text-gray-500 tabular-nums ml-2">{formatPrice(Number(item.line_total), currency)}</span>
              </div>
              {showSub && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {extras.map((e: any, i: number) => <p key={i} className="text-[11px] text-cyan-400/80">+ {e.product_extras?.name ?? 'Extra'}</p>)}
                  {mods.map((m: any, i: number) => <p key={i} className="text-[11px] text-gray-500">{m.group_name}: <span className="text-gray-400">{m.option_name}</span></p>)}
                  {item.notes && <p className="text-[11px] text-amber-400 font-medium bg-amber-500/10 rounded px-1.5 py-0.5 inline-block">&quot;{item.notes}&quot;</p>}
                </div>
              )}
            </div>
          );
        })}

        {hasDetails && !isNew && (
          <button onClick={onExpand} className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-300 pt-0.5">
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} {isExpanded ? 'Menos' : 'Detalles'}
          </button>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-3 mb-2 flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-amber-300 italic">{order.notes}</span>
        </div>
      )}

      {/* ── BUMP BUTTON ── */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-1.5">
        <button onClick={onPrint} className="p-2 rounded-lg text-gray-500 hover:bg-gray-700 hover:text-white touch-manipulation"><Printer className="w-4 h-4" /></button>
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button onClick={onCancel} className="p-2 rounded-lg text-gray-500 hover:bg-red-500/20 hover:text-red-400 touch-manipulation"><XCircle className="w-4 h-4" /></button>
        )}
        {nxt && bmp && (
          <button onClick={onBump} className={cn('flex-1 py-3 rounded-lg text-white font-black text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] touch-manipulation', bmp.cls)}>
            {bmp.label} <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── History row ── */
function HRow({ order, currency, open, onToggle, onPrint, onRecall }: {
  order: Order; currency: string; open: boolean; onToggle: () => void; onPrint: () => void; onRecall: () => void;
}) {
  const tm = TYPE_META[order.order_type ?? ''];
  const ok = order.status === 'delivered';
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-800/80 touch-manipulation" onClick={onToggle}>
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', ok ? 'bg-emerald-500' : 'bg-red-500')} />
        <span className="text-xs font-bold text-white font-mono w-28 flex-shrink-0">{order.order_number}</span>
        <span className="text-xs text-gray-300 truncate flex-1">{order.customer_name || '—'}</span>
        {tm && <span className="hidden md:inline text-[10px] text-gray-500">{tm.label}</span>}
        <span className="text-xs font-bold text-white tabular-nums w-20 text-right flex-shrink-0">{formatPrice(Number(order.total), currency)}</span>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold', ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>{ok ? 'OK' : 'X'}</span>
        <span className="text-[10px] text-gray-600 w-16 text-right hidden sm:block">{timeAgo(order.created_at)}</span>
        <button onClick={e => { e.stopPropagation(); onRecall(); }} className="p-1 rounded text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 touch-manipulation" title="Recuperar"><Undo2 className="w-3.5 h-3.5" /></button>
        <button onClick={e => { e.stopPropagation(); onPrint(); }} className="p-1 rounded text-gray-600 hover:text-white hover:bg-gray-700 touch-manipulation" title="Reimprimir"><Printer className="w-3.5 h-3.5" /></button>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-600 transition-transform', open && 'rotate-180')} />
      </div>
      {open && (
        <div className="px-3 pb-2.5 pt-1 border-t border-gray-700/20 space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{new Date(order.created_at).toLocaleString('es-MX')}</span>
            {order.customer_phone && <a href={`tel:${order.customer_phone}`} className="text-emerald-400 hover:underline">{order.customer_phone}</a>}
          </div>
          {order.delivery_address && <div className="flex items-start gap-1 text-[11px] text-gray-400"><MapPin className="w-3 h-3 text-gray-600 mt-0.5" />{order.delivery_address}</div>}
          <div className="bg-gray-900/40 rounded-lg p-2 space-y-0.5">
            {(order.items ?? []).map((i: any, idx: number) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-gray-300"><span className="font-bold text-emerald-400">{i.qty}x</span> {i.product?.name ?? 'Producto'}</span>
                <span className="text-gray-500 tabular-nums">{formatPrice(Number(i.line_total), currency)}</span>
              </div>
            ))}
          </div>
          {order.notes && <div className="text-[11px] text-amber-400 italic bg-amber-500/10 rounded px-2 py-1">{order.notes}</div>}
        </div>
      )}
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
        setError(d.error || 'Error al enviar');
      }
    } catch {
      setError('Error de conexión');
    }
    setSending(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-gray-900 border border-gray-700 rounded-2xl z-50 shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Enviar SMS</h2>
            <p className="text-xs text-gray-500">#{order.order_number} · {order.customer_name || order.customer_phone}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
          {SMS_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => send(t.id, t.msg)}
              disabled={sending !== null}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all touch-manipulation',
                sent.has(t.id)
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : 'bg-gray-800 border border-gray-700/50 hover:bg-gray-750 hover:border-gray-600',
                sending === t.id && 'opacity-70'
              )}
            >
              <span className="flex-1">
                <span className="text-sm font-medium text-white block">{t.label}</span>
                <span className="text-[11px] text-gray-500 block mt-0.5">{t.msg.replace('#{order}', order.order_number).replace('#{restaurant}', restaurantName)}</span>
              </span>
              {sending === t.id ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
              ) : sent.has(t.id) ? (
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
                placeholder="Escribe tu mensaje..."
                rows={2}
                maxLength={300}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowCustom(false)} className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800">Cancelar</button>
                <button
                  onClick={() => custom.trim() && send('custom', custom.trim())}
                  disabled={!custom.trim() || sending !== null}
                  className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sending === 'custom' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-gray-700 text-sm text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
            >
              ✏️ Mensaje personalizado
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
            <p className="text-xs text-emerald-400">{sent.size} mensaje{sent.size !== 1 ? 's' : ''} enviado{sent.size !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </>
  );
}
