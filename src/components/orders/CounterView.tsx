'use client';

/**
 * CounterView — Tablet-first, landscape order reception station.
 * Inspired by Uber Eats / DoorDash merchant apps.
 * Brand: emerald #059669 (active states) · purple #7c3aed (CTAs)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Bell, Printer, CheckCircle2, XCircle, Clock,
  MapPin, Phone, Mail, Volume2, VolumeX,
  ChevronRight, Package, Truck, UtensilsCrossed,
  CreditCard, DollarSign, Timer, Check,
  Zap, Store, ChefHat,
} from 'lucide-react';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { updateOrderStatus, updateOrderETA } from '@/lib/actions/restaurant';
import { PrinterService } from '@/lib/printing/PrinterService';
import type { PrintState } from '@/lib/printing/types';
import type { Order, OrderItem } from '@/types';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────────────

const ETA_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;

const STATUS_PILL: Record<string, string> = {
  pending:   'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  confirmed: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  preparing: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  ready:     'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  delivered: 'bg-gray-500/20 text-gray-400 border border-gray-500/20',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/20',
};

const NEXT_ACTION_STYLE: Record<string, { status: string; colorCls: string }> = {
  confirmed: { status: 'preparing', colorCls: 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/40' },
  preparing: { status: 'ready',     colorCls: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40' },
  ready:     { status: 'delivered', colorCls: 'bg-gray-600 hover:bg-gray-500 shadow-gray-900/40' },
};

const TYPE_ICON: Record<string, React.ElementType> = {
  delivery: Truck,
  pickup:   Package,
  dine_in:  UtensilsCrossed,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function elapsed(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function elapsedColor(mins: number) {
  if (mins >= 20) return 'text-red-400';
  if (mins >= 10) return 'text-amber-400';
  return 'text-gray-500';
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface CounterViewProps {
  initialOrders: Order[];
  restaurantId: string;
  restaurantName: string;
  currency: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CounterView({ initialOrders, restaurantId, restaurantName, currency }: CounterViewProps) {
  const { t } = useDashboardLocale();
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [selectedETA, setSelectedETA] = useState<number>(15);
  const [isUpdating, setIsUpdating]   = useState(false);
  const [autoPrint, setAutoPrint]     = useState(false);
  const [notifWA, setNotifWA]         = useState(true);
  const [notifSMS, setNotifSMS]       = useState(true);
  const [notifEmail, setNotifEmail]   = useState(true);
  const [flashId, setFlashId]         = useState<string | null>(null);
  const [, tick]                      = useState(0);

  type PrintJobEntry = { jobId: string; state: PrintState; error?: string };
  const [printJobs, setPrintJobs] = useState<Record<string, PrintJobEntry>>({});

  useEffect(() => {
    return PrinterService.subscribe((job) => {
      setPrintJobs((prev) => ({
        ...prev,
        [job.orderId]: { jobId: job.id, state: job.state, error: job.error },
      }));
    });
  }, []);

  const { playSound, soundEnabled, setSoundEnabled } = useNotifications({ defaultTitle: 'Counter — MENIUS' });

  // Refresh elapsed times every 30 s
  useEffect(() => {
    const timer = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  const handleNewOrder = useCallback((order: Order) => {
    playSound(order.order_type === 'delivery' ? 'urgent' : 'normal');
    setFlashId(order.id);
    setSelectedId(order.id);
    setTimeout(() => setFlashId(null), 4_000);
  }, [playSound]);

  const { orders } = useRealtimeOrders({ restaurantId, initialOrders, onNewOrder: handleNewOrder });

  const active   = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pending  = active.filter(o => o.status === 'pending');
  const progress = active.filter(o => o.status !== 'pending');
  const selected = orders.find(o => o.id === selectedId) ?? null;

  const handlePrint = useCallback((order: Order) => {
    PrinterService.printOrder(order, selectedETA, restaurantName, currency).catch(() => {});
  }, [selectedETA, restaurantName, currency]);

  const handleRetryPrint = useCallback((jobId: string, order: Order) => {
    PrinterService.retryJob(jobId, order, selectedETA, restaurantName, currency).catch(() => {});
  }, [selectedETA, restaurantName, currency]);

  const handleStatus = useCallback(async (orderId: string, status: string) => {
    setIsUpdating(true);
    try {
      if (status === 'confirmed') {
        await updateOrderETA(orderId, selectedETA).catch(() => {});
      }
      const result = await updateOrderStatus(orderId, status);
      if (!result?.error) {
        if (['confirmed', 'ready', 'delivered'].includes(status)) playSound('success');
        if (status === 'cancelled') setSelectedId(null);
        // Auto-print on confirm
        if (status === 'confirmed' && autoPrint) {
          const orderToPrint = orders.find((o) => o.id === orderId);
          if (orderToPrint) handlePrint(orderToPrint);
        }
      }
    } finally {
      setIsUpdating(false);
    }
  }, [playSound, selectedETA, autoPrint, orders, handlePrint]);

  const isFlashing = flashId !== null;

  return (
    <div className="relative h-screen w-screen bg-gray-950 flex flex-col overflow-hidden select-none">

      {/* ── NEW ORDER flash border ── */}
      {isFlashing && (
        <div
          className="absolute inset-0 z-50 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 6px #059669' }}
        >
          <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="flex-none h-14 bg-[#111827] border-b border-gray-800 flex items-center px-5 gap-4 z-10">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-900/40">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none">
            <p className="text-white text-sm font-bold truncate max-w-[160px]">{restaurantName}</p>
            <p className="text-gray-500 text-[10px] mt-0.5 uppercase tracking-widest">{t.counter_title}</p>
          </div>
        </div>

        {/* Separator */}
        <div className="w-px h-7 bg-gray-800 mx-1 flex-none" />

        {/* Live counters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full flex-none',
              pending.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-gray-700'
            )} />
            <span className="text-white text-lg font-bold leading-none">{pending.length}</span>
            <span className="text-amber-400/80 text-xs font-medium">{t.counter_pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full flex-none',
              progress.length > 0 ? 'bg-purple-400' : 'bg-gray-700'
            )} />
            <span className="text-white text-lg font-bold leading-none">{progress.length}</span>
            <span className="text-purple-400/80 text-xs font-medium">{t.counter_inProgress}</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notification channel toggles */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
          <ToggleChip
            label="WA"
            active={notifWA}
            activeColor="bg-green-600"
            title={t.counter_notifWA}
            onClick={() => setNotifWA(v => !v)}
          />
          <ToggleChip
            label="SMS"
            active={notifSMS}
            activeColor="bg-blue-600"
            title={t.counter_notifSMS}
            onClick={() => setNotifSMS(v => !v)}
          />
          <ToggleChip
            label="✉"
            active={notifEmail}
            activeColor="bg-purple-600"
            title={t.counter_notifEmail}
            onClick={() => setNotifEmail(v => !v)}
          />
        </div>

        {/* Auto-print */}
        <button
          onClick={() => setAutoPrint(v => !v)}
          title={t.counter_autoPrint}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-all',
            autoPrint
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-900/40'
              : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
          )}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{t.counter_autoPrint}</span>
        </button>

        {/* Sound */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={t.counter_sound}
          className={cn(
            'w-8 h-8 rounded-lg border flex items-center justify-center transition-all',
            soundEnabled
              ? 'bg-gray-900 border-gray-700 text-gray-300 hover:text-white'
              : 'bg-gray-900 border-gray-800 text-gray-700 hover:text-gray-500'
          )}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </header>

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ──────────────── LEFT: Order Queue ──────────────── */}
        <aside className="w-[320px] flex-none bg-[#0d1117] border-r border-gray-800/60 flex flex-col overflow-hidden">

          {/* Pending section */}
          {pending.length > 0 && (
            <div className="flex-none">
              <div className="h-9 px-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                  {pending.length} {pending.length > 1 ? t.counter_newOrders : t.counter_newOrder}
                </span>
              </div>
              <div className="divide-y divide-gray-800/50">
                {pending.map(o => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    selected={selectedId === o.id}
                    isNew={flashId === o.id}
                    currency={currency}
                    onClick={() => setSelectedId(o.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In-progress section */}
          {progress.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-9 px-4 bg-gray-800/30 border-b border-gray-800/50 flex items-center gap-2 flex-none">
                <ChefHat className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {t.counter_inProgress} ({progress.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800">
                {progress.map(o => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    selected={selectedId === o.id}
                    isNew={false}
                    currency={currency}
                    onClick={() => setSelectedId(o.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {active.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8">
              <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-gray-400 text-sm font-medium text-center">{t.counter_noOrders}</p>
              <p className="text-gray-700 text-xs text-center leading-relaxed">{t.counter_noOrdersDesc}</p>
            </div>
          )}

          {/* MENIUS footer */}
          <div className="flex-none h-9 border-t border-gray-800/50 flex items-center justify-center gap-1.5">
            <Zap className="w-3 h-3 text-emerald-600" />
            <span className="text-gray-700 text-[10px] font-semibold tracking-[0.2em] uppercase">
              {t.counter_poweredBy}
            </span>
          </div>
        </aside>

        {/* ──────────────── RIGHT: Order Detail ──────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <OrderDetail
              order={selected}
              currency={currency}
              selectedETA={selectedETA}
              onSelectETA={setSelectedETA}
              isUpdating={isUpdating}
              onStatus={handleStatus}
              printJob={printJobs[selected.id]}
              onPrint={() => handlePrint(selected)}
              onRetryPrint={(jobId) => handleRetryPrint(jobId, selected)}
            />
          ) : (
            <IdleScreen hasOrders={active.length > 0} />
          )}
        </main>

      </div>
    </div>
  );
}

// ─── Idle screen ─────────────────────────────────────────────────────────────

function IdleScreen({ hasOrders }: { hasOrders: boolean }) {
  const { t } = useDashboardLocale();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-950 p-8">
      <div className="w-20 h-20 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
        <Store className="w-9 h-9 text-gray-700" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-gray-400 text-base font-semibold">
          {hasOrders ? t.counter_selectOrder : t.counter_noOrders}
        </p>
        <p className="text-gray-700 text-sm">
          {hasOrders ? t.counter_selectOrderDesc : t.counter_noOrdersDesc}
        </p>
      </div>
    </div>
  );
}

// ─── OrderCard ───────────────────────────────────────────────────────────────

function OrderCard({
  order, selected, isNew, currency, onClick,
}: {
  order: Order; selected: boolean; isNew: boolean; currency: string; onClick: () => void;
}) {
  const { t } = useDashboardLocale();
  const mins      = elapsed(order.created_at);
  const itemCount = order.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
  const TypeIcon  = TYPE_ICON[order.order_type ?? 'dine_in'] ?? UtensilsCrossed;

  const statusLabels: Record<string, string> = {
    pending:   t.counter_newOrder,
    confirmed: t.kds_accept,
    preparing: t.counter_preparing,
    ready:     t.counter_markReady,
    delivered: t.counter_deliver,
    cancelled: t.kds_cancelled,
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 transition-all duration-150 relative',
        selected
          ? 'bg-emerald-950/40 border-l-[3px] border-emerald-500'
          : isNew
          ? 'bg-amber-950/30 border-l-[3px] border-amber-500'
          : 'hover:bg-gray-900/60 border-l-[3px] border-transparent'
      )}
    >
      {isNew && (
        <div className="absolute inset-0 border-l-[3px] border-amber-400 animate-pulse pointer-events-none" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-sm">#{order.order_number}</span>
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', STATUS_PILL[order.status])}>
              {statusLabels[order.status] ?? order.status.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-500 text-xs truncate">
            {order.customer_name || t.kds_customer} &middot; {itemCount} {t.kds_product}
          </p>
        </div>

        <div className="flex-none flex flex-col items-end gap-1">
          <span className="text-white text-sm font-bold">
            {formatCurrency(order.total, currency)}
          </span>
          <div className="flex items-center gap-1.5">
            <TypeIcon className="w-3 h-3 text-gray-600" />
            <span className={cn('text-[11px] font-semibold', elapsedColor(mins))}>
              {mins}{t.counter_agoMin}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── OrderDetail ─────────────────────────────────────────────────────────────

function OrderDetail({
  order, currency, selectedETA, onSelectETA, isUpdating, onStatus,
  printJob, onPrint, onRetryPrint,
}: {
  order: Order;
  currency: string;
  selectedETA: number;
  onSelectETA: (v: number) => void;
  isUpdating: boolean;
  onStatus: (id: string, status: string) => void;
  printJob?: { jobId: string; state: PrintState; error?: string };
  onPrint: () => void;
  onRetryPrint: (jobId: string) => void;
}) {
  const { t } = useDashboardLocale();
  const mins       = elapsed(order.created_at);
  const isPending  = order.status === 'pending';
  const TypeIcon   = TYPE_ICON[order.order_type ?? 'dine_in'] ?? UtensilsCrossed;
  const isComplete = ['delivered', 'cancelled'].includes(order.status);

  const typeLabels: Record<string, string> = {
    delivery: t.counter_delivery,
    pickup:   t.counter_pickup,
    dine_in:  t.counter_dineIn,
  };

  const nextActionMap: Record<string, { status: string; label: string; colorCls: string }> = {
    confirmed: { ...NEXT_ACTION_STYLE.confirmed, label: t.counter_preparing },
    preparing: { ...NEXT_ACTION_STYLE.preparing, label: t.counter_markReady },
    ready:     { ...NEXT_ACTION_STYLE.ready,     label: t.counter_deliver   },
  };
  const nextAct = nextActionMap[order.status] ?? null;

  const statusLabels: Record<string, string> = {
    pending:   t.counter_newOrder,
    confirmed: t.kds_accept,
    preparing: t.counter_preparing,
    ready:     t.counter_markReady,
    delivered: t.counter_deliver,
    cancelled: t.kds_cancelled,
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Order header bar ── */}
      <div className={cn(
        'flex-none px-6 py-4 border-b border-gray-800 flex items-center justify-between',
        isPending ? 'bg-gradient-to-r from-amber-950/30 to-gray-900/50' : 'bg-gray-900/40'
      )}>
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-white text-2xl font-extrabold tracking-tight">
                #{order.order_number}
              </h2>
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md', STATUS_PILL[order.status])}>
                {statusLabels[order.status] ?? order.status.toUpperCase()}
              </span>
              {isPending && (
                <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold animate-pulse">
                  <Bell className="w-3.5 h-3.5" />
                  {t.counter_newOrder}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <TypeIcon className="w-3.5 h-3.5" />
                {typeLabels[order.order_type ?? 'dine_in']}
              </span>
              {order.payment_method && (
                <>
                  <span className="text-gray-800">·</span>
                  <span className="flex items-center gap-1">
                    {order.payment_method === 'cash'
                      ? <DollarSign className="w-3.5 h-3.5" />
                      : <CreditCard className="w-3.5 h-3.5" />}
                    {order.payment_method === 'cash' ? t.counter_cash : t.counter_online}
                  </span>
                </>
              )}
              <span className="text-gray-800">·</span>
              <span className={cn('flex items-center gap-1 font-medium', elapsedColor(mins))}>
                <Timer className="w-3.5 h-3.5" />
                {mins} {t.counter_agoMin}
              </span>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="text-right">
          <p className="text-white text-3xl font-black tracking-tight">
            {formatCurrency(order.total, currency)}
          </p>
          {order.items && (
            <p className="text-gray-600 text-xs mt-0.5">
              {order.items.reduce((s, i) => s + i.qty, 0)} {t.counter_orderItems}
            </p>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Items column */}
        <div className="flex-1 overflow-y-auto p-5 border-r border-gray-800/60 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800 space-y-1">
          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mb-3">
            {t.counter_orderItems}
          </p>
          {(order.items ?? []).map((item, idx) => (
            <ItemRow key={item.id ?? idx} item={item} currency={currency} />
          ))}

          {/* Notes */}
          {order.notes && (
            <div className="mt-4 p-3 rounded-xl bg-amber-950/30 border border-amber-800/30">
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                {t.counter_notes}
              </p>
              <p className="text-amber-100/80 text-sm leading-relaxed">{order.notes}</p>
            </div>
          )}

          {/* Delivery address */}
          {order.delivery_address && (
            <div className="mt-3 p-3 rounded-xl bg-gray-900 border border-gray-800">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> {t.counter_address}
              </p>
              <p className="text-gray-200 text-sm">{order.delivery_address}</p>
            </div>
          )}
        </div>

        {/* Action sidebar */}
        <div className="w-[268px] flex-none flex flex-col p-5 gap-5 bg-gray-900/30">

          {/* Customer info */}
          <section className="space-y-3">
            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
              {t.counter_customer}
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-gray-300">
                  {(order.customer_name || 'G')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {order.customer_name || t.kds_customer}
                </p>
                {order.customer_phone && (
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />{order.customer_phone}
                  </p>
                )}
              </div>
            </div>
            {order.customer_email && (
              <p className="text-gray-600 text-xs flex items-center gap-1.5 pl-0.5">
                <Mail className="w-3 h-3 flex-none" />
                <span className="truncate">{order.customer_email}</span>
              </p>
            )}
          </section>

          {/* ETA picker — only when pending */}
          {isPending && (
            <section className="space-y-3">
              <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {t.counter_etaLabel}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {ETA_OPTIONS.map(eta => (
                  <button
                    key={eta}
                    onClick={() => onSelectETA(eta)}
                    className={cn(
                      'py-2 rounded-lg text-xs font-bold transition-all border',
                      selectedETA === eta
                        ? 'bg-purple-700 border-purple-600 text-white shadow-sm shadow-purple-900/50'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    )}
                  >
                    {eta}m
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Spacer pushes buttons to bottom */}
          <div className="flex-1" />

          {/* ── Action buttons ── */}
          <section className="space-y-2">
            {isPending ? (
              <>
                {/* ACCEPT */}
                <button
                  disabled={isUpdating}
                  onClick={() => onStatus(order.id, 'confirmed')}
                  className={cn(
                    'w-full h-14 rounded-xl font-extrabold text-base text-white',
                    'bg-gradient-to-br from-[#7c3aed] to-[#6d28d9]',
                    'hover:from-[#8b5cf6] hover:to-[#7c3aed]',
                    'shadow-lg shadow-purple-950/50',
                    'flex items-center justify-center gap-2',
                    'transition-all active:scale-[0.98]',
                    isUpdating && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {isUpdating ? (
                    <Spinner label={t.counter_accepting} />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {t.counter_accept}
                    </>
                  )}
                </button>

                {/* REJECT */}
                <button
                  disabled={isUpdating}
                  onClick={() => onStatus(order.id, 'cancelled')}
                  className={cn(
                    'w-full h-10 rounded-xl font-semibold text-sm text-red-400',
                    'border border-red-900/40 hover:bg-red-950/30',
                    'flex items-center justify-center gap-1.5',
                    'transition-all',
                    isUpdating && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <XCircle className="w-4 h-4" />
                  {t.counter_reject}
                </button>
              </>
            ) : nextAct ? (
              <button
                disabled={isUpdating}
                onClick={() => onStatus(order.id, nextAct.status)}
                className={cn(
                  'w-full h-14 rounded-xl font-extrabold text-base text-white',
                  nextAct.colorCls,
                  'shadow-lg',
                  'flex items-center justify-center gap-2',
                  'transition-all active:scale-[0.98]',
                  isUpdating && 'opacity-60 cursor-not-allowed'
                )}
              >
                {isUpdating ? (
                  <Spinner label={t.counter_updating} />
                ) : (
                  <>
                    <ChevronRight className="w-5 h-5" />
                    {nextAct.label}
                  </>
                )}
              </button>
            ) : isComplete ? (
              <div className={cn(
                'w-full h-12 rounded-xl flex items-center justify-center gap-2',
                order.status === 'delivered'
                  ? 'bg-emerald-950/40 border border-emerald-800/30'
                  : 'bg-red-950/30 border border-red-900/20'
              )}>
                {order.status === 'delivered' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-400 text-sm font-bold">{t.counter_complete}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-400 text-sm font-bold">{t.kds_cancelled}</span>
                  </>
                )}
              </div>
            ) : null}

            {/* ── PRINT BUTTON ── */}
            {printJob?.state === 'failed' ? (
              <div className="mt-1 rounded-xl border border-red-800/40 bg-red-950/20 p-3 space-y-2">
                <p className="text-red-400 text-xs font-semibold flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 flex-none" />
                  Impresora no conectada
                </p>
                <p className="text-red-500/60 text-[10px] leading-snug">{printJob.error}</p>
                <button
                  onClick={() => onRetryPrint(printJob.jobId)}
                  className="w-full h-8 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Reintentar impresión
                </button>
              </div>
            ) : (
              <button
                onClick={onPrint}
                disabled={printJob?.state === 'printing' || printJob?.state === 'retrying'}
                className={cn(
                  'w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-1',
                  printJob?.state === 'printed'
                    ? 'bg-emerald-950/40 border border-emerald-800/30 text-emerald-400'
                    : 'bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600',
                  (printJob?.state === 'printing' || printJob?.state === 'retrying') && 'opacity-60 cursor-not-allowed'
                )}
              >
                {printJob?.state === 'printing' || printJob?.state === 'retrying' ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
                    Imprimiendo…
                  </>
                ) : printJob?.state === 'printed' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Impreso
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir orden
                  </>
                )}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── ItemRow ─────────────────────────────────────────────────────────────────

function ItemRow({ item, currency }: { item: OrderItem; currency: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800/40 last:border-0">
      {/* Qty badge */}
      <div className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-extrabold text-white">{item.qty}</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold leading-tight">
          {item.product?.name ?? '—'}
        </p>
        {item.variant && (
          <p className="text-gray-500 text-xs mt-0.5">› {item.variant.name}</p>
        )}
        {((item as any).order_item_extras ?? []).map((ex: any, i: number) => (
          <p key={i} className="text-gray-600 text-xs">+ {ex.product_extras?.name}</p>
        ))}
        {((item as any).order_item_modifiers ?? []).map((m: any, i: number) => (
          <p key={i} className="text-gray-600 text-xs">• {m.option_name}</p>
        ))}
        {item.notes && (
          <p className="text-amber-400/70 text-xs mt-0.5 italic">{item.notes}</p>
        )}
      </div>

      {/* Line total */}
      <span className="text-gray-300 text-sm font-bold flex-none">
        {formatCurrency(item.line_total, currency)}
      </span>
    </div>
  );
}

// ─── ToggleChip ───────────────────────────────────────────────────────────────

function ToggleChip({ label, active, activeColor, title, onClick }: {
  label: string; active: boolean; activeColor: string; title: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'px-2.5 py-1 rounded-md text-xs font-bold transition-all',
        active ? `${activeColor} text-white` : 'text-gray-600 hover:text-gray-400'
      )}
    >
      {label}
    </button>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      {label}
    </span>
  );
}
