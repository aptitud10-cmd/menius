'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, ChefHat, Bell, Package, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatPrice, cn } from '@/lib/utils';

interface OrderTrackerProps {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  orderNumber: string;
}

const STEPS = [
  { key: 'pending', label: 'Recibido', icon: Clock, description: 'Tu pedido fue recibido' },
  { key: 'confirmed', label: 'Confirmado', icon: CheckCircle2, description: 'El restaurante confirmó tu pedido' },
  { key: 'preparing', label: 'Preparando', icon: ChefHat, description: 'Tu pedido se está preparando' },
  { key: 'ready', label: 'Listo', icon: Bell, description: '¡Tu pedido está listo!' },
  { key: 'delivered', label: 'Entregado', icon: Package, description: 'Pedido entregado. ¡Buen provecho!' },
];

export function OrderTracker({ restaurantId, restaurantName, restaurantSlug, orderNumber }: OrderTrackerProps) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/status?order_number=${orderNumber}&restaurant_id=${restaurantId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setOrder(data.order);
      setError('');
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [orderNumber, restaurantId]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-1">Pedido no encontrado</h2>
          <p className="text-sm text-gray-500 mb-4">{error || 'No pudimos encontrar tu pedido'}</p>
          <Link href={`/r/${restaurantSlug}`} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700">
            Ir al menú
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = STEPS.findIndex((s) => s.key === order.status);
  const isComplete = order.status === 'delivered';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/r/${restaurantSlug}`} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-sm font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>{restaurantName}</h1>
            <p className="text-xs text-gray-400">Pedido {order.order_number}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          {isCancelled ? (
            <div className="text-center py-4">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-red-600">Pedido cancelado</h2>
              <p className="text-sm text-gray-500 mt-1">Este pedido fue cancelado</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                {isComplete ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Package className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-emerald-700">¡Pedido entregado!</h2>
                    <p className="text-sm text-gray-500">Buen provecho</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
                      {(() => {
                        const StepIcon = STEPS[currentStepIndex]?.icon ?? Clock;
                        return <StepIcon className="w-8 h-8 text-brand-600" />;
                      })()}
                    </div>
                    <h2 className="text-lg font-bold">{STEPS[currentStepIndex]?.label}</h2>
                    <p className="text-sm text-gray-500">{STEPS[currentStepIndex]?.description}</p>
                  </>
                )}
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-1 mb-2">
                {STEPS.map((step, i) => (
                  <div
                    key={step.key}
                    className={cn(
                      'flex-1 h-2 rounded-full transition-all duration-500',
                      i <= currentStepIndex ? 'bg-brand-500' : 'bg-gray-200'
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                {STEPS.map((step, i) => (
                  <span key={step.key} className={cn(i <= currentStepIndex && 'text-brand-600 font-semibold')}>
                    {step.label}
                  </span>
                ))}
              </div>

              {!isComplete && (
                <p className="text-center text-xs text-gray-400 mt-4 animate-pulse">
                  Actualizando automáticamente...
                </p>
              )}
            </>
          )}
        </div>

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="font-bold text-sm mb-3">Detalles del pedido</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cliente</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            {order.notes && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Notas</span>
                <span className="text-gray-600 text-right max-w-[60%]">{order.notes}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
            {order.order_items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">{item.qty}x {item.products?.name ?? 'Producto'}</span>
                  {item.product_variants?.name && (
                    <span className="text-gray-400 text-xs ml-1">({item.product_variants.name})</span>
                  )}
                  {item.order_item_extras?.length > 0 && (
                    <p className="text-xs text-gray-400">
                      +{item.order_item_extras.map((ex: any) => ex.product_extras?.name).filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-medium">{formatPrice(Number(item.line_total))}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
            <span className="font-bold">Total</span>
            <span className="font-bold text-brand-600 text-lg">{formatPrice(Number(order.total))}</span>
          </div>
        </div>

        {/* Back to menu */}
        <Link
          href={`/r/${restaurantSlug}`}
          className="block w-full py-3 rounded-xl bg-white border border-gray-200 text-center font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Volver al menú
        </Link>
      </div>
    </div>
  );
}
