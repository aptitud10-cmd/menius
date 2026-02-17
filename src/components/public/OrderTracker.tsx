'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, ChefHat, Bell, Package, XCircle, ArrowLeft, Star, Wifi } from 'lucide-react';
import Link from 'next/link';
import { formatPrice, cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

interface OrderTrackerProps {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  orderNumber: string;
  currency?: string;
}

const STEPS = [
  { key: 'pending', label: 'Recibido', icon: Clock, description: 'Tu pedido fue recibido', color: 'text-amber-600', bg: 'bg-amber-100' },
  { key: 'confirmed', label: 'Confirmado', icon: CheckCircle2, description: 'El restaurante confirmó tu pedido', color: 'text-blue-600', bg: 'bg-blue-100' },
  { key: 'preparing', label: 'Preparando', icon: ChefHat, description: 'Tu pedido se está preparando', color: 'text-violet-600', bg: 'bg-violet-100' },
  { key: 'ready', label: 'Listo', icon: Bell, description: '¡Tu pedido está listo para recoger!', color: 'text-orange-600', bg: 'bg-orange-100' },
  { key: 'delivered', label: 'Entregado', icon: Package, description: 'Pedido entregado. ¡Buen provecho!', color: 'text-emerald-600', bg: 'bg-emerald-100' },
];

export function OrderTracker({ restaurantId, restaurantName, restaurantSlug, orderNumber, currency = 'MXN' }: OrderTrackerProps) {
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
  }, [fetchOrder]);

  useEffect(() => {
    if (!order?.id) return;

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`order-track:${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder((prev: any) => prev ? { ...prev, ...payload.new } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Cargando tu pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold mb-1">Pedido no encontrado</h2>
          <p className="text-sm text-gray-500 mb-6">{error || 'No pudimos encontrar tu pedido'}</p>
          <Link href={`/r/${restaurantSlug}`} className="px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors">
            Ir al menú
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = STEPS.findIndex((s) => s.key === order.status);
  const isComplete = order.status === 'delivered';
  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/r/${restaurantSlug}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-sm font-bold font-heading">{restaurantName}</h1>
              <p className="text-xs text-gray-400">Pedido #{order.order_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
            <Wifi className="w-3 h-3" />
            En vivo
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status Hero */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isCancelled ? (
            <div className="text-center py-10 px-4">
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-red-600">Pedido cancelado</h2>
              <p className="text-sm text-gray-500 mt-1">Este pedido fue cancelado</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="text-center mb-6">
                {isComplete ? (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Package className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-emerald-700">¡Pedido entregado!</h2>
                    <p className="text-sm text-gray-500">Esperamos que disfrutes tu comida</p>
                  </>
                ) : currentStep ? (
                  <>
                    <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3', currentStep.bg)}>
                      <currentStep.icon className={cn('w-8 h-8', currentStep.color)} />
                    </div>
                    <h2 className="text-lg font-bold">{currentStep.label}</h2>
                    <p className="text-sm text-gray-500">{currentStep.description}</p>
                  </>
                ) : null}
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-1 mb-3">
                {STEPS.map((step, i) => (
                  <div
                    key={step.key}
                    className={cn(
                      'flex-1 h-2.5 rounded-full transition-all duration-700',
                      i <= currentStepIndex ? 'bg-brand-500' : 'bg-gray-100'
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between">
                {STEPS.map((step, i) => (
                  <span
                    key={step.key}
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      i <= currentStepIndex ? 'text-brand-600' : 'text-gray-300'
                    )}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm mb-3">Detalles del pedido</h3>
          <div className="space-y-2.5">
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
                <span className="font-medium">{formatPrice(Number(item.line_total), currency)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
            <span className="font-bold">Total</span>
            <span className="font-bold text-brand-600 text-lg">{formatPrice(Number(order.total), currency)}</span>
          </div>
        </div>

        {/* Review prompt when delivered */}
        {isComplete && (
          <ReviewPrompt restaurantId={restaurantId} orderId={order.id} customerName={order.customer_name} />
        )}

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

function ReviewPrompt({ restaurantId, orderId, customerName }: { restaurantId: string; orderId: string; customerName: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, order_id: orderId, customer_name: customerName, rating, comment }),
      });
      if (res.ok) setSubmitted(true);
    } catch {} finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
        <Star className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
        <p className="text-emerald-700 font-semibold">¡Gracias por tu reseña!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-sm mb-3 text-center">¿Cómo estuvo tu experiencia?</h3>
      <div className="flex justify-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} onClick={() => setRating(s)}>
            <Star className={cn('w-7 h-7 transition', s <= rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300')} />
          </button>
        ))}
      </div>
      <textarea
        value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Cuéntanos tu experiencia (opcional)" rows={2}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none mb-3"
      />
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-400 disabled:opacity-50 transition"
      >
        {submitting ? 'Enviando...' : 'Enviar reseña'}
      </button>
    </div>
  );
}
