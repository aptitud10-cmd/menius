'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import Image from 'next/image';
import { CheckCircle2, Check, Clock, ChefHat, Bell, Package, XCircle, ArrowLeft, Star, Wifi, Utensils, ShoppingBag, Truck, CreditCard, Banknote, MapPin, Phone, DoorOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { formatPrice, cn } from '@/lib/utils';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
const DeliveryMap = dynamic(
  () => import('./DeliveryMap').then((m) => m.DeliveryMap),
  { ssr: false, loading: () => <div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse" /> }
);

function getT(locale?: string, orderType?: string) {
  const en = locale === 'en';
  const isDelivery = orderType === 'delivery';
  return {
    en,
    loading: en ? 'Loading your order…' : 'Cargando tu pedido…',
    errorTitle: en ? 'Could not load your order' : 'No se pudo cargar el pedido',
    errorDesc: en ? 'There was a problem loading your order. It may take a few seconds.' : 'Hubo un problema al obtener el estado de tu pedido. Puede que tarde unos segundos en estar disponible.',
    tryAgain: en ? 'Try again' : 'Intentar de nuevo',
    backToMenu: en ? 'Back to menu' : 'Volver al menú',
    paymentReceived: en ? 'Payment received!' : '¡Pago recibido!',
    paymentReceivedDesc: en ? 'Your payment was processed successfully. The restaurant has received your order.' : 'Tu pago fue procesado exitosamente. El restaurante ha recibido tu pedido y lo está preparando.',
    viewOrderStatus: en ? 'View order status' : 'Ver estado del pedido',
    live: en ? 'Live' : 'En vivo',
    orderCancelled: en ? 'Order cancelled' : 'Pedido cancelado',
    orderCancelledDesc: en ? 'This order was cancelled.' : 'Este pedido fue cancelado.',
    orderDelivered: orderType === 'pickup'
      ? (en ? 'Order picked up!' : '¡Pedido recogido!')
      : orderType === 'dine_in'
        ? (en ? 'Order served!'  : '¡Pedido servido!')
        : (en ? 'Order delivered!' : '¡Pedido entregado!'),
    orderDeliveredDesc: en ? 'Enjoy your meal!' : 'Esperamos que disfrutes tu comida.',
    estimatedTime: en ? 'Estimated time' : 'Tiempo estimado',
    paymentConfirmed: en ? 'Payment confirmed!' : '¡Pago confirmado!',
    paymentConfirmedDesc: en ? "If you left your email, you'll receive a receipt." : 'Si dejaste tu email, recibirás un comprobante.',
    orderDetails: en ? 'Order details' : 'Detalles del pedido',
    customer: en ? 'Customer' : 'Cliente',
    phone: en ? 'Phone' : 'Teléfono',
    email: en ? 'Email' : 'Correo',
    table: en ? 'Table' : 'Mesa',
    type: en ? 'Type' : 'Tipo',
    payment: en ? 'Payment' : 'Pago',
    address: en ? 'Delivery address' : 'Dirección de entrega',
    notes: en ? 'Notes' : 'Notas',
    subtotal: en ? 'Subtotal' : 'Subtotal',
    taxes: en ? 'Taxes' : 'Impuestos',
    tip: en ? 'Tip' : 'Propina',
    deliveryFee: en ? 'Delivery fee' : 'Costo de envío',
    discount: en ? 'Discount' : 'Descuento',
    total: 'Total',
    viewPreviousOrders: en ? 'View all my previous orders →' : 'Ver todos mis pedidos anteriores →',
    reorder: en ? '🔄 Order the same again' : '🔄 Volver a pedir lo mismo',
    reviewTitle: en ? 'How was your experience?' : '¿Cómo estuvo tu experiencia?',
    reviewPlaceholder: en ? 'Tell us about your experience (optional)' : 'Cuéntanos tu experiencia (opcional)',
    reviewSubmitting: en ? 'Sending…' : 'Enviando…',
    reviewSubmit: en ? 'Submit review' : 'Enviar reseña',
    reviewThanks: en ? 'Thanks for your review!' : '¡Gracias por tu reseña!',
    cfdiBtn: 'Solicitar factura (CFDI)',
    cfdiTitle: 'Solicitar factura fiscal',
    cfdiDesc: 'Solo disponible para restaurantes en México. Recibirás tu CFDI 4.0 en formato XML y PDF.',
    cfdiRfc: 'RFC',
    cfdiRfcPlaceholder: 'XAXX010101000',
    cfdiRazonSocial: 'Razón social',
    cfdiUse: 'Uso del CFDI',
    cfdiRegimen: 'Régimen fiscal',
    cfdiCp: 'CP del domicilio fiscal',
    cfdiSubmit: 'Solicitar factura',
    cfdiSubmitting: 'Procesando…',
    cfdiSuccess: '¡Solicitud enviada! El restaurante procesará tu factura pronto.',
    cfdiIssuedXml: 'Descargar XML',
    cfdiIssuedPdf: 'Descargar PDF',
    cfdiError: 'Ocurrió un error. Intenta de nuevo.',
    callRestaurant: en ? 'Call restaurant' : 'Llamar al restaurante',
    steps: {
      // Header icon/text per DB status (detailed view)
      pending:   { label: en ? 'Received'    : 'Recibido',       desc: en ? 'Your order was received'           : 'Tu pedido fue recibido' },
      confirmed: { label: en ? 'Preparing'   : 'En preparación', desc: en ? 'Your order is being prepared'     : 'Tu pedido se está preparando' },
      preparing: { label: en ? 'Preparing'   : 'En preparación', desc: en ? 'Your order is being prepared'     : 'Tu pedido se está preparando' },
      ready:     { label: en ? 'Ready'       : 'Listo',          desc: isDelivery ? (en ? 'Your order is on its way!' : '¡Tu pedido está en camino!') : (en ? 'Your order is ready for pickup!' : '¡Tu pedido está listo para recoger!') },
      delivered: {
        label: orderType === 'pickup'
          ? (en ? 'Picked up'  : 'Recogido')
          : orderType === 'dine_in'
            ? (en ? 'Served'   : 'Servido')
            : (en ? 'Delivered': 'Entregado'),
        desc: orderType === 'pickup'
          ? (en ? 'Order picked up. Enjoy your meal!'  : '¡Pedido recogido. Buen provecho!')
          : orderType === 'dine_in'
            ? (en ? 'Order served. Enjoy your meal!'   : '¡Pedido servido. Buen provecho!')
            : (en ? 'Order delivered. Enjoy your meal!': 'Pedido entregado. ¡Buen provecho!'),
      },
    },
    // 4-step progress bar labels (customer-facing simplified)
    customerSteps: {
      pending:   en ? 'Received'    : 'Recibido',
      preparing: en ? 'Preparing'   : 'Preparando',
      ready:     isDelivery ? (en ? 'On its way' : 'En camino') : (en ? 'Ready'   : 'Listo'),
      delivered: orderType === 'pickup'
        ? (en ? 'Picked up' : 'Recogido')
        : orderType === 'dine_in'
          ? (en ? 'Served'  : 'Servido')
          : (en ? 'Delivered': 'Entregado'),
    },
    orderTypes: {
      dine_in:  { icon: Utensils,  label: en ? 'Dine-in'  : 'En restaurante' },
      pickup:   { icon: ShoppingBag, label: en ? 'Pickup' : 'Para recoger' },
      delivery: { icon: Truck,     label: en ? 'Delivery' : 'Delivery' },
    },
    paymentMethods: {
      cash:   { icon: Banknote,   label: en ? 'Cash'        : 'Efectivo' },
      online: { icon: CreditCard, label: en ? 'Paid online' : 'Pagado online' },
    },
  };
}

const STEP_STYLES: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  pending:   { icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-100' },
  confirmed: { icon: ChefHat,      color: 'text-violet-600',  bg: 'bg-violet-100' },
  preparing: { icon: ChefHat,      color: 'text-violet-600',  bg: 'bg-violet-100' },
  ready:     { icon: Bell,         color: 'text-orange-600',  bg: 'bg-orange-100' },
  delivered: { icon: Package,      color: 'text-[#05c8a7]', bg: 'bg-[#d0f7f1]' },
};

// Customer-visible progress steps: confirmed and preparing both map to step 1 ("En preparación")
const CUSTOMER_STEPS = ['pending', 'preparing', 'ready', 'delivered'] as const;
const STATUS_TO_CUSTOMER_STEP: Record<string, typeof CUSTOMER_STEPS[number]> = {
  pending:   'pending',
  confirmed: 'preparing',
  preparing: 'preparing',
  ready:     'ready',
  delivered: 'delivered',
};

interface OrderTrackerProps {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  orderNumber: string;
  currency?: string;
  locale?: string;
  showPaidBanner?: boolean;
  /** Pre-fetched order data from the server component — renders immediately without a client fetch */
  initialOrder?: any;
}

export function OrderTracker({ restaurantId, restaurantName, restaurantSlug, restaurantAddress, restaurantPhone, orderNumber, currency = 'MXN', locale, showPaidBanner = false, initialOrder }: OrderTrackerProps) {
  const t = getT(locale);
  const [order, setOrder] = useState<any>(initialOrder ?? null);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState('');
  const [paidBannerVisible, setPaidBannerVisible] = useState(showPaidBanner);
  const [rtStatus, setRtStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('reconnecting');

  const hasInitialOrder = !!initialOrder;

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/order-track?order=${encodeURIComponent(orderNumber)}&restaurant=${encodeURIComponent(restaurantId)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        if (!hasInitialOrder) setError('not_found');
        return;
      }
      const orderData = await res.json();
      if (orderData && !orderData.error) {
        setOrder(orderData);
        setError('');
      } else if (!hasInitialOrder) {
        setError('not_found');
      }
    } catch {
      if (!hasInitialOrder) setError('connection_error');
    } finally {
      setLoading(false);
    }
  }, [orderNumber, restaurantId, hasInitialOrder]);

  useEffect(() => {
    // If we already have initialOrder, still refresh in background to get latest status
    fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling fallback — refreshes order every 15 s so status updates even if
  // realtime websocket is unavailable (e.g. anon key has no realtime perms).
  useEffect(() => {
    if (!order?.id || order.status === 'delivered' || order.status === 'cancelled') return;
    const interval = setInterval(fetchOrder, 15_000);
    return () => clearInterval(interval);
  }, [order?.id, order?.status, fetchOrder]);

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
        () => {
          // Full refetch instead of partial merge: ensures joined fields
          // (driver timestamps, payment_status, etc.) are always up-to-date.
          fetchOrder();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRtStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRtStatus('disconnected');
        } else {
          setRtStatus('reconnecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  // fetchOrder is stable (useCallback with fixed deps)
  }, [order?.id, fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    if (showPaidBanner) {
      return (
        <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-[#d0f7f1] flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-[#05c8a7]" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t.paymentReceived}</h1>
            <p className="text-sm text-gray-500 mb-6">{t.paymentReceivedDesc}</p>
            <div className="space-y-3">
              <button
                onClick={() => { setLoading(true); setError(''); fetchOrder(); }}
                className="w-full py-3.5 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-colors"
              >
                {t.viewOrderStatus}
              </button>
              <Link href={`/${restaurantSlug}`} className="block w-full py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                {t.backToMenu}
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.errorTitle}</h1>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">{t.errorDesc}</p>
          <div className="space-y-3">
            <button
              onClick={() => { setLoading(true); setError(''); fetchOrder(); }}
              className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors"
            >
              {t.tryAgain}
            </button>
            <Link href={`/${restaurantSlug}`} className="block w-full py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
              {t.backToMenu}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const customerStep = STATUS_TO_CUSTOMER_STEP[order.status] ?? 'pending';
  const currentStepIndex = CUSTOMER_STEPS.indexOf(customerStep);
  const isComplete = order.status === 'delivered';
  const currentStepStyle = STEP_STYLES[order.status];
  const tWithType = getT(locale, order.order_type);
  const currentStepText = tWithType.steps[order.status as keyof typeof tWithType.steps];

  // Dynamic subtitle per status
  const statusSubtitle = (() => {
    const en = tWithType.en;
    switch (order.status) {
      case 'pending':   return en ? `${restaurantName} received your order` : `${restaurantName} recibió tu pedido`;
      case 'confirmed':
      case 'preparing': return en ? `${restaurantName} is preparing your order` : `${restaurantName} está preparando tu pedido`;
      case 'ready':     return order.order_type === 'delivery'
                          ? ((order as any).driver_at_door_at
                              ? (en ? 'Your driver is at the door!' : '¡Tu repartidor está en la puerta!')
                              : (order as any).driver_picked_up_at
                                ? (en ? 'Your order is on its way!' : '¡Tu pedido está en camino!')
                                : (en ? 'Your order is ready for dispatch' : 'Tu pedido está listo para envío'))
                          : (en ? 'Your order is ready for pickup!' : '¡Tu pedido está listo para recoger!');
      case 'delivered': return en ? 'Enjoy your meal!' : '¡Buen provecho!';
      default:          return '';
    }
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tracker-card { animation: fadeInUp 0.45s ease-out both; }
        .tracker-card:nth-child(2) { animation-delay: 0.05s; }
        .tracker-card:nth-child(3) { animation-delay: 0.1s; }
        .tracker-card:nth-child(4) { animation-delay: 0.15s; }
      `}</style>

      {/* Sticky nav bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${restaurantSlug}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors active:scale-95">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-sm font-bold font-heading leading-tight">{restaurantName}</h1>
              <p className="text-[11px] text-gray-400">{t.en ? 'Order' : 'Pedido'} #{order.order_number}</p>
            </div>
          </div>
          {rtStatus === 'connected' ? (
            <div className="flex items-center gap-1 text-[10px] text-[#047a65] font-semibold bg-[#e6faf7] px-2.5 py-1 rounded-full border border-[#b3efe6]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#05c8a7] animate-pulse" />
              {t.live}
            </div>
          ) : rtStatus === 'reconnecting' ? (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
              <Wifi className="w-3 h-3 animate-pulse" />
              {t.en ? 'Connecting…' : 'Conectando…'}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-red-500 font-semibold bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {t.en ? 'Offline' : 'Sin conexión'}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        {/* Payment confirmed banner */}
        {paidBannerVisible && (
          <div className="tracker-card flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-[#e6faf7] border border-[#b3efe6]">
            <div className="w-9 h-9 rounded-xl bg-[#d0f7f1] flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-[#05c8a7]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#047a65]">{t.paymentConfirmed}</p>
              <p className="text-xs text-[#05c8a7] mt-0.5">{t.paymentConfirmedDesc}</p>
            </div>
            <button
              onClick={() => setPaidBannerVisible(false)}
              className="flex-shrink-0 p-1 text-[#05c8a7] hover:text-[#047a65] transition-colors"
              aria-label={t.en ? 'Close' : 'Cerrar'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── STATUS HERO CARD ── */}
        <div className="tracker-card bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {isCancelled ? (
            <div className="text-center py-12 px-6">
              <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-red-600 mb-1">{t.orderCancelled}</h2>
              <p className="text-sm text-gray-500">{t.orderCancelledDesc}</p>
            </div>
          ) : (
            <>
              {/* Colored accent strip */}
              <div className={cn(
                'h-1 w-full',
                isComplete ? 'bg-[#05c8a7]' :
                order.status === 'ready' ? 'bg-orange-400' :
                ['confirmed', 'preparing'].includes(order.status) ? 'bg-violet-500' :
                'bg-amber-400'
              )} />

              {/* Icon + title + subtitle */}
              <div className="px-6 pt-8 pb-6 text-center">
                {isComplete ? (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-[#d0f7f1] flex items-center justify-center mx-auto mb-5">
                      <Package className="w-10 h-10 text-[#05c8a7]" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-1">{t.orderDelivered}</h2>
                    <p className="text-sm text-gray-500">{t.orderDeliveredDesc}</p>
                  </>
                ) : currentStepStyle && currentStepText ? (
                  <>
                    <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5', currentStepStyle.bg)}>
                      <currentStepStyle.icon className={cn('w-10 h-10', currentStepStyle.color)} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-1">{currentStepText.label}</h2>
                    <p className="text-sm text-gray-500 leading-snug">{statusSubtitle}</p>
                  </>
                ) : null}
              </div>

              {/* ── Timeline with circles ── */}
              <div className="px-6 pb-8">
                <div className="flex items-start">
                  {CUSTOMER_STEPS.map((key, i) => {
                    const isDone   = i < currentStepIndex;
                    const isActive = i === currentStepIndex;
                    return (
                      <Fragment key={key}>
                        {/* Circle + label */}
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="relative">
                            {/* Ping ring on active step */}
                            {isActive && (
                              <span className="absolute inset-0 rounded-full bg-brand-400 animate-ping opacity-30" />
                            )}
                            <div className={cn(
                              'relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500',
                              isDone   ? 'bg-brand-500 border-brand-500' :
                              isActive ? 'bg-brand-500 border-brand-500' :
                              'bg-white border-gray-200'
                            )}>
                              {isDone ? (
                                <Check className="w-4 h-4 text-white" strokeWidth={3} />
                              ) : (
                                <div className={cn('w-2 h-2 rounded-full', isActive ? 'bg-white' : 'bg-gray-300')} />
                              )}
                            </div>
                          </div>
                          <span className={cn(
                            'text-[9px] font-semibold text-center leading-tight w-14',
                            isDone || isActive ? 'text-brand-600' : 'text-gray-300'
                          )}>
                            {tWithType.customerSteps[key]}
                          </span>
                        </div>

                        {/* Connecting line between circles */}
                        {i < CUSTOMER_STEPS.length - 1 && (
                          <div className={cn(
                            'flex-1 h-0.5 mt-[18px] mx-1 transition-all duration-700',
                            i < currentStepIndex ? 'bg-brand-500' : 'bg-gray-100'
                          )} />
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── MAP HERO — promoted to top when driver is on the road ── */}
        {order.order_type === 'delivery' && restaurantAddress && (order as any).driver_picked_up_at && order.status !== 'delivered' && (
          <div className="tracker-card rounded-3xl overflow-hidden shadow-md">
            <DeliveryMap
              restaurantAddress={restaurantAddress}
              deliveryAddress={order.delivery_address}
              restaurantName={restaurantName}
              driverLat={(order as any).driver_lat ?? null}
              driverLng={(order as any).driver_lng ?? null}
              locale={locale}
            />
          </div>
        )}

        {/* ── ETA HERO (Uber-style large display) ── */}
        {order.estimated_ready_minutes && ['confirmed', 'preparing'].includes(order.status) && (() => {
          const confirmedAt = order.updated_at ? new Date(order.updated_at) : new Date(order.created_at);
          const etaTime   = new Date(confirmedAt.getTime() + order.estimated_ready_minutes * 60_000);
          const etaLocale = t.en ? 'en-US' : 'es-MX';
          const etaStr    = etaTime.toLocaleTimeString(etaLocale, { hour: '2-digit', minute: '2-digit' });
          const minsLeft  = Math.max(0, Math.round((etaTime.getTime() - Date.now()) / 60_000));
          return (
            <div className="tracker-card rounded-3xl bg-gradient-to-br from-[#e6faf7] to-[#d0f7f1] border border-[#b3efe6] shadow-sm overflow-hidden">
              <div className="px-6 py-7 text-center">
                <p className="text-[11px] font-bold text-[#05c8a7] uppercase tracking-widest mb-3">{t.estimatedTime}</p>
                {minsLeft > 0 ? (
                  <div className="flex items-end justify-center gap-1 mb-1">
                    <span className="text-[72px] font-black text-[#047a65] leading-none tabular-nums">~{minsLeft}</span>
                    <span className="text-2xl font-bold text-[#05c8a7] mb-3">min</span>
                  </div>
                ) : (
                  <p className="text-4xl font-black text-[#047a65] mb-1">
                    {t.en ? 'Almost ready!' : '¡Ya casi!'}
                  </p>
                )}
                <p className="text-sm text-[#05c8a7] font-medium">
                  {t.en ? `Ready by ${etaStr}` : `Listo a las ${etaStr}`}
                </p>
              </div>
              {/* Progress shimmer bar */}
              <div className="h-1 bg-[#d0f7f1] relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-[#05c8a7] animate-pulse" style={{ width: `${Math.min(100, 100 - (minsLeft / order.estimated_ready_minutes) * 100)}%`, transition: 'width 1s ease' }} />
              </div>
            </div>
          );
        })()}

        {/* ── DRIVER CARD + STATUS BANNERS (delivery only) ── */}
        {order.order_type === 'delivery' && order.status === 'ready' && (
          <>
            {/* Driver card — shown as soon as driver picks up */}
            {(order as any).driver_picked_up_at && !(order as any).driver_at_door_at && (
              <div className="tracker-card rounded-3xl overflow-hidden shadow-lg">
                {/* Gradient header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-5">
                  <div className="flex items-center gap-4">
                    {/* Driver avatar — animated motorcycle */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl">
                        🛵
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#05c8a7] border-2 border-blue-600 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
                        {t.en ? 'Your driver' : 'Tu repartidor'}
                      </p>
                      <p className="text-lg font-black text-white leading-tight">
                        {t.en ? 'On the way!' : '¡En camino!'}
                      </p>
                      <p className="text-sm text-blue-200 mt-0.5">
                        {t.en ? 'Heading to your address' : 'Dirigiéndose a tu dirección'}
                      </p>
                    </div>
                    {/* Live GPS indicator */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#05c8a7] animate-pulse" />
                      <span className="text-[9px] font-bold text-blue-200 uppercase">GPS</span>
                    </div>
                  </div>
                </div>
                {/* Call button strip */}
                {order.customer_phone && (
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-50 border-t border-blue-100 text-blue-600 text-sm font-bold hover:bg-blue-100 active:bg-blue-200 transition-colors"
                  >
                    <Truck className="w-4 h-4" />
                    {t.en ? 'Track on map ↓' : 'Ver en mapa ↓'}
                  </a>
                )}
              </div>
            )}

            {/* "Driver at door" — highest urgency, full pulsing card */}
            {(order as any).driver_at_door_at && (
              <div className="tracker-card rounded-3xl overflow-hidden shadow-xl border-2 border-orange-300">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-5">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl animate-bounce">
                        🚪
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest">
                        {t.en ? 'Driver arrived!' : '¡Repartidor llegó!'}
                      </p>
                      <p className="text-xl font-black text-white leading-tight">
                        {t.en ? 'At your door now' : 'Está en tu puerta'}
                      </p>
                      <p className="text-sm text-orange-100 mt-0.5">
                        {t.en ? 'Please come to the door' : 'Por favor acércate a la puerta'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50">
                  <ComingOutButton orderId={order.id} locale={locale} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── WAITER CALL BUTTON (dine-in only, while order is active) ── */}
        {order.order_type === 'dine_in' && !isCancelled && !isComplete && (
          <WaiterCallButton orderId={order.id} tableName={(order as any).table_name} locale={locale} />
        )}

        {/* Push notification prompt */}
        {!isCancelled && !isComplete && (
          <PushSubscriptionPrompt orderId={order.id} locale={locale} />
        )}

        {/* ── ORDER DETAILS CARD ── */}
        <div className="tracker-card bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900">{t.orderDetails}</h3>
          </div>

          {/* Customer info rows — structured per order type */}
          <div className="px-5 py-4 space-y-3">
            {/* Name */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{t.customer}</span>
              <span className="text-sm font-semibold text-gray-800">{order.customer_name}</span>
            </div>

            {/* Phone */}
            {order.customer_phone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{t.phone}</span>
                <a
                  href={`tel:${order.customer_phone}`}
                  className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {order.customer_phone}
                </a>
              </div>
            )}

            {/* Email */}
            {order.customer_email && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-400 flex-shrink-0">{t.email}</span>
                <span className="text-sm font-semibold text-gray-800 text-right truncate">{order.customer_email}</span>
              </div>
            )}

            {/* Delivery address — prominent */}
            {order.order_type === 'delivery' && order.delivery_address && (
              <div className="mt-1 rounded-2xl bg-violet-50 border border-violet-200 px-4 py-3 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wide mb-0.5">{t.address}</p>
                  <p className="text-sm font-semibold text-violet-900">{order.delivery_address}</p>
                </div>
              </div>
            )}

            {/* Table name — dine-in */}
            {order.order_type === 'dine_in' && order.table_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{t.table}</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <Utensils className="w-3.5 h-3.5 text-gray-400" /> {order.table_name}
                </span>
              </div>
            )}

            {/* Order type */}
            {t.orderTypes[order.order_type as keyof typeof t.orderTypes] && (() => {
              const ot = t.orderTypes[order.order_type as keyof typeof t.orderTypes];
              return (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{t.type}</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <ot.icon className="w-3.5 h-3.5 text-gray-400" /> {ot.label}
                  </span>
                </div>
              );
            })()}

            {/* Payment method */}
            {t.paymentMethods[order.payment_method as keyof typeof t.paymentMethods] && (() => {
              const pm = t.paymentMethods[order.payment_method as keyof typeof t.paymentMethods];
              return (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{t.payment}</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <pm.icon className="w-3.5 h-3.5 text-gray-400" /> {pm.label}
                  </span>
                </div>
              );
            })()}

            {/* Notes */}
            {order.notes && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-gray-400 flex-shrink-0">{t.notes}</span>
                <span className="text-sm text-gray-600 text-right max-w-[60%] italic">&quot;{order.notes}&quot;</span>
              </div>
            )}
          </div>

          {/* Items list */}
          <div className="px-5 py-4 border-t border-gray-50 space-y-3">
            {order.order_items?.map((item: any) => {
              // Support both RPC flat format (product_name) and nested format (products?.name)
              const productName = item.product_name ?? item.products?.name ?? (t.en ? 'Item' : 'Producto');
              const variantName = item.variant_name ?? item.product_variants?.name;
              return (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      <span className="text-brand-600 font-bold">{item.qty}×</span>{' '}
                      {productName}
                      {variantName && (
                        <span className="text-gray-400 font-normal text-xs ml-1">({variantName})</span>
                      )}
                    </p>
                    {(item.order_item_extras ?? []).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        + {(item.order_item_extras ?? []).map((ex: any) => ex.product_extras?.name).filter(Boolean).join(', ')}
                      </p>
                    )}
                    {(item.order_item_modifiers ?? []).map((mod: any, i: number) => (
                      <p key={i} className="text-xs text-gray-400">{mod.group_name}: {mod.option_name}</p>
                    ))}
                    {item.notes && <p className="text-xs text-amber-600 italic mt-0.5">&quot;{item.notes}&quot;</p>}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{formatPrice(Number(item.line_total ?? item.unit_price), currency)}</span>
                </div>
              );
            })}
          </div>

          {/* Price breakdown */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-2">
            {/* Subtotal — only shown when there are additional line items to explain */}
            {(Number(order.tax_amount) > 0 || Number(order.tip_amount) > 0 || Number(order.delivery_fee) > 0 || Number(order.discount_amount) > 0) && (() => {
              const subtotal = Number(order.total)
                - Number(order.tax_amount ?? 0)
                - Number(order.tip_amount ?? 0)
                - Number(order.delivery_fee ?? 0)
                + Number(order.discount_amount ?? 0);
              return (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{t.subtotal}</span>
                  <span>{formatPrice(subtotal, currency)}</span>
                </div>
              );
            })()}

            {Number(order.discount_amount) > 0 && (
              <div className="flex items-center justify-between text-sm text-[#05c8a7]">
                <span>{t.discount}</span>
                <span>-{formatPrice(Number(order.discount_amount), currency)}</span>
              </div>
            )}

            {order.order_type === 'delivery' && Number(order.delivery_fee) > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{t.deliveryFee}</span>
                <span>{formatPrice(Number(order.delivery_fee), currency)}</span>
              </div>
            )}

            {Number(order.tax_amount) > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{t.taxes}</span>
                <span>{formatPrice(Number(order.tax_amount), currency)}</span>
              </div>
            )}

            {Number(order.tip_amount) > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{t.tip}</span>
                <span>{formatPrice(Number(order.tip_amount), currency)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-base font-bold text-gray-900">{t.total}</span>
              <span className="text-2xl font-black text-brand-600">{formatPrice(Number(order.total), currency)}</span>
            </div>
          </div>
        </div>

        {/* Delivery map — static position (shown when driver not yet active or order complete) */}
        {order.order_type === 'delivery' && restaurantAddress && (!(order as any).driver_picked_up_at || order.status === 'delivered') && (
          <div className="tracker-card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{t.en ? 'Location' : 'Ubicación'}</p>
            <DeliveryMap
              restaurantAddress={restaurantAddress}
              deliveryAddress={order.delivery_address}
              restaurantName={restaurantName}
              driverLat={(order as any).driver_lat ?? null}
              driverLng={(order as any).driver_lng ?? null}
              locale={locale}
            />
          </div>
        )}

        {/* Delivery proof photo */}
        {isComplete && (order as any).delivery_photo_url && (
          <div className="tracker-card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {t.en ? 'Delivery photo' : 'Foto de entrega'}
            </p>
            <a href={(order as any).delivery_photo_url} target="_blank" rel="noopener noreferrer">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                <Image
                  src={(order as any).delivery_photo_url}
                  alt={t.en ? 'Delivery proof' : 'Foto de entrega'}
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-contain"
                />
              </div>
            </a>
          </div>
        )}

        {/* Review prompt */}
        {isComplete && (
          <ReviewPrompt restaurantId={restaurantId} orderId={order.id} customerName={order.customer_name} locale={locale} />
        )}

        {/* Reorder */}
        {isComplete && order.order_items?.length > 0 && (
          <button
            onClick={() => {
              const reorderItems = order.order_items.map((item: any) => ({
                product_id: item.product_id,
                name: item.product_name ?? item.products?.name ?? (t.en ? 'Item' : 'Producto'),
                qty: item.qty,
                price: Number(item.unit_price),
                variant_id: item.variant_id,
                variant_name: item.variant_name ?? item.product_variants?.name,
                image_url: item.products?.image_url,
              }));
              localStorage.setItem('menius-reorder', JSON.stringify(reorderItems));
              window.location.href = `/${restaurantSlug}?reorder=1`;
            }}
            className="tracker-card block w-full py-3.5 rounded-2xl bg-[#05c8a7] text-white text-center font-bold text-sm hover:bg-[#04b096] active:scale-[0.98] transition-all shadow-lg shadow-[#05c8a7]/20"
          >
            {t.reorder}
          </button>
        )}

        {/* CFDI invoice */}
        {isComplete && currency === 'MXN' && (
          <CfdiButton orderId={order.id} restaurantId={restaurantId} t={t} />
        )}

        {/* ── CTA BUTTONS ── */}
        <div className="tracker-card space-y-2.5">
          <Link
            href={`/${restaurantSlug}`}
            className="block w-full py-4 rounded-2xl bg-brand-500 text-white text-center font-bold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all shadow-md shadow-brand-500/20"
          >
            {t.backToMenu}
          </Link>
          {restaurantPhone && (
            <a
              href={`tel:${restaurantPhone}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              <Phone className="w-4 h-4" />
              {t.callRestaurant}
            </a>
          )}
        </div>

        {/* My orders history link */}
        <Link
          href={`/${restaurantSlug}/mis-pedidos`}
          className="block w-full py-2.5 text-center text-xs text-gray-400 hover:text-brand-600 transition-colors"
        >
          {t.viewPreviousOrders}
        </Link>

        {/* Save order to local history */}
        <OrderHistorySaver order={order} restaurantSlug={restaurantSlug} restaurantName={restaurantName} locale={locale} currency={currency} />
      </div>
    </div>
  );
}

function ComingOutButton({ orderId, locale }: { orderId: string; locale?: string }) {
  const en = locale === 'en';
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'sent_no_driver'>('idle');

  const handlePress = async () => {
    if (state !== 'idle') return;
    setState('sending');
    try {
      const res = await fetch('/api/public/customer-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'coming_out' }),
      });
      const data = await res.json().catch(() => ({}));
      setState(data.notified === false ? 'sent_no_driver' : 'sent');
    } catch {
      setState('sent');
    }
  };

  if (state === 'sent') {
    return (
      <div className="px-5 pb-4 text-center">
        <p className="text-sm font-semibold text-orange-700">
          {en ? '✓ Driver notified — on your way!' : '✓ Repartidor avisado — ¡ya voy!'}
        </p>
      </div>
    );
  }

  if (state === 'sent_no_driver') {
    return (
      <div className="px-5 pb-4 text-center">
        <p className="text-sm font-semibold text-gray-600">
          {en ? '✓ On your way! The restaurant has been notified.' : '✓ ¡Ya puedes salir! El restaurante fue notificado.'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-4">
      <button
        onClick={handlePress}
        disabled={state === 'sending'}
        className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-60 shadow-md shadow-orange-500/30"
      >
        {state === 'sending'
          ? (en ? 'Notifying driver…' : 'Avisando al repartidor…')
          : (en ? '🚶 I\'m coming out!' : '🚶 ¡Ya salgo!')}
      </button>
    </div>
  );
}

function WaiterCallButton({ orderId, tableName, locale }: { orderId: string; tableName?: string | null; locale?: string }) {
  const en = locale === 'en';
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = async () => {
    if (state !== 'idle' || cooldown > 0) return;
    setState('sending');
    try {
      await fetch('/api/public/waiter-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
    } catch { /* silent */ }
    setState('sent');
    // 3-minute cooldown to avoid spamming
    let secs = 180;
    setCooldown(secs);
    timerRef.current = setInterval(() => {
      secs -= 1;
      setCooldown(secs);
      if (secs <= 0) {
        clearInterval(timerRef.current!);
        setState('idle');
        setCooldown(0);
      }
    }, 1000);
  };

  const label = tableName
    ? (en ? `Table ${tableName} needs attention` : `Mesa ${tableName} necesita atención`)
    : (en ? 'Waiter needed' : 'Mesero necesita atención');

  if (state === 'sent' && cooldown > 0) {
    const mins = Math.floor(cooldown / 60);
    const secs = cooldown % 60;
    const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-violet-50 border border-violet-200">
        <p className="text-sm font-semibold text-violet-700">
          {en ? '✓ Staff notified!' : '✓ ¡Personal avisado!'}
        </p>
        <p className="text-xs text-violet-400">{en ? `Again in ${timeStr}` : `De nuevo en ${timeStr}`}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handlePress}
      disabled={state === 'sending' || cooldown > 0}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-50 border border-violet-200 text-violet-700 font-semibold text-sm hover:bg-violet-100 active:scale-[0.98] transition-all disabled:opacity-50"
    >
      <span className="text-base">🙋</span>
      {state === 'sending'
        ? (en ? 'Notifying staff…' : 'Avisando al personal…')
        : (en ? 'Call waiter' : 'Llamar al mesero')}
    </button>
  );
}

function PushSubscriptionPrompt({ orderId, locale }: { orderId: string; locale?: string }) {
  const en = locale === 'en';
  const [state, setState] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'granted') setState('subscribed');
    if (Notification.permission === 'denied') setState('denied');
    // Check if already subscribed for this order
    const key = `push-subscribed-${orderId}`;
    if (localStorage.getItem(key)) setState('subscribed');
  }, [orderId]);

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); return; }

      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/push/subscribe');
      const { publicKey } = await keyRes.json();
      if (!publicKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), order_id: orderId }),
      });

      localStorage.setItem(`push-subscribed-${orderId}`, '1');
      setState('subscribed');
    } catch {
      setState('denied');
    }
  };

  if (state === 'subscribed' || state === 'unsupported' || state === 'denied') return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-violet-50 border border-violet-200">
      <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-violet-800">
          {en ? 'Get order updates' : 'Recibe actualizaciones'}
        </p>
        <p className="text-xs text-violet-600 mt-0.5">
          {en ? 'We\'ll notify you when your order status changes.' : 'Te avisamos cuando cambie el estado de tu pedido.'}
        </p>
      </div>
      <button
        onClick={handleSubscribe}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
      >
        {en ? 'Notify me' : 'Activar'}
      </button>
    </div>
  );
}

function ReviewPrompt({ restaurantId, orderId, customerName, locale }: { restaurantId: string; orderId: string; customerName: string; locale?: string }) {
  const t = getT(locale);
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
      <div className="bg-[#e6faf7] border border-[#b3efe6] rounded-2xl p-5 text-center">
        <Star className="w-8 h-8 text-[#05c8a7] mx-auto mb-2" />
        <p className="text-[#047a65] font-semibold">{t.reviewThanks}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-sm mb-3 text-center">{t.reviewTitle}</h3>
      <div className="flex justify-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} onClick={() => setRating(s)}>
            <Star className={cn('w-7 h-7 transition', s <= rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300')} />
          </button>
        ))}
      </div>
      <textarea
        value={comment} onChange={e => setComment(e.target.value)}
        placeholder={t.reviewPlaceholder} rows={2}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none mb-3"
      />
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-400 disabled:opacity-50 transition"
      >
        {submitting ? t.reviewSubmitting : t.reviewSubmit}
      </button>
    </div>
  );
}

function OrderSuccessRedirect({ restaurantSlug }: { restaurantSlug: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/${restaurantSlug}`);
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
        <div className="w-16 h-16 rounded-2xl bg-[#d0f7f1] flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#05c8a7]" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Tu pedido fue procesado exitosamente</h2>
        <p className="text-sm text-gray-500 mb-6 animate-pulse">Regresando al menú...</p>
        <Link
          href={`/${restaurantSlug}`}
              className="px-6 py-3 rounded-xl bg-[#05c8a7] text-white font-semibold text-sm hover:bg-[#04b096] transition-colors"
        >
          Ir al menú
        </Link>
      </div>
    </div>
  );
}

function OrderHistorySaver({ order, restaurantSlug, restaurantName, locale, currency }: { order: any; restaurantSlug: string; restaurantName: string; locale?: string; currency?: string }) {
  const en = locale === 'en';
  const displayCurrency = currency ?? 'MXN';
  const dateLocale = en ? 'en-US' : 'es-MX';

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

  const toggleLabel = showHistory
    ? (en ? 'Hide' : 'Ocultar')
    : en
      ? `See ${history.length} previous order${history.length !== 1 ? 's' : ''}`
      : `Ver ${history.length} pedido${history.length !== 1 ? 's' : ''} anterior${history.length !== 1 ? 'es' : ''}`;

  return (
    <div className="mt-2">
      <button onClick={() => setShowHistory(!showHistory)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2">
        {toggleLabel}
      </button>
      {showHistory && (
        <div className="space-y-2 mt-1">
          {history.map((h: any) => (
            <Link key={h.id} href={`/${restaurantSlug}/orden/${h.number}`}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium">#{h.number}</p>
                <p className="text-xs text-gray-400">
                  {new Date(h.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {h.items} {en ? 'items' : 'items'}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-700">{formatPrice(Number(h.total), displayCurrency)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const CFDI_USES_OPTIONS = [
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'G02', label: 'G02 — Devoluciones, descuentos o bonificaciones' },
  { value: 'D01', label: 'D01 — Honorarios médicos, dentales y hospitalarios' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 — Pagos' },
  { value: 'CN01', label: 'CN01 — Nómina' },
];

const REGIMEN_OPTIONS = [
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '612', label: '612 — Personas Físicas con Actividades Empresariales' },
  { value: '626', label: '626 — Simplificado de Confianza (RESICO)' },
  { value: '621', label: '621 — Incorporación Fiscal' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '608', label: '608 — Demás ingresos' },
  { value: '616', label: '616 — Sin obligaciones fiscales' },
];

function CfdiButton({ orderId, restaurantId, t }: { orderId: string; restaurantId: string; t: ReturnType<typeof getT> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rfc: '', razonSocial: '', cfdiUse: 'G03', regimenFiscal: '601', cpDomicilio: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; xmlUrl?: string; pdfUrl?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/billing/cfdi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, restaurantId, ...form, razonSocial: form.razonSocial }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ error: data.error ?? t.cfdiError });
      } else {
        setResult({ success: true, message: data.message ?? t.cfdiSuccess, xmlUrl: data.xmlUrl, pdfUrl: data.pdfUrl });
      }
    } catch {
      setResult({ error: t.cfdiError });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full py-3 rounded-xl border border-gray-200 bg-white text-center text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        🧾 {t.cfdiBtn}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">🧾 {t.cfdiTitle}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t.cfdiDesc}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {result?.success ? (
              <div className="p-5 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#d0f7f1] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-[#05c8a7]" />
                </div>
                <p className="text-sm font-semibold text-gray-800">{result.message ?? t.cfdiSuccess}</p>
                {result.xmlUrl && (
                  <a href={result.xmlUrl} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
                    📄 {t.cfdiIssuedXml}
                  </a>
                )}
                {result.pdfUrl && (
                  <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-2.5 rounded-xl bg-[#05c8a7] text-white text-sm font-semibold hover:bg-[#04b096] transition-colors">
                    📋 {t.cfdiIssuedPdf}
                  </a>
                )}
                <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600">Cerrar</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {result?.error && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                    {result.error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.cfdiRfc}</label>
                  <input
                    required
                    value={form.rfc}
                    onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                    placeholder={t.cfdiRfcPlaceholder}
                    maxLength={13}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#05c8a7] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.cfdiRazonSocial}</label>
                  <input
                    required
                    value={form.razonSocial}
                    onChange={e => setForm(f => ({ ...f, razonSocial: e.target.value }))}
                    placeholder="Nombre o razón social"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#05c8a7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.cfdiUse}</label>
                  <select
                    value={form.cfdiUse}
                    onChange={e => setForm(f => ({ ...f, cfdiUse: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#05c8a7] bg-white"
                  >
                    {CFDI_USES_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.cfdiRegimen}</label>
                  <select
                    value={form.regimenFiscal}
                    onChange={e => setForm(f => ({ ...f, regimenFiscal: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#05c8a7] bg-white"
                  >
                    {REGIMEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.cfdiCp}</label>
                  <input
                    value={form.cpDomicilio}
                    onChange={e => setForm(f => ({ ...f, cpDomicilio: e.target.value }))}
                    placeholder="00000"
                    maxLength={5}
                    inputMode="numeric"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#05c8a7]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !form.rfc || !form.razonSocial}
                  className="w-full py-3 rounded-xl bg-[#05c8a7] text-white font-semibold text-sm hover:bg-[#04b096] transition-colors disabled:opacity-50"
                >
                  {submitting ? t.cfdiSubmitting : t.cfdiSubmit}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
