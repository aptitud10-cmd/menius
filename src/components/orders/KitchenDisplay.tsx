'use client';

import { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import {
  Clock, ChefHat, CheckCircle, Package, ArrowRight, XCircle,
  Maximize, Minimize, Volume2, VolumeX, Wifi,
} from 'lucide-react';
import { updateOrderStatus } from '@/lib/actions/restaurant';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG, cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
import type { Order, OrderStatus } from '@/types';

const KDS_COLUMNS: { status: OrderStatus; icon: typeof Clock; accent: string }[] = [
  { status: 'pending', icon: Clock, accent: 'amber' },
  { status: 'confirmed', icon: CheckCircle, accent: 'blue' },
  { status: 'preparing', icon: ChefHat, accent: 'purple' },
  { status: 'ready', icon: Package, accent: 'emerald' },
];

const NEXT_STATUS: Record<string, OrderStatus> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

interface KitchenDisplayProps {
  initialOrders: Order[];
  restaurantId: string;
  restaurantName: string;
  currency: string;
}

function ElapsedTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [since]);

  const diff = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
  const isUrgent = diff > 600;
  const isWarning = diff > 300;

  return (
    <span className={cn(
      'font-mono text-xs font-bold tabular-nums',
      isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-gray-500'
    )}>
      {elapsed}
    </span>
  );
}

export function KitchenDisplay({ initialOrders, restaurantId, restaurantName, currency }: KitchenDisplayProps) {
  const [isPending, startTransition] = useTransition();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    soundEnabled,
    setSoundEnabled,
    notifyNewOrder,
  } = useNotifications({ defaultTitle: 'KDS — MENIUS' });

  const { orders, updateOrderLocally } = useRealtimeOrders({
    restaurantId,
    initialOrders,
    onNewOrder: useCallback((order: Order) => {
      const total = formatPrice(Number(order.total), currency);
      notifyNewOrder(order.order_number, total);
      setNewOrderIds((prev) => new Set(Array.from(prev).concat(order.id)));
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }, 15000);
    }, [currency, notifyNewOrder]),
  });

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderLocally(orderId, { status: newStatus });
    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  };

  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
  );

  return (
    <div ref={containerRef} className={cn('flex flex-col', isFullscreen && 'bg-[#050505] h-screen')}>
      {/* KDS Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-purple-400" />
            Cocina (KDS)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {restaurantName} &middot; {activeOrders.length} orden{activeOrders.length !== 1 ? 'es' : ''} activa{activeOrders.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/[0.08] text-emerald-400 text-xs font-medium">
            <Wifi className="w-3.5 h-3.5" />
            En vivo
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              soundEnabled ? 'bg-purple-500/[0.1] text-purple-400' : 'bg-white/[0.04] text-gray-400'
            )}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] text-gray-400 hover:bg-white/[0.06] transition-colors"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            {isFullscreen ? 'Salir' : 'Pantalla completa'}
          </button>
        </div>
      </div>

      {/* Columns */}
      {activeOrders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <ChefHat className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin órdenes activas</p>
            <p className="text-xs text-gray-400 mt-1">Las nuevas órdenes aparecerán aquí en tiempo real</p>
          </div>
        </div>
      ) : (
        <div className={cn(
          'grid gap-3 flex-1',
          isFullscreen ? 'grid-cols-4 overflow-hidden' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
        )}>
          {KDS_COLUMNS.map(({ status, icon: Icon, accent }) => {
            const config = ORDER_STATUS_CONFIG[status];
            const columnOrders = activeOrders
              .filter((o) => o.status === status)
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            return (
              <div
                key={status}
                className={cn(
                  'flex flex-col rounded-2xl border bg-[#0a0a0a] overflow-hidden',
                  status === 'pending' && columnOrders.length > 0
                    ? 'border-amber-500/20'
                    : 'border-white/[0.06]'
                )}
              >
                {/* Column header */}
                <div className={cn(
                  'flex items-center gap-2 px-4 py-3 border-b',
                  status === 'pending' && columnOrders.length > 0
                    ? 'border-amber-500/20 bg-amber-500/[0.04]'
                    : 'border-white/[0.06]'
                )}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm font-semibold text-white">{config.label}</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    {columnOrders.length}
                  </span>
                </div>

                {/* Orders */}
                <div className={cn(
                  'flex-1 p-2 space-y-2',
                  isFullscreen ? 'overflow-y-auto' : ''
                )}>
                  {columnOrders.map((order) => {
                    const isNew = newOrderIds.has(order.id);
                    const tableName = order.table?.name;
                    const orderType = order.order_type;

                    return (
                      <div
                        key={order.id}
                        className={cn(
                          'rounded-xl border p-3 transition-all',
                          isNew
                            ? 'border-purple-400 bg-purple-500/[0.06] animate-pulse'
                            : 'border-white/[0.06] bg-white/[0.02]'
                        )}
                      >
                        {/* Order header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-white">{order.order_number}</span>
                            {tableName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 font-medium">
                                {tableName}
                              </span>
                            )}
                            {orderType && orderType !== 'dine_in' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/[0.1] text-sky-400 font-medium uppercase">
                                {orderType === 'pickup' ? 'Pickup' : 'Delivery'}
                              </span>
                            )}
                          </div>
                          <ElapsedTimer since={order.created_at} />
                        </div>

                        {/* Customer info */}
                        {(order.customer_name || order.customer_phone) && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-2">
                            {order.customer_name && <span>{order.customer_name}</span>}
                            {order.customer_phone && (
                              <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                                {order.customer_phone}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Items */}
                        {order.items && order.items.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {order.items.map((item, idx) => {
                              const prod = item.product as { name: string } | undefined;
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-white/[0.06] text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">
                                    {item.qty}
                                  </span>
                                  <span className="text-xs text-gray-300 truncate">
                                    {prod?.name ?? 'Producto'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Notes */}
                        {order.notes && (
                          <p className="text-[11px] text-amber-400/80 bg-amber-500/[0.06] rounded-lg px-2 py-1 mb-2 italic">
                            {order.notes}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">
                            {formatPrice(Number(order.total), currency)}
                          </span>
                          <div className="flex gap-1.5">
                            {NEXT_STATUS[status] && (
                              <button
                                onClick={() => handleStatusChange(order.id, NEXT_STATUS[status])}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
                              >
                                <ArrowRight className="w-3 h-3" />
                                {NEXT_STATUS[status] === 'confirmed' && 'Confirmar'}
                                {NEXT_STATUS[status] === 'preparing' && 'Preparar'}
                                {NEXT_STATUS[status] === 'ready' && 'Listo'}
                                {NEXT_STATUS[status] === 'delivered' && 'Entregar'}
                              </button>
                            )}
                            {status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'cancelled')}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-500/[0.08] hover:text-red-400 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
