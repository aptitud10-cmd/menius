'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Package, RotateCcw, Clock, CheckCircle2, XCircle, ChefHat, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  payment_method: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  currency: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending:    { label: 'Pendiente',   icon: Clock,        color: 'text-gray-500' },
  confirmed:  { label: 'Confirmado',  icon: CheckCircle2, color: 'text-blue-500' },
  preparing:  { label: 'Preparando',  icon: ChefHat,      color: 'text-amber-500' },
  ready:      { label: 'Listo',       icon: CheckCircle2, color: 'text-emerald-500' },
  delivered:  { label: 'Entregado',   icon: Truck,        color: 'text-emerald-600' },
  cancelled:  { label: 'Cancelado',   icon: XCircle,      color: 'text-red-500' },
};

export function OrderHistoryClient({ restaurantId, restaurantName, restaurantSlug, currency }: Props) {
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const setOpen = useCartStore((s) => s.setOpen);

  const fmtPrice = (n: number) => formatPrice(n, currency);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Ingresa un email válido');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/history?restaurant_id=${encodeURIComponent(restaurantId)}&email=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al cargar'); return; }
      setOrders(data.orders);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (order: Order) => {
    for (const item of order.order_items) {
      // Build a minimal product object to re-add to cart
      const fakeProduct = {
        id: `history-${item.id}`,
        restaurant_id: restaurantId,
        category_id: '',
        name: item.product_name,
        description: '',
        price: item.unit_price,
        image_url: null,
        is_active: true,
        sort_order: 0,
        created_at: '',
        dietary_tags: [],
        variants: [],
        extras: [],
        modifier_groups: [],
      };
      addItem(fakeProduct as any, null, [], item.quantity, '');
    }
    setReorderedId(order.id);
    setOpen(true);
    setTimeout(() => setReorderedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link
          href={`/${restaurantSlug}`}
          className="p-2 -ml-1 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 truncate">{restaurantName}</p>
          <h1 className="text-[15px] font-bold text-gray-900">Mis pedidos</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Search form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-800 mb-1">Consulta tu historial</p>
          <p className="text-xs text-gray-500 mb-4">
            Ingresa el email que usaste al hacer tu pedido y veremos tus órdenes anteriores.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 rounded-xl bg-emerald-500 text-white flex items-center gap-2 text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        {/* Results */}
        {orders !== null && (
          orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700">Sin pedidos encontrados</p>
              <p className="text-sm text-gray-400 mt-1">
                No encontramos pedidos con ese email en {restaurantName}.
              </p>
              <Link
                href={`/${restaurantSlug}`}
                className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
              >
                Hacer un pedido
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 font-medium px-1">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} encontrado{orders.length !== 1 ? 's' : ''}
              </p>
              {orders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const date = new Date(order.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'short', year: 'numeric',
                });

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    {/* Order header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div>
                        <Link
                          href={`/${restaurantSlug}/orden/${order.order_number}`}
                          className="text-sm font-bold text-gray-900 hover:text-emerald-600 transition-colors"
                        >
                          #{order.order_number}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="px-4 py-3 space-y-1">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {item.quantity}× {item.product_name}
                            {item.variant_name && <span className="text-gray-400 text-xs"> ({item.variant_name})</span>}
                          </span>
                          <span className="text-gray-500 tabular-nums text-xs">
                            {fmtPrice(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                      <span className="text-sm font-bold text-gray-900">{fmtPrice(order.total)}</span>
                      <button
                        onClick={() => handleReorder(order)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors active:scale-95"
                      >
                        {reorderedId === order.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        {reorderedId === order.id ? '¡Agregado!' : 'Volver a pedir'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

      </div>
    </div>
  );
}
