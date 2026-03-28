'use client';

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock, ChefHat, CheckCircle, Package, XCircle, User, ArrowRight, Bell,
  Volume2, VolumeX, BellRing, Wifi, Printer, MapPin, StickyNote,
  Utensils, ShoppingBag, Truck, ChevronDown, ChevronUp, Search,
  CreditCard, Banknote, X, History, LayoutGrid, Eye, FileDown,
  CheckSquare, Square, QrCode,
} from 'lucide-react';
import { updateOrderStatus } from '@/lib/actions/restaurant';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG, cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
import { OrderReceipt } from './OrderReceipt';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { DashboardTranslations } from '@/lib/dashboard-translations';
import type { Order, OrderStatus } from '@/types';

const COLUMNS: { status: OrderStatus; icon: typeof Clock }[] = [
  { status: 'pending', icon: Clock },
  { status: 'confirmed', icon: CheckCircle },
  { status: 'preparing', icon: ChefHat },
  { status: 'ready', icon: Package },
];

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const ORDER_TYPE_META: Record<string, { icon: typeof Utensils; color: string }> = {
  dine_in: { icon: Utensils, color: 'text-blue-600 bg-blue-50' },
  pickup: { icon: ShoppingBag, color: 'text-amber-600 bg-amber-50' },
  delivery: { icon: Truck, color: 'text-violet-600 bg-violet-50' },
};

const PAYMENT_META: Record<string, { icon: typeof Banknote; color: string }> = {
  cash: { icon: Banknote, color: 'text-green-700 bg-green-50' },
  online: { icon: CreditCard, color: 'text-indigo-700 bg-indigo-50' },
};

function orderTypeLabel(t: DashboardTranslations, type?: string | null): string {
  if (type === 'dine_in') return t.orders_dineIn;
  if (type === 'pickup') return t.orders_pickup;
  if (type === 'delivery') return t.orders_delivery;
  return '';
}

function paymentLabel(t: DashboardTranslations, method?: string | null): string {
  if (method === 'cash') return t.orders_cash;
  if (method === 'online') return t.orders_paidOnline;
  return '';
}

function statusLabel(t: DashboardTranslations, status: string): string {
  const map: Record<string, string> = {
    pending: t.orders_pending,
    confirmed: t.orders_confirmed,
    preparing: t.orders_preparing,
    ready: t.orders_ready,
    delivered: t.orders_delivered,
    cancelled: t.orders_cancelled,
  };
  return map[status] ?? status;
}

interface OrdersBoardProps {
  initialOrders: Order[];
  restaurantId: string;
  restaurantSlug: string;
  currency: string;
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  taxLabel?: string;
  taxIncluded?: boolean;
}

export function OrdersBoard({ initialOrders, restaurantId, restaurantSlug, currency, restaurantName, restaurantPhone, restaurantAddress, taxLabel, taxIncluded }: OrdersBoardProps) {
  const { t, locale } = useDashboardLocale();
  const [isPending, startTransition] = useTransition();
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | '7' | '30' | 'all'>('all');
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const toggleBulk = useCallback((id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const clearBulk = useCallback(() => setBulkSelected(new Set()), []);
  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('menius-auto-print') === 'true';
  });

  const {
    soundEnabled,
    setSoundEnabled,
    hasPermission,
    requestPermission,
    notifyNewOrder,
    updateTabTitle,
  } = useNotifications({ defaultTitle: `${t.orders_title} — MENIUS` });

  const toggleAutoPrint = useCallback((on: boolean) => {
    setAutoPrint(on);
    localStorage.setItem('menius-auto-print', String(on));
  }, []);

  const { orders, updateOrderLocally } = useRealtimeOrders({
    restaurantId,
    initialOrders,
    onNewOrder: useCallback((order: Order) => {
      const total = formatPrice(Number(order.total), currency);
      notifyNewOrder(order.order_number, total);
      setNewOrderIds((prev) => new Set(Array.from(prev).concat(order.id)));
      setTimeout(() => {
        setNewOrderIds((prev) => { const next = new Set(prev); next.delete(order.id); return next; });
      }, 12000);
      if (localStorage.getItem('menius-auto-print') === 'true') {
        import('./OrderReceipt').then(({ quickPrintOrder }) => {
          quickPrintOrder(order, restaurantName, restaurantPhone, restaurantAddress, currency, taxLabel, taxIncluded, locale);
        });
      }
    }, [currency, notifyNewOrder, restaurantName, restaurantPhone, restaurantAddress]),
  });

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q)
      );
    }
    if (filterType !== 'all') {
      result = result.filter((o) => o.order_type === filterType);
    }
    if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === 'today') {
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateRange === '7') {
        cutoff.setDate(cutoff.getDate() - 7);
      } else if (dateRange === '30') {
        cutoff.setDate(cutoff.getDate() - 30);
      }
      result = result.filter((o) => new Date(o.created_at) >= cutoff);
    }
    return result;
  }, [orders, search, filterType, dateRange]);

  const activeOrders = useMemo(() =>
    filteredOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)),
  [filteredOrders]);

  const historyOrders = useMemo(() =>
    filteredOrders.filter((o) => ['delivered', 'cancelled'].includes(o.status)),
  [filteredOrders]);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString() && o.status !== 'cancelled');
  const todayTotal = todayOrders.reduce((s, o) => s + Number(o.total), 0);

  useEffect(() => { updateTabTitle(pendingCount); }, [pendingCount, updateTabTitle]);

  // Keep the screen awake while the counter is open (re-acquire after tab comes back)
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      if ('wakeLock' in navigator) {
        try { lock = await (navigator as Navigator & { wakeLock: { request(type: string): Promise<WakeLockSentinel> } }).wakeLock.request('screen'); }
        catch { /* non-fatal — browser may deny (e.g. low battery) */ }
      }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      lock?.release();
    };
  }, []);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderLocally(orderId, { status: newStatus });
    startTransition(async () => { await updateOrderStatus(orderId, newStatus); });
  };

  const handleBulkAdvance = () => {
    bulkSelected.forEach((id) => {
      const order = orders.find((o) => o.id === id);
      if (order && NEXT_STATUS[order.status]) {
        handleStatusChange(id, NEXT_STATUS[order.status]);
      }
    });
    clearBulk();
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-2xl border border-amber-500/[0.15] bg-amber-500/[0.06] p-4">
          <p className="text-xs text-gray-500 font-medium">{t.orders_pendingPlural}</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-violet-500/[0.15] bg-violet-500/[0.06] p-4">
          <p className="text-xs text-gray-500 font-medium">{t.orders_preparing}</p>
          <p className="text-2xl font-bold text-violet-500 mt-1">{preparingCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/[0.15] bg-emerald-500/[0.06] p-4">
          <p className="text-xs text-gray-500 font-medium">{t.orders_salesToday}</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{formatPrice(todayTotal, currency)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 font-medium">{t.orders_ordersToday}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{todayOrders.length}</p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.orders_searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-400"
          />
        </div>

        {/* Date filter */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(['today', '7', '30', 'all'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setDateRange(key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-sm font-medium transition-colors',
                dateRange === key
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {key === 'today' ? t.orders_today : key === '7' ? t.orders_thisWeek : key === '30' ? t.orders_thisMonth : t.orders_all}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="all">{t.orders_allTypes}</option>
          <option value="dine_in">{t.orders_dineIn}</option>
          <option value="pickup">{t.orders_pickup}</option>
          <option value="delivery">{t.orders_delivery}</option>
        </select>

        {/* History toggle */}
        <button
          onClick={() => setShowHistory((s) => !s)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            showHistory ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
          )}
        >
          {showHistory ? <LayoutGrid className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
          {showHistory ? t.orders_kanban : `${t.orders_history} (${historyOrders.length})`}
        </button>

        {/* Export */}
        <button
          onClick={() => {
            import('@/lib/export-csv').then(({ downloadCSV }) => {
              const rows = filteredOrders.map((o) => ({
                orden: o.order_number,
                estado: o.status,
                cliente: o.customer_name ?? '',
                telefono: o.customer_phone ?? '',
                tipo: o.order_type ?? '',
                pago: o.payment_method ?? '',
                total: o.total,
                items: (o.items ?? []).map((i: any) => `${i.qty}x ${i.product?.name ?? ''}`).join('; '),
                notas: o.notes ?? '',
                fecha: new Date(o.created_at).toLocaleString('es-MX'),
              }));
              downloadCSV(rows, `ordenes-${new Date().toISOString().slice(0, 10)}`);
            });
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          CSV
        </button>

        <div className="flex-1" />

        {/* Notification + print controls */}
        <div className="flex items-center gap-1.5">
          {!hasPermission && (
            <button onClick={requestPermission} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
              <BellRing className="w-3.5 h-3.5" /> {t.orders_notify}
            </button>
          )}
          <button
            onClick={() => toggleAutoPrint(!autoPrint)}
            className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
              autoPrint ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
            )}
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
              soundEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
            )}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-1 text-xs text-gray-400 ml-1">
            <Wifi className="w-3 h-3 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main content */}
      {orders.length === 0 ? (
        <div className="dash-empty py-20">
          <Package className="dash-empty-icon" />
          <p className="dash-empty-title">{t.orders_noOrders}</p>
          <p className="dash-empty-desc">{t.orders_emptyDesc}</p>
          <Link
            href="/app/tables"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            {t.nav_tables ?? 'Ver QR de mesas'}
          </Link>
        </div>
      ) : showHistory ? (
        /* ── History list view ── */
        <div className="space-y-2">
          {historyOrders.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">{t.orders_noCompleted}{search ? ` ${t.orders_withFilter}` : ''}.</p>
          ) : historyOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold">{order.order_number}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold',
                    order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  )}>
                    {order.status === 'delivered' ? t.orders_delivered : t.orders_cancelled}
                  </span>
                  {ORDER_TYPE_META[order.order_type ?? ''] && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold', ORDER_TYPE_META[order.order_type!].color)}>
                      {orderTypeLabel(t, order.order_type)}
                    </span>
                  )}
                  {PAYMENT_META[order.payment_method ?? ''] && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold', PAYMENT_META[order.payment_method!].color)}>
                      {paymentLabel(t, order.payment_method)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  {order.customer_name && <span>{order.customer_name}</span>}
                  <span>·</span>
                  <span>{timeAgo(order.created_at)}</span>
                  <span>·</span>
                  <span>{order.items?.length ?? 0} items</span>
                </div>
              </div>
              <span className="font-bold text-sm text-gray-900 tabular-nums">{formatPrice(Number(order.total), currency)}</span>
              <button onClick={() => setDetailOrder(order)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
              <button onClick={() => setPrintOrder(order)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <Printer className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* ── Kanban board ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(({ status, icon: Icon }) => {
            const config = ORDER_STATUS_CONFIG[status];
            const columnOrders = activeOrders.filter((o) => o.status === status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm font-semibold text-gray-900">{statusLabel(t, status)}</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    {columnOrders.length}
                  </span>
                </div>
                {columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isNew={newOrderIds.has(order.id)}
                    status={status}
                    currency={currency}
                    onAdvance={() => handleStatusChange(order.id, NEXT_STATUS[status])}
                    onCancel={() => handleStatusChange(order.id, 'cancelled')}
                    onPrint={() => setPrintOrder(order)}
                    onDetail={() => setDetailOrder(order)}
                    isBulkSelected={bulkSelected.has(order.id)}
                    onBulkToggle={() => toggleBulk(order.id)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {bulkSelected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900 text-white shadow-2xl">
          <span className="text-sm font-medium">{bulkSelected.size} {t.orders_selected}</span>
          <button onClick={handleBulkAdvance} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 text-sm font-semibold hover:bg-emerald-600 transition-colors">
            <ArrowRight className="w-3.5 h-3.5" /> {t.orders_advanceStatus}
          </button>
          <button onClick={clearBulk} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Order detail modal */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          currency={currency}
          restaurantSlug={restaurantSlug}
          onClose={() => setDetailOrder(null)}
          onPrint={() => { setPrintOrder(detailOrder); setDetailOrder(null); }}
          onStatusChange={(s) => { handleStatusChange(detailOrder.id, s); setDetailOrder({ ...detailOrder, status: s }); }}
        />
      )}

      {/* Print receipt modal */}
      {printOrder && (
        <OrderReceipt
          order={printOrder}
          restaurantName={restaurantName}
          restaurantPhone={restaurantPhone}
          restaurantAddress={restaurantAddress}
          currency={currency}
          taxLabel={taxLabel}
          taxIncluded={taxIncluded}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}

// ─── Order card (kanban) ──────────────────────────────────────────

function OrderCard({
  order, isNew, status, currency, onAdvance, onCancel, onPrint, onDetail,
  isBulkSelected, onBulkToggle,
}: {
  order: Order; isNew: boolean; status: OrderStatus; currency: string;
  onAdvance: () => void; onCancel: () => void; onPrint: () => void; onDetail: () => void;
  isBulkSelected: boolean; onBulkToggle: () => void;
}) {
  const { t } = useDashboardLocale();
  const [expanded, setExpanded] = useState(false);
  const typeMeta = ORDER_TYPE_META[order.order_type ?? ''];
  const payMeta = PAYMENT_META[order.payment_method ?? ''];

  return (
    <div className={cn(
      'bg-white rounded-xl border p-3.5 transition-all text-gray-900 cursor-pointer hover:shadow-sm',
      isNew ? 'border-emerald-500/40 ring-2 ring-emerald-500/20 animate-pulse' : 'border-gray-200',
      isBulkSelected && 'ring-2 ring-indigo-500/30 border-indigo-300'
    )} onClick={onDetail}>
      {isNew && (
        <div className="flex items-center gap-1 mb-2">
          <Bell className="w-3 h-3 text-emerald-600" />
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{t.orders_newOrder}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); onBulkToggle(); }} className="p-0.5 -ml-0.5 text-gray-300 hover:text-indigo-500 transition-colors">
            {isBulkSelected ? <CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> : <Square className="w-3.5 h-3.5" />}
          </button>
          <span className="text-xs font-mono font-bold">{order.order_number}</span>
        </div>
        <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
      </div>

      {/* Badges: order type + payment */}
      <div className="flex flex-wrap gap-1 mb-2">
        {typeMeta && (
          <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold', typeMeta.color)}>
            <typeMeta.icon className="w-2.5 h-2.5" /> {orderTypeLabel(t, order.order_type)}
          </span>
        )}
        {payMeta && (
          <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold', payMeta.color)}>
            <payMeta.icon className="w-2.5 h-2.5" /> {paymentLabel(t, order.payment_method)}
          </span>
        )}
      </div>

      {(order.customer_name || order.customer_phone) && (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1.5">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="font-medium truncate">{order.customer_name}</span>
        </div>
      )}

      {order.order_type === 'dine_in' && order.table_name && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-1.5">
          <Utensils className="w-3 h-3 flex-shrink-0" />
          <span className="font-medium truncate">{order.table_name}</span>
        </div>
      )}

      {order.delivery_address && (
        <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-1.5">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="truncate">{order.delivery_address}</span>
        </div>
      )}

      {/* Items summary */}
      {order.items && order.items.length > 0 && (
        <div className="space-y-1 mb-2" onClick={(e) => e.stopPropagation()}>
          {order.items.map((item: any, idx: number) => {
            const prodName = item.product?.name ?? t.orders_product;
            const variantName = item.variant?.name;
            const extras: any[] = item.order_item_extras ?? [];
            const modifiers: any[] = item.order_item_modifiers ?? [];
            const hasDetails = variantName || extras.length > 0 || modifiers.length > 0 || item.notes;
            return (
              <div key={idx} className="rounded-lg bg-gray-50 px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-800">
                    <span className="font-bold">{item.qty}x</span> {prodName}
                    {variantName && <span className="text-gray-400"> · {variantName}</span>}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500 tabular-nums">{formatPrice(Number(item.line_total), currency)}</span>
                </div>
                {hasDetails && (expanded || isNew) && (
                  <div className="mt-0.5 space-y-0.5">
                    {extras.map((ex: any, i: number) => (
                      <p key={i} className="text-[10px] text-gray-400 pl-3">+ {ex.product_extras?.name ?? 'Extra'}</p>
                    ))}
                    {modifiers.map((mod: any, i: number) => (
                      <p key={i} className="text-[10px] text-gray-400 pl-3">{mod.group_name}: {mod.option_name}</p>
                    ))}
                    {item.notes && <p className="text-[10px] text-amber-600 pl-3 italic">&quot;{item.notes}&quot;</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {order.notes && (expanded || isNew) && (
        <div className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mb-1.5">
          <StickyNote className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span className="italic">{order.notes}</span>
        </div>
      )}

      {order.include_utensils === false && (expanded || isNew) && (
        <div className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-2 py-1 mb-1.5">
          <span>🚫🍴</span>
          <span className="font-medium">Sin cubiertos</span>
        </div>
      )}

      {!isNew && order.items?.some((item: any) =>
        item.variant || (item.order_item_extras?.length ?? 0) > 0 || (item.order_item_modifiers?.length ?? 0) > 0 || item.notes
      ) && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((s) => !s); }}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors mb-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? t.orders_less : t.orders_details}
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <span className="font-bold text-sm">{formatPrice(Number(order.total), currency)}</span>
        <div className="flex gap-1">
          <button onClick={onPrint} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title={t.orders_print}>
            <Printer className="w-3.5 h-3.5" />
          </button>
          {NEXT_STATUS[status] && (
            <button onClick={onAdvance} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-medium hover:bg-emerald-600 transition-colors">
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {status !== 'cancelled' && status !== 'delivered' && (
            <button onClick={onCancel} className="p-1 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Order detail modal ───────────────────────────────────────────

function OrderDetailModal({
  order, currency, restaurantSlug, onClose, onPrint, onStatusChange,
}: {
  order: Order; currency: string; restaurantSlug: string;
  onClose: () => void; onPrint: () => void;
  onStatusChange: (s: OrderStatus) => void;
}) {
  const { t } = useDashboardLocale();
  const typeMeta = ORDER_TYPE_META[order.order_type ?? ''];
  const payMeta = PAYMENT_META[order.payment_method ?? ''];
  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const nextStatus = NEXT_STATUS[order.status];
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const trackingUrl = restaurantSlug ? `${appUrl}/${restaurantSlug}/orden/${order.order_number}` : null;

  const copyTrackingLink = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sendViaWhatsApp = () => {
    if (!trackingUrl || !order.customer_phone) return;
    const phone = order.customer_phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hola ${order.customer_name ?? ''}! 👋 Tu pedido #${order.order_number} está en camino. Sigue tu pedido aquí: ${trackingUrl}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg text-gray-900">{order.order_number}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleString('es-MX')}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Ver tracking del cliente"
              >
                <Eye className="w-4 h-4" />
              </a>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status + badges */}
          <div className="flex flex-wrap gap-2">
            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold', statusConfig?.bg, statusConfig?.color)}>
              {statusLabel(t, order.status)}
            </span>
            {typeMeta && (
              <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold', typeMeta.color)}>
                <typeMeta.icon className="w-3.5 h-3.5" /> {orderTypeLabel(t, order.order_type)}
              </span>
            )}
            {payMeta && (
              <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold', payMeta.color)}>
                <payMeta.icon className="w-3.5 h-3.5" /> {paymentLabel(t, order.payment_method)}
              </span>
            )}
          </div>

          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.orders_customer}</h3>
            {order.customer_name && (
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <User className="w-4 h-4 text-gray-400" /> {order.customer_name}
              </div>
            )}
            {order.customer_phone && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">{order.customer_phone}</span>
                <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 text-xs font-medium hover:underline">
                  WhatsApp
                </a>
              </div>
            )}
            {order.customer_email && (
              <div className="text-sm text-gray-500">{order.customer_email}</div>
            )}
            {order.delivery_address && (
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> {order.delivery_address}
              </div>
            )}
            {trackingUrl && (
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <button
                  onClick={copyTrackingLink}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {copied ? '¡Copiado!' : 'Copiar link de tracking'}
                </button>
                {order.customer_phone && (
                  <button
                    onClick={sendViaWhatsApp}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar tracking por WA
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.orders_products}</h3>
            <div className="space-y-2">
              {(order.items ?? []).map((item: any, idx: number) => {
                const prodName = item.product?.name ?? t.orders_product;
                const variantName = item.variant?.name;
                const extras: any[] = item.order_item_extras ?? [];
                const modifiers: any[] = item.order_item_modifiers ?? [];
                return (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.qty}x {prodName}
                        </p>
                        {variantName && <p className="text-xs text-gray-500 mt-0.5">{t.orders_variant}: {variantName}</p>}
                        {extras.map((ex: any, i: number) => (
                          <p key={i} className="text-xs text-gray-500 mt-0.5">
                            + {ex.product_extras?.name ?? 'Extra'} <span className="text-gray-400">({formatPrice(ex.price, currency)})</span>
                          </p>
                        ))}
                        {modifiers.map((mod: any, i: number) => (
                          <p key={i} className="text-xs text-gray-500 mt-0.5">
                            {mod.group_name}: <span className="font-medium">{mod.option_name}</span>
                            {mod.price_delta > 0 && <span className="text-gray-400"> (+{formatPrice(mod.price_delta, currency)})</span>}
                          </p>
                        ))}
                        {item.notes && (
                          <p className="text-xs text-amber-600 mt-1 italic bg-amber-50 rounded px-2 py-1">&quot;{item.notes}&quot;</p>
                        )}
                      </div>
                      <span className="font-bold text-sm text-gray-900 tabular-nums ml-3">{formatPrice(Number(item.line_total), currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order notes */}
          {order.notes && (
            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5">{t.orders_customerNotes}</h3>
              <p className="text-sm text-amber-800 italic">{order.notes}</p>
            </div>
          )}

          {order.include_utensils === false && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <span className="text-base">🚫🍴</span>
              <span className="text-sm font-medium text-gray-600">Sin cubiertos ni servilletas</span>
            </div>
          )}

          {/* Total */}
          <div className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">{t.orders_total}</span>
            <span className="text-xl font-bold text-white">{formatPrice(Number(order.total), currency)}</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200 px-5 py-3 flex items-center gap-2 flex-shrink-0">
          <button onClick={onPrint} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" /> {t.orders_print}
          </button>
          <div className="flex-1" />
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <button
              onClick={() => onStatusChange('cancelled')}
              className="px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              {t.general_cancel}
            </button>
          )}
          {nextStatus && (
            <button
              onClick={() => onStatusChange(nextStatus)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              {statusLabel(t, nextStatus)} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
