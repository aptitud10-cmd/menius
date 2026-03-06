'use client';

/**
 * CounterView — Restaurant delivery counter, Uber Eats / GrubHub style.
 *
 * Layout (single order card, full-screen tablet):
 *
 *  ┌──────────────────── GREEN HEADER ──────────────────┐
 *  │  [×]  Kay A. • #AFB95   3 items  Delivery  [📞][✉] │
 *  ├──────────────────────────────┬─────────────────────┤
 *  │  ITEMS                       │  Ready time         │
 *  │  1× Alpine Burger Deluxe     │                     │
 *  │     - Well Done   $15.95     │     15 min          │
 *  │  1× Apple Pie                │                     │
 *  │     - A la mode    $6.95     │  [ Edit time ]      │
 *  │  1× Assorted Soda            ├─────────────────────┤
 *  │     - Sprite       $3.45     │  [Adjust order]     │
 *  ├──────────────────────────────│                     │
 *  │  Subtotal   $32.10           │  [  Accept   ]      │
 *  │  Tax         $0.00           │                     │
 *  └──────────────────────────────┴─────────────────────┘
 *
 *  Queue strip below: shows other pending orders.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Phone, Mail, ChevronRight, Edit2, Check, XCircle, Clock, Printer, Settings, Zap, ChefHat } from 'lucide-react';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { updateOrderStatus, updateOrderETA } from '@/lib/actions/restaurant';
import { OrderStateMachine, type CounterStatus } from '@/lib/counter/OrderStateMachine';
import { AutoAcceptService, type AutoAcceptConfig } from '@/lib/counter/AutoAcceptService';
import { PrinterService } from '@/lib/printing/PrinterService';
import type { Order, OrderItem } from '@/types';
import { cn } from '@/lib/utils';

// ─── Brand ───────────────────────────────────────────────────────────────────

const GREEN   = '#06C167';
const GREEN_D = '#059254'; // darker green for hover

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

const ORDER_TYPES: Record<string, string> = {
  delivery: 'Delivery',
  pickup:   'Para recoger',
  dine_in:  'En mesa',
};

const ETA_OPTS = [5, 10, 15, 20, 25, 30, 45, 60] as const;

function playBeep() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {/* AudioContext unavailable */}
}

function playUrgentBeep() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [440, 480, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'square';
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  } catch {/* AudioContext unavailable */}
}

function requestPushPermission() {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendPushNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag: 'menius-order' });
  } catch {/* notification failed */}
}

// Minutes elapsed since SLA breach threshold
const SLA_WARN_MINS = 3;

// ─── CounterView ─────────────────────────────────────────────────────────────

interface CounterViewProps {
  initialOrders: Order[];
  restaurantId:  string;
  restaurantName: string;
  currency:      string;
}

export function CounterView({ initialOrders, restaurantId, restaurantName, currency }: CounterViewProps) {
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [eta, setEta]                     = useState(15);
  const [editingEta, setEditingEta]       = useState(false);
  const [isUpdating, setIsUpdating]       = useState(false);
  const [autoConfig, setAutoConfig]       = useState<AutoAcceptConfig>(AutoAcceptService.config);
  const [showSettings, setShowSettings]   = useState(false);
  const [flashNew, setFlashNew]           = useState(false);
  const [, tick]                          = useState(0);
  const soundRef    = useRef(true);
  const urgentRef   = useRef<Set<string>>(new Set());

  // Tick every second for countdown + SLA timer
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  // Request browser push permission on first render
  useEffect(() => { requestPushPermission(); }, []);

  // Sync AutoAcceptService config changes
  useEffect(() => {
    return AutoAcceptService.subscribe(setAutoConfig);
  }, []);

  const handleNewOrder = useCallback((order: Order) => {
    if (soundRef.current) playBeep();
    sendPushNotification(
      'Nueva orden · ' + restaurantName,
      `${order.customer_name || 'Cliente'} · #${order.order_number}`
    );
    setFlashNew(true);
    setTimeout(() => setFlashNew(false), 3_000);
    // Auto-open if no active order selected
    setActiveId(prev => prev ?? order.id);
  }, [restaurantName]);

  const { orders } = useRealtimeOrders({ restaurantId, initialOrders, onNewOrder: handleNewOrder });

  // Pending (NEW) orders sorted oldest-first
  const queue = orders
    .filter(o => o.status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Active in-progress orders (not pending, not terminal)
  const inProgress = orders.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status));

  // Show oldest pending first; fall back to in-progress
  const displayed = activeId
    ? (orders.find(o => o.id === activeId) ?? queue[0] ?? inProgress[0] ?? null)
    : (queue[0] ?? inProgress[0] ?? null);

  // SLA: beep again when a pending order crosses the warn threshold
  useEffect(() => {
    queue.forEach(o => {
      const mins = elapsed(o.created_at);
      if (mins >= SLA_WARN_MINS && !urgentRef.current.has(o.id)) {
        urgentRef.current.add(o.id);
        playUrgentBeep();
        sendPushNotification(
          '⚠️ Orden sin atender · ' + restaurantName,
          `#${o.order_number} lleva más de ${SLA_WARN_MINS} min esperando`
        );
      }
    });
  });

  // Auto-accept logic: run whenever queue changes
  useEffect(() => {
    const firstNew = queue[0];
    if (!firstNew) return;
    if (!AutoAcceptService.shouldAutoAccept(firstNew, orders)) return;

    // Auto-accept
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
      if (to === 'ACCEPTED') {
        await updateOrderETA(order.id, eta).catch(() => {});
      }
      await updateOrderStatus(order.id, OrderStateMachine.toDB(to));

      if (to === 'ACCEPTED') {
        PrinterService.printOrder(order, eta, restaurantName, currency).catch(() => {});
      }

      // If accepted/rejected, advance to next pending
      if (to === 'ACCEPTED' || to === 'REJECTED') {
        const remaining = queue.filter(o => o.id !== order.id);
        setActiveId(remaining[0]?.id ?? null);
        setEditingEta(false);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [eta, queue, restaurantName, currency]);

  return (
    <div className="min-h-screen w-full bg-[#F0F0F0] flex flex-col">

      {/* ── Top status bar ── */}
      <div className="flex-none h-11 bg-white border-b border-[#E8E8E8] flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: GREEN }}
          />
          <span className="text-[#111111] text-xs font-semibold tracking-wide">{restaurantName}</span>
          <span className="text-[#999999] text-xs">· Counter</span>
        </div>
        <div className="flex items-center gap-3">
          {queue.length > 0 && (
            <span
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-full',
                flashNew ? 'animate-pulse' : ''
              )}
              style={{ background: GREEN + '22', color: GREEN }}
            >
              {queue.length} {queue.length === 1 ? 'nueva orden' : 'nuevas órdenes'}
            </span>
          )}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="text-[#999999] hover:text-[#111111] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Settings panel (slide-in) ── */}
      {showSettings && (
        <AutoAcceptPanel
          config={autoConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">

        {displayed ? (
          <OrderCard
            key={displayed.id}
            order={displayed}
            currency={currency}
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

        {/* ── Queue strip ── */}
        {queue.length > 1 && (
          <div className="w-full max-w-3xl">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
              En espera — {queue.length - 1} más
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {queue
                .filter(o => o.id !== displayed?.id)
                .map(o => (
                  <QueueCard
                    key={o.id}
                    order={o}
                    currency={currency}
                    isUrgent={elapsed(o.created_at) >= SLA_WARN_MINS}
                    onClick={() => setActiveId(o.id)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* In-progress strip */}
        {inProgress.length > 0 && (
          <div className="w-full max-w-3xl">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
              En preparación — {inProgress.length}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {inProgress.map(o => (
                <QueueCard
                  key={o.id}
                  order={o}
                  currency={currency}
                  isUrgent={false}
                  onClick={() => setActiveId(o.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({
  order, currency, eta, editingEta, isUpdating, isUrgent,
  onSetEta, onToggleEditEta, onAction, onDismiss,
}: {
  order: Order;
  currency: string;
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
  const isComplete = sm.isTerminal;
  const mins       = elapsed(order.created_at);
  const totalQty   = (order.items ?? []).reduce((s, i) => s + i.qty, 0);

  // Countdown for accepted/preparing orders
  const etaMins     = order.estimated_ready_minutes;
  const countdown   = etaMins != null ? etaMins - mins : null;
  const isLate      = countdown !== null && countdown <= 0;
  const headerColor = isPending && isUrgent ? '#EF4444' : GREEN;

  const subtotal = (order.items ?? []).reduce(
    (s, i) => s + (i.line_total ?? i.unit_price * i.qty),
    0
  );

  const typeLabel = ORDER_TYPES[order.order_type ?? 'dine_in'] ?? '';

  // Next action for non-pending active orders
  const nextAction: Record<string, { to: CounterStatus; label: string }> = {
    confirmed: { to: 'PREPARING', label: 'Enviando a cocina' },
    preparing: { to: 'READY',     label: 'Marcar listo' },
    ready:     { to: 'COMPLETED', label: 'Entregado' },
  };
  const next = nextAction[order.status];

  return (
    <div
      className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-xl"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.12)' }}
    >
      {/* ── HEADER ── */}
      <div
        className={cn(
          'flex items-center justify-between px-5 py-3.5 transition-colors duration-500',
          isPending && isUrgent ? 'animate-pulse' : ''
        )}
        style={{ background: headerColor }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-none transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-extrabold text-lg leading-tight truncate max-w-[160px]">
                {order.customer_name || 'Cliente'}
              </span>
              <span className="text-white/70 font-light text-lg">•</span>
              <span className="text-white font-bold text-base">#{order.order_number}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-xs mt-0.5">
              <span>{totalQty} items</span>
              {typeLabel && <><span>·</span><span>{typeLabel}</span></>}
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{mins} min
              </span>
              {isPending && isUrgent && (
                <span className="bg-white/25 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide">
                  ¡Urgente!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact icons */}
        <div className="flex items-center gap-2 flex-none">
          {order.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <Phone className="w-4 h-4 text-white" />
            </a>
          )}
          {order.customer_email && (
            <a
              href={`mailto:${order.customer_email}`}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <Mail className="w-4 h-4 text-white" />
            </a>
          )}
          {/* Status badge for non-pending */}
          {!isPending && (
            <StatusBadge status={sm.status} />
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex" style={{ minHeight: 320 }}>

        {/* LEFT: items + pricing */}
        <div className="flex-1 flex flex-col border-r border-[#E8E8E8]">

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
            {(order.items ?? []).map((item, idx) => (
              <ItemRow key={item.id ?? idx} item={item} currency={currency} />
            ))}

            {order.notes && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-amber-700 text-xs font-bold uppercase tracking-wide mb-1">Nota especial</p>
                <p className="text-amber-800 text-sm leading-relaxed">{order.notes}</p>
              </div>
            )}

            {order.delivery_address && (
              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">Dirección</p>
                <p className="text-gray-700 text-sm">{order.delivery_address}</p>
              </div>
            )}
          </div>

          {/* Price summary */}
          <div className="flex-none px-5 py-3 border-t border-[#E8E8E8] bg-[#FAFAFA]">
            <div className="flex justify-between text-sm text-[#666666] mb-1">
              <span>Subtotal</span>
              <span>{fmt(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#111111] font-bold text-sm">Total</span>
              <span className="text-[#111111] font-black text-xl">{fmt(order.total, currency)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: ETA + actions */}
        <div className="w-[220px] flex-none flex flex-col">

          {/* Ready time block */}
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 border-b border-[#E8E8E8]">
            {isPending ? (
              <>
                <p className="text-[#666666] text-xs font-bold uppercase tracking-widest mb-3">
                  Ready time
                </p>
                <p className="font-black leading-none" style={{ fontSize: 72, color: '#111111' }}>
                  {eta}
                </p>
                <p className="text-[#666666] text-sm font-semibold mt-1">min</p>

                {/* ETA edit */}
                <button
                  onClick={onToggleEditEta}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E0E0E0] text-[#666666] hover:border-gray-400 hover:text-[#111111] transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  {editingEta ? 'Cerrar' : 'Editar'}
                </button>

                {/* ETA chip grid */}
                {editingEta && (
                  <div className="mt-3 grid grid-cols-4 gap-1.5 w-full">
                    {ETA_OPTS.map(v => (
                      <button
                        key={v}
                        onClick={() => { onSetEta(v); onToggleEditEta(); }}
                        className={cn(
                          'py-1.5 rounded-lg text-xs font-bold border transition-all',
                          eta === v
                            ? 'text-white border-transparent'
                            : 'bg-white border-[#E0E0E0] text-[#666666] hover:border-gray-400'
                        )}
                        style={eta === v ? { background: GREEN, borderColor: GREEN } : {}}
                      >
                        {v}m
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : countdown !== null ? (
              /* ETA countdown for accepted/preparing orders */
              <>
                <p className="text-[#666666] text-xs font-bold uppercase tracking-widest mb-3">
                  {isLate ? 'Atrasado' : 'Tiempo restante'}
                </p>
                <p
                  className="font-black leading-none"
                  style={{ fontSize: 72, color: isLate ? '#EF4444' : '#111111' }}
                >
                  {isLate ? '0' : countdown}
                </p>
                <p
                  className="text-sm font-semibold mt-1"
                  style={{ color: isLate ? '#EF4444' : '#666666' }}
                >
                  {isLate ? '¡TARDE!' : 'min'}
                </p>
                {isLate && (
                  <span className="mt-2 text-[10px] font-bold text-red-400 animate-pulse">
                    {Math.abs(countdown)} min de retraso
                  </span>
                )}
              </>
            ) : (
              /* Fallback: elapsed time */
              <>
                <p className="text-[#666666] text-xs font-bold uppercase tracking-widest mb-3">
                  Tiempo activo
                </p>
                <p className="font-black leading-none" style={{ fontSize: 72, color: '#111111' }}>
                  {mins}
                </p>
                <p className="text-[#666666] text-sm font-semibold mt-1">min</p>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex-none p-4 space-y-2.5">
            {isComplete ? (
              <CompletedBadge status={sm.status} />
            ) : isPending ? (
              <>
                {/* Adjust order */}
                <button
                  disabled={isUpdating}
                  className="w-full h-12 rounded-xl border-2 border-[#E0E0E0] bg-white text-[#111111] text-sm font-bold flex items-center justify-center gap-2 hover:border-gray-400 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Adjust order
                </button>

                {/* Accept */}
                <button
                  disabled={isUpdating}
                  onClick={() => onAction(order, 'ACCEPTED')}
                  className="w-full h-14 rounded-xl text-white text-base font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: isUpdating ? '#aaa' : GREEN }}
                  onMouseEnter={e => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = GREEN_D; }}
                  onMouseLeave={e => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = GREEN; }}
                >
                  {isUpdating ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Check className="w-5 h-5" /> Accept</>
                  )}
                </button>

                {/* Reject */}
                <button
                  disabled={isUpdating}
                  onClick={() => onAction(order, 'REJECTED')}
                  className="w-full h-10 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-red-100 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </button>
              </>
            ) : next ? (
              <>
                {/* Print */}
                <button
                  onClick={() => PrinterService.printOrder(order, eta, order.customer_name ?? '', currency).catch(() => {})}
                  className="w-full h-10 rounded-xl border border-[#E0E0E0] bg-white text-[#666666] text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-gray-400 hover:text-[#111111] transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>

                {/* Next step */}
                <button
                  disabled={isUpdating}
                  onClick={() => onAction(order, next.to)}
                  className="w-full h-14 rounded-xl text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: isUpdating ? '#aaa' : GREEN }}
                  onMouseEnter={e => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = GREEN_D; }}
                  onMouseLeave={e => { if (!isUpdating) (e.currentTarget as HTMLElement).style.background = GREEN; }}
                >
                  {isUpdating ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><ChevronRight className="w-5 h-5" />{next.label}</>
                  )}
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
  for (const m of mods) {
    if (m.option_name) modifiers.push(m.option_name);
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0F0] last:border-0">
      {/* Qty */}
      <span className="flex-none text-sm font-black text-[#111111] min-w-[24px]">
        {item.qty}×
      </span>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-[#111111] text-sm font-semibold leading-tight">
          {item.product?.name ?? '—'}
        </p>
        {modifiers.map((m, i) => (
          <p key={i} className="text-[#666666] text-xs mt-0.5 leading-snug">
            — {m}
          </p>
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

function QueueCard({ order, currency, isUrgent, onClick }: { order: Order; currency: string; isUrgent: boolean; onClick: () => void }) {
  const mins  = elapsed(order.created_at);
  const label = order.status === 'pending' ? 'Nueva' : ORDER_TYPES[order.order_type ?? 'dine_in'] ?? '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-none w-48 bg-white rounded-xl border-2 p-3 text-left transition-all active:scale-[0.97] shadow-sm',
        isUrgent
          ? 'border-red-400 hover:border-red-500 animate-pulse'
          : 'border-[#E8E8E8] hover:border-[#06C167]'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#111111] text-xs font-black">#{order.order_number}</span>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={isUrgent
            ? { background: '#FEE2E2', color: '#EF4444' }
            : { background: '#06C16720', color: '#059254' }
          }
        >
          {isUrgent ? '¡Urgente!' : label}
        </span>
      </div>
      <p className="text-[#666666] text-xs truncate">{order.customer_name || 'Cliente'}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[#111111] text-sm font-bold">{fmt(order.total, currency)}</span>
        <span className={cn('text-xs', isUrgent ? 'text-red-500 font-bold' : 'text-[#999999]')}>{mins}m</span>
      </div>
    </button>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<CounterStatus, { bg: string; text: string; label: string }> = {
  NEW:       { bg: '#FFF7ED', text: '#C2410C', label: 'Nueva' },
  ACCEPTED:  { bg: '#F0FDF4', text: '#166534', label: 'Aceptada' },
  PREPARING: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Preparando' },
  READY:     { bg: '#F0FDF4', text: '#059669', label: 'Lista' },
  COMPLETED: { bg: '#F9FAFB', text: '#6B7280', label: 'Completada' },
  REJECTED:  { bg: '#FFF1F2', text: '#BE123C', label: 'Rechazada' },
};

function StatusBadge({ status }: { status: CounterStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function CompletedBadge({ status }: { status: CounterStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <div
      className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
      style={{ background: s.bg }}
    >
      {status === 'COMPLETED'
        ? <><Check className="w-4 h-4" style={{ color: s.text }} /><span className="text-sm font-bold" style={{ color: s.text }}>Completada</span></>
        : <><XCircle className="w-4 h-4" style={{ color: s.text }} /><span className="text-sm font-bold" style={{ color: s.text }}>Rechazada</span></>
      }
    </div>
  );
}

// ─── IdleState ────────────────────────────────────────────────────────────────

function IdleState({ restaurantName }: { restaurantName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: GREEN + '15' }}
      >
        <ChefHat className="w-10 h-10" style={{ color: GREEN }} />
      </div>
      <div className="text-center">
        <p className="text-[#111111] text-xl font-extrabold">{restaurantName}</p>
        <p className="text-[#666666] text-base mt-1">Esperando órdenes…</p>
        <p className="text-[#999999] text-sm mt-0.5 flex items-center justify-center gap-1.5">
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

  const save = () => {
    AutoAcceptService.update(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: GREEN }} />
            <span className="text-[#111111] font-bold text-sm">Auto-Accept</span>
          </div>
          <button onClick={onClose} className="text-[#999999] hover:text-[#111111] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#111111] text-sm font-semibold">Activar auto-accept</p>
              <p className="text-[#999999] text-xs">Acepta órdenes automáticamente</p>
            </div>
            <button
              onClick={() => setLocal(p => ({ ...p, enabled: !p.enabled }))}
              className="w-11 h-6 rounded-full flex items-center px-0.5 transition-colors"
              style={{ background: local.enabled ? GREEN : '#E0E0E0' }}
            >
              <span
                className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: local.enabled ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          {/* Max orders */}
          <div>
            <label className="text-[#111111] text-xs font-semibold block mb-1.5">
              Máx. órdenes simultáneas
            </label>
            <input
              type="number"
              value={local.maxConcurrentOrders}
              min={1} max={50}
              onChange={e => setLocal(p => ({ ...p, maxConcurrentOrders: Number(e.target.value) }))}
              className="w-full h-10 border border-[#E0E0E0] rounded-lg px-3 text-sm text-[#111111] focus:outline-none focus:border-[#06C167]"
            />
          </div>

          {/* Min value */}
          <div>
            <label className="text-[#111111] text-xs font-semibold block mb-1.5">
              Valor mínimo de orden
            </label>
            <input
              type="number"
              value={local.minOrderValue}
              min={0}
              onChange={e => setLocal(p => ({ ...p, minOrderValue: Number(e.target.value) }))}
              className="w-full h-10 border border-[#E0E0E0] rounded-lg px-3 text-sm text-[#111111] focus:outline-none focus:border-[#06C167]"
            />
          </div>

          {/* Default ETA */}
          <div>
            <label className="text-[#111111] text-xs font-semibold block mb-1.5">
              ETA por defecto (minutos)
            </label>
            <input
              type="number"
              value={local.defaultEtaMinutes}
              min={1} max={120}
              onChange={e => setLocal(p => ({ ...p, defaultEtaMinutes: Number(e.target.value) }))}
              className="w-full h-10 border border-[#E0E0E0] rounded-lg px-3 text-sm text-[#111111] focus:outline-none focus:border-[#06C167]"
            />
          </div>
        </div>

        {/* Push notifications */}
        <div className="px-5 pb-3">
          <p className="text-[#111111] text-xs font-semibold mb-1.5">Notificaciones del navegador</p>
          <button
            onClick={requestPushPermission}
            className="w-full h-9 rounded-lg border border-[#E0E0E0] bg-[#FAFAFA] text-[#666666] text-xs font-semibold hover:border-gray-400 hover:text-[#111111] transition-all"
          >
            {typeof window !== 'undefined' && 'Notification' in window
              ? Notification.permission === 'granted'
                ? '✓ Notificaciones activadas'
                : 'Activar notificaciones'
              : 'No disponible en este navegador'}
          </button>
        </div>

        {/* Save */}
        <div className="px-5 pb-5">
          <button
            onClick={save}
            className="w-full h-11 rounded-xl text-white text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: GREEN }}
          >
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
  );
}
