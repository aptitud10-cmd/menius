'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, Clock, ChefHat, Bell, Package, XCircle, ArrowLeft, Star, Wifi, Utensils, ShoppingBag, Truck, CreditCard, Banknote, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { formatPrice, cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { PushOptIn } from './PushOptIn';

const DeliveryMap = dynamic(
  () => import('./DeliveryMap').then((m) => m.DeliveryMap),
  { ssr: false, loading: () => <div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse" /> }
);

const ORDER_TYPE_LABELS: Record<string, { icon: typeof Utensils; label: string }> = {
  dine_in: { icon: Utensils, label: 'En restaurante' },
  pickup: { icon: ShoppingBag, label: 'Para recoger' },
  delivery: { icon: Truck, label: 'Delivery' },
};
const PAYMENT_LABELS: Record<string, { icon: typeof Banknote; label: string }> = {
  cash: { icon: Banknote, label: 'Efectivo' },
  online: { icon: CreditCard, label: 'Pagado online' },
};

interface OrderTrackerProps {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantAddress?: string;
  orderNumber: string;
  currency?: string;
  showPaidBanner?: boolean;
}

const STEPS = [
  { key: 'pending', label: 'Recibido', icon: Clock, description: 'Tu pedido fue recibido', color: 'text-amber-600', bg: 'bg-amber-100' },
  { key: 'confirmed', label: 'Confirmado', icon: CheckCircle2, description: 'El restaurante confirmó tu pedido', color: 'text-blue-600', bg: 'bg-blue-100' },
  { key: 'preparing', label: 'Preparando', icon: ChefHat, description: 'Tu pedido se está preparando', color: 'text-violet-600', bg: 'bg-violet-100' },
  { key: 'ready', label: 'Listo', icon: Bell, description: '¡Tu pedido está listo para recoger!', color: 'text-orange-600', bg: 'bg-orange-100' },
  { key: 'delivered', label: 'Entregado', icon: Package, description: 'Pedido entregado. ¡Buen provecho!', color: 'text-emerald-600', bg: 'bg-emerald-100' },
];

export function OrderTracker({ restaurantId, restaurantName, restaurantSlug, restaurantAddress, orderNumber, currency = 'MXN', showPaidBanner = false }: OrderTrackerProps) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paidBannerVisible, setPaidBannerVisible] = useState(showPaidBanner);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/status?order_number=${encodeURIComponent(orderNumber)}&restaurant_id=${encodeURIComponent(restaurantId)}`);
      if (!res.ok) {
        let msg = 'Orden no encontrada';
        try { const d = await res.json(); msg = d?.error || msg; } catch {}
        setError(msg);
        return;
      }
      const data = await res.json();
      if (data?.order) {
        setOrder(data.order);
        setError('');
      } else {
        setError('Orden no encontrada');
      }
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
    if (showPaidBanner) {
      // Payment was confirmed but order can't be loaded yet — show confirmation
      return (
        <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">¡Pago recibido!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Tu pago fue procesado exitosamente. El restaurante ha recibido tu pedido y lo está preparando.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setLoading(true); setError(''); fetchOrder(); }}
                className="w-full py-3.5 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-colors"
              >
                Ver estado del pedido
              </button>
              <Link
                href={`/r/${restaurantSlug}`}
                className="block w-full py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Volver al menú
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return (
      <OrderSuccessRedirect restaurantSlug={restaurantSlug} />
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
        {/* Payment confirmed banner */}
        {paidBannerVisible && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-800">¡Pago confirmado!</p>
              <p className="text-xs text-emerald-600 mt-0.5">Tu pago fue procesado exitosamente. Si dejaste tu email, recibirás un comprobante.</p>
            </div>
            <button
              onClick={() => setPaidBannerVisible(false)}
              className="flex-shrink-0 p-1 text-emerald-400 hover:text-emerald-600 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

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

        {/* Push notification opt-in */}
        {!isCancelled && !isComplete && order?.id && (
          <PushOptIn orderId={order.id} />
        )}

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm mb-3">Detalles del pedido</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cliente</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            {ORDER_TYPE_LABELS[order.order_type ?? ''] && (() => {
              const t = ORDER_TYPE_LABELS[order.order_type!];
              return (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">Tipo</span>
                  <span className="flex items-center gap-1 font-medium"><t.icon className="w-3.5 h-3.5 text-gray-400" /> {t.label}</span>
                </div>
              );
            })()}
            {PAYMENT_LABELS[order.payment_method ?? ''] && (() => {
              const p = PAYMENT_LABELS[order.payment_method!];
              return (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">Pago</span>
                  <span className="flex items-center gap-1 font-medium"><p.icon className="w-3.5 h-3.5 text-gray-400" /> {p.label}</span>
                </div>
              );
            })()}
            {order.delivery_address && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dirección</span>
                <span className="text-gray-700 text-right max-w-[60%] flex items-start gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />{order.delivery_address}</span>
              </div>
            )}
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
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{item.qty}x {item.products?.name ?? 'Producto'}</span>
                  {item.product_variants?.name && (
                    <span className="text-gray-400 text-xs ml-1">({item.product_variants.name})</span>
                  )}
                  {(item.order_item_extras ?? []).length > 0 && (
                    <p className="text-xs text-gray-400">
                      +{(item.order_item_extras ?? []).map((ex: any) => ex.product_extras?.name).filter(Boolean).join(', ')}
                    </p>
                  )}
                  {(item.order_item_modifiers ?? []).map((mod: any, i: number) => (
                    <p key={i} className="text-xs text-gray-400">{mod.group_name}: {mod.option_name}</p>
                  ))}
                  {item.notes && <p className="text-xs text-amber-600 italic">&quot;{item.notes}&quot;</p>}
                </div>
                <span className="font-medium ml-2 flex-shrink-0">{formatPrice(Number(item.line_total), currency)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
            <span className="font-bold">Total</span>
            <span className="font-bold text-brand-600 text-lg">{formatPrice(Number(order.total), currency)}</span>
          </div>
        </div>

        {/* Delivery map — shown for delivery orders when restaurant has an address */}
        {order.order_type === 'delivery' && restaurantAddress && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Ubicación</p>
            <DeliveryMap
              restaurantAddress={restaurantAddress}
              deliveryAddress={order.delivery_address}
              restaurantName={restaurantName}
            />
          </div>
        )}

        {/* Review prompt when delivered */}
        {isComplete && (
          <ReviewPrompt restaurantId={restaurantId} orderId={order.id} customerName={order.customer_name} />
        )}

        {/* Reorder */}
        {isComplete && order.order_items?.length > 0 && (
          <button
            onClick={() => {
              const reorderItems = order.order_items.map((item: any) => ({
                product_id: item.product_id,
                name: item.products?.name ?? 'Producto',
                qty: item.qty,
                price: Number(item.unit_price),
                variant_id: item.variant_id,
                variant_name: item.product_variants?.name,
                image_url: item.products?.image_url,
              }));
              localStorage.setItem('menius-reorder', JSON.stringify(reorderItems));
              window.location.href = `/r/${restaurantSlug}?reorder=1`;
            }}
            className="block w-full py-3.5 rounded-xl bg-emerald-600 text-white text-center font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            🔄 Volver a pedir lo mismo
          </button>
        )}

        {/* Back to menu */}
        <Link
          href={`/r/${restaurantSlug}`}
          className="block w-full py-3 rounded-xl bg-white border border-gray-200 text-center font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Volver al menú
        </Link>

        {/* My orders history link */}
        <Link
          href={`/r/${restaurantSlug}/mis-pedidos`}
          className="block w-full py-2.5 text-center text-xs text-gray-400 hover:text-emerald-600 transition-colors"
        >
          Ver todos mis pedidos anteriores →
        </Link>

        {/* Save order to local history */}
        <OrderHistorySaver order={order} restaurantSlug={restaurantSlug} restaurantName={restaurantName} />
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
    } catch (err) {
      console.error('[OrderTracker] submit review failed:', err);
    } finally { setSubmitting(false); }
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

function OrderSuccessRedirect({ restaurantSlug }: { restaurantSlug: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/r/${restaurantSlug}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [router, restaurantSlug]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const colors = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24', '#f59e0b', '#fb923c'];
    const dots: HTMLSpanElement[] = [];

    for (let i = 0; i < 40; i++) {
      const dot = document.createElement('span');
      const size = Math.random() * 6 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 600;
      const duration = Math.random() * 1200 + 1000;

      Object.assign(dot.style, {
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        backgroundColor: color,
        left: `${left}%`,
        top: '50%',
        opacity: '1',
        transform: `rotate(${Math.random() * 360}deg)`,
        animation: `confetti-fall ${duration}ms ${delay}ms ease-out forwards`,
        pointerEvents: 'none',
      });

      dots.push(dot);
      el.appendChild(dot);
    }

    return () => {
      dots.forEach((d) => d.remove());
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(120px) rotate(${Math.random() > 0.5 ? '' : '-'}540deg) scale(0); opacity: 0; }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        ref={containerRef}
        className="text-center max-w-sm relative overflow-hidden"
        style={{ animation: 'fade-in-up 0.5s ease-out' }}
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Tu pedido fue procesado exitosamente</h2>
        <p className="text-sm text-gray-500 mb-6 animate-pulse">Regresando al menú...</p>
        <Link
          href={`/r/${restaurantSlug}`}
          className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
        >
          Ir al menú
        </Link>
      </div>
    </div>
  );
}

function OrderHistorySaver({ order, restaurantSlug, restaurantName }: { order: any; restaurantSlug: string; restaurantName: string }) {
  useEffect(() => {
    if (!order?.id) return;
    try {
      const key = `menius-history-${restaurantSlug}`;
      const raw = localStorage.getItem(key);
      const history: any[] = raw ? JSON.parse(raw) : [];
      if (history.some(h => h.id === order.id)) {
        const idx = history.findIndex(h => h.id === order.id);
        history[idx] = { id: order.id, number: order.order_number, status: order.status, total: order.total, date: order.created_at, items: order.order_items?.length ?? 0 };
      } else {
        history.unshift({ id: order.id, number: order.order_number, status: order.status, total: order.total, date: order.created_at, items: order.order_items?.length ?? 0 });
      }
      localStorage.setItem(key, JSON.stringify(history.slice(0, 20)));
    } catch {}
  }, [order, restaurantSlug]);

  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`menius-history-${restaurantSlug}`);
      if (raw) setHistory(JSON.parse(raw).filter((h: any) => h.id !== order?.id));
    } catch {}
  }, [restaurantSlug, order?.id]);

  if (history.length === 0) return null;

  return (
    <div className="mt-2">
      <button onClick={() => setShowHistory(!showHistory)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2">
        {showHistory ? 'Ocultar' : `Ver ${history.length} pedido${history.length !== 1 ? 's' : ''} anterior${history.length !== 1 ? 'es' : ''}`}
      </button>
      {showHistory && (
        <div className="space-y-2 mt-1">
          {history.map((h: any) => (
            <Link key={h.id} href={`/${restaurantSlug}/orden/${h.number}`}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium">#{h.number}</p>
                <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {h.items} items</p>
              </div>
              <span className="text-sm font-bold text-gray-700">{formatPrice(Number(h.total), 'USD')}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
