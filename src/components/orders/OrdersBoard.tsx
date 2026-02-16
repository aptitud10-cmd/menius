'use client';

import { useState, useTransition } from 'react';
import { Clock, ChefHat, CheckCircle, Package, XCircle, User, ArrowRight } from 'lucide-react';
import { updateOrderStatus } from '@/lib/actions/restaurant';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG } from '@/lib/utils';
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
}

export function OrdersBoard({ initialOrders }: OrdersBoardProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
    });
  };

  const handleCancel = (orderId: string) => {
    handleStatusChange(orderId, 'cancelled');
  };

  // Stats
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const todayTotal = orders
    .filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString() && o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total), 0);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPrice(todayTotal)}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay órdenes aún</p>
          <p className="text-sm mt-1">Las órdenes aparecerán aquí cuando tus clientes empiecen a pedir</p>
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

                {columnOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
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
                      <span className="font-bold text-sm">{formatPrice(Number(order.total))}</span>
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
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
