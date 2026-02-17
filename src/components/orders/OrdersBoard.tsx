'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { Clock, ChefHat, CheckCircle, Package, XCircle, User, ArrowRight, Bell, Volume2, VolumeX, BellRing, Wifi, WifiOff } from 'lucide-react';
import { updateOrderStatus } from '@/lib/actions/restaurant';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import { useNotifications } from '@/hooks/use-notifications';
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

interface OrdersBoardProps {
  initialOrders: Order[];
  restaurantId: string;
  currency: string;
}

export function OrdersBoard({ initialOrders, restaurantId, currency }: OrdersBoardProps) {
  const [isPending, startTransition] = useTransition();
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  const {
    soundEnabled,
    setSoundEnabled,
    hasPermission,
    requestPermission,
    notifyNewOrder,
    updateTabTitle,
  } = useNotifications({ defaultTitle: 'Órdenes — MENIUS' });

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
      }, 12000);
    }, [currency, notifyNewOrder]),
  });

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const todayTotal = orders
    .filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString() && o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total), 0);

  useEffect(() => {
    updateTabTitle(pendingCount);
  }, [pendingCount, updateTabTitle]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderLocally(orderId, { status: newStatus });
    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  };

  const handleCancel = (orderId: string) => {
    handleStatusChange(orderId, 'cancelled');
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-gray-500 font-medium">Pendientes</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <p className="text-xs text-gray-500 font-medium">Preparando</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">{preparingCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs text-gray-500 font-medium">Venta hoy</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPrice(todayTotal, currency)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tiempo real activo</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasPermission && (
            <button
              onClick={requestPermission}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <BellRing className="w-3.5 h-3.5" />
              Activar notificaciones
            </button>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              soundEnabled ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'
            )}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundEnabled ? 'Sonido ON' : 'Sonido OFF'}
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay órdenes aún</p>
          <p className="text-sm mt-1">Las órdenes aparecerán aquí en tiempo real cuando tus clientes empiecen a pedir</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(({ status, icon: Icon }) => {
            const config = ORDER_STATUS_CONFIG[status];
            const columnOrders = orders.filter((o) => o.status === status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm font-semibold">{config.label}</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    {columnOrders.length}
                  </span>
                </div>

                {columnOrders.map((order) => {
                  const isNew = newOrderIds.has(order.id);
                  return (
                    <div key={order.id} className={cn(
                      'bg-white rounded-xl border shadow-sm p-3.5 transition-all',
                      isNew ? 'border-brand-400 ring-2 ring-brand-200 animate-pulse' : 'border-gray-100'
                    )}>
                      {isNew && (
                        <div className="flex items-center gap-1 mb-2">
                          <Bell className="w-3 h-3 text-brand-600" />
                          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Nueva orden</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold">{order.order_number}</span>
                        <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                      </div>

                      {order.customer_name && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {order.customer_name}
                        </div>
                      )}

                      {order.items && order.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {order.items.map((item, idx) => {
                            const prod = item.product as { name: string } | undefined;
                            return (
                              <span key={idx} className="text-xs bg-gray-50 px-1.5 py-0.5 rounded">
                                {item.qty}x {prod?.name ?? 'Producto'}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-sm">{formatPrice(Number(order.total), currency)}</span>
                        <div className="flex gap-1.5">
                          {NEXT_STATUS[status] && (
                            <button
                              onClick={() => handleStatusChange(order.id, NEXT_STATUS[status])}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          {status !== 'cancelled' && status !== 'delivered' && (
                            <button
                              onClick={() => handleCancel(order.id)}
                              className="p-1 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
