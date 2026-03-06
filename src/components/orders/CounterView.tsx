'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, MessageCircle, Mail, ChevronRight, Edit2, Check, XCircle, Clock, Printer, Settings, Zap, ChefHat, Bell } from 'lucide-react';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { updateOrderStatus, updateOrderETA } from '@/lib/actions/restaurant';
import { OrderStateMachine, type CounterStatus } from '@/lib/counter/OrderStateMachine';
import { AutoAcceptService, type AutoAcceptConfig } from '@/lib/counter/AutoAcceptService';
import { PrinterService } from '@/lib/printing/PrinterService';
import type { Order, OrderItem } from '@/types';
import { cn } from '@/lib/utils';

// ─── Brand ───────────────────────────────────────────────────────────────────

const GREEN   = '#06C167';
const GREEN_D = '#059254';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function elapsed(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

const ORDER_TYPES: Record<string, string> = {
  delivery: 'Delivery',
  pickup:   'Para recoger',
  dine_in:  'En mesa',
};

const ETA_OPTS = [5, 10, 15, 20, 25, 30, 45, 60] as const;

const SLA_WARN_MINS = 3;

// ─── Audio ───────────────────────────────────────────────────────────────────

function playBeep() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
  } catch {/* unavailable */}
}

function playUrgentBeep() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [440, 480, 440].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'square';
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t); osc.stop(t + 0.15);
    });
  } catch {/* unavailable */}
}

// ─── Push notifications ───────────────────────────────────────────────────────

function requestPushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

function sendPushNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: '/favicon.ico', tag: 'menius-order' }); } catch {/* failed */}
}

// ─── CounterView ─────────────────────────────────────────────────────────────

interface CounterViewProps {
  initialOrders:  Order[];
  restaurantId:   string;
  restaurantName: string;
  currency:       string;
}

export function CounterView({ initialOrders, restaurantId, restaurantName, currency }: CounterViewProps) {
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [eta, setEta]                   = useState(15);
  const [editingEta, setEditingEta]     = useState(false);
  const [isUpdating, setIsUpdating]     = useState(false);
  const [autoConfig, setAutoConfig]     = useState<AutoAcceptConfig>(AutoAcceptService.config);
  const [showSettings, setShowSettings] = useState(false);
  const [splashOrder, setSplashOrder]   = useState<Order | null>(null);
  const [, tick]                        = useState(0);
  const urgentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { requestPushPermission(); }, []);

  useEffect(() => { return AutoAcceptService.subscribe(setAutoConfig); }, []);

  const handleNewOrder = useCallback((order: Order) => {
    playBeep();
    sendPushNotification(
      '🔔 Nueva orden · ' + restaurantName,
      `${order.customer_name || 'Cliente'} · #${order.order_number} · ${fmt(order.total, currency)}`
    );
    setSplashOrder(order);
    setActiveId(order.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantName, currency]);

  const { orders } = useRealtimeOrders({ restaurantId, initialOrders, onNewOrder: handleNewOrder });

  const queue      = orders.filter(o => o.status === 'pending')
                           .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const inProgress = orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status));

  const displayed = activeId
    ? (orders.find(o => o.id === activeId) ?? queue[0] ?? inProgress[0] ?? null)
    : (queue[0] ?? inProgress[0] ?? null);

  // SLA: urgent beep when pending order crosses threshold
  useEffect(() => {
    queue.forEach(o => {
      if (elapsed(o.created_at) >= SLA_WARN_MINS && !urgentRef.current.has(o.id)) {
        urgentRef.current.add(o.id);
        playUrgentBeep();
        sendPushNotification(
          '⚠️ Orden sin atender · ' + restaurantName,
          `#${o.order_number} lleva más de ${SLA_WARN_MINS} min esperando`
        );
      }
    });
  });

  // Auto-accept
  useEffect(() => {
    const firstNew = queue[0];
    if (!firstNew || !AutoAcceptService.shouldAutoAccept(firstNew, orders)) return;
    (async () => {
      await updateOrderETA(firstNew.id, AutoAcceptService.config.defaultEtaMinutes).catch(() => {});
      await updateOrderStatus(firstNew.id, 'confirmed').catch(() => {});
      PrinterService.printOrder(firstNew, AutoAcceptService.config.defaultEtaMinutes, restaurantName, currency).catch(() => {});
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.map(o => o.id).join(',')]);

  const handleAction = useCallback(async (order: Order, to: CounterStatus) => {
    const sm = OrderStateMachine.create(order.status);
    if (!sm.canTransition(to)) return;
    setIsUpdating(true);
    try {
      if (to === 'ACCEPTED') await updateOrderETA(order.id, eta).catch(() => {});
      await updateOrderStatus(order.id, OrderStateMachine.toDB(to));
      if (to === 'ACCEPTED') PrinterService.printOrder(order, eta, restaurantName, currency).catch(() => {});
      if (to === 'ACCEPTED' || to === 'REJECTED') {
        const remaining = queue.filter(o => o.id !== order.id);
        setActiveId(remaining[0]?.id ?? null);
        setEditingEta(false);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [eta, queue, restaurantName, currency]);

  const dismissSplash = () => setSplashOrder(null);

  return (
    <div className="h-screen w-full bg-[#F2F2F2] flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex-none h-11 bg-white border-b border-[#E8E8E8] flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN }} />
          <span className="text-[#111111] text-xs font-semibold">{restaurantName}</span>
          <span className="text-[#BBBBBB] text-xs">· Counter</span>
        </div>
        <div className="flex items-center gap-3">
          {queue.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full animate-pulse"
              style={{ background: GREEN + '22', color: GREEN }}>
              {queue.length} {queue.length === 1 ? 'nueva' : 'nuevas'}
            </span>
          )}
          <button onClick={() => setShowSettings(s => !s)}
            className="text-[#AAAAAA] hover:text-[#111111] transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Settings panel ── */}
      {showSettings && (
        <AutoAcceptPanel config={autoConfig} onClose={() => setShowSettings(false)} />
      )}

      {/* ── New order splash ── */}
      {splashOrder && (
        <NewOrderSplash
          order={splashOrder}
          currency={currency}
          onReview={dismissSplash}
        />
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {displayed ? (
          <OrderCard
            key={displayed.id}
            order={displayed}
            currency={currency}
            restaurantName={restaurantName}
            eta={eta}
            editingEta={editingEta}
            isUpdating={isUpdating}
            isUrgent={displayed.status === 'pending' && elapsed(displayed.created_at) >= SLA_WARN_MINS}
            onSetEta={setEta}
            onToggleEditEta={() => setEditingEta(e => !e)}
            onAction={handleAction}
            onDismiss={() => {
              const next = queue.find(o => o.id !== displayed.id) ?? inProgress.find(o => o.id !== displayed.id);
              setActiveId(next?.id ?? null);
            }}
          />
        ) : (
          <IdleState restaurantName={restaurantName} />
        )}
      </div>

      {/* ── Bottom queue bar ── */}
      {(queue.length > 1 || inProgress.length > 0) && (
        <div className="flex-none bg-white border-t border-[#E8E8E8] px-4 py-2.5">
          <div className="flex gap-2 overflow-x-auto">
            {queue.filter(o => o.id !== displayed?.id).map(o => (
              <QueueCard key={o.id} order={o} currency={currency}
                isUrgent={elapsed(o.created_at) >= SLA_WARN_MINS}
                label="Pendiente"
                onClick={() => setActiveId(o.id)} />
            ))}
            {inProgress.filter(o => o.id !== displayed?.id).map(o => (
              <QueueCard key={o.id} order={o} currency={currency}
                isUrgent={false}
                label={ORDER_TYPES[o.order_type ?? 'dine_in'] ?? ''}
                onClick={() => setActiveId(o.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NewOrderSplash ───────────────────────────────────────────────────────────

function NewOrderSplash({ order, currency, onReview }: {
  order: Order; currency: string; onReview: () => void;
}) {
  const totalQty = (order.items ?? []).reduce((s, i) => s + i.qty, 0);
  const typeLabel = ORDER_TYPES[order.order_type ?? 'dine_in'] ?? '';

  // Auto-dismiss after 8s
  useEffect(() => {
    const t = setTimeout(onReview, 8_000);
    return () => clearTimeout(t);
  }, [onReview]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: GREEN }}
    >
      {/* Bell icon */}
      <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-6 animate-bounce">
        <Bell className="w-10 h-10 text-white" />
      </div>

      {/* Title */}
      <p className="text-white/80 text-lg font-semibold uppercase tracking-widest mb-2">
        Nueva orden
      </p>

      {/* Customer + order */}
      <p className="text-white font-black mb-1" style={{ fontSize: 48, lineHeight: 1.1 }}>
        {order.customer_name || 'Cliente'}
      </p>
      <p className="text-white/80 text-2xl font-bold mb-1">
        #{order.order_number}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-white/70 text-base mt-1 mb-2">
        <span>{totalQty} {totalQty === 1 ? 'producto' : 'productos'}</span>
        {typeLabel && <><span>·</span><span>{typeLabel}</span></>}
      </div>

      {/* Total */}
      <p className="text-white font-black mt-2" style={{ fontSize: 40 }}>
        {fmt(order.total, currency)}
      </p>

      {/* CTA */}
      <button
        onClick={onReview}
        className="mt-10 h-16 px-12 rounded-2xl bg-white font-extrabold text-xl flex items-center gap-3 shadow-xl active:scale-[0.97] transition-transform"
        style={{ color: GREEN }}
      >
        Ver orden <ChevronRight className="w-6 h-6" />
      </button>

      <p className="text-white/50 text-xs mt-5">
        Se cierra automáticamente en 8 segundos
      </p>
    </div>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({
  order, currency, restaurantName, eta, editingEta, isUpdating, isUrgent,
  onSetEta, onToggleEditEta, onAction, onDismiss,
}: {
  order: Order;
  currency: string;
  restaurantName: string;
  eta: number;
  editingEta: boolean;
  isUpdating: boolean;
  isUrgent: boolean;
  onSetEta: (v: number) => void;
  onToggleEditEta: () => void;
  onAction: (order: Order, to: CounterStatus) => void;
  onDismiss: () => void;
}) {
  const sm         = OrderStateMachine.create(order.status);
  const isPending  = order.status === 'pending';
  const isReady    = order.status === 'ready';
  const isComplete = sm.isTerminal;
  const mins       = elapsed(order.created_at);
  const totalQty   = (order.items ?? []).reduce((s, i) => s + i.qty, 0);

  const etaMins   = order.estimated_ready_minutes;
  const countdown = etaMins != null ? etaMins - mins : null;
  const isLate    = countdown !== null && countdown <= 0;

  const headerColor = isPending && isUrgent ? '#EF4444' : GREEN;

  const subtotal = (order.items ?? []).reduce(
    (s, i) => s + (i.line_total ?? i.unit_price * i.qty), 0
  );
  const typeLabel = ORDER_TYPES[order.order_type ?? 'dine_in'] ?? '';

  const nextAction: Record<string, { to: CounterStatus; label: string }> = {
    confirmed: { to: 'PREPARING', label: 'En preparación' },
    preparing: { to: 'READY',     label: 'Marcar lista' },
    ready:     { to: 'COMPLETED', label: 'Entregado' },
  };
  const next = nextAction[order.status];

  // WhatsApp message for "order ready"
  const waReadyMsg = order.customer_phone
    ? waLink(
        order.customer_phone,
        `Hola ${order.customer_name || 'cliente'}, tu orden #${order.order_number} está lista ✅ Puedes pasar a recogerla.`
      )
    : null;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">

      {/* ── HEADER ── */}
      <div
        className={cn('flex items-center justify-between px-5 py-4 flex-none transition-colors duration-500',
          isPending && isUrgent ? 'animate-pulse' : '')}
        style={{ background: headerColor }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onDismiss}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-none transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-extrabold text-xl leading-tight truncate max-w-[200px]">
                {order.customer_name || 'Cliente'}
              </span>
              <span className="text-white/70 font-light text-xl">·</span>
              <span className="text-white font-bold text-base">#{order.order_number}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-xs mt-0.5 flex-wrap">
              <span>{totalQty} {totalQty === 1 ? 'producto' : 'productos'}</span>
              {typeLabel && <><span>·</span><span>{typeLabel}</span></>}
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mins} min</span>
              {isPending && isUrgent && (
                <span className="bg-white/25 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px] uppercase">
                  ¡Urgente!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact + status */}
        <div className="flex items-center gap-2 flex-none">
          {/* WhatsApp — abre chat sin salir del counter */}
          {order.customer_phone && (
            <a href={waLink(order.customer_phone, `Hola ${order.customer_name || ''}`)}
              target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="WhatsApp">
              <MessageCircle className="w-4 h-4 text-white" />
            </a>
          )}
          {/* Email */}
          {order.customer_email && (
            <a href={`mailto:${order.customer_email}`}
              target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Email">
              <Mail className="w-4 h-4 text-white" />
            </a>
          )}
          {!isPending && <StatusBadge status={sm.status} />}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: items */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[#EEEEEE]">
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
            {(order.items ?? []).map((item, idx) => (
              <ItemRow key={item.id ?? idx} item={item} currency={currency} />
            ))}

            {order.notes && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-amber-700 text-[11px] font-bold uppercase tracking-wide mb-1">Nota del cliente</p>
                <p className="text-amber-800 text-sm leading-relaxed">{order.notes}</p>
              </div>
            )}

            {order.delivery_address && (
              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wide mb-1">Dirección de entrega</p>
                <p className="text-gray-700 text-sm">{order.delivery_address}</p>
              </div>
            )}
          </div>

          {/* Price summary */}
          <div className="flex-none px-5 py-3 border-t border-[#EEEEEE] bg-[#FAFAFA]">
            <div className="flex justify-between text-sm text-[#888888] mb-1">
              <span>Subtotal</span>
              <span>{fmt(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#111111] font-bold text-sm">Total</span>
              <span className="text-[#111111] font-black text-2xl">{fmt(order.total, currency)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: ETA + actions */}
        <div className="w-[240px] flex-none flex flex-col">

          {/* ETA / countdown */}
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 border-b border-[#EEEEEE]">
            {isPending ? (
              <>
                <p className="text-[#888888] text-[11px] font-bold uppercase tracking-widest mb-3">
                  Tiempo estimado
                </p>
                <p className="font-black leading-none" style={{ fontSize: 80, color: '#111111' }}>
                  {eta}
                </p>
                <p className="text-[#888888] text-sm font-semibold mt-1">min</p>
                <button onClick={onToggleEditEta}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E0E0E0] text-[#666666] hover:border-gray-400 hover:text-[#111111] transition-colors">
                  <Edit2 className="w-3 h-3" />
                  {editingEta ? 'Cerrar' : 'Editar'}
                </button>
                {editingEta && (
                  <div className="mt-3 grid grid-cols-4 gap-1.5 w-full">
                    {ETA_OPTS.map(v => (
                      <button key={v}
                        onClick={() => { onSetEta(v); onToggleEditEta(); }}
                        className={cn('py-1.5 rounded-lg text-xs font-bold border transition-all',
                          eta === v ? 'text-white border-transparent' : 'bg-white border-[#E0E0E0] text-[#666666] hover:border-gray-400')}
                        style={eta === v ? { background: GREEN, borderColor: GREEN } : {}}>
                        {v}m
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : countdown !== null ? (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
                  style={{ color: isLate ? '#EF4444' : '#888888' }}>
                  {isLate ? '¡Atrasado!' : 'Tiempo restante'}
                </p>
                <p className="font-black leading-none"
                  style={{ fontSize: 80, color: isLate ? '#EF4444' : '#111111' }}>
                  {isLate ? Math.abs(countdown) : countdown}
                </p>
                <p className="text-sm font-semibold mt-1"
                  style={{ color: isLate ? '#EF4444' : '#888888' }}>
                  {isLate ? 'min de retraso' : 'min restantes'}
                </p>
              </>
            ) : (
              <>
                <p className="text-[#888888] text-[11px] font-bold uppercase tracking-widest mb-3">
                  En proceso
                </p>
                <p className="font-black leading-none" style={{ fontSize: 80, color: '#111111' }}>
                  {mins}
                </p>
                <p className="text-[#888888] text-sm font-semibold mt-1">min</p>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex-none p-4 space-y-2.5">
            {isComplete ? (
              <CompletedBadge status={sm.status} />
            ) : isPending ? (
              <>
                {/* ACCEPT — big green */}
                <button
                  disabled={isUpdating}
                  onClick={() => onAction(order, 'ACCEPTED')}
                  className="w-full h-16 rounded-2xl text-white text-lg font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: isUpdating ? '#aaa' : GREEN }}
                  onMouseEnter={e => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = GREEN_D; }}
                  onMouseLeave={e => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = GREEN; }}
                >
                  {isUpdating
                    ? <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Check className="w-6 h-6" /> Aceptar</>
                  }
                </button>

                {/* REJECT — subtle */}
                <button
                  disabled={isUpdating}
                  onClick={() => onAction(order, 'REJECTED')}
                  className="w-full h-10 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-red-100 transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar orden
                </button>
              </>
            ) : next ? (
              <>
                {/* Notify customer via WhatsApp when ready */}
                {isReady && waReadyMsg && (
                  <a href={waReadyMsg} target="_blank" rel="noopener noreferrer"
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold border-2 transition-all active:scale-[0.97]"
                    style={{ background: '#DCFCE7', borderColor: '#86EFAC', color: '#15803D' }}>
                    <MessageCircle className="w-4 h-4" />
                    Avisar al cliente (WhatsApp)
                  </a>
                )}

                {/* Print */}
                <button
                  onClick={() => PrinterService.printOrder(order, etaMins ?? eta, restaurantName, currency).catch(() => {})}
                  className="w-full h-9 rounded-xl border border-[#E0E0E0] bg-white text-[#666666] text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-gray-400 hover:text-[#111111] transition-all">
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir ticket
                </button>

                {/* Next state */}
                <button
                  disabled={isUpdating}
                  onClick={() => onAction(order, next.to)}
                  className="w-full h-14 rounded-xl text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: isUpdating ? '#aaa' : GREEN }}
                  onMouseEnter={e => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = GREEN_D; }}
                  onMouseLeave={e => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = GREEN; }}
                >
                  {isUpdating
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><ChevronRight className="w-5 h-5" />{next.label}</>
                  }
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ItemRow ─────────────────────────────────────────────────────────────────

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
    <div className="flex items-start gap-3 py-3.5 border-b border-[#F2F2F2] last:border-0">
      {/* Qty box */}
      <span className="flex-none w-8 h-8 rounded-lg border-2 border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-center text-sm font-black text-[#111111]">
        {item.qty}
      </span>
      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-[#111111] text-sm font-bold leading-tight">{item.product?.name ?? '—'}</p>
        {modifiers.map((m, i) => (
          <p key={i} className="text-[#888888] text-xs mt-0.5">— {m}</p>
        ))}
        {item.notes && (
          <p className="text-amber-600 text-xs mt-0.5 italic">★ {item.notes}</p>
        )}
      </div>
      {/* Price */}
      <span className="flex-none text-sm font-bold text-[#111111]">
        {fmt(item.line_total ?? item.unit_price * item.qty, currency)}
      </span>
    </div>
  );
}

// ─── QueueCard ───────────────────────────────────────────────────────────────

function QueueCard({ order, currency, isUrgent, label, onClick }: {
  order: Order; currency: string; isUrgent: boolean; label: string; onClick: () => void;
}) {
  const mins = elapsed(order.created_at);
  return (
    <button onClick={onClick}
      className={cn(
        'flex-none w-44 bg-white rounded-xl border-2 px-3 py-2 text-left transition-all active:scale-[0.97] shadow-sm',
        isUrgent ? 'border-red-400 animate-pulse' : 'border-[#EEEEEE] hover:border-[#06C167]'
      )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#111111] text-xs font-black truncate">#{order.order_number}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 flex-none"
          style={isUrgent
            ? { background: '#FEE2E2', color: '#EF4444' }
            : { background: '#06C16720', color: '#059254' }}>
          {isUrgent ? '¡Urgente!' : label}
        </span>
      </div>
      <p className="text-[#888888] text-xs truncate">{order.customer_name || 'Cliente'}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[#111111] text-xs font-bold">{fmt(order.total, currency)}</span>
        <span className={cn('text-[10px]', isUrgent ? 'text-red-500 font-bold' : 'text-[#AAAAAA]')}>{mins}m</span>
      </div>
    </button>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<CounterStatus, { bg: string; text: string; label: string }> = {
  NEW:       { bg: '#FFF7ED', text: '#C2410C', label: 'Nueva' },
  ACCEPTED:  { bg: '#F0FDF4', text: '#166534', label: 'Aceptada' },
  PREPARING: { bg: '#EFF6FF', text: '#1D4ED8', label: 'En cocina' },
  READY:     { bg: '#F0FDF4', text: '#059669', label: 'Lista ✓' },
  COMPLETED: { bg: '#F9FAFB', text: '#6B7280', label: 'Entregada' },
  REJECTED:  { bg: '#FFF1F2', text: '#BE123C', label: 'Rechazada' },
};

function StatusBadge({ status }: { status: CounterStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

function CompletedBadge({ status }: { status: CounterStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <div className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
      style={{ background: s.bg }}>
      {status === 'COMPLETED'
        ? <><Check className="w-4 h-4" style={{ color: s.text }} /><span className="text-sm font-bold" style={{ color: s.text }}>Entregada</span></>
        : <><XCircle className="w-4 h-4" style={{ color: s.text }} /><span className="text-sm font-bold" style={{ color: s.text }}>Rechazada</span></>
      }
    </div>
  );
}

// ─── IdleState ────────────────────────────────────────────────────────────────

function IdleState({ restaurantName }: { restaurantName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5">
      <div className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: GREEN + '18' }}>
        <ChefHat className="w-12 h-12" style={{ color: GREEN }} />
      </div>
      <div className="text-center">
        <p className="text-[#111111] text-2xl font-extrabold">{restaurantName}</p>
        <p className="text-[#888888] text-base mt-1">Esperando órdenes…</p>
        <p className="text-[#BBBBBB] text-sm mt-1 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: GREEN }} />
          Conectado en tiempo real
        </p>
      </div>
    </div>
  );
}

// ─── AutoAcceptPanel ──────────────────────────────────────────────────────────

function AutoAcceptPanel({ config, onClose }: { config: AutoAcceptConfig; onClose: () => void }) {
  const [local, setLocal] = useState(config);
  const save = () => { AutoAcceptService.update(local); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: GREEN }} />
            <span className="text-[#111111] font-bold text-sm">Configuración del Counter</span>
          </div>
          <button onClick={onClose} className="text-[#AAAAAA] hover:text-[#111111]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Auto-accept toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#111111] text-sm font-semibold">Auto-aceptar órdenes</p>
              <p className="text-[#AAAAAA] text-xs">Acepta automáticamente al llegar</p>
            </div>
            <button onClick={() => setLocal(p => ({ ...p, enabled: !p.enabled }))}
              className="w-11 h-6 rounded-full flex items-center px-0.5 transition-colors"
              style={{ background: local.enabled ? GREEN : '#E0E0E0' }}>
              <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: local.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          <div>
            <label className="text-[#111111] text-xs font-semibold block mb-1.5">Máx. órdenes simultáneas</label>
            <input type="number" value={local.maxConcurrentOrders} min={1} max={50}
              onChange={e => setLocal(p => ({ ...p, maxConcurrentOrders: Number(e.target.value) }))}
              className="w-full h-10 border border-[#E0E0E0] rounded-lg px-3 text-sm text-[#111111] focus:outline-none focus:border-[#06C167]" />
          </div>

          <div>
            <label className="text-[#111111] text-xs font-semibold block mb-1.5">Valor mínimo de orden</label>
            <input type="number" value={local.minOrderValue} min={0}
              onChange={e => setLocal(p => ({ ...p, minOrderValue: Number(e.target.value) }))}
              className="w-full h-10 border border-[#E0E0E0] rounded-lg px-3 text-sm text-[#111111] focus:outline-none focus:border-[#06C167]" />
          </div>

          <div>
            <label className="text-[#111111] text-xs font-semibold block mb-1.5">ETA por defecto (minutos)</label>
            <input type="number" value={local.defaultEtaMinutes} min={1} max={120}
              onChange={e => setLocal(p => ({ ...p, defaultEtaMinutes: Number(e.target.value) }))}
              className="w-full h-10 border border-[#E0E0E0] rounded-lg px-3 text-sm text-[#111111] focus:outline-none focus:border-[#06C167]" />
          </div>

          {/* Push notifications */}
          <div>
            <label className="text-[#111111] text-xs font-semibold block mb-1.5">Notificaciones del navegador</label>
            <button onClick={requestPushPermission}
              className="w-full h-9 rounded-lg border border-[#E0E0E0] bg-[#FAFAFA] text-[#666666] text-xs font-semibold hover:border-gray-400 hover:text-[#111111] transition-all">
              {typeof window !== 'undefined' && 'Notification' in window
                ? Notification.permission === 'granted' ? '✓ Notificaciones activadas' : 'Activar notificaciones'
                : 'No disponible en este navegador'}
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button onClick={save}
            className="w-full h-11 rounded-xl text-white text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: GREEN }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
