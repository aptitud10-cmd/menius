'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  MessageCircle, Clock, Check, XCircle, Printer, Pause, Bell,
  Phone, Search, X, MoreHorizontal, Utensils, ShoppingBag, Truck,
  History, MapPin, User, ChevronRight, AlertTriangle, CheckCircle,
  FlaskConical, Loader2,
} from 'lucide-react';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { updateOrderStatus, updateOrderETA } from '@/lib/actions/restaurant';
import { AutoAcceptService } from '@/lib/counter/AutoAcceptService';
import { PrinterService } from '@/lib/printing/PrinterService';
import type { Order, OrderItem } from '@/types';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const GREEN = '#06C167';
const ETA_OPTS = [10, 15, 20, 25, 30, 45] as const;
const SLA_WARN_MINS = 5;

type Tab = 'new' | 'cooking' | 'ready' | 'history';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
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

function fmtMM(seconds: number) {
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgoShort(createdAt: string) {
  const m = elapsedMins(createdAt);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function waLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

// ─── Audio ───────────────────────────────────────────────────────────────────

function isSoundMuted(): boolean {
  try {
    const stored = localStorage.getItem('menius-sound');
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed?.state?.soundEnabled === false;
  } catch { return false; }
}

function playBeep() {
  if (typeof window === 'undefined' || isSoundMuted()) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
  } catch { /* unavailable */ }
}

function playUrgentBeep() {
  if (typeof window === 'undefined' || isSoundMuted()) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [440, 480, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'square';
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t); osc.stop(t + 0.15);
    });
  } catch { /* unavailable */ }
}

function requestPushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

function sendPush(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: '/favicon.ico', tag: 'menius-order' }); } catch { /* failed */ }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CounterViewProps {
  initialOrders: Order[];
  restaurantId: string;
  restaurantName: string;
  currency: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CounterView — Uber Eats master-detail layout
// ══════════════════════════════════════════════════════════════════════════════

export function CounterView({ initialOrders, restaurantId, restaurantName, currency }: CounterViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [eta, setEta] = useState(15);
  const [busyExtra, setBusyExtra] = useState(0);
  const [showBusy, setShowBusy] = useState(false);
  const [pausedUntil, setPausedUntil] = useState<number | null>(null);
  const [showPause, setShowPause] = useState(false);
  const [pauseOpt, setPauseOpt] = useState(30);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testToast, setTestToast] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [splashOrder, setSplashOrder] = useState<Order | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [, tick] = useState(0);
  const urgentRef = useRef<Set<string>>(new Set());

  // Tick every second for live timers
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { requestPushPermission(); }, []);
  useEffect(() => { return AutoAcceptService.subscribe(() => {}); }, []);

  const handleNewOrder = useCallback((order: Order) => {
    playBeep();
    sendPush('🔔 Nueva orden · ' + restaurantName, `${order.customer_name || 'Cliente'} · #${order.order_number} · ${fmt(order.total, currency)}`);
    setSplashOrder(order);
  }, [restaurantName, currency]);

  const { orders } = useRealtimeOrders({ restaurantId, initialOrders, onNewOrder: handleNewOrder });

  // ── Derived lists ──
  const newOrders = useMemo(() =>
    orders.filter(o => o.status === 'pending')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]);

  const cookingOrders = useMemo(() =>
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
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      r = r.filter(o => o.order_number?.toLowerCase().includes(q) || (o.customer_name ?? '').toLowerCase().includes(q));
    }
    return r;
  }, [orders, historySearch]);

  const currentTabList = useMemo(() => {
    if (activeTab === 'new') return newOrders;
    if (activeTab === 'cooking') return cookingOrders;
    if (activeTab === 'ready') return readyOrders;
    return historyOrders;
  }, [activeTab, newOrders, cookingOrders, readyOrders, historyOrders]);

  // Auto-select first order when tab/list changes
  useEffect(() => {
    if (!currentTabList.find(o => o.id === selectedId)) {
      setSelectedId(currentTabList[0]?.id ?? null);
    }
  }, [currentTabList, selectedId]);

  // SLA urgent beep
  useEffect(() => {
    newOrders.forEach(o => {
      if (elapsedMins(o.created_at) >= SLA_WARN_MINS && !urgentRef.current.has(o.id)) {
        urgentRef.current.add(o.id);
        playUrgentBeep();
        sendPush('⚠️ Orden sin atender · ' + restaurantName, `#${o.order_number} lleva más de ${SLA_WARN_MINS} min esperando`);
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
      PrinterService.printOrder(firstNew, effectiveEta, restaurantName, currency).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOrders.map(o => o.id).join(',')]);

  // ── Actions ──
  const handleAccept = useCallback(async (order: Order) => {
    setIsUpdating(true);
    const effectiveEta = eta + busyExtra;
    try {
      await updateOrderETA(order.id, effectiveEta);
      await updateOrderStatus(order.id, 'confirmed');
      PrinterService.printOrder(order, effectiveEta, restaurantName, currency).catch(() => {});
      setShowMoreMenu(false);
      setActiveTab('cooking');
      setSelectedId(order.id);
    } finally { setIsUpdating(false); }
  }, [eta, busyExtra, restaurantName, currency]);

  const handleReject = useCallback(async (order: Order) => {
    setIsUpdating(true);
    setShowMoreMenu(false);
    setShowRejectConfirm(false);
    try {
      await updateOrderStatus(order.id, 'cancelled');
    } finally { setIsUpdating(false); }
  }, []);

  const handleMarkReady = useCallback(async (order: Order) => {
    setIsUpdating(true);
    try {
      await updateOrderStatus(order.id, 'ready');
      setActiveTab('ready');
      setSelectedId(order.id);
      if (order.customer_phone) {
        const msg = `Hola ${order.customer_name || 'cliente'}, tu orden #${order.order_number} está lista ✅ Puedes pasar a recogerla.`;
        window.open(waLink(order.customer_phone, msg), '_blank');
      }
    } finally { setIsUpdating(false); }
  }, []);

  const handleDeliver = useCallback(async (order: Order) => {
    setIsUpdating(true);
    try {
      await updateOrderStatus(order.id, 'delivered');
      setActiveTab('history');
      setSelectedId(null);
    } finally { setIsUpdating(false); }
  }, []);

  const handleCancelCooking = useCallback(async (order: Order) => {
    setIsUpdating(true);
    setShowMoreMenu(false);
    try {
      await updateOrderStatus(order.id, 'cancelled');
    } finally { setIsUpdating(false); }
  }, []);

  const doPause = () => {
    let ms = pauseOpt * 60_000;
    if (pauseOpt === 9999) {
      const n = new Date();
      ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime() - n.getTime();
    }
    setPausedUntil(Date.now() + ms);
    setShowPause(false);
  };

  const handleTestOrder = useCallback(async () => {
    setIsSendingTest(true);
    setTestToast(null);
    try {
      const res = await fetch('/api/test-order', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setTestToast(data.error ?? 'Error al crear pedido de prueba');
      } else {
        setTestToast(`✓ Pedido #${data.order_number} enviado`);
        setActiveTab('new');
      }
    } catch {
      setTestToast('Error de conexión');
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestToast(null), 4_000);
    }
  }, []);

  const selectedOrder = activeTab !== 'history'
    ? orders.find(o => o.id === selectedId) ?? null
    : null;
  const historySelected = activeTab === 'history'
    ? orders.find(o => o.id === selectedId) ?? null
    : null;

  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const pauseLeftMins = pausedUntil ? Math.max(0, Math.ceil((pausedUntil - Date.now()) / 60_000)) : 0;
  const isPaused = !!pausedUntil && Date.now() < pausedUntil;

  return (
    <div className="h-screen w-full bg-[#F2F2F2] flex flex-col overflow-hidden select-none">

      {/* ── New order splash ── */}
      {splashOrder && (
        <NewOrderSplash
          order={splashOrder}
          currency={currency}
          onReview={() => {
            setSplashOrder(null);
            setActiveTab('new');
            setSelectedId(splashOrder.id);
          }}
        />
      )}

      {/* ══ TOP BAR ══ */}
      <header className="flex-none h-14 bg-white border-b border-[#E8E8E8] flex items-center px-4 gap-2 z-10 shadow-sm">
        {/* Live dot + name */}
        <div className="flex items-center gap-2 mr-1 flex-shrink-0">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: isPaused ? '#EF4444' : GREEN }} />
          <span className="text-[#111] text-sm font-bold truncate max-w-[130px] hidden sm:block">{restaurantName}</span>
        </div>

        {/* 4 Tabs */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          <TabBtn label="Nuevas" count={newOrders.length} active={activeTab === 'new'} urgent={newOrders.length > 0} badgeColor="#EF4444" onClick={() => setActiveTab('new')} />
          <TabBtn label="En cocina" count={cookingOrders.length} active={activeTab === 'cooking'} urgent={false} badgeColor="#F59E0B" onClick={() => setActiveTab('cooking')} />
          <TabBtn label="Listas" count={readyOrders.length} active={activeTab === 'ready'} urgent={false} badgeColor={GREEN} onClick={() => setActiveTab('ready')} />
          <TabBtn label="Historial" count={null} active={activeTab === 'history'} urgent={false} badgeColor="#9CA3AF" onClick={() => setActiveTab('history')} icon={<History className="w-3.5 h-3.5" />} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          {isPaused && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600 text-[11px] font-bold animate-pulse">
              <Pause className="w-3 h-3" /> {pauseLeftMins}m
              <button onClick={() => setPausedUntil(null)} className="ml-0.5 hover:text-red-800 font-black leading-none">×</button>
            </span>
          )}
          {busyExtra > 0 && (
            <span className="px-2 py-1 rounded-full text-white text-[11px] font-bold" style={{ background: '#F59E0B' }}>
              +{busyExtra}min
            </span>
          )}
          <button
            onClick={() => setShowBusy(true)}
            title="Modo ocupado"
            className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors text-base', busyExtra > 0 ? 'text-white' : 'bg-[#F5F5F5] text-[#888] hover:bg-[#E8E8E8]')}
            style={busyExtra > 0 ? { background: '#F59E0B' } : {}}
          >🔥</button>
          <button
            onClick={() => setShowPause(true)}
            title="Pausar órdenes"
            className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors', isPaused ? 'bg-red-100 text-red-500' : 'bg-[#F5F5F5] text-[#888] hover:bg-[#E8E8E8]')}
          ><Pause className="w-4 h-4" /></button>
          <button
            onClick={handleTestOrder}
            disabled={isSendingTest}
            title="Enviar pedido de prueba"
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-[#F5F5F5] text-[#888] hover:bg-[#E8E8E8] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isSendingTest
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FlaskConical className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Prueba</span>
          </button>
        </div>
      </header>

      {/* ── Test toast ── */}
      {testToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#111] text-white text-sm font-semibold shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {testToast}
        </div>
      )}

      {/* ══ MASTER-DETAIL ══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — Order list */}
        <div className="w-[272px] flex-none bg-white border-r border-[#E8E8E8] flex flex-col overflow-hidden">

          {activeTab === 'history' && (
            <div className="p-3 border-b border-[#F0F0F0]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#BBBBBB]" />
                <input
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Buscar orden o cliente…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#F5F5F5] text-sm text-[#111] placeholder-[#BBBBBB] focus:outline-none border border-transparent focus:border-[#06C167]/50"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {currentTabList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-[#CCCCCC]">
                {activeTab === 'new' && <Bell className="w-8 h-8" />}
                {activeTab === 'cooking' && <Utensils className="w-8 h-8" />}
                {activeTab === 'ready' && <CheckCircle className="w-8 h-8" />}
                {activeTab === 'history' && <History className="w-8 h-8" />}
                <p className="text-sm text-[#BBBBBB]">
                  {activeTab === 'new' ? 'Sin nuevas órdenes' :
                   activeTab === 'cooking' ? 'Cocina libre' :
                   activeTab === 'ready' ? 'Sin órdenes listas' : 'Sin historial hoy'}
                </p>
              </div>
            ) : (
              currentTabList.map(o => (
                activeTab === 'history' ? (
                  <HistoryListRow
                    key={o.id}
                    order={o}
                    currency={currency}
                    selected={selectedId === o.id}
                    onClick={() => setSelectedId(o.id)}
                  />
                ) : (
                  <OrderListRow
                    key={o.id}
                    order={o}
                    currency={currency}
                    tab={activeTab}
                    selected={selectedId === o.id}
                    isUrgent={activeTab === 'new' && elapsedMins(o.created_at) >= SLA_WARN_MINS}
                    onClick={() => { setSelectedId(o.id); setShowMoreMenu(false); setShowRejectConfirm(false); }}
                  />
                )
              ))
            )}
          </div>

          {/* Day summary footer */}
          <div className="flex-none px-4 py-2.5 border-t border-[#F0F0F0] bg-[#FAFAFA]">
            <div className="flex justify-between text-[11px] text-[#AAAAAA]">
              <span>Hoy: <span className="font-bold text-[#555]">{todayOrders.length} órdenes</span></span>
              <span className="font-bold text-[#555]">{fmt(todayRevenue, currency)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Detail panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'history' ? (
            historySelected ? (
              <HistoryDetailPanel order={historySelected} currency={currency} restaurantName={restaurantName} />
            ) : (
              <IdlePanel icon={<History className="w-12 h-12 text-[#DDDDDD]" />} label="Selecciona una orden" />
            )
          ) : selectedOrder ? (
            <DetailPanel
              order={selectedOrder}
              currency={currency}
              restaurantName={restaurantName}
              tab={activeTab}
              eta={eta}
              busyExtra={busyExtra}
              isUpdating={isUpdating}
              showMoreMenu={showMoreMenu}
              showRejectConfirm={showRejectConfirm}
              onSetEta={setEta}
              onAccept={handleAccept}
              onReject={handleReject}
              onMarkReady={handleMarkReady}
              onDeliver={handleDeliver}
              onCancelCooking={handleCancelCooking}
              onToggleMoreMenu={() => { setShowMoreMenu(s => !s); setShowRejectConfirm(false); }}
              onShowRejectConfirm={() => setShowRejectConfirm(true)}
              onCloseMoreMenu={() => { setShowMoreMenu(false); setShowRejectConfirm(false); }}
              onPrint={() => PrinterService.printOrder(selectedOrder, selectedOrder.estimated_ready_minutes ?? eta, restaurantName, currency).catch(() => {})}
            />
          ) : (
            <IdlePanel
              icon={activeTab === 'new' ? <Bell className="w-12 h-12 text-[#DDDDDD]" /> : <Utensils className="w-12 h-12 text-[#DDDDDD]" />}
              label={activeTab === 'new' ? 'Esperando órdenes…' : activeTab === 'cooking' ? 'Cocina sin órdenes' : 'Sin órdenes listas'}
              sub="Conectado en tiempo real"
              showDot
            />
          )}
        </div>
      </div>

      {/* ══ MODALS ══ */}

      {/* Busy Mode */}
      {showBusy && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowBusy(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-xs mx-auto bg-white rounded-2xl z-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#111]">🔥 Modo ocupado</h2>
              <button onClick={() => setShowBusy(false)} className="p-1 text-[#AAAAAA] hover:text-[#111]"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-[#AAAAAA] mb-4">Agrega minutos extra al ETA cuando hay mucha demanda.</p>
            <div className="space-y-2 mb-5">
              {[{ v: 0, l: 'Normal — sin cambios' }, { v: 10, l: 'Ocupado (+10 min)' }, { v: 20, l: 'Muy ocupado (+20 min)' }].map(o => (
                <label key={o.v} className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors', busyExtra === o.v ? 'border-[#06C167] bg-[#06C167]/5' : 'border-[#EEEEEE] hover:border-[#CCCCCC]')}>
                  <input type="radio" name="busy" checked={busyExtra === o.v} onChange={() => setBusyExtra(o.v)} style={{ accentColor: GREEN }} />
                  <span className="text-sm font-medium text-[#111]">{o.l}</span>
                </label>
              ))}
            </div>
            <button onClick={() => setShowBusy(false)} className="w-full py-3 rounded-xl text-white font-bold text-sm" style={{ background: GREEN }}>
              Guardar
            </button>
          </div>
        </>
      )}

      {/* Pause orders */}
      {showPause && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowPause(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-xs mx-auto bg-white rounded-2xl z-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#111]">⏸ Pausar nuevas órdenes</h2>
              <button onClick={() => setShowPause(false)} className="p-1 text-[#AAAAAA] hover:text-[#111]"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 mb-5">
              {[{ v: 30, l: '30 minutos' }, { v: 60, l: '1 hora' }, { v: 120, l: '2 horas' }, { v: 9999, l: 'Hasta mañana' }].map(o => (
                <label key={o.v} className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors', pauseOpt === o.v ? 'border-red-400 bg-red-50' : 'border-[#EEEEEE] hover:border-[#CCCCCC]')}>
                  <input type="radio" name="pause" checked={pauseOpt === o.v} onChange={() => setPauseOpt(o.v)} className="accent-red-500" />
                  <span className="text-sm font-medium text-[#111]">{o.l}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPause(false)} className="flex-1 py-3 rounded-xl text-sm text-[#888] border border-[#EEEEEE]">Cancelar</button>
              <button onClick={doPause} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold">Pausar</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TabBtn
// ══════════════════════════════════════════════════════════════════════════════

function TabBtn({ label, count, active, urgent, badgeColor, onClick, icon }: {
  label: string; count: number | null; active: boolean; urgent: boolean;
  badgeColor: string; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
        active ? 'bg-[#111] text-white shadow-sm' : 'text-[#888] hover:text-[#111] hover:bg-[#F5F5F5]'
      )}
    >
      {icon && <span className={active ? 'text-white' : 'text-[#BBBBBB]'}>{icon}</span>}
      {label}
      {count !== null && count > 0 && (
        <span
          className={cn('text-[11px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center', urgent && !active ? 'animate-pulse' : '')}
          style={{ background: active ? 'rgba(255,255,255,0.25)' : badgeColor + '22', color: active ? '#fff' : badgeColor }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OrderListRow — left panel row for new/cooking/ready tabs
// ══════════════════════════════════════════════════════════════════════════════

const TYPE_ICON: Record<string, typeof Utensils> = {
  delivery: Truck,
  pickup: ShoppingBag,
  dine_in: Utensils,
};

function OrderListRow({ order, currency, tab, selected, isUrgent, onClick }: {
  order: Order; currency: string; tab: Tab; selected: boolean; isUrgent: boolean; onClick: () => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

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
        'w-full text-left px-4 py-3.5 border-b border-[#F5F5F5] transition-all',
        selected ? 'bg-[#F0FDF4] border-l-4' : 'hover:bg-[#FAFAFA] border-l-4 border-l-transparent',
        isUrgent && !selected ? 'bg-red-50 border-l-red-400' : '',
        selected ? 'border-l-[#06C167]' : ''
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TypeIcon className="w-3 h-3 text-[#AAAAAA] flex-shrink-0" />
            <span className="text-[13px] font-black text-[#111] truncate">#{order.order_number}</span>
            {isUrgent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 flex-shrink-0">¡Urgente!</span>}
          </div>
          <p className="text-xs text-[#888] truncate">{order.customer_name || 'Cliente'}</p>
          <p className="text-xs font-bold text-[#111] mt-1">{fmt(Number(order.total), currency)}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          {tab === 'cooking' && countdownSecs !== null ? (
            <div className={cn('text-xs font-black tabular-nums', isLate ? 'text-red-500' : 'text-[#06C167]')}>
              {isLate ? '−' : ''}{fmtMM(countdownSecs)}
            </div>
          ) : (
            <div className={cn('text-xs font-semibold tabular-nums', isUrgent ? 'text-red-500' : 'text-[#AAAAAA]')}>
              {mins}m
            </div>
          )}
          {tab === 'ready' && <div className="text-[10px] text-[#06C167] font-bold mt-0.5">Lista ✓</div>}
        </div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HistoryListRow — left panel row for history tab
// ══════════════════════════════════════════════════════════════════════════════

function HistoryListRow({ order, currency, selected, onClick }: {
  order: Order; currency: string; selected: boolean; onClick: () => void;
}) {
  const ok = order.status === 'delivered';
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-[#F5F5F5] transition-all',
        selected ? 'bg-[#F5F5F5]' : 'hover:bg-[#FAFAFA]'
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', ok ? 'bg-[#06C167]' : 'bg-red-400')} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#111]">#{order.order_number}</span>
            <span className="text-xs font-bold text-[#111]">{fmt(Number(order.total), currency)}</span>
          </div>
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-xs text-[#888] truncate">{order.customer_name || '—'}</span>
            <span className="text-[10px] text-[#BBBBBB] flex-shrink-0 ml-2">{timeAgoShort(order.created_at)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DetailPanel — right panel for new/cooking/ready tabs
// ══════════════════════════════════════════════════════════════════════════════

function DetailPanel({
  order, currency, restaurantName, tab, eta, busyExtra, isUpdating,
  showMoreMenu, showRejectConfirm,
  onSetEta, onAccept, onReject, onMarkReady, onDeliver, onCancelCooking,
  onToggleMoreMenu, onShowRejectConfirm, onCloseMoreMenu, onPrint,
}: {
  order: Order; currency: string; restaurantName: string; tab: Tab;
  eta: number; busyExtra: number; isUpdating: boolean;
  showMoreMenu: boolean; showRejectConfirm: boolean;
  onSetEta: (v: number) => void;
  onAccept: (o: Order) => void;
  onReject: (o: Order) => void;
  onMarkReady: (o: Order) => void;
  onDeliver: (o: Order) => void;
  onCancelCooking: (o: Order) => void;
  onToggleMoreMenu: () => void;
  onShowRejectConfirm: () => void;
  onCloseMoreMenu: () => void;
  onPrint: () => void;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  const secs = elapsedSecs(order.created_at);
  const mins = elapsedMins(order.created_at);
  const etaMins = order.estimated_ready_minutes;
  const countdownSecs = etaMins != null ? etaMins * 60 - secs : null;
  const isLate = countdownSecs !== null && countdownSecs < 0;
  const isUrgent = tab === 'new' && mins >= SLA_WARN_MINS;
  const effectiveEta = eta + busyExtra;

  const typeLabels: Record<string, string> = { dine_in: 'En mesa', pickup: 'Para recoger', delivery: 'Delivery' };
  const TypeIcon = TYPE_ICON[order.order_type ?? 'dine_in'] ?? Utensils;
  const table = (order as any).table?.name;
  const subtotal = (order.items ?? []).reduce((s, i) => s + (i.line_total ?? i.unit_price * i.qty), 0);

  const waReadyMsg = order.customer_phone
    ? waLink(order.customer_phone, `Hola ${order.customer_name || 'cliente'}, tu orden #${order.order_number} está lista ✅ Puedes pasar a recogerla.`)
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <div
        className={cn('flex-none px-5 py-4 transition-colors duration-500', isUrgent ? 'animate-pulse' : '')}
        style={{ background: isUrgent ? '#EF4444' : tab === 'ready' ? GREEN : tab === 'cooking' && isLate ? '#EF4444' : '#111111' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-black text-2xl leading-tight">{order.customer_name || 'Cliente'}</span>
              <span className="text-white/60 text-base font-light">·</span>
              <span className="text-white font-bold text-base">#{order.order_number}</span>
              {isUrgent && <span className="text-white bg-white/20 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">¡Urgente!</span>}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <TypeIcon className="w-3 h-3" />
                <span>{typeLabels[order.order_type ?? 'dine_in']}</span>
                {table && <span>· Mesa {table}</span>}
              </div>
              <span className="text-white/50 text-xs">·</span>
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <Clock className="w-3 h-3" />
                <span>{timeAgoShort(order.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {order.customer_phone && (
              <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                title="WhatsApp">
                <MessageCircle className="w-4 h-4 text-white" />
              </a>
            )}
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                title="Llamar">
                <Phone className="w-4 h-4 text-white" />
              </a>
            )}
            <button onClick={onPrint}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Imprimir ticket">
              <Printer className="w-4 h-4 text-white" />
            </button>
            <button onClick={onToggleMoreMenu}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors relative"
              title="Más opciones">
              <MoreHorizontal className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* "..." dropdown */}
        {showMoreMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={onCloseMoreMenu} />
            <div className="absolute right-4 top-16 z-50 bg-white rounded-xl shadow-2xl border border-[#E8E8E8] overflow-hidden min-w-[200px]">
              {tab === 'new' && !showRejectConfirm && (
                <button onClick={onShowRejectConfirm}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  <XCircle className="w-4 h-4" />
                  Rechazar orden
                </button>
              )}
              {tab === 'new' && showRejectConfirm && (
                <div className="p-4">
                  <p className="text-sm font-bold text-[#111] mb-1">¿Rechazar #{order.order_number}?</p>
                  <p className="text-xs text-[#888] mb-3">El cliente será notificado.</p>
                  <div className="flex gap-2">
                    <button onClick={onCloseMoreMenu} className="flex-1 py-2 rounded-lg text-xs text-[#888] border border-[#E8E8E8]">Cancelar</button>
                    <button onClick={() => onReject(order)} disabled={isUpdating}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold disabled:opacity-50">
                      Rechazar
                    </button>
                  </div>
                </div>
              )}
              {tab === 'cooking' && !showRejectConfirm && (
                <>
                  <button onClick={onShowRejectConfirm}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                    <XCircle className="w-4 h-4" /> Cancelar orden
                  </button>
                  {order.customer_phone && (
                    <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      onClick={onCloseMoreMenu}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#111] hover:bg-[#F5F5F5] transition-colors">
                      <MessageCircle className="w-4 h-4" /> Contactar cliente
                    </a>
                  )}
                </>
              )}
              {tab === 'cooking' && showRejectConfirm && (
                <div className="p-4">
                  <p className="text-sm font-bold text-[#111] mb-1">¿Cancelar #{order.order_number}?</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={onCloseMoreMenu} className="flex-1 py-2 rounded-lg text-xs text-[#888] border border-[#E8E8E8]">No</button>
                    <button onClick={() => onCancelCooking(order)} disabled={isUpdating}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold disabled:opacity-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-4">

          {/* Timer — only for cooking tab */}
          {tab === 'cooking' && countdownSecs !== null && (
            <div className={cn('rounded-2xl p-5 text-center border-2', isLate ? 'bg-red-50 border-red-200' : 'bg-white border-[#E8E8E8]')}>
              <p className={cn('text-[11px] font-bold uppercase tracking-widest mb-2', isLate ? 'text-red-500' : 'text-[#AAAAAA]')}>
                {isLate ? '¡Atrasado!' : 'Tiempo restante'}
              </p>
              <p className={cn('font-black tabular-nums leading-none', isLate ? 'text-red-500' : 'text-[#111]')} style={{ fontSize: 64 }}>
                {isLate ? '−' : ''}{fmtMM(countdownSecs)}
              </p>
              <p className={cn('text-sm font-semibold mt-1', isLate ? 'text-red-400' : 'text-[#888]')}>
                {isLate ? 'min de retraso' : 'min restantes'}
              </p>
            </div>
          )}

          {/* ETA selector — only for new tab */}
          {tab === 'new' && (
            <div className="bg-white rounded-2xl p-5 border-2 border-[#E8E8E8]">
              <p className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-widest mb-3">Tiempo estimado de preparación</p>
              <div className="grid grid-cols-6 gap-2">
                {ETA_OPTS.map(v => (
                  <button key={v}
                    onClick={() => onSetEta(v)}
                    className={cn('py-3 rounded-xl text-sm font-black border-2 transition-all active:scale-[0.97]',
                      (eta === v) ? 'text-white border-transparent shadow-md' : 'bg-white border-[#EEEEEE] text-[#555] hover:border-[#CCCCCC]'
                    )}
                    style={(eta === v) ? { background: GREEN, borderColor: GREEN } : {}}>
                    {v}m
                  </button>
                ))}
              </div>
              {busyExtra > 0 && (
                <p className="text-xs text-center text-[#F59E0B] font-semibold mt-2">
                  +{busyExtra} min por modo ocupado → ETA real: <strong>{effectiveEta} min</strong>
                </p>
              )}
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-2xl border-2 border-[#E8E8E8] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F5F5F5]">
              <p className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-widest">
                {(order.items ?? []).reduce((s, i) => s + i.qty, 0)} items
              </p>
            </div>
            <div className="px-5 divide-y divide-[#F5F5F5]">
              {(order.items ?? []).map((item, idx) => (
                <ItemRow key={item.id ?? idx} item={item} currency={currency} />
              ))}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="mx-5 mb-4 mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-700 italic">{order.notes}</p>
              </div>
            )}

            {/* Delivery address */}
            {order.delivery_address && (
              <div className="mx-5 mb-4 mt-2 flex items-start gap-2 bg-[#F5F5F5] rounded-xl px-3 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-[#888] flex-shrink-0 mt-0.5" />
                <div>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-bold underline" style={{ color: GREEN }}>
                    Ver en mapa →
                  </a>
                  <p className="text-xs text-[#555] mt-0.5">{order.delivery_address}</p>
                </div>
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
                  <span>Impuestos</span><span>{fmt(order.tax_amount!, currency)}</span>
                </div>
              )}
              {(order.delivery_fee ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-[#888]">
                  <span>Envío</span><span>{fmt(order.delivery_fee!, currency)}</span>
                </div>
              )}
              {(order.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-xs" style={{ color: GREEN }}>
                  <span>Descuento</span><span>−{fmt(order.discount_amount!, currency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-[#EEEEEE]">
                <span className="text-sm font-bold text-[#111]">Total</span>
                <span className="text-2xl font-black text-[#111]">{fmt(Number(order.total), currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex-none p-4 bg-white border-t border-[#E8E8E8] space-y-2.5">
        {tab === 'new' && (
          <button
            disabled={isUpdating}
            onClick={() => onAccept(order)}
            className="w-full h-16 rounded-2xl text-white text-lg font-black flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: isUpdating ? '#AAA' : GREEN }}
          >
            {isUpdating
              ? <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Check className="w-6 h-6" /> Confirmar {effectiveEta} min</>}
          </button>
        )}

        {tab === 'cooking' && (
          <button
            disabled={isUpdating}
            onClick={() => onMarkReady(order)}
            className="w-full h-16 rounded-2xl text-white text-lg font-black flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: isUpdating ? '#AAA' : GREEN }}
          >
            {isUpdating
              ? <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><CheckCircle className="w-6 h-6" /> Marcar lista <ChevronRight className="w-5 h-5" /></>}
          </button>
        )}

        {tab === 'ready' && (
          <>
            {waReadyMsg && (
              <a href={waReadyMsg} target="_blank" rel="noopener noreferrer"
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border-2 transition-all active:scale-[0.97]"
                style={{ background: '#DCFCE7', borderColor: '#86EFAC', color: '#15803D' }}>
                <MessageCircle className="w-4 h-4" /> Avisar por WhatsApp
              </a>
            )}
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`}
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border-2 border-[#E8E8E8] bg-white text-[#555] transition-all active:scale-[0.97] hover:bg-[#F5F5F5]">
                <Phone className="w-4 h-4" /> Llamar al cliente
              </a>
            )}
            <button
              disabled={isUpdating}
              onClick={() => onDeliver(order)}
              className="w-full h-14 rounded-xl text-white text-base font-black flex items-center justify-center gap-2 shadow transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: isUpdating ? '#AAA' : '#111' }}
            >
              {isUpdating
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Check className="w-5 h-5" /> Entregado</>}
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

function ItemRow({ item, currency }: { item: OrderItem; currency: string }) {
  const raw = item as any;
  const modifiers: string[] = [];
  if (item.variant?.name) modifiers.push(item.variant.name);
  const extras: any[] = item.extras ?? raw.order_item_extras ?? [];
  for (const ex of extras) {
    const n = ex.extra?.name ?? ex.product_extras?.name;
    if (n) modifiers.push(n);
  }
  const mods: any[] = raw.order_item_modifiers ?? [];
  for (const m of mods) { if (m.option_name) modifiers.push(m.option_name); }

  return (
    <div className="flex items-start gap-3 py-3.5">
      <span className="flex-none w-8 h-8 rounded-lg border-2 border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-center text-sm font-black text-[#111]">
        {item.qty}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[#111] text-sm font-bold leading-tight">{item.product?.name ?? '—'}</p>
        {modifiers.map((m, i) => <p key={i} className="text-[#888] text-xs mt-0.5">— {m}</p>)}
        {item.notes && <p className="text-amber-600 text-xs mt-0.5 italic">★ {item.notes}</p>}
      </div>
      <span className="flex-none text-sm font-bold text-[#111]">
        {fmt(item.line_total ?? item.unit_price * item.qty, currency)}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HistoryDetailPanel
// ══════════════════════════════════════════════════════════════════════════════

function HistoryDetailPanel({ order, currency, restaurantName }: { order: Order; currency: string; restaurantName: string }) {
  const ok = order.status === 'delivered';
  const typeLabels: Record<string, string> = { dine_in: 'En mesa', pickup: 'Para recoger', delivery: 'Delivery' };
  const TypeIcon = TYPE_ICON[order.order_type ?? 'dine_in'] ?? Utensils;
  const elapsed = order.updated_at
    ? Math.round((new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()) / 60_000)
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-none px-5 py-4" style={{ background: ok ? GREEN : '#EF4444' }}>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-xl">{order.customer_name || 'Cliente'}</span>
              <span className="text-white/60">·</span>
              <span className="text-white font-bold">#{order.order_number}</span>
              <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full uppercase">
                {ok ? 'Entregada' : 'Cancelada'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-white/70 text-xs">
              <TypeIcon className="w-3 h-3" />
              <span>{typeLabels[order.order_type ?? 'dine_in']}</span>
              {elapsed !== null && <><span>·</span><span>{elapsed} min</span></>}
            </div>
          </div>
          <span className="ml-auto text-white font-black text-xl">{fmt(Number(order.total), currency)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {(order.customer_name || order.customer_phone) && (
          <div className="bg-white rounded-2xl border-2 border-[#E8E8E8] px-5 py-4 flex items-center gap-3">
            <User className="w-4 h-4 text-[#AAAAAA]" />
            <div>
              <p className="text-sm font-bold text-[#111]">{order.customer_name || '—'}</p>
              {order.customer_phone && <p className="text-xs text-[#888]">{order.customer_phone}</p>}
            </div>
            {order.customer_phone && (
              <div className="flex gap-2 ml-auto">
                <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-green-100 transition-colors">
                  <MessageCircle className="w-4 h-4 text-[#888]" />
                </a>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border-2 border-[#E8E8E8] overflow-hidden">
          <div className="px-5 divide-y divide-[#F5F5F5]">
            {(order.items ?? []).map((item, idx) => (
              <ItemRow key={item.id ?? idx} item={item} currency={currency} />
            ))}
          </div>
          <div className="px-5 py-3 border-t border-[#F5F5F5] bg-[#FAFAFA] flex justify-between items-center">
            <span className="text-sm font-bold text-[#111]">Total</span>
            <span className="text-xl font-black text-[#111]">{fmt(Number(order.total), currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NewOrderSplash — full screen green flash (identical to Uber Eats)
// ══════════════════════════════════════════════════════════════════════════════

function NewOrderSplash({ order, currency, onReview }: { order: Order; currency: string; onReview: () => void }) {
  const totalQty = (order.items ?? []).reduce((s, i) => s + i.qty, 0);
  const typeLabels: Record<string, string> = { dine_in: 'En mesa', pickup: 'Para recoger', delivery: 'Delivery' };

  useEffect(() => {
    const t = setTimeout(onReview, 8_000);
    return () => clearTimeout(t);
  }, [onReview]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: GREEN }}
      onClick={onReview}
    >
      <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-bounce">
        <Bell className="w-10 h-10 text-white" />
      </div>
      <p className="text-white/80 text-lg font-bold uppercase tracking-widest mb-2">Nueva orden</p>
      <p className="text-white font-black mb-1 text-center" style={{ fontSize: 52, lineHeight: 1.1 }}>
        {order.customer_name || 'Cliente'}
      </p>
      <p className="text-white/80 text-2xl font-bold mb-1">#{order.order_number}</p>
      <div className="flex items-center gap-3 text-white/70 text-base mt-1 mb-2">
        <span>{totalQty} {totalQty === 1 ? 'producto' : 'productos'}</span>
        {typeLabels[order.order_type ?? ''] && <><span>·</span><span>{typeLabels[order.order_type ?? '']}</span></>}
      </div>
      <p className="text-white font-black mt-2" style={{ fontSize: 44 }}>{fmt(order.total, currency)}</p>
      <button onClick={onReview}
        className="mt-10 h-16 px-12 rounded-2xl bg-white font-extrabold text-xl flex items-center gap-3 shadow-xl active:scale-[0.97] transition-transform"
        style={{ color: GREEN }}>
        Ver orden <ChevronRight className="w-6 h-6" />
      </button>
      <p className="text-white/50 text-xs mt-5">Toca en cualquier parte para continuar</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// IdlePanel
// ══════════════════════════════════════════════════════════════════════════════

function IdlePanel({ icon, label, sub, showDot }: { icon: React.ReactNode; label: string; sub?: string; showDot?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-[#888] text-xl font-bold">{label}</p>
        {sub && (
          <p className="text-[#BBBBBB] text-sm mt-1 flex items-center justify-center gap-2">
            {showDot && <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: GREEN }} />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
