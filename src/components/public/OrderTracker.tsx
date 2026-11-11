'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { CheckCircle2, Check, Clock, Bell, XCircle, ArrowLeft, Star, Utensils, ShoppingBag, Truck, CreditCard, Banknote, Phone } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatPrice } from '@/lib/utils';
import { travelMinutes, haversineKm } from '@/lib/orders/eta';
import { MINUTES_PER_STOP_AHEAD } from '@/lib/orders/driver-route';
import { isAwaitingOnlinePayment } from '@/lib/order-state';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import ShareReceiptButton from './ShareReceiptButton';

// Paleta del seguimiento = la de los emails al cliente, con modo oscuro
// automático (prefers-color-scheme). Los valores claros son los del Counter.
const K = {
  surface: 'var(--tk-surface)', card: 'var(--tk-card)', line: 'var(--tk-line)',
  ink: 'var(--tk-ink)', sub: 'var(--tk-sub)', faint: 'var(--tk-faint)',
  btn: 'var(--tk-btn)', btnFg: 'var(--tk-btn-fg)',
  green: 'var(--tk-green)', greenInk: 'var(--tk-green-ink)', greenDeep: 'var(--tk-green-deep)', greenSoft: 'var(--tk-green-soft)',
  violet: 'var(--tk-violet)', violetSoft: 'var(--tk-violet-soft)',
  orange: 'var(--tk-orange)', orangeSoft: 'var(--tk-orange-soft)', amber: 'var(--tk-amber)',
  red: 'var(--tk-red)', redSoft: 'var(--tk-red-soft)',
  noteBg: 'var(--tk-note-bg)', noteFg: 'var(--tk-note-fg)',
  inkLabel: 'var(--tk-ink-label)', inkSub: 'var(--tk-ink-sub)', header: 'var(--tk-header)',
} as const;
const TRACKER_CSS = `
.mt-root{--tk-surface:#F2F4F3;--tk-card:#FFFFFE;--tk-line:#E1E6E3;--tk-ink:#0E1412;--tk-sub:#55605C;--tk-faint:#7A8580;
--tk-btn:#111816;--tk-btn-fg:#FFFFFE;--tk-green:#05C8A7;--tk-green-ink:#04241E;--tk-green-deep:#047A67;--tk-green-soft:#DFF7F1;
--tk-violet:#6D28D9;--tk-violet-soft:#F1E8FF;--tk-orange:#B54708;--tk-orange-soft:#FFF1E0;--tk-amber:#B45309;
--tk-red:#C81E1E;--tk-red-soft:#FDE8E8;--tk-note-bg:#FFF8E6;--tk-note-fg:#6B4A00;--tk-ink-label:#7FE3CF;--tk-ink-sub:#B7C2BE;
--tk-header:rgba(242,244,243,0.92);color-scheme:light}
@media (prefers-color-scheme: dark){.mt-root{--tk-surface:#0B0F0E;--tk-card:#161B19;--tk-line:#2A322F;--tk-ink:#F1F4F2;--tk-sub:#A3ADA9;--tk-faint:#7F8A86;
--tk-btn:#F1F4F2;--tk-btn-fg:#0E1412;--tk-green-deep:#5BE3C9;--tk-green-soft:#12302A;
--tk-violet:#B9A4FF;--tk-violet-soft:#241D3D;--tk-orange:#FFB46B;--tk-orange-soft:#3A2410;--tk-amber:#FBBF5B;
--tk-red:#FF9B91;--tk-red-soft:#3A1717;--tk-note-bg:#3A2F12;--tk-note-fg:#FFD98A;--tk-ink-label:#047A67;--tk-ink-sub:#55605C;
--tk-header:rgba(11,15,14,0.88);color-scheme:dark}}
.mt-root .bg-white{background-color:var(--tk-card)}
`;

/** "1:10 PM–1:20 PM" → "1:10–1:20 PM" cuando comparten AM/PM. */
function compactRange(a: string, b: string): string {
  const am = /\s?(AM|PM|a\.\s?m\.|p\.\s?m\.)$/i;
  const ma = a.match(am)?.[0]?.trim().toLowerCase();
  const mb = b.match(am)?.[0]?.trim().toLowerCase();
  return `${ma && ma === mb ? a.replace(am, '') : a}–${b}`;
}
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
    viewPreviousOrders: en ? 'My orders' : 'Mis pedidos',
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
    // Nav/status bar
    orderLabel: en ? 'Order' : 'Pedido',
    connecting: en ? 'Connecting…' : 'Conectando…',
    offline: en ? 'Offline' : 'Sin conexión',
    closeBanner: en ? 'Close' : 'Cerrar',
    // Order type pills
    orderTypePillDelivery: 'Delivery',
    orderTypePillPickup: en ? 'Pickup' : 'Para recoger',
    orderTypePillDineIn: en ? 'Dine-in' : 'En mesa',
    // Almost ready / pickup
    almostReadyHeading: en ? 'Almost ready — head over!' : '¡Casi listo — ve saliendo!',
    almostReadyDesc: en ? 'Your order will be ready by the time you arrive' : 'Tu pedido estará listo cuando llegues',
    // Driver on the way
    driverOnWayHeading: en ? 'Driver is on the way!' : '¡Tu repartidor viene en camino!',
    driverOnWayDesc: en ? 'Stay close to your delivery address' : 'Mantente cerca de tu dirección de entrega',
    // Pickup ready block
    pickupReadyHeading: en ? 'Your order is READY!' : '¡Tu pedido está LISTO!',
    pickupReadyDesc: en ? 'Head to the restaurant to pick it up' : 'Dirígete al restaurante a recogerlo',
    openInMaps: en ? 'Open in Maps' : 'Ver en Maps',
    call: en ? 'Call' : 'Llamar',
    // Completed taglines (per order type)
    taglinePickup: en ? 'Enjoy your meal!' : '¡Buen provecho!',
    taglineDineIn: en ? 'Enjoy your meal!' : '¡Que lo disfrutes!',
    taglineDelivery: en ? 'Enjoy your meal!' : '¡Buen provecho!',
    // Progress bar — "on the way" vs "ready" label
    progressOnTheWay: en ? 'On the way' : 'En camino',
    progressReady: en ? 'Ready' : 'Listo',
    // ETA hero
    almostReadyEta: en ? 'Almost ready!' : '¡Ya casi!',
    runningLate: en ? 'Taking a little longer' : 'Se está demorando un poco',
    runningLateDesc: en ? "We'll let you know as soon as it's ready" : 'Te avisamos apenas esté listo',
    readyByLabel: (etaStr: string) => en ? `Ready by ${etaStr}` : `Listo a las ${etaStr}`,
    arrivesByLabel: (etaStr: string) => en ? `Arrives around ${etaStr}` : `Llega aprox. a las ${etaStr}`,
    estimatedArrivalLabel: en ? 'Estimated arrival' : 'Llegada estimada',
    driverAssigned: en ? 'Driver assigned' : 'Repartidor asignado',
    atDoorTitle: en ? 'Your driver is at the door' : 'Tu repartidor está en la puerta',
    scheduledFor: (when: string) => en ? `Scheduled for ${when}` : `Programado para ${when}`,
    refunded: (amount: string) => en ? `We refunded ${amount} to your card. It may take 5–10 business days to show up.` : `Te reembolsamos ${amount} a tu tarjeta. Puede tardar de 5 a 10 días hábiles en verse.`,
    payFailedTitle: en ? "Your payment didn't go through" : 'Tu pago no se completó',
    payFailedDesc: en ? "The restaurant hasn't received your order yet. You were not charged." : 'El restaurante todavía no recibió tu pedido. No se hizo ningún cobro.',
    payRetry: en ? 'Try the payment again' : 'Intentar el pago de nuevo',
    payRetryError: en ? 'Could not open the payment. Try again or call the restaurant.' : 'No se pudo abrir el pago. Intenta de nuevo o llama al restaurante.',
    // Driver on the way hero
    driverOnWayHeroLabel: en ? 'Driver on the way' : 'Repartidor en camino',
    estimatedArrival: en ? 'estimated arrival' : 'tiempo estimado de llegada',
    // Dine-in table card
    yourTable: en ? 'Your table' : 'Tu mesa',
    foodBroughtToTable: en ? 'Your food will be brought to you' : 'Tu pedido será llevado a tu mesa',
    // Driver card
    yourDriver: en ? 'Your driver' : 'Tu repartidor',
    onTheWay: en ? 'On the way!' : '¡En camino!',
    headingToAddress: en ? 'Heading to your address' : 'Dirigiéndose a tu dirección',
    callDriverDirect: (name: string) => en ? `Call ${name}` : `Llamar a ${name}`,
    // Driver at door card
    driverArrived: en ? 'Driver arrived!' : '¡Repartidor llegó!',
    atYourDoor: en ? 'At your door now' : 'Está en tu puerta',
    comeToTheDoor: en ? 'Please come to the door' : 'Por favor acércate a la puerta',
    // Event timeline
    timelineTitle: en ? 'Order activity' : 'Actividad del pedido',
    timelineOrdered: en ? 'Order placed' : 'Pedido realizado',
    timelineConfirmed: en ? 'Confirmed by restaurant' : 'Confirmado por el restaurante',
    timelinePreparing: en ? 'Preparation started' : 'En preparación',
    timelineReady: en ? 'Driver assigned' : 'Driver asignado',
    timelinePickedUp: en ? 'Picked up by driver' : 'Recogido por el repartidor',
    timelineAtDoor: en ? 'Driver at your door' : 'Repartidor en tu puerta',
    timelineDelivered: en ? 'Delivered' : 'Entregado',
    // Items card
    yourOrderLabel: en ? 'Your order' : 'Tu pedido',
    itemSingular: en ? 'item' : 'producto',
    itemPlural: en ? 'items' : 'productos',
    productFallback: en ? 'Item' : 'Producto',
    // Delivery map / photo section labels
    locationLabel: en ? 'Location' : 'Ubicación',
    deliveryPhotoLabel: en ? 'Delivery photo' : 'Foto de entrega',
    deliveryProofAlt: en ? 'Delivery proof' : 'Foto de entrega',
    // Add more items (dine-in)
    addMoreItems: en ? 'Add more items →' : 'Agregar más productos →',
    // OrderSuccessRedirect
    orderProcessedHeading: en ? 'Your order was processed successfully' : 'Tu pedido fue procesado exitosamente',
    returningToMenu: en ? 'Returning to menu…' : 'Regresando al menú...',
    goToMenu: en ? 'Go to menu' : 'Ir al menú',
    callDriver: en ? 'Call driver' : 'Llamar al repartidor',
    driverAssignedEtaLabel: en ? 'Estimated pickup' : 'Recogida estimada',
    driverAssignedSubtitle: en ? 'Driver is heading to the restaurant' : 'El driver va hacia el restaurante',
    // WaiterCallButton sub-component
    waiterCallLabel: (tableName: string | null | undefined) =>
      tableName ? (en ? `Table ${tableName} needs attention` : `Mesa ${tableName} necesita atención`)
                : (en ? 'Waiter needed' : 'Mesero necesita atención'),
    staffNotified: en ? '✓ Staff notified!' : '✓ ¡Personal avisado!',
    callAgainIn: (timeStr: string) => en ? `Again in ${timeStr}` : `De nuevo en ${timeStr}`,
    notifyingStaff: en ? 'Notifying staff…' : 'Avisando al personal…',
    callWaiter: en ? 'Call waiter' : 'Llamar al mesero',
    // PushSubscriptionPrompt sub-component
    getOrderUpdates: en ? 'Get order updates' : 'Recibe actualizaciones',
    notifyWhenStatusChanges: en ? "We'll notify you when your order status changes." : 'Te avisamos cuando cambie el estado de tu pedido.',
    notifyMe: en ? 'Notify me' : 'Activar',
    // OrderHistorySaver sub-component
    hideHistory: en ? 'Hide' : 'Ocultar',
    seePreviousOrders: (n: number) => en
      ? `See ${n} previous order${n !== 1 ? 's' : ''}`
      : `Ver ${n} pedido${n !== 1 ? 's' : ''} anterior${n !== 1 ? 'es' : ''}`,
    // Chef messages (pickup/preparing) — 5 rotating messages for variety
    chefMessages: en
      ? [
          'Your order is getting the full attention it deserves 🍳',
          'Each item is being prepared fresh, just for you',
          'Almost there — something delicious is on its way',
          'The kitchen is on it — won\'t be long now',
          'Your meal is in good hands. We\'ll have it ready soon!',
        ]
      : [
          'Tu pedido recibe toda la atención que merece 🍳',
          'Cada platillo preparado fresco, especialmente para ti',
          'Ya casi — algo delicioso está en camino',
          'La cocina está en ello — no tardará mucho',
          '¡Tu pedido está en buenas manos. Listo muy pronto!',
        ],
    steps: {
      // Header icon/text per DB status (detailed view)
      pending:          { label: en ? 'Received'       : 'Recibido',          desc: en ? 'Your order was received'              : 'Tu pedido fue recibido' },
      confirmed:        { label: en ? 'Preparing'      : 'En preparación',    desc: en ? 'Your order is being prepared'         : 'Tu pedido se está preparando' },
      preparing:        { label: en ? 'Preparing'      : 'En preparación',    desc: en ? 'Your order is being prepared'         : 'Tu pedido se está preparando' },
      almost_ready:     { label: en ? 'Almost ready!'  : '¡Casi listo!',      desc: en ? 'Your order will be ready very soon'   : 'Tu pedido estará listo en unos minutos' },
      ready:            { label: en ? 'Ready'          : 'Listo',             desc: isDelivery ? (en ? 'Ready — leaving with the driver soon' : 'Listo — sale pronto con el repartidor') : orderType === 'dine_in' ? (en ? 'Your order is on its way to your table!' : '¡Tu pedido va camino a tu mesa!') : (en ? 'Your order is ready for pickup!' : '¡Tu pedido está listo para recoger!') },
      out_for_delivery: { label: en ? 'On its way!'    : '¡En camino!',       desc: en ? 'Your order is out for delivery'       : 'Tu pedido está en camino a tu puerta' },
      served:           { label: en ? 'Served!'        : '¡Servido!',         desc: en ? 'Your order has been served'           : 'Tu pedido fue servido en tu mesa' },
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
      // Faltaban, y son estados reales: 68 pedidos cancelled y 1 completed en
      // prod. Sin entrada aca, currentStepText quedaba undefined y la pantalla
      // no decia en que estado estaba el pedido.
      completed: {
        label: en ? 'Completed' : 'Completado',
        desc: en ? 'This order is complete.' : 'Este pedido está completo.',
      },
      cancelled: {
        label: en ? 'Cancelled' : 'Cancelado',
        desc: en ? 'This order was cancelled.' : 'Este pedido fue cancelado.',
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

interface OrderTrackerProps {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantAddress?: string;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  restaurantPhone?: string;
  /** Logo del restaurante (la misma imagen de los emails). */
  restaurantLogo?: string | null;
  orderNumber: string;
  /** Opaque per-order token; required for the API to return customer/driver PII */
  trackingToken?: string;
  currency?: string;
  locale?: string;
  showPaidBanner?: boolean;
  /** ?paid= de la vuelta de la pasarela: 'true' | 'false' | 'pending' */
  paidParam?: string;
  /** Pre-fetched order data from the server component — renders immediately without a client fetch */
  initialOrder?: any;
}

export function OrderTracker({ restaurantId, restaurantName, restaurantSlug, restaurantAddress, restaurantLat, restaurantLng, restaurantPhone, restaurantLogo, orderNumber, trackingToken, currency = 'MXN', locale, showPaidBanner = false, paidParam, initialOrder }: OrderTrackerProps) {
  const t = getT(locale);
  const [order, setOrder] = useState<any>(initialOrder ?? null);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState('');
  const [paidBannerVisible, setPaidBannerVisible] = useState(showPaidBanner);
  const [rtStatus, setRtStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('reconnecting');
  // Live GPS coords pushed directly from the broadcast 'location_update' event.
  // Updated without HTTP refetch so the map marker moves in real-time.
  const [liveDriverCoords, setLiveDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [liveDeliveryEta, setLiveDeliveryEta] = useState<number | null>(null);
  // Cuándo llegó la última posición del repartidor (para "de hace N min").
  const [lastLocAt, setLastLocAt] = useState<number | null>(null);
  const [arriving, setArriving] = useState(false);
  const [arriveErr, setArriveErr] = useState(false);
  const [etaTick, setEtaTick] = useState(0);

  const hasInitialOrder = !!initialOrder;

  const fetchOrder = useCallback(async () => {
    try {
      const tokenParam = trackingToken ? `&t=${encodeURIComponent(trackingToken)}` : '';
      const res = await fetch(
        `/api/public/order-track?order=${encodeURIComponent(orderNumber)}&restaurant=${encodeURIComponent(restaurantId)}${tokenParam}`,
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
  }, [orderNumber, restaurantId, trackingToken, hasInitialOrder]);

  useEffect(() => {
    // If we already have initialOrder, still refresh in background to get latest status
    fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling fallback — refreshes every 5 s for active orders.
  // Fires even when the WebSocket is up, so GPS coordinates and ETA
  // countdown stay fresh without extra subscriptions.
  const isTerminal = ['delivered', 'completed', 'cancelled'].includes(order?.status);
  // Entregado por el repartidor pero la foto todavía no llegó (la sube DESPUÉS
  // de marcar entregado): se sigue consultando un rato para mostrarla sin recargar.
  const deliveredAtMs = (order as { driver_delivered_at?: string | null } | null)?.driver_delivered_at
    ? Date.parse((order as { driver_delivered_at: string }).driver_delivered_at) : NaN;
  const waitingPhoto = order?.order_type === 'delivery' && order?.status === 'delivered'
    && !(order as { delivery_photo_url?: string | null }).delivery_photo_url
    && Number.isFinite(deliveredAtMs) && Date.now() - deliveredAtMs < 15 * 60_000;
  // Con el canal en vivo conectado, los cambios llegan por broadcast: el sondeo
  // es solo respaldo (15 s). Sin canal, 5 s. Antes eran 5 s siempre y dos
  // seguimientos en el mismo Wi-Fi chocaban con el límite de 30/min por IP.
  const pollMs = rtStatus === 'connected' ? 15_000 : 5_000;
  useEffect(() => {
    if (!order?.id || (isTerminal && !waitingPhoto)) return;
    const interval = setInterval(fetchOrder, pollMs);
    return () => clearInterval(interval);
  }, [order?.id, isTerminal, waitingPhoto, pollMs, fetchOrder]);

  // Supabase Realtime Broadcast subscription.
  //
  // We deliberately use BROADCAST instead of postgres_changes.
  // postgres_changes requires the connected user to have RLS SELECT access
  // on the row being watched. Customers are anonymous (anon key, no session)
  // so their RLS policy blocks the events — they arrive at the server but
  // are silently dropped before reaching the client.
  //
  // Broadcast channels are NOT gated by RLS: any client that knows the
  // channel name can subscribe. We use the order UUID as the channel name
  // (opaque, server-issued, only the tracking page URL holder knows it).
  //
  // The server sends a broadcast via HTTP Broadcast API from every route
  // that changes order state: updateOrderStatus, driver/status, cron jobs.
  // Immediate refetch when the tab becomes visible again (mobile switches app,
  // or phone wakes from standby). Prevents the customer from seeing a stale
  // status after returning to the tracking page.
  useEffect(() => {
    if (!order?.id || isTerminal) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchOrder();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [order?.id, isTerminal, fetchOrder]);

  // Tick every 30s so ETA hero re-renders with live minsLeft without waiting for the 5s poll
  useEffect(() => {
    // Horas y "ubicación de hace N min" se recalculan solas mientras está activo.
    if (!order?.id || ['delivered', 'completed', 'cancelled', 'served'].includes(order?.status)) return;
    const interval = setInterval(() => setEtaTick(n => n + 1), 30_000);
    return () => clearInterval(interval);
  }, [order?.id, order?.status]);

  useEffect(() => {
    if (!order?.id || isTerminal) return;

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`order-track:${order.id}`)
      .on('broadcast', { event: 'status_change' }, () => {
        // Full refetch: ensures driver timestamps, ETA, and all joined fields
        // are always up-to-date rather than relying on the partial payload.
        fetchOrder();
      })
      .subscribe((status: string) => {
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
  }, [order?.id, isTerminal, fetchOrder]);

  // GPS en vivo del repartidor: canal secreto que el servidor entrega solo con
  // el token del pedido (live_topic). Sin token no hay canal: el mapa no se
  // muestra y la ubicación no viaja a quien adivine el pedido.
  const liveTopic = (order as { live_topic?: string | null } | null)?.live_topic ?? null;
  useEffect(() => {
    if (!liveTopic || isTerminal) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(liveTopic)
      .on('broadcast', { event: 'location_update' }, ({ payload }: { payload: Record<string, unknown> }) => {
        if (typeof payload?.lat === 'number' && typeof payload?.lng === 'number') {
          setLiveDriverCoords({ lat: payload.lat, lng: payload.lng });
          setLastLocAt(Date.now());
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [liveTopic, isTerminal]);

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
              <CheckCircle2 className="w-10 h-10 text-[#047a65]" />
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

  // ───────────────────────── Diseño 2026-11 ─────────────────────────
  // Arriba siempre lo mismo: en qué va y cuándo llega. Todo lo demás debajo y
  // plegado. Misma familia visual que el Counter y la página del repartidor.
  const o = order as any;
  const en = t.en;
  const dateLocale = en ? 'en-US' : 'es-MX';
  const isDelivery = o.order_type === 'delivery';
  const isPickup = o.order_type === 'pickup';
  const isDineIn = o.order_type === 'dine_in';
  const isCancelled = o.status === 'cancelled';
  const isComplete = ['delivered', 'completed', 'served'].includes(o.status);
  const isActive = !isCancelled && !isComplete;
  // En camino: el repartidor marcó "recogí" o el mostrador tocó "Salió".
  const onTheWay = isDelivery && isActive && (Boolean(o.driver_picked_up_at) || o.status === 'out_for_delivery');
  const atDoor = onTheWay && Boolean(o.driver_at_door_at);
  const awaitingPayment = isAwaitingOnlinePayment(o);
  const refunded = isCancelled && o.payment_status === 'refunded';
  const autoClosed = Boolean(o.auto_closed);
  const shortNum = String(o.order_number ?? '').split('-').pop();
  const driverName = String(o.driver_name ?? '').trim().split(' ')[0] || null;
  const fmtClock = (ms: number) => new Date(ms).toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit' });
  const now = Date.now() + etaTick * 0;
  const cashDue = o.payment_method === 'cash' && o.payment_status !== 'paid';
  const amount = formatPrice(Number(o.total) || 0, currency);

  // Programado: su hora, mientras espera.
  const scheduledLabel = o.scheduled_for && o.status === 'pending'
    ? new Date(o.scheduled_for).toLocaleString(dateLocale, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : null;

  // Cocina: desde que el restaurante ACEPTÓ (prepared_at), igual que el email.
  const acceptedMs = Date.parse(o.prepared_at ?? o.updated_at ?? o.created_at);
  const readyMs = Number(o.estimated_ready_minutes) > 0 && Number.isFinite(acceptedMs)
    ? acceptedMs + Number(o.estimated_ready_minutes) * 60_000 : null;
  const kitchenLate = readyMs != null && ['confirmed', 'preparing'].includes(o.status) && now - readyMs > 3 * 60_000;

  // Delivery: cuándo LLEGA (cocina + viaje en bici, mismo cálculo del checkout).
  const dLat = Number(o.delivery_lat), dLng = Number(o.delivery_lng);
  const km = restaurantLat != null && restaurantLng != null && o.delivery_lat != null && Number.isFinite(dLat) && Number.isFinite(dLng)
    ? haversineKm(restaurantLat, restaurantLng, dLat, dLng) : 2;
  // Ruta: el repartidor entrega N pedidos antes del tuyo (solo el número llega).
  const stopsAhead = onTheWay && !atDoor ? Math.max(0, Number(o.stops_ahead) || 0) : 0;
  let arrivalMs: number | null = null;
  if (isDelivery && isActive && !atDoor) {
    if (onTheWay) {
      if (liveDeliveryEta != null) arrivalMs = now + liveDeliveryEta * 60_000;
      else {
        const left = Date.parse(o.driver_picked_up_at ?? o.updated_at);
        arrivalMs = Math.max((Number.isFinite(left) ? left : now) + travelMinutes(km) * 60_000, now + 60_000);
      }
      // El ETA del mapa va directo a tu casa: se suman las paradas de antes.
      arrivalMs += stopsAhead * MINUTES_PER_STOP_AHEAD * 60_000;
    } else if (readyMs != null && o.status !== 'pending') {
      const leave = o.status === 'ready' ? now : Math.max(readyMs, now);
      arrivalMs = leave + travelMinutes(km) * 60_000;
    }
  }
  // Ventana de 10 min antes de salir (estudio Booth 2025: una ventana estrecha
  // deja más conforme que una hora puntual); en camino, minutos y hora.
  const windowStart = arrivalMs != null ? Math.floor((arrivalMs - 4 * 60_000) / 300_000) * 300_000 : null;
  const stopsAheadText = en
    ? `Delivering ${stopsAhead} order${stopsAhead === 1 ? '' : 's'} before yours`
    : `Entrega ${stopsAhead} pedido${stopsAhead === 1 ? '' : 's'} antes del tuyo`;

  // Hora del cierre (entregado / recogido / servido).
  const closedMs = Date.parse(o.driver_delivered_at ?? o.updated_at);

  const headline = (() => {
    if (isCancelled) return en ? 'Order cancelled' : 'Pedido cancelado';
    if (isComplete) {
      if (autoClosed) return en ? 'Order closed' : 'Pedido cerrado';
      return isPickup ? (en ? 'Picked up' : 'Recogido') : isDineIn ? (en ? 'Served' : 'Servido') : (en ? 'Delivered' : 'Entregado');
    }
    if (atDoor) return driverName ? (en ? `${driverName} is at your door` : `${driverName} está en tu puerta`) : t.atDoorTitle;
    if (onTheWay) return driverName ? (en ? `${driverName} is on the way` : `${driverName} viene en camino`) : (en ? 'Your order is on the way' : 'Tu pedido viene en camino');
    switch (o.status) {
      case 'pending': return scheduledLabel ? (en ? 'Order scheduled' : 'Pedido programado') : (en ? `Waiting for ${restaurantName} to confirm` : `Esperando que ${restaurantName} confirme`);
      case 'almost_ready': return isPickup ? (en ? 'Almost ready — head over' : 'Casi listo, ya puedes salir') : (en ? 'Almost ready' : 'Casi listo');
      case 'ready': return isPickup ? (en ? 'Your order is ready' : 'Tu pedido está listo')
        : isDineIn ? (en ? 'On its way to your table' : 'Va camino a tu mesa')
        : (en ? 'Ready — leaving soon' : 'Listo, sale en breve');
      default: return en ? "We're preparing your order" : 'Estamos preparando tu pedido';
    }
  })();

  const subline = (() => {
    if (isCancelled) return refunded ? t.refunded(amount) : (en ? `Questions? Call ${restaurantName}.` : `¿Dudas? Llama a ${restaurantName}.`);
    if (isComplete) {
      const when = Number.isFinite(closedMs) ? fmtClock(closedMs) : '';
      return [when, isDelivery && driverName ? (en ? `by ${driverName}` : `por ${driverName}`) : null].filter(Boolean).join(' · ');
    }
    if (atDoor) return o.notes ? String(o.notes) : (en ? 'Please head to the door' : 'Acércate a la puerta');
    if (o.status === 'pending') return scheduledLabel ? t.scheduledFor(scheduledLabel) : (en ? "We'll let you know as soon as they accept it." : 'Te avisamos apenas lo acepte.');
    if (isDelivery && onTheWay && stopsAhead > 0 && windowStart != null) {
      return `${stopsAheadText} · ${en ? 'arrives' : 'llega entre'} ${compactRange(fmtClock(windowStart), fmtClock(windowStart + 600_000))}`;
    }
    if (isDelivery && onTheWay && arrivalMs != null) {
      const mins = Math.max(1, Math.round((arrivalMs - now) / 60_000));
      return en ? `Arrives in ~${mins} min · ${fmtClock(arrivalMs)}` : `Llega en ~${mins} min · ${fmtClock(arrivalMs)}`;
    }
    if (isDelivery && windowStart != null) {
      if (kitchenLate) return en ? `Running a little late · arrives around ${fmtClock(arrivalMs!)}` : `Va un poco atrasado · llega aprox. a las ${fmtClock(arrivalMs!)}`;
      return en ? `Arrives between ${fmtClock(windowStart)} and ${fmtClock(windowStart + 600_000)}` : `Llega entre ${fmtClock(windowStart)} y ${fmtClock(windowStart + 600_000)}`;
    }
    if (isDineIn && o.table_name) return en ? `Table ${o.table_name}` : `Mesa ${o.table_name}`;
    if (readyMs != null && ['confirmed', 'preparing', 'almost_ready'].includes(o.status)) {
      if (kitchenLate) return `${t.runningLate} · ${t.runningLateDesc.toLowerCase()}`;
      return t.readyByLabel(fmtClock(readyMs));
    }
    return '';
  })();

  // Barra de 4 tramos por tipo de pedido.
  const stepLabels = isDelivery
    ? [en ? 'Received' : 'Recibido', en ? 'Preparing' : 'Preparando', en ? 'On the way' : 'En camino', en ? 'Delivered' : 'Entregado']
    : [en ? 'Received' : 'Recibido', en ? 'Preparing' : 'Preparando', en ? 'Ready' : 'Listo', isPickup ? (en ? 'Picked up' : 'Recogido') : (en ? 'Served' : 'Servido')];
  const stepIndex = isComplete ? 3
    : onTheWay ? 2
    : o.status === 'pending' ? 0
    : o.status === 'ready' && !isDelivery ? 2
    : 1;

  // Ubicación del repartidor: en vivo o "de hace N min" (sin fingir).
  const hasDriverGps = liveDriverCoords != null || (o.driver_lat != null && o.driver_lng != null);
  const locMs = lastLocAt ?? (o.driver_updated_at ? Date.parse(o.driver_updated_at) : NaN);
  const locAgeMin = Number.isFinite(locMs) ? Math.floor((now - locMs) / 60_000) : null;
  const locLabel = locAgeMin == null || locAgeMin < 1
    ? (en ? 'Live location' : 'Ubicación en vivo')
    : (en ? `Location from ${locAgeMin} min ago` : `Ubicación de hace ${locAgeMin} min`);

  // Aviso de efectivo en camino/en la puerta: si se muestra, "Tu pedido" no lo repite.
  const cashRowShown = isDelivery && cashDue && (onTheWay || atDoor);
  const itemCount = (o.order_items ?? []).reduce((n: number, it: any) => n + (Number(it.qty) || 1), 0);
  const payLine = isCancelled ? null
    : cashDue ? (isDelivery ? (en ? 'Pay on delivery, in cash' : 'Pagas al recibir, en efectivo') : (en ? 'Pay in cash' : 'Pagas en efectivo'))
    : o.payment_status === 'paid' ? (en ? 'Paid online' : 'Pagado online') : null;

  const reorder = () => {
    // Mismo mecanismo que "Repetir mi último pedido" del menú.
    const saved = ((o.order_items ?? []) as any[])
      .filter((it) => it.product_id)
      .map((it) => ({
        productId: it.product_id as string,
        productName: (it.product_name as string) ?? '',
        variantId: (it.variant_id as string | null) ?? null,
        variantName: (it.variant_name as string | null) ?? null,
        variantPriceDelta: (it.variant_price_delta as number | null) ?? null,
        qty: Number(it.qty) || 1,
      }));
    if (saved.length === 0) { window.location.href = `/${restaurantSlug}`; return; }
    useCartStore.setState({ lastOrder: { restaurantId, items: saved, date: new Date().toISOString() } });
    window.location.href = `/${restaurantSlug}?reorder=1`;
  };

  const markArrived = async () => {
    if (!trackingToken || arriving) return;
    setArriving(true);
    setArriveErr(false);
    try {
      const res = await fetch('/api/public/order-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: o.id, t: trackingToken, action: 'arrived' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setOrder((prev: any) => ({ ...prev, customer_arrived_at: data.arrived_at ?? new Date().toISOString() }));
      else setArriveErr(true);
    } catch {
      // Sin señal: que el cliente sepa que el mostrador NO se enteró.
      setArriveErr(true);
    } finally {
      setArriving(false);
    }
  };

  // Bloque grande como en los emails: la hora (o el número) es lo primero.
  const hero: { tone: 'green' | 'ink'; label: string; big: string; sub: string } | null = (() => {
    if (!isActive || atDoor || awaitingPayment) return null;
    if (isPickup && o.status === 'ready') {
      return {
        tone: 'ink',
        label: en ? 'Ready now' : 'Listo ahora',
        big: `#${shortNum}`,
        sub: [en ? 'Show this number at the counter' : 'Muestra este número en el mostrador',
          cashDue ? (en ? `pay ${amount} at pickup` : `pagas ${amount} al recoger`) : null].filter(Boolean).join(' · '),
      };
    }
    // Con paradas antes de la tuya la hora es menos segura: ventana, no minutos.
    if (isDelivery && onTheWay && stopsAhead > 0 && windowStart != null) {
      return { tone: 'green', label: headline, big: compactRange(fmtClock(windowStart), fmtClock(windowStart + 600_000)), sub: stopsAheadText };
    }
    if (isDelivery && onTheWay && arrivalMs != null) {
      const mins = Math.max(1, Math.round((arrivalMs - now) / 60_000));
      return { tone: 'green', label: headline, big: `~${mins} min`, sub: en ? `Arrives around ${fmtClock(arrivalMs)}` : `Llega cerca de las ${fmtClock(arrivalMs)}` };
    }
    if (isDelivery && windowStart != null && o.status !== 'pending') {
      return {
        tone: 'green',
        label: en ? 'Arrives between' : 'Llega entre',
        big: compactRange(fmtClock(windowStart), fmtClock(windowStart + 600_000)),
        sub: kitchenLate ? (en ? 'Running a little late' : 'Va un poco atrasado') : headline,
      };
    }
    if (!isDelivery && readyMs != null && ['confirmed', 'preparing', 'almost_ready'].includes(o.status)) {
      return {
        tone: 'green',
        label: isPickup ? (en ? 'Ready for pickup around' : 'Listo para recoger cerca de las') : (en ? 'Ready around' : 'Listo cerca de las'),
        big: fmtClock(Math.max(readyMs, now)),
        sub: kitchenLate ? t.runningLate : headline,
      };
    }
    return null;
  })();

  const card = 'bg-white rounded-[20px] border';
  const cardStyle = { borderColor: K.line };
  const canArrive = isPickup && o.status === 'ready' && o.authorized && !!trackingToken;
  const canReorder = isComplete && (o.order_items?.length ?? 0) > 0;
  const showDock = !awaitingPayment && (canArrive || canReorder || !!restaurantPhone);

  return (
    <div className="mt-root min-h-[100dvh] flex flex-col font-sans" style={{ background: K.surface, color: K.ink }}>
      <style>{TRACKER_CSS}</style>
      {/* Barra superior mínima: volver · logo + restaurante · #pedido · en vivo */}
      <header className="sticky z-40 border-b backdrop-blur-md" style={{ top: 'env(safe-area-inset-top, 0px)', background: K.header, borderColor: K.line }}>
        <div className="max-w-md mx-auto px-2 h-14 flex items-center gap-1">
          <Link href={`/${restaurantSlug}`} aria-label={t.backToMenu} className="w-11 h-11 rounded-xl grid place-items-center active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5" style={{ color: K.sub }} aria-hidden />
          </Link>
          {restaurantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurantLogo} alt="" width={28} height={28} className="w-7 h-7 rounded-lg object-cover flex-shrink-0 mr-1" style={{ boxShadow: `0 0 0 1px ${K.line}` }} />
          ) : null}
          <p className="flex-1 min-w-0 truncate text-[14px] font-semibold" style={{ color: K.sub }}>
            {restaurantName}{shortNum ? ` · #${shortNum}` : ''}
          </p>
          {isActive && !awaitingPayment && (
            rtStatus === 'connected' ? (
              <span className="mr-2 inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: K.greenDeep }}>
                <span className="w-1.5 h-1.5 rounded-full motion-safe:animate-pulse" style={{ background: K.greenDeep }} aria-hidden />
                {t.live}
              </span>
            ) : (
              <span className="mr-2 text-[12px] font-bold" style={{ color: K.amber }}>{t.connecting}</span>
            )
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-5 pb-6 flex flex-col gap-3">

        {paidBannerVisible && !awaitingPayment && (
          <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[14px] font-semibold" style={{ background: K.greenSoft, color: K.greenDeep }}>
            <span className="flex items-center gap-2"><Check className="w-4 h-4" aria-hidden />{t.paymentConfirmed}</span>
            <button type="button" onClick={() => setPaidBannerVisible(false)} aria-label={t.closeBanner} className="w-11 h-11 -mr-3 grid place-items-center">
              <XCircle className="w-4 h-4" aria-hidden />
            </button>
          </div>
        )}

        {awaitingPayment ? (
          <section className={card} style={cardStyle}>
            <PaymentPendingCard orderId={o.id} restaurantSlug={restaurantSlug} paidParam={paidParam}
              createdAt={o.created_at} paymentMethod={o.payment_method} currency={currency} t={t} />
          </section>
        ) : (
          <>
            {/* ── Estado + hora: lo único que importa de un vistazo ── */}
            <section className="pt-1 grid gap-2" aria-live="polite">
              {isComplete && (
                <span className="w-14 h-14 rounded-full grid place-items-center mb-1" style={{ background: K.green, color: K.greenInk }}>
                  <Check className="w-7 h-7" strokeWidth={3} aria-hidden />
                </span>
              )}
              {isCancelled && (
                <span className="w-14 h-14 rounded-full grid place-items-center mb-1" style={{ background: K.redSoft, color: K.red }}>
                  <XCircle className="w-7 h-7" aria-hidden />
                </span>
              )}
              {/* En la puerta lo dice la tarjeta negra de abajo; con bloque de hora, lo dice el bloque. */}
              <h1 className={atDoor || hero ? 'sr-only' : 'font-display text-[30px] font-extrabold leading-[1.08] tracking-tight'} style={{ textWrap: 'balance' } as React.CSSProperties}>
                {headline}
              </h1>
              {/* ── En la puerta: arriba de todo, en el lugar del bloque de la hora ── */}
              {atDoor && (
                <div className="rounded-[20px] px-5 py-5 grid gap-1" style={{ background: K.ink, color: K.card }} role="status">
                  <p className="text-[12.5px] font-bold uppercase tracking-[0.06em]" style={{ color: K.inkLabel }}>{en ? 'Now' : 'Ahora'}</p>
                  <p className="font-display text-[28px] font-extrabold leading-tight">{headline}</p>
                  {o.notes && <p className="text-[14.5px]" style={{ color: K.inkSub }}>{o.notes}</p>}
                </div>
              )}
              {hero && (
                <div className="rounded-[20px] px-5 py-4 grid gap-0.5" style={hero.tone === 'ink' ? { background: K.ink, color: K.card } : { background: K.green, color: K.greenInk }}>
                  <p className="text-[12.5px] font-bold uppercase tracking-[0.06em] opacity-85">{hero.label}</p>
                  {/* "11:35–11:45 p.m." no entra a 44 px en un teléfono de 375: baja a 36. */}
                  <p className={`font-display ${hero.big.length > 14 ? 'text-[36px]' : 'text-[44px]'} font-extrabold leading-[1.02] tracking-tight tabular-nums whitespace-nowrap`}>{hero.big}</p>
                  {hero.sub && <p className="text-[14.5px] font-semibold">{hero.sub}</p>}
                </div>
              )}
              {subline && !atDoor && !hero && (
                <p className="text-[16px] font-semibold leading-snug" style={{ color: isCancelled ? K.sub : kitchenLate ? K.amber : K.ink }}>
                  {subline}
                </p>
              )}
              {!isCancelled && (
                <div className="mt-2" aria-hidden>
                  <div className="grid grid-cols-4 gap-1">
                    {stepLabels.map((_, i) => (
                      <i key={i} className="h-1.5 rounded-full" style={{ background: i <= stepIndex ? K.ink : K.line }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-4 mt-1.5 text-[11.5px] font-semibold">
                    {stepLabels.map((l, i) => (
                      <span key={l} style={{ color: i === stepIndex ? K.ink : K.faint }}>{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── Efectivo: que lo tenga listo cuando llega ── */}
            {cashRowShown && (
              <div className={`${card} flex items-center justify-between gap-3 px-4 py-3`} style={cardStyle}>
                <span className="text-[14px] font-semibold" style={{ color: K.sub }}>{atDoor ? (en ? 'Pay on delivery, in cash' : 'Paga al recibir, en efectivo') : (en ? 'Have the cash ready' : 'Ten listo el efectivo')}</span>
                <span className="font-display text-[22px] font-extrabold tabular-nums" style={{ color: K.ink }}>{amount}</span>
              </div>
            )}

            {/* ── Mapa: solo en camino ── */}
            {onTheWay && !atDoor && hasDriverGps && (
              <section className="relative rounded-[20px] overflow-hidden border" style={cardStyle}>
                <DeliveryMap
                  restaurantAddress={restaurantAddress}
                  deliveryAddress={o.delivery_address}
                  restaurantName={restaurantName}
                  driverLat={liveDriverCoords?.lat ?? o.driver_lat ?? null}
                  driverLng={liveDriverCoords?.lng ?? o.driver_lng ?? null}
                  deliveryLat={o.delivery_lat ?? null}
                  deliveryLng={o.delivery_lng ?? null}
                  restaurantLat={restaurantLat}
                  restaurantLng={restaurantLng}
                  locale={locale}
                  onEtaUpdate={setLiveDeliveryEta}
                />
                <span className="absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[12px] font-bold shadow-sm" style={{ background: K.card, color: locAgeMin != null && locAgeMin >= 2 ? K.amber : K.greenDeep }}>
                  {locLabel}
                </span>
              </section>
            )}
            {onTheWay && !atDoor && !hasDriverGps && (
              <p className="text-[13px] font-semibold px-1" style={{ color: K.faint }}>
                {en ? 'Live location will appear when the driver shares it.' : 'La ubicación en vivo aparece cuando el repartidor la comparte.'}
              </p>
            )}

            {/* ── Pickup listo: cómo llegar (el número va en el bloque de arriba) ── */}
            {isPickup && isActive && restaurantAddress && ['almost_ready', 'ready'].includes(o.status) && (
              <section className={`${card} px-4 py-3 flex items-center justify-between gap-3`} style={cardStyle}>
                <p className="text-[14px] font-semibold min-w-0">{restaurantAddress}</p>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurantAddress)}`} target="_blank" rel="noopener noreferrer"
                  className="flex-shrink-0 h-11 px-3 rounded-xl grid place-items-center text-[14px] font-bold" style={{ color: K.greenDeep }}>
                  {en ? 'Directions' : 'Cómo llegar'}
                </a>
              </section>
            )}

            {/* ── Mesa ── */}
            {isDineIn && isActive && (
              <>
                <WaiterCallButton orderId={o.id} tableName={o.table_name} locale={locale} />
                <Link href={`/${restaurantSlug}`} className="h-12 rounded-2xl grid place-items-center text-[15px] font-bold bg-white border" style={cardStyle}>
                  {t.addMoreItems}
                </Link>
              </>
            )}

            {/* ── Dirección + instrucciones (editables hasta que sale) ── */}
            {isDelivery && isActive && !onTheWay && o.delivery_address && (
              <DeliveryInstructions
                orderId={o.id}
                token={o.authorized ? trackingToken : undefined}
                address={o.delivery_address}
                notes={o.notes ?? ''}
                en={en}
                onSaved={(notes) => setOrder((prev: any) => ({ ...prev, notes }))}
              />
            )}

            {/* ── Entregado: foto + una sola pregunta ── */}
            {isComplete && o.delivery_photo_url && (
              <a href={o.delivery_photo_url} target="_blank" rel="noopener noreferrer" className="relative block w-full aspect-[4/3] rounded-[20px] overflow-hidden border" style={cardStyle}>
                <Image src={o.delivery_photo_url} alt={t.deliveryProofAlt} fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" />
              </a>
            )}
            {isComplete && !autoClosed && (
              <FeedbackPrompt restaurantId={restaurantId} orderId={o.id} customerName={o.customer_name} restaurantPhone={restaurantPhone} en={en} />
            )}

            {isActive && o.authorized && trackingToken && (
              <PushSubscriptionPrompt orderId={o.id} token={trackingToken} locale={locale} />
            )}
          </>
        )}

        {/* ── Tu pedido (plegado) ── */}
        {!isCancelled && (o.order_items?.length ?? 0) > 0 && (
          <details className={`${card} group`} style={cardStyle}>
            <summary className="list-none cursor-pointer px-4 py-3.5 flex items-center justify-between gap-3 min-h-[52px]">
              <span className="min-w-0">
                <span className="block text-[15px] font-bold">{t.yourOrderLabel} · {itemCount} {itemCount === 1 ? t.itemSingular : t.itemPlural}</span>
                {payLine && !cashRowShown && <span className="block text-[13px]" style={{ color: K.sub }}>{payLine}</span>}
              </span>
              <span className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[15px] font-bold tabular-nums">{amount}</span>
                <span className="text-[18px] transition-transform group-open:rotate-90" style={{ color: K.faint }} aria-hidden>›</span>
              </span>
            </summary>
            <div className="px-4 pb-4 grid gap-3 border-t" style={{ borderColor: K.line }}>
              <ul className="grid gap-2 pt-3">
                {(o.order_items as any[]).map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 text-[14px]">
                    <span className="min-w-0">
                      <b className="tabular-nums">{item.qty}×</b> {item.product_name ?? t.productFallback}
                      {item.variant_name && <span style={{ color: K.faint }}> · {item.variant_name}</span>}
                      {item.notes && <span className="block text-[12.5px]" style={{ color: K.sub }}>{item.notes}</span>}
                    </span>
                    <span className="tabular-nums flex-shrink-0" style={{ color: K.sub }}>{formatPrice(Number(item.line_total ?? item.unit_price), currency)}</span>
                  </li>
                ))}
              </ul>
              <div className="grid gap-1 pt-2 border-t text-[13.5px]" style={{ borderColor: K.line, color: K.sub }}>
                {Number(o.discount_amount) > 0 && <div className="flex justify-between"><span>{t.discount}</span><span>-{formatPrice(Number(o.discount_amount), currency)}</span></div>}
                {isDelivery && Number(o.delivery_fee) > 0 && <div className="flex justify-between"><span>{t.deliveryFee}</span><span>{formatPrice(Number(o.delivery_fee), currency)}</span></div>}
                {Number(o.tax_amount) > 0 && <div className="flex justify-between"><span>{t.taxes}</span><span>{formatPrice(Number(o.tax_amount), currency)}</span></div>}
                {Number(o.tip_amount) > 0 && <div className="flex justify-between"><span>{t.tip}</span><span>{formatPrice(Number(o.tip_amount), currency)}</span></div>}
                <div className="flex justify-between text-[15px] font-bold pt-1" style={{ color: K.ink }}><span>{t.total}</span><span className="tabular-nums">{amount}</span></div>
              </div>
              {!isDelivery && o.notes && <p className="text-[13px]" style={{ color: K.sub }}>{t.notes}: {o.notes}</p>}
              {isDelivery && (() => {
                const events: { label: string; ts: string }[] = [];
                if (o.created_at) events.push({ label: t.timelineOrdered, ts: o.created_at });
                if (o.driver_picked_up_at) events.push({ label: t.timelinePickedUp, ts: o.driver_picked_up_at });
                if (o.driver_at_door_at) events.push({ label: t.timelineAtDoor, ts: o.driver_at_door_at });
                if (o.driver_delivered_at) events.push({ label: t.timelineDelivered, ts: o.driver_delivered_at });
                if (events.length < 2) return null;
                return (
                  <ol className="grid gap-1 pt-2 border-t text-[13px]" style={{ borderColor: K.line, color: K.sub }}>
                    {events.map((ev) => (
                      <li key={ev.label} className="flex justify-between"><span>{ev.label}</span><span className="tabular-nums">{fmtClock(Date.parse(ev.ts))}</span></li>
                    ))}
                  </ol>
                );
              })()}
            </div>
          </details>
        )}

        {isComplete && currency === 'MXN' && (
          <CfdiButton orderId={o.id} restaurantId={restaurantId} t={t} />
        )}

        <div className="grid gap-1 pt-1">
          {isComplete && (o.order_items?.length ?? 0) > 0 && (
            <ShareReceiptButton
              orderNumber={o.order_number}
              restaurantName={restaurantName}
              restaurantSlug={restaurantSlug}
              total={Number(o.total)}
              currency={currency}
              items={(o.order_items as any[]).map((i: any) => ({ name: i.product_name ?? 'Item', qty: i.qty }))}
              locale={en ? 'en' : 'es'}
            />
          )}
          <nav className="flex items-center justify-center gap-1 text-[14px] font-semibold" style={{ color: K.sub }}>
            <Link href={`/${restaurantSlug}`} className="h-11 px-3 grid place-items-center">
              {t.backToMenu}
            </Link>
            <span aria-hidden style={{ color: K.faint }}>·</span>
            <Link href={`/${restaurantSlug}/mis-pedidos`} className="h-11 px-3 grid place-items-center">
              {t.viewPreviousOrders}
            </Link>
          </nav>
          <OrderHistorySaver order={o} restaurantSlug={restaurantSlug} restaurantName={restaurantName} locale={locale} currency={currency} trackingToken={trackingToken} />
        </div>
      </main>

      {/* ── Acción principal abajo, al alcance del pulgar ── */}
      {showDock && (
        <div className="sticky bottom-0 w-full border-t" style={{ background: K.surface, borderColor: K.line, paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto px-4 pt-3 grid gap-2">
            {canArrive ? (
              o.customer_arrived_at ? (
                <p className="h-14 rounded-2xl grid place-items-center text-[16px] font-bold" style={{ background: K.greenSoft, color: K.greenDeep }} role="status">
                  {en ? "We told them you're here" : 'Ya avisamos que llegaste'}
                </p>
              ) : (
                <>
                  {arriveErr && (
                    <p className="text-center text-[13.5px] font-semibold" style={{ color: K.red }} role="alert">
                      {en ? "Couldn't notify the restaurant. Try again" : 'No pudimos avisar al restaurante. Intenta de nuevo'}
                      {restaurantPhone && <>{' '}{en ? 'or ' : 'o '}<a href={`tel:${restaurantPhone}`} className="underline">{en ? 'call' : 'llama'}</a></>}.
                    </p>
                  )}
                  <button type="button" onClick={markArrived} disabled={arriving}
                    className="h-14 rounded-2xl text-[17px] font-extrabold active:scale-[0.98] transition-transform disabled:opacity-60"
                    style={{ background: K.btn, color: K.btnFg }}>
                    {arriving ? '…' : (en ? "I'm here" : 'Ya llegué')}
                  </button>
                </>
              )
            ) : canReorder ? (
              <button type="button" onClick={reorder}
                className="h-14 rounded-2xl text-[17px] font-extrabold active:scale-[0.98] transition-transform"
                style={{ background: K.btn, color: K.btnFg }}>
                {en ? 'Order the same again' : 'Pedir lo mismo otra vez'}
              </button>
            ) : restaurantPhone ? (
              <a href={`tel:${restaurantPhone}`}
                className="h-12 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-bold bg-white border active:scale-[0.98] transition-transform"
                style={cardStyle}>
                <Phone className="w-[18px] h-[18px]" aria-hidden /> {t.callRestaurant}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// Dirección + instrucciones de entrega. Editables desde el seguimiento hasta
// que el repartidor recoge (DoorDash Drive): en edificios de Queens el timbre
// o el apartamento hacen la diferencia.
function DeliveryInstructions({ orderId, token, address, notes, en, onSaved }: {
  orderId: string; token?: string; address: string; notes: string; en: boolean; onSaved: (notes: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!token) return;
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/public/order-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, t: token, action: 'notes', notes: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { onSaved(data.notes ?? draft); setEditing(false); }
      else setErr(res.status === 409
        ? (en ? 'The driver already has your order. Call the restaurant.' : 'El repartidor ya salió con tu pedido. Llama al restaurante.')
        : (en ? 'Could not save. Try again.' : 'No se pudo guardar. Intenta de nuevo.'));
    } catch {
      setErr(en ? 'Could not save. Try again.' : 'No se pudo guardar. Intenta de nuevo.');
    }
    setSaving(false);
  };
  return (
    <section className="bg-white rounded-[20px] border px-4 py-3.5 grid gap-2" style={{ borderColor: K.line }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: K.faint }}>{en ? 'Deliver to' : 'Entregar en'}</p>
      <p className="text-[16px] font-bold leading-snug">{address}</p>
      {editing ? (
        <>
          <label htmlFor="delivery-notes" className="sr-only">{en ? 'Delivery instructions' : 'Instrucciones de entrega'}</label>
          <textarea id="delivery-notes" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} rows={3}
            placeholder={en ? 'Apt, buzzer, gate code…' : 'Apto, timbre, código del portón…'}
            className="w-full rounded-xl border px-3 py-2 text-[16px]" style={{ borderColor: K.line }} />
          {err && <p className="text-[13px] font-semibold" style={{ color: K.red }}>{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className="h-11 px-4 rounded-xl text-[14px] font-bold disabled:opacity-60" style={{ background: K.btn, color: K.btnFg }}>
              {saving ? '…' : (en ? 'Save' : 'Guardar')}
            </button>
            <button type="button" onClick={() => { setEditing(false); setDraft(notes); setErr(''); }} className="h-11 px-4 rounded-xl text-[14px] font-semibold" style={{ color: K.sub }}>
              {en ? 'Cancel' : 'Cancelar'}
            </button>
          </div>
        </>
      ) : (
        <>
          {notes && <p className="rounded-xl px-3 py-2 text-[13.5px] font-semibold" style={{ background: K.noteBg, color: K.noteFg }}>{notes}</p>}
          {token && (
            <button type="button" onClick={() => { setDraft(notes); setEditing(true); }} className="justify-self-start h-11 -ml-1 px-1 text-[14px] font-bold" style={{ color: K.greenDeep }}>
              {notes ? (en ? 'Edit instructions' : 'Editar instrucciones') : (en ? 'Add instructions' : 'Agregar instrucciones')}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// Una sola pregunta al final (peak-end). "Todo bien" lleva a la reseña
// pública; "Hubo un problema" le llega al dueño en privado (no se publica).
function FeedbackPrompt({ restaurantId, orderId, customerName, restaurantPhone, en }: {
  restaurantId: string; orderId: string; customerName: string; restaurantPhone?: string; en: boolean;
}) {
  const [mode, setMode] = useState<'ask' | 'good' | 'issue' | 'done'>('ask');
  const [rating, setRating] = useState(5);
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState(false);
  const reasons = en
    ? ['Something was missing', 'It arrived cold', 'It arrived late', 'Other']
    : ['Faltó algo', 'Llegó frío', 'Llegó tarde', 'Otro'];

  const send = async () => {
    setSending(true);
    setSendErr(false);
    const issue = mode === 'issue';
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId, order_id: orderId, customer_name: customerName || (en ? 'Customer' : 'Cliente'),
          rating: issue ? 2 : rating,
          comment: issue ? [reason, comment.trim()].filter(Boolean).join(': ') : comment.trim(),
          issue, _hp: '',
        }),
      });
      if (res.ok || res.status === 409) setMode('done');
      else setSendErr(true);
    } catch { setSendErr(true); }
    setSending(false);
  };

  if (mode === 'done') {
    return (
      <p className="rounded-2xl px-4 py-3 text-[14px] font-semibold" style={{ background: K.greenSoft, color: K.greenDeep }} role="status">
        {en ? 'Thanks for letting us know.' : 'Gracias por contarnos.'}
      </p>
    );
  }
  return (
    <section className="bg-white rounded-[20px] border px-4 py-4 grid gap-3" style={{ borderColor: K.line }}>
      {mode === 'ask' && (
        <>
          <p className="text-[16px] font-bold">{en ? 'Did everything arrive OK?' : '¿Llegó todo bien?'}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode('good')} className="h-12 rounded-2xl border text-[15px] font-bold" style={{ borderColor: K.line }}>
              {en ? 'Yes, all good' : 'Sí, todo bien'}
            </button>
            <button type="button" onClick={() => setMode('issue')} className="h-12 rounded-2xl border text-[15px] font-bold" style={{ borderColor: K.line }}>
              {en ? 'There was a problem' : 'Hubo un problema'}
            </button>
          </div>
        </>
      )}
      {mode === 'good' && (
        <>
          <p className="text-[16px] font-bold">{en ? 'How would you rate it?' : '¿Cómo lo calificas?'}</p>
          <div className="flex gap-1" role="radiogroup" aria-label={en ? 'Rating' : 'Calificación'}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={en ? `${n} star${n > 1 ? 's' : ''}` : `${n} estrella${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)} className="w-11 h-11 grid place-items-center">
                <Star className="w-7 h-7" style={{ color: n <= rating ? '#F5A524' : K.line }} fill={n <= rating ? '#F5A524' : 'none'} aria-hidden />
              </button>
            ))}
          </div>
          <label htmlFor="review-comment" className="sr-only">{en ? 'Comment' : 'Comentario'}</label>
          <textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={2}
            placeholder={en ? 'Anything to add? (optional)' : '¿Algo que agregar? (opcional)'}
            className="w-full rounded-xl border px-3 py-2 text-[16px]" style={{ borderColor: K.line }} />
          {sendErr && <p className="text-[13px] font-semibold" style={{ color: K.red }} role="alert">{en ? "Couldn't send. Try again." : 'No se pudo enviar. Intenta de nuevo.'}</p>}
          <button type="button" onClick={send} disabled={sending} className="h-12 rounded-2xl text-[15px] font-bold disabled:opacity-60" style={{ background: K.btn, color: K.btnFg }}>
            {sending ? '…' : (en ? 'Send' : 'Enviar')}
          </button>
        </>
      )}
      {mode === 'issue' && (
        <>
          <p className="text-[16px] font-bold">{en ? 'What happened?' : '¿Qué pasó?'}</p>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r}
                className="h-11 px-4 rounded-full border text-[14px] font-semibold"
                style={reason === r ? { background: K.ink, color: K.card, borderColor: K.ink } : { borderColor: K.line }}>
                {r}
              </button>
            ))}
          </div>
          <label htmlFor="issue-comment" className="sr-only">{en ? 'Details' : 'Detalles'}</label>
          <textarea id="issue-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={400} rows={2}
            placeholder={en ? 'Tell us a bit more (optional)' : 'Cuéntanos un poco más (opcional)'}
            className="w-full rounded-xl border px-3 py-2 text-[16px]" style={{ borderColor: K.line }} />
          {sendErr && <p className="text-[13px] font-semibold" style={{ color: K.red }} role="alert">{en ? "Couldn't send. Try again." : 'No se pudo enviar. Intenta de nuevo.'}</p>}
          <button type="button" onClick={send} disabled={sending || !reason} className="h-12 rounded-2xl text-[15px] font-bold disabled:opacity-50" style={{ background: K.btn, color: K.btnFg }}>
            {sending ? '…' : (en ? 'Send to the restaurant' : 'Enviar al restaurante')}
          </button>
          {restaurantPhone && (
            <a href={`tel:${restaurantPhone}`} className="text-center text-[14px] font-semibold h-11 grid place-items-center" style={{ color: K.sub }}>
              {en ? 'Or call the restaurant' : 'O llama al restaurante'}
            </a>
          )}
        </>
      )}
    </section>
  );
}

function WaiterCallButton({ orderId, tableName, locale }: { orderId: string; tableName?: string | null; locale?: string }) {
  const t = getT(locale);
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

  const label = t.waiterCallLabel(tableName);

  if (state === 'sent' && cooldown > 0) {
    const mins = Math.floor(cooldown / 60);
    const secs = cooldown % 60;
    const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-violet-50 border border-violet-200">
        <p className="text-sm font-semibold text-violet-700">
          {t.staffNotified}
        </p>
        <p className="text-xs text-violet-400">{t.callAgainIn(timeStr)}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handlePress}
      disabled={state === 'sending' || cooldown > 0}
      aria-label={label}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-50 border border-violet-200 text-violet-700 font-semibold text-sm hover:bg-violet-100 active:scale-[0.98] transition-all disabled:opacity-50"
    >
      <span className="text-base">🙋</span>
      {state === 'sending'
        ? t.notifyingStaff
        : t.callWaiter}
    </button>
  );
}

// Pedido online sin cobrar: antes decía "Recibido" aunque el cliente hubiera
// cancelado el pago (el mostrador ni lo ve y a las 24 h se cancela solo).
// Ojo: justo después de pagar bien, el pedido sigue "sin cobrar" unos
// segundos hasta que llega la confirmación de la pasarela (y con Apple/Google
// Pay no hay ?paid=true): en esa ventana se dice "Confirmando", nunca
// "no se cobró", para no invitar a pagar dos veces.
const CONFIRM_WINDOW_MS = 3 * 60_000;
function PaymentPendingCard({ orderId, restaurantSlug, paidParam, createdAt, paymentMethod, currency, t }: {
  orderId: string; restaurantSlug: string; paidParam?: string; createdAt: string;
  paymentMethod?: string | null; currency: string; t: ReturnType<typeof getT>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [mountedAt] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const age = now - Date.parse(createdAt);
  const confirming =
    paidParam === 'pending' // MercadoPago/OXXO: queda pendiente de verdad
    || (paidParam === 'true' && now - mountedAt < 60_000)
    || (paidParam !== 'false' && paidParam !== 'true' && (paymentMethod === 'wallet' || age < CONFIRM_WINDOW_MS));

  if (confirming) {
    return (
      <div className="text-center py-10 px-6" role="status" aria-live="polite">
        <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-gray-200 border-t-[#05c8a7] motion-safe:animate-spin" aria-hidden />
        <h2 className="text-xl font-black text-gray-900">
          {paidParam === 'pending'
            ? (t.en ? 'Your payment is pending' : 'Tu pago está pendiente')
            : (t.en ? 'Confirming your payment…' : 'Confirmando tu pago…')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {paidParam === 'pending'
            ? (t.en ? 'We will let you know as soon as it is confirmed.' : 'Te avisamos apenas se confirme.')
            : (t.en ? 'This takes a few seconds.' : 'Tarda unos segundos.')}
        </p>
      </div>
    );
  }

  // El reintento abre Stripe: no aplica a restaurantes con Wompi (COP).
  const canRetry = currency.toUpperCase() !== 'COP';
  const retry = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, slug: restaurantSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setErr(t.payRetryError);
    } catch {
      setErr(t.payRetryError);
    }
    setBusy(false);
  };
  return (
    <div className="py-8 px-6 text-center" role="alert">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
        <CreditCard className="w-8 h-8 text-red-600" aria-hidden />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">{t.payFailedTitle}</h2>
      <p className="text-sm text-gray-600 max-w-xs mx-auto">{t.payFailedDesc}</p>
      {canRetry && (
        <button type="button" onClick={retry} disabled={busy}
          className="mt-5 w-full h-12 rounded-2xl bg-gray-900 text-white font-bold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-60">
          {busy ? '…' : t.payRetry}
        </button>
      )}
      {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
    </div>
  );
}

/** Pedidos con avisos activos en este navegador (incluye la clave vieja de 1 solo pedido). */
function readPushOrders(): string[] {
  try {
    const raw = localStorage.getItem('menius-push-orders');
    const list = raw ? JSON.parse(raw) : [];
    const legacy = localStorage.getItem('menius-push-order');
    const ids = Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
    return legacy && !ids.includes(legacy) ? [...ids, legacy] : ids;
  } catch {
    return [];
  }
}

function PushSubscriptionPrompt({ orderId, token, locale }: { orderId: string; token: string; locale?: string }) {
  const t = getT(locale);
  const [state, setState] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle');

  // Suscribe ESTE pedido. Con permiso ya dado (de un pedido anterior) se hace
  // en silencio: antes se marcaba "suscrito" sin suscribir nada y desde el
  // segundo pedido no llegaba ningún aviso.
  const subscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const keyRes = await fetch('/api/push/subscribe');
      const { publicKey } = await keyRes.json();
      if (!publicKey) return false;
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
    }
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), order_id: orderId, t: token }),
    });
    if (!res.ok) return false;
    // Se recuerdan los pedidos ya suscritos en este navegador (los últimos 20).
    try {
      const list = readPushOrders().filter((id) => id !== orderId);
      localStorage.setItem('menius-push-orders', JSON.stringify([orderId, ...list].slice(0, 20)));
    } catch { /* sin storage */ }
    return true;
  }, [orderId, token]);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setState('denied'); return; }
    let done = false;
    done = readPushOrders().includes(orderId);
    if (done) { setState('subscribed'); return; }
    if (Notification.permission === 'granted') {
      setState('subscribed');
      subscribe().catch(() => { /* sin push: el seguimiento sigue funcionando */ });
    }
  }, [orderId, subscribe]);

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); return; }
      setState((await subscribe()) ? 'subscribed' : 'idle');
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
          {t.getOrderUpdates}
        </p>
        <p className="text-xs text-violet-600 mt-0.5">
          {t.notifyWhenStatusChanges}
        </p>
      </div>
      <button
        onClick={handleSubscribe}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
      >
        {t.notifyMe}
      </button>
    </div>
  );
}

function OrderHistorySaver({ order, restaurantSlug, restaurantName, locale, currency, trackingToken }: { order: any; restaurantSlug: string; restaurantName: string; locale?: string; currency?: string; trackingToken?: string | null }) {
  const t = getT(locale);
  const displayCurrency = currency ?? 'MXN';
  const dateLocale = locale === 'en' ? 'en-US' : 'es-MX';

  useEffect(() => {
    if (!order?.id) return;
    try {
      const key = `menius-history-${restaurantSlug}`;
      const raw = localStorage.getItem(key);
      const history: any[] = raw ? JSON.parse(raw) : [];
      // La llave de cada pedido queda en ESTE teléfono (el mismo que la abrió),
      // para que el historial abra el seguimiento completo y no uno sin datos.
      const prev = history.find(h => h.id === order.id);
      const entry = { id: order.id, number: order.order_number, status: order.status, total: order.total, date: order.created_at, items: order.order_items?.length ?? 0, t: (order.authorized && trackingToken) || prev?.t || null };
      if (prev) {
        history[history.indexOf(prev)] = entry;
      } else {
        history.unshift(entry);
      }
      localStorage.setItem(key, JSON.stringify(history.slice(0, 20)));
      // Keep the latest tracking token so "Mis pedidos" can prove ownership to
      // /api/orders/history (which authorizes against the most recent order's
      // token) and get the full payload (images, dietary tags, payment method).
      // The server re-validates it, so persisting an unverified token is harmless.
      if (trackingToken) {
        localStorage.setItem(`menius-track-token-${restaurantSlug}`, trackingToken);
      }
    } catch {}
  }, [order, restaurantSlug, trackingToken]);

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
    ? t.hideHistory
    : t.seePreviousOrders(history.length);

  return (
    <div className="mt-2">
      <button onClick={() => setShowHistory(!showHistory)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2">
        {toggleLabel}
      </button>
      {showHistory && (
        <div className="space-y-2 mt-1">
          {history.map((h: any) => (
            <Link key={h.id} href={`/${restaurantSlug}/orden/${h.number}${h.t ? `?t=${encodeURIComponent(h.t)}` : ''}`}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium">#{h.number}</p>
                <p className="text-xs text-gray-400">
                  {new Date(h.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {h.items} items
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
                  <CheckCircle2 className="w-6 h-6 text-[#047a65]" />
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
                    className="block w-full py-2.5 rounded-xl bg-[#05c8a7] text-[#04241E] text-sm font-semibold hover:bg-[#04b096] transition-colors">
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
                  className="w-full py-3 rounded-xl bg-[#05c8a7] text-[#04241E] font-semibold text-sm hover:bg-[#04b096] transition-colors disabled:opacity-50"
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
