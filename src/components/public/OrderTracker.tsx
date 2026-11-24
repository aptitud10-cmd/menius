'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { CheckCircle2, Check, Clock, Bell, XCircle, ArrowLeft, Star, Utensils, ShoppingBag, Truck, CreditCard, Banknote, Phone, MapPin, ChevronRight, RotateCw } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { readPendingPayment, clearPendingPayment } from '@/lib/pending-payment';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatPrice } from '@/lib/utils';
import { travelMinutes, haversineKm } from '@/lib/orders/eta';
import { MINUTES_PER_STOP_AHEAD } from '@/lib/orders/driver-route';
import { isAwaitingOnlinePayment } from '@/lib/order-state';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import ShareReceiptButton from './ShareReceiptButton';
import { shortOrderNumber } from '@/lib/orders/short-number';
import { trackerBrand } from '@/lib/tracker-brand';
import { formatPhoneNumber, formatPhoneNumberIntl } from 'react-phone-number-input';
import { NOT_ACCEPTED_MINS } from '@/lib/orders/order-timeouts';

// Datos "de máquina" (n.º de pedido, horas de los pasos, "Actualizado…") van
// en Inter con cifras tabulares: la DM Mono con cero tachado se leía como una
// terminal ("#Ø42", "Updated Ø s ago"). --tk-mono queda como alias de la fuente.

const phoneText = (p: string) => formatPhoneNumber(p) || formatPhoneNumberIntl(p) || p;

// Paleta del seguimiento = la del checkout, SIEMPRE clara (el menú y el
// checkout son claros: pasar a oscuro al llegar acá se sentía otra app).
// --brand* = color del restaurante (estado del pedido); --accent = verde MENIUS
// (lo que se toca). Los --tk-* quedan como alias para DeliveryMap.
const K = {
  surface: 'var(--tk-surface)', card: 'var(--tk-card)', line: 'var(--tk-line)',
  ink: 'var(--tk-ink)', sub: 'var(--tk-sub)', faint: 'var(--tk-faint)',
  btn: 'var(--tk-btn)', btnFg: 'var(--tk-btn-fg)',
  green: 'var(--tk-green)', greenInk: 'var(--tk-green-ink)', greenDeep: 'var(--tk-green-deep)', greenSoft: 'var(--tk-green-soft)',
  amber: 'var(--tk-amber)', amberSoft: 'var(--tk-amber-soft)',
  red: 'var(--tk-red)', redSoft: 'var(--tk-red-soft)',
  brand: 'var(--brand)', brandInk: 'var(--brand-ink)', brandSoft: 'var(--brand-soft)',
  surface2: 'var(--tk-surface-2)', shadow: 'var(--tk-shadow)', mono: 'var(--tk-mono)',
} as const;
const TRACKER_CSS = `
.mt-root{--tk-surface:#F2F2F6;--tk-card:#FFFFFF;--tk-surface-2:#F5F5F8;--tk-line:rgba(17,17,20,.09);--tk-ink:#111114;--tk-sub:#4F4F57;--tk-faint:#6B6B74;
--tk-btn:#05C8A7;--tk-btn-fg:#04241E;--tk-green:#05C8A7;--tk-green-ink:#04241E;--tk-green-deep:#047A65;--tk-green-soft:#E2F7F3;
--tk-amber:#8A5100;--tk-amber-soft:#FFF4DC;--tk-red:#C4321B;--tk-red-soft:#FDECEA;
--tk-shadow:0 1px 2px rgba(17,17,20,.04),0 8px 24px rgba(17,17,20,.06);
--tk-mono:inherit;color-scheme:light}
.mt-root .mt-ok circle{fill:var(--brand)}
.mt-root .mt-ok path{fill:none;stroke:var(--brand-ink);stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
.mt-root .mt-ok.draw circle{animation:mtPop .45s cubic-bezier(.32,.72,0,1) both;transform-origin:center}
.mt-root .mt-ok.draw path{stroke-dasharray:30;stroke-dashoffset:30;animation:mtDraw .5s .18s cubic-bezier(.32,.72,0,1) forwards}
@keyframes mtDraw{to{stroke-dashoffset:0}}
@keyframes mtPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.mt-root .mt-now::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:2px solid var(--brand);opacity:.35;animation:mtRing 1.8s ease-out 2}
@keyframes mtRing{from{transform:scale(.7);opacity:.5}to{transform:scale(1.25);opacity:0}}
@media (prefers-reduced-motion: reduce){.mt-root .mt-ok.draw circle,.mt-root .mt-ok.draw path,.mt-root .mt-now::after{animation:none}.mt-root .mt-ok.draw path{stroke-dashoffset:0}}
.mt-root .mt-pretty{text-wrap:pretty}
`;

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
  /** Color del restaurante (#RRGGBB) para el estado del pedido; sin color → tinta neutra. */
  brandColor?: string | null;
  /** Enlace de reseña de Google (se ofrece a todos al terminar). */
  googleReviewUrl?: string | null;
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

export function OrderTracker({ restaurantId, restaurantName, restaurantSlug, restaurantAddress, restaurantLat, restaurantLng, restaurantPhone, restaurantLogo, brandColor, googleReviewUrl, orderNumber, trackingToken, currency = 'MXN', locale, showPaidBanner = false, paidParam, initialOrder }: OrderTrackerProps) {
  const t = getT(locale);
  const [order, setOrder] = useState<any>(initialOrder ?? null);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState('');
  const [rtStatus, setRtStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('reconnecting');
  // Live GPS coords pushed directly from the broadcast 'location_update' event.
  // Updated without HTTP refetch so the map marker moves in real-time.
  const [liveDriverCoords, setLiveDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Minutos de la ruta y CUÁNDO se calcularon. La llegada se ancla a ese momento:
  // si el GPS se corta (pantalla bloqueada), la cuenta sigue bajando en vez de
  // quedarse en "5 min" para siempre.
  const [liveDeliveryEta, setLiveDeliveryEta] = useState<{ min: number; at: number } | null>(null);
  const onLiveEta = useCallback((m: number | null) => setLiveDeliveryEta(m == null ? null : { min: m, at: Date.now() }), []);
  // Cuándo llegó la última posición del repartidor (para "de hace N min").
  const [lastLocAt, setLastLocAt] = useState<number | null>(null);
  const [etaTick, setEtaTick] = useState(0);
  // Cuándo llegó el último dato del servidor ("Actualizado hace N s").
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(() => (initialOrder ? Date.now() : null));
  const [online, setOnline] = useState(true);
  // Escritorio: no se puede llamar desde la computadora → número + Copiar.
  const [isDesktop, setIsDesktop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 860px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const hasInitialOrder = !!initialOrder;

  // B1/W9 — el checkout deja el carrito intacto al mandar a pagar online. Se
  // vacía acá, cuando ESTE pedido figura pagado (el webhook puede llegar unos
  // segundos después de la vuelta: el efecto re-corre con el realtime).
  useEffect(() => {
    if (!order?.id || order.payment_status !== 'paid') return;
    const pending = readPendingPayment();
    if (!pending || pending.orderId !== order.id) return;
    const cart = useCartStore.getState();
    if (cart.restaurantId === pending.restaurantId) cart.clearCart();
    clearPendingPayment();
  }, [order?.id, order?.payment_status]);

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
        setLastFetchAt(Date.now());
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
      <div className="min-h-screen bg-[#F2F2F6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-gray-200 border-t-[#05c8a7] rounded-full motion-safe:animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    if (showPaidBanner) {
      return (
        <div className="min-h-[100dvh] bg-[#F2F2F6] flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-[#d0f7f1] flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-[#047a65]" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t.paymentReceived}</h1>
            <p className="text-sm text-gray-600 mb-6">{t.paymentReceivedDesc}</p>
            <div className="space-y-3">
              <button
                onClick={() => { setLoading(true); setError(''); fetchOrder(); }}
                className="w-full py-3.5 rounded-2xl bg-[#05c8a7] text-[#04241E] font-bold text-sm hover:bg-[#04b096] transition-colors"
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
      <div className="min-h-[100dvh] bg-[#F2F2F6] flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.errorTitle}</h1>
          <p className="text-sm text-gray-600 mb-6 max-w-xs mx-auto">{t.errorDesc}</p>
          <div className="space-y-3">
            <button
              onClick={() => { setLoading(true); setError(''); fetchOrder(); }}
              className="w-full py-3.5 rounded-2xl bg-[#05c8a7] text-[#04241E] font-bold text-sm hover:bg-[#04b096] transition-colors"
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

  // ───────────────────────── Diseño 2026-11-16 (A10) ─────────────────────────
  // Misma superficie clara que el checkout. Un solo dato gigante por pantalla,
  // pasos con hora, UNA tarjeta de detalle y un botón según el momento.
  // Color del restaurante = estado del pedido; verde MENIUS = lo que se toca.
  // Maqueta aprobada: .specify/docs/checkout-premium (A10, v4.6).
  const o = order as any;
  const en = t.en;
  const dateLocale = en ? 'en-US' : 'es-MX';
  const R = restaurantName;
  const brand = trackerBrand(brandColor);
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
  // Pickup dado por retirado tras 30 min en Listo: no hay hora real de retiro.
  const pickupDone = Boolean(o.pickup_done);
  const notAccepted = isCancelled && Boolean(o.not_accepted);
  const shortNum = shortOrderNumber(o.order_number as string | null | undefined);
  const driverName = String(o.driver_name ?? '').trim().split(' ')[0] || null;
  const customerFirst = String(o.customer_name ?? '').trim().split(' ')[0] || null;
  const fmtClock = (ms: number) => new Date(ms).toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit' });
  const now = Date.now() + etaTick * 0;
  const cashDue = o.payment_method === 'cash' && o.payment_status !== 'paid';
  const paidOnline = o.payment_status === 'paid' && o.payment_method !== 'cash';
  const amount = formatPrice(Number(o.total) || 0, currency);
  const phoneShown = restaurantPhone ? phoneText(restaurantPhone) : '';
  const tip = Number(o.tip_amount) || 0;

  // "8:35 a. m." → { hm: "8:35", suf: "a. m." } (el sufijo va chico al lado del número).
  const AMPM = /\s?(a\.\s?m\.|p\.\s?m\.|AM|PM)$/i;
  const clock = (ms: number) => {
    const s = fmtClock(ms);
    const m = s.match(AMPM);
    return { hm: m && m.index != null ? s.slice(0, m.index).trim() : s, suf: m ? m[0].trim() : '' };
  };
  const hm = (ms: number) => clock(ms).hm;
  // Ventana de 10 min (estudio Booth 2025: más conforme que una hora puntual).
  const win5 = (ms: number) => Math.floor((ms - 4 * 60_000) / 300_000) * 300_000;
  const range = (startMs: number) => {
    const a = clock(startMs), b = clock(startMs + 600_000);
    return { val: a.suf && a.suf !== b.suf ? `${a.hm} ${a.suf} – ${b.hm}` : `${a.hm} – ${b.hm}`, suf: b.suf };
  };
  const endDot = (x: string) => (x.endsWith('.') ? x : `${x}.`);
  const tsMs = (v: unknown) => (typeof v === 'string' ? Date.parse(v) : NaN);

  const createdMs = tsMs(o.created_at);
  const isPending = o.status === 'pending';
  const scheduledMs = isPending ? tsMs(o.scheduled_for) : NaN;
  const scheduled = Number.isFinite(scheduledMs);
  const pendingMin = Number.isFinite(createdMs) ? Math.max(0, Math.floor((now - createdMs) / 60_000)) : 0;
  const waiting = isPending && !scheduled && !awaitingPayment && pendingMin >= 5;
  const freshOrder = isPending && Number.isFinite(createdMs) && now - createdMs < 90_000;
  const almost = o.status === 'almost_ready';
  const pickupReady = isPickup && isActive && o.status === 'ready';
  const tableName = o.table_name ? String(o.table_name) : null;
  const tableLabel = tableName ? (/^\d+$/.test(tableName) ? (en ? `table ${tableName}` : `la mesa ${tableName}`) : tableName) : (en ? 'your table' : 'tu mesa');

  // Cocina: desde que el restaurante ACEPTÓ (prepared_at), igual que el email.
  const acceptedMs = tsMs(o.prepared_at);
  const kitchenStartMs = Number.isFinite(acceptedMs) ? acceptedMs : Date.parse(o.updated_at ?? o.created_at);
  const readyMs = Number(o.estimated_ready_minutes) > 0 && Number.isFinite(kitchenStartMs)
    ? kitchenStartMs + Number(o.estimated_ready_minutes) * 60_000 : null;
  const kitchenLate = readyMs != null && ['confirmed', 'preparing'].includes(o.status) && now - readyMs > 3 * 60_000;

  // Delivery: cuándo LLEGA (cocina + viaje en bici, mismo cálculo del checkout).
  const dLat = Number(o.delivery_lat), dLng = Number(o.delivery_lng);
  const km = restaurantLat != null && restaurantLng != null && o.delivery_lat != null && Number.isFinite(dLat) && Number.isFinite(dLng)
    ? haversineKm(restaurantLat, restaurantLng, dLat, dLng) : 2;
  const travelMs = travelMinutes(km) * 60_000;
  // Ruta: el repartidor entrega N pedidos antes del tuyo (solo el número llega).
  const stopsAhead = onTheWay && !atDoor ? Math.max(0, Number(o.stops_ahead) || 0) : 0;
  let arrivalMs: number | null = null;
  if (isDelivery && isActive && !atDoor) {
    if (onTheWay) {
      if (liveDeliveryEta != null) arrivalMs = Math.max(liveDeliveryEta.at + liveDeliveryEta.min * 60_000, now + 60_000);
      else {
        const left = Date.parse(o.driver_picked_up_at ?? o.updated_at);
        arrivalMs = Math.max((Number.isFinite(left) ? left : now) + travelMs, now + 60_000);
      }
      arrivalMs += stopsAhead * MINUTES_PER_STOP_AHEAD * 60_000;
    } else if (readyMs != null && !isPending) {
      const leave = o.status === 'ready' ? now : Math.max(readyMs, now);
      arrivalMs = leave + travelMs;
    }
  }
  const stopsAheadText = en
    ? `${stopsAhead} ${stopsAhead === 1 ? 'delivery' : 'deliveries'} before yours`
    : `${stopsAhead} entrega${stopsAhead === 1 ? '' : 's'} antes de la tuya`;

  // Hora del cierre (entregado / recogido / servido).
  const closedMs = Date.parse(o.driver_delivered_at ?? o.updated_at);

  // Ubicación del repartidor: en vivo o "de hace N min" (sin fingir).
  const hasDriverGps = liveDriverCoords != null || (o.driver_lat != null && o.driver_lng != null);
  const locMs = lastLocAt ?? (o.driver_updated_at ? Date.parse(o.driver_updated_at) : NaN);
  const locAgeMin = Number.isFinite(locMs) ? Math.floor((now - locMs) / 60_000) : null;

  // Frescura del dato (lo que el cliente ve es de hace N s) y sin conexión.
  const offline = !online;
  const fetchAgeS = lastFetchAt != null ? Math.max(0, Math.round((now - lastFetchAt) / 1000)) : null;
  const freshLabel = offline
    ? (en ? `Updated at ${fmtClock(lastFetchAt ?? now)}` : `Actualizado a las ${fmtClock(lastFetchAt ?? now)}`)
    : fetchAgeS == null || fetchAgeS < 10
      ? (en ? 'Updated just now' : 'Actualizado ahora')
      : fetchAgeS < 60
      ? (en ? 'Updated a moment ago' : 'Actualizado hace un momento')
      : (en ? `Updated ${Math.floor(fetchAgeS / 60)} min ago` : `Actualizado hace ${Math.floor(fetchAgeS / 60)} min`);

  // Billete con el que paga (el checkout lo deja en las notas: "[Paga con: $100]").
  const payWithMatch = typeof o.notes === 'string' ? o.notes.match(/\[(?:Paga con|Pays with):\s*\$?\s*([\d.,]+)\]/i) : null;
  const payWith = payWithMatch ? Number(payWithMatch[1].replace(/,/g, '')) : NaN;
  const changeDue = Number.isFinite(payWith) && payWith > (Number(o.total) || 0) ? payWith - (Number(o.total) || 0) : null;
  const visibleNotes = typeof o.notes === 'string' ? o.notes.replace(/\s*\[(?:Paga con|Pays with):[^\]]*\]\s*/gi, ' ').trim() : '';

  const itemCount = (o.order_items ?? []).reduce((n: number, it: any) => n + (Number(it.qty) || 1), 0);

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


  const copyPhone = async () => {
    if (!restaurantPhone) return;
    try { await navigator.clipboard.writeText(phoneText(restaurantPhone)); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { /* sin portapapeles */ }
  };

  // ── Titular + bajada ──
  const typeLabel = isPickup ? (en ? 'Pickup' : 'Para recoger') : isDelivery ? (en ? 'Delivery' : 'A domicilio') : (tableName ? (/^\d+$/.test(tableName) ? `${en ? 'Table' : 'Mesa'} ${tableName}` : tableName) : (en ? 'Dine-in' : 'En mesa'));
  const acceptedAt = Number.isFinite(acceptedMs) ? fmtClock(acceptedMs) : null;
  const doorMs = tsMs(o.driver_at_door_at);
  const [headline, lead] = ((): [string, string] => {
    if (notAccepted) return [en ? "It wasn't confirmed in time" : 'No lo confirmaron a tiempo', en
      ? `${R} didn't accept your order within ${NOT_ACCEPTED_MINS} minutes, so we cancelled it.`
      : `${R} no aceptó tu pedido en ${NOT_ACCEPTED_MINS} minutos, así que lo cancelamos.`];
    if (isCancelled) return [en ? 'Order cancelled' : 'Pedido cancelado', en ? `${R} couldn't take it this time.` : `${R} no pudo tomarlo esta vez.`];
    if (isComplete) {
      if (autoClosed) return [en ? 'Order closed' : 'Pedido cerrado', ''];
      if (pickupDone) return [en ? 'Thanks for your order' : 'Gracias por tu pedido',
        en ? `Thanks for ordering directly from ${R}.` : `Gracias por pedir directo a ${R}.`];
      const at = Number.isFinite(closedMs) ? fmtClock(closedMs) : '';
      if (isDineIn) return [en ? 'Served. Enjoy!' : 'Servido. ¡Buen provecho!', en ? `Thanks for ordering at ${R}.` : `Gracias por pedir en ${R}.`];
      return [
        isPickup ? (en ? `Picked up${at ? ` at ${at}` : ''}` : `Recogido${at ? ` a las ${at}` : ''}`) : (en ? `Delivered${at ? ` at ${at}` : ''}` : `Entregado${at ? ` a las ${at}` : ''}`),
        en ? `Enjoy! Thanks for ordering directly from ${R}.` : `¡Buen provecho! Gracias por pedir directo a ${R}.`,
      ];
    }
    if (atDoor) {
      const who = driverName ?? (en ? 'Your driver' : 'Tu repartidor');
      return [en ? `${who} is at your door` : `${who} está en tu puerta`,
        `${Number.isFinite(doorMs) ? (en ? `Arrived at ${endDot(fmtClock(doorMs))} ` : `Llegó a las ${endDot(fmtClock(doorMs))} `) : ''}${restaurantPhone ? (en ? `If you can't come down, call ${R}.` : `Si no puedes bajar, llama a ${R}.`) : ''}`.trim()];
    }
    if (onTheWay) return [en ? 'On the way' : 'Va en camino', driverName ? (en ? `${driverName} has your order.` : `${driverName} lleva tu pedido.`) : ''];
    if (isPending) {
      if (scheduled) return [en ? 'Order scheduled' : 'Pedido programado', en ? `${R} will have it ready at the time you chose.` : `${R} lo tendrá listo a la hora que elegiste.`];
      if (waiting) return [en ? 'Not accepted yet' : 'Aún no lo aceptan', en
        ? `We sent it to ${R} ${pendingMin} minutes ago and they haven't answered yet.${restaurantPhone ? ' Call them to make sure they got it.' : ''}`
        : `Lo enviamos a ${R} hace ${pendingMin} minutos y todavía no responden.${restaurantPhone ? ' Llámalos para confirmar que lo recibieron.' : ''}`];
      return [isDineIn ? (en ? 'Order sent to the kitchen' : 'Pedido enviado a la cocina') : (en ? `Order sent to ${R}` : `Pedido enviado a ${R}`),
        isDineIn ? (en ? "We'll update this as soon as the kitchen accepts it." : 'Te avisamos aquí en cuanto la cocina lo acepte.') : (en ? `We'll update this as soon as ${R} accepts it.` : `Te avisamos aquí en cuanto ${R} lo acepte.`)];
    }
    if (kitchenLate) return [en ? 'Running a little late' : 'Va con un poco de demora', isDelivery
      ? (en ? "Sorry for the wait. We'll let you know as soon as it leaves." : 'Perdón por la espera. Te avisamos apenas salga.')
      : (en ? "Sorry for the wait. We'll let you know as soon as it's ready." : 'Perdón por la espera. Te avisamos apenas esté listo.')];
    if (pickupReady) {
      return [en ? 'Ready for pickup' : 'Listo para recoger', cashDue ? (en ? `You pay ${amount} in cash at the counter.` : `Pagas ${amount} en efectivo en el mostrador.`) : paidOnline ? (en ? 'Already paid.' : 'Ya está pagado.') : ''];
    }
    if (isDineIn && o.status === 'ready') return [en ? 'On its way to your table' : 'Va en camino a tu mesa', en ? `Arriving at ${tableLabel} in a moment.` : `Llega a ${tableLabel} en un momento.`];
    if (isDelivery && o.status === 'ready') return [en ? 'Ready — leaving soon' : 'Listo, sale en breve', en ? 'It leaves with the driver in a moment.' : 'Sale con el repartidor en un momento.'];
    if (almost) return [en ? 'Almost ready' : 'Casi listo', isPickup ? (en ? `Good time to head to ${R}.` : `Buen momento para salir hacia ${R}.`) : (en ? "It's finishing in the kitchen." : 'Está terminando en la cocina.')];
    // confirmed / preparing
    const acc = acceptedAt ? (en ? `${R} accepted it at ${endDot(acceptedAt)} ` : `${R} lo aceptó a las ${endDot(acceptedAt)} `) : '';
    if (isDineIn) return [en ? 'In the kitchen' : 'En la cocina', en ? `They'll bring it to ${tableLabel}.` : `Te lo llevan a ${tableLabel}.`];
    if (isDelivery) return [en ? 'In the kitchen' : 'En la cocina', acc + (en ? "We'll let you know when it leaves." : 'Te avisamos cuando salga.')];
    return [en ? 'In the kitchen' : 'En la cocina', acc + (en ? "We'll let you know when it's at the counter." : 'Te avisamos cuando esté en el mostrador.')];
  })();

  // ── Un solo dato gigante ──
  type Anchor = { lbl: string; val: string; suf?: string; ctx?: React.ReactNode; muted?: boolean; words?: boolean } | { code: true; lbl: string; val: string; ctx: string } | null;
  const freshNode = (
    <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ fontFamily: K.mono, color: K.faint }}>
      {!offline && <i className="block w-[7px] h-[7px] rounded-full" style={{ background: K.brand }} aria-hidden />}
      {freshLabel}
    </span>
  );
  const lateChip = <span className="text-[12.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: K.amberSoft, color: K.amber }}>{en ? 'Running late' : 'Con demora'}</span>;
  const anchor: Anchor = (() => {
    if (!isActive || awaitingPayment) return null;
    if (scheduled) {
      const c = clock(scheduledMs);
      const sd = new Date(scheduledMs);
      const tomorrow = new Date(now + 86_400_000);
      const day = sd.toDateString() === new Date(now).toDateString() ? (en ? 'today' : 'hoy')
        : sd.toDateString() === tomorrow.toDateString() ? (en ? 'tomorrow' : 'mañana')
        : sd.toLocaleDateString(dateLocale, { weekday: 'short' });
      const full = new Date(scheduledMs).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });
      return { lbl: isDelivery ? (en ? 'Arrives' : 'Llega') : isPickup ? (en ? 'Ready for pickup' : 'Listo para recoger') : (en ? 'Ready' : 'Listo'),
        val: `${day.charAt(0).toUpperCase()}${day.slice(1).replace('.', '')} ${c.hm}`, suf: c.suf,
        ctx: <span>{full.charAt(0).toUpperCase() + full.slice(1)}{restaurantPhone ? (en ? ` · to change it, call ${R}` : ` · para cambiarlo, llama a ${R}`) : ''}</span> };
    }
    if (isPending) {
      // Antes de aceptar: estimado en gris, nunca como hora firme.
      const est = Number(o.estimated_ready_minutes);
      if (!(est > 0)) return null;
      const r = range(win5(now + est * 60_000 + (isDelivery ? travelMs : 0)));
      if (isDineIn) return { lbl: en ? 'If accepted now, at your table in' : 'Si lo aceptan ahora, llega a tu mesa en', val: `~${est} min`, muted: true };
      return { lbl: isDelivery ? (en ? 'If accepted now, arrives between' : 'Si lo aceptan ahora, llega entre') : (en ? 'If accepted now, ready between' : 'Si lo aceptan ahora, listo entre'),
        val: r.val, suf: r.suf, muted: true, ctx: <span>{en ? 'Estimate · not a firm time yet' : 'Estimado · todavía no es la hora firme'}</span> };
    }
    if (atDoor) {
      if (cashDue) return { lbl: en ? 'Have ready' : 'Ten listos', val: amount,
        ctx: <span>{changeDue != null ? (en ? `Paying with ${formatPrice(payWith, currency)} · your change: ${formatPrice(changeDue, currency)}` : `Pagas con ${formatPrice(payWith, currency)} · tu cambio: ${formatPrice(changeDue, currency)}`) : (en ? 'In cash' : 'En efectivo')}</span> };
      if (Number.isFinite(doorMs)) { const c = clock(doorMs); return { lbl: en ? `${driverName ?? 'Your driver'} arrived at` : `${driverName ?? 'Tu repartidor'} llegó a las`, val: c.hm, suf: c.suf, ctx: paidOnline ? <span>{en ? "It's paid: you don't need to give anything." : 'Ya está pagado: no tienes que darle nada.'}</span> : undefined }; }
      return null;
    }
    if (pickupReady) {
      const since = tsMs(o.updated_at);
      return { code: true, lbl: en ? 'When you arrive, show this' : 'Al llegar, muestra esto', val: `#${shortNum}${customerFirst ? ` · ${customerFirst}` : ''}`,
        ctx: Number.isFinite(since) ? (en ? `Waiting for you since ${fmtClock(since)}` : `Te espera desde las ${fmtClock(since)}`) : '' };
    }
    if (isDelivery) {
      if (onTheWay && arrivalMs != null) {
        if (offline && lastFetchAt != null) {
          const r = range(win5(arrivalMs));
          return { lbl: en ? `At ${fmtClock(lastFetchAt)} it was arriving between` : `A las ${fmtClock(lastFetchAt)} llegaba entre`, val: r.val, suf: r.suf,
            ctx: <span>{en ? 'Your order keeps moving even without signal.' : 'Tu pedido sigue en camino aunque no tengas señal.'}</span> };
        }
        if (stopsAhead > 0) {
          const r = range(win5(arrivalMs));
          return { lbl: en ? 'Arrives between' : 'Llega entre', val: r.val, suf: r.suf, ctx: <><span>{stopsAheadText}</span>{freshNode}</> };
        }
        const mins = Math.max(1, Math.round((arrivalMs - now) / 60_000));
        return { lbl: en ? 'Arrives in' : 'Llega en', val: `~${mins} min`, ctx: <><span>{en ? `Around ${fmtClock(arrivalMs)}` : `Cerca de las ${fmtClock(arrivalMs)}`}</span>{freshNode}</> };
      }
      if (arrivalMs != null && readyMs != null) {
        // Late: the biggest thing on screen was a time that no longer holds.
        // Say what we know; the old window goes small and struck through.
        if (kitchenLate) { const r = range(win5(readyMs + travelMs)); return { lbl: en ? 'Arrives' : 'Llega', val: en ? 'A little later' : 'Un poco más tarde', words: true, ctx: <>{lateChip}<span>{en ? 'Was ' : 'Era '}<s>{r.val}{r.suf ? ` ${r.suf}` : ''}</s></span>{freshNode}</> }; }
        const r = range(win5(arrivalMs));
        return { lbl: en ? 'Arrives between' : 'Llega entre', val: r.val, suf: r.suf, ctx: <><span>{en ? `Includes the ride from ${R}` : `Incluye el viaje desde ${R}`}</span>{freshNode}</> };
      }
      return null;
    }
    if (isPickup && readyMs != null) {
      if (kitchenLate) { const r = range(win5(readyMs)); return { lbl: en ? 'Ready' : 'Listo', val: en ? 'In a few more minutes' : 'En unos minutos más', words: true, ctx: <>{lateChip}<span>{en ? 'Was ' : 'Era '}<s>{r.val}{r.suf ? ` ${r.suf}` : ''}</s></span>{freshNode}</> }; }
      if (almost) { const c = clock(Math.max(readyMs, now)); return { lbl: en ? 'Ready at' : 'Estará listo a las', val: c.hm, suf: c.suf, ctx: freshNode }; }
      const r = range(win5(readyMs));
      return { lbl: en ? 'Ready for pickup between' : 'Listo para recoger entre', val: r.val, suf: r.suf, ctx: freshNode };
    }
    if (isDineIn && readyMs != null && ['confirmed', 'preparing', 'almost_ready'].includes(o.status)) {
      const mins = Math.max(1, Math.round((readyMs - now) / 60_000));
      return { lbl: en ? 'At your table in' : 'Llega a tu mesa en', val: `~${mins} min`, ctx: <span>{en ? 'Estimated by the kitchen' : 'Estimado por la cocina'}</span> };
    }
    return null;
  })();

  // ── Pasos con hora ──
  type Step = { key: string; label: string; at: number; sub?: string };
  const pickedMs = tsMs(o.driver_picked_up_at);
  const deliveredMs = tsMs(o.driver_delivered_at);
  const readyAtMs = o.status === 'ready' ? tsMs(o.updated_at) : NaN;
  const steps: Step[] = isDelivery
    ? [
        { key: 'sent', label: en ? `Sent to ${R}` : `Enviado a ${R}`, at: createdMs },
        { key: 'accepted', label: en ? 'Accepted and in the kitchen' : 'Aceptado y en la cocina', at: acceptedMs },
        { key: 'onway', label: driverName ? (en ? `On the way with ${driverName}` : `En camino con ${driverName}`) : (en ? 'On the way' : 'En camino'), at: pickedMs },
        { key: 'done', label: en ? 'Delivered' : 'Entregado', at: deliveredMs },
      ]
    : isDineIn
      ? [
          { key: 'sent', label: en ? 'Sent to the kitchen' : 'Enviado a la cocina', at: createdMs },
          { key: 'accepted', label: en ? 'In the kitchen' : 'En la cocina', at: acceptedMs },
          { key: 'ready', label: en ? `On its way to ${tableLabel}` : `En camino a ${tableLabel}`, at: readyAtMs },
          { key: 'done', label: en ? 'Served' : 'Servido', at: NaN },
        ]
      : [
          { key: 'sent', label: en ? `Sent to ${R}` : `Enviado a ${R}`, at: createdMs },
          { key: 'accepted', label: en ? 'Accepted and in the kitchen' : 'Aceptado y en la cocina', at: acceptedMs },
          { key: 'ready', label: en ? 'Ready at the counter' : 'Listo en el mostrador', at: readyAtMs },
        ];
  // Índice del paso en curso; los anteriores están hechos. 99 = todos hechos.
  const stepNow = isComplete ? 99
    : isDelivery ? (onTheWay ? 2 : 1)
    : isDineIn ? (o.status === 'ready' ? 2 : 1)
    : (o.status === 'ready' ? 99 : 1);
  const pendingAccept = isPending;
  const stepSub = (key: string): string | undefined => {
    if (key === 'accepted' && waiting) return en ? `${pendingMin} min, no answer yet` : `Hace ${pendingMin} min, sin respuesta todavía`;
    if (key === 'accepted' && almost) return en ? 'Almost ready' : 'Casi listo';
    if (key === 'onway' && atDoor && Number.isFinite(doorMs)) return en ? `At your door since ${fmtClock(doorMs)}` : `En tu puerta desde las ${fmtClock(doorMs)}`;
    return undefined;
  };
  const showSteps = !isCancelled && !scheduled && !awaitingPayment;

  // ── Acción principal ──
  const callState = isActive && !awaitingPayment && (waiting || atDoor) && !!restaurantPhone;
  const canReorder = isComplete && !isDineIn && (o.order_items?.length ?? 0) > 0;
  const cashStripShown = cashDue && isActive && !awaitingPayment && !pickupReady && !atDoor;
  const cashWhere = isDelivery ? (en ? 'on delivery' : 'al recibir') : isDineIn ? (en ? 'at the table' : 'en la mesa') : (en ? 'at pickup' : 'al recoger');

  // ── Piezas ──
  const groupCls = 'rounded-[18px] overflow-hidden';
  const groupStyle = { background: K.card, boxShadow: K.shadow };
  const linkCls = 'inline-flex items-center min-h-[44px] text-[14px] font-semibold';
  const ctaCls = 'w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[17px] font-semibold tracking-[-0.01em] active:scale-[0.985] transition-transform disabled:opacity-60';
  const ctaSecondaryCls = 'w-full h-[50px] rounded-2xl flex items-center justify-center gap-2 text-[16px] font-semibold active:scale-[0.985] transition-transform';

  const checkMark = (isPending && !awaitingPayment && !waiting && !scheduled) ? (
    <svg className={`mt-ok ${freshOrder ? 'draw' : ''} w-10 h-10 mb-2.5`} viewBox="0 0 52 52" aria-hidden><circle cx="26" cy="26" r="26" /><path d="M16 27l7 7 13-15" /></svg>
  ) : null;

  const heroBlock = (
    <section className="grid">
      {checkMark}
      <p className="text-[12px] uppercase tracking-[0.03em] mb-2" style={{ fontFamily: K.mono, color: K.faint }}>
        {en ? 'Order' : 'Pedido'} <b style={{ color: K.ink, fontWeight: 600 }}>#{shortNum}</b> · {typeLabel}
      </p>
      <h1 className="text-[28px] min-[860px]:text-[32px] leading-[1.12] font-bold tracking-[-0.028em] outline-none" style={{ textWrap: 'balance' } as React.CSSProperties}>
        {headline}
      </h1>
      {lead && <p className="mt-pretty mt-1.5 text-[15px] min-[860px]:text-[16.5px] leading-[1.45] max-w-[36ch]" style={{ color: K.sub }}>{lead}</p>}
      {anchor && ('code' in anchor ? (
        <div className="mt-[18px] rounded-[18px] px-[18px] py-4 grid gap-0.5" style={{ background: K.brand, color: K.brandInk }}>
          <span className="text-[12px] uppercase tracking-[0.03em] font-medium opacity-90" style={{ fontFamily: K.mono }}>{anchor.lbl}</span>
          <span className="text-[48px] min-[860px]:text-[56px] leading-[1.02] font-bold tracking-[-0.045em] tabular-nums">{anchor.val}</span>
          {anchor.ctx && <span className="text-[14px] opacity-85">{anchor.ctx}</span>}
        </div>
      ) : (
        <div className="mt-5 grid gap-0.5">
          <span className="text-[14px]" style={{ color: K.sub }}>{anchor.lbl}</span>
          <span className={anchor.words ? 'text-[32px] min-[860px]:text-[40px] leading-[1.08] font-bold tracking-[-0.03em]' : 'text-[48px] min-[860px]:text-[56px] leading-[1.02] font-bold tracking-[-0.045em] tabular-nums whitespace-nowrap'} style={{ color: anchor.muted ? K.faint : K.ink, fontWeight: anchor.muted ? 600 : 700 }}>
            {anchor.val}{anchor.suf && <small className="text-[18px] font-semibold tracking-[-0.01em] ml-1.5" style={{ color: K.sub }}>{anchor.suf}</small>}
          </span>
          {anchor.ctx && <span className="mt-pretty mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px]" style={{ color: K.sub }}>{anchor.ctx}</span>}
        </div>
      ))}
      {isActive && !awaitingPayment && !isDineIn && !pickupReady && !onTheWay && o.authorized && trackingToken && (
        <PushSubscriptionPrompt orderId={o.id} token={trackingToken} locale={locale} orderType={o.order_type} desktop={isDesktop} />
      )}
    </section>
  );

  const stepsBlock = showSteps ? (
    <div className={groupCls} style={groupStyle}>
      <ol className="list-none m-0 px-4 pt-4 pb-1 grid" aria-label={en ? 'Order status' : 'Estado del pedido'}>
        {steps.map((s, i) => {
          const state = i < stepNow ? 'done' : i === stepNow ? 'now' : 'todo';
          const waitingAccept = state === 'now' && s.key === 'accepted' && pendingAccept;
          const label = waitingAccept ? (isDineIn ? (en ? 'Waiting for the kitchen' : 'Esperando a la cocina') : (en ? 'Waiting to be accepted' : 'Esperando que lo acepten')) : s.label;
          const sub = stepSub(s.key);
          const showTime = state !== 'todo' && !waitingAccept && Number.isFinite(s.at);
          const last = i === steps.length - 1;
          return (
            <li key={s.key} className="grid grid-cols-[22px_1fr_auto] gap-3 relative pb-3.5" aria-current={state === 'now' ? 'step' : undefined}>
              {!last && <span className="absolute left-[10px] top-[22px] bottom-0 w-0.5" style={{ background: state === 'done' ? K.brand : K.line }} aria-hidden />}
              <span className={`relative z-[1] w-[22px] h-[22px] rounded-full grid place-items-center ${state === 'now' ? 'mt-now' : ''}`}
                style={state === 'done' ? { background: K.brand } : state === 'now' ? { background: K.card, boxShadow: `inset 0 0 0 7px ${K.brand}` } : { background: K.card, boxShadow: `inset 0 0 0 2px ${K.line}` }} aria-hidden>
                {state === 'done' && <Check className="w-3 h-3" strokeWidth={3.4} style={{ color: K.brandInk }} />}
              </span>
              <span className="min-w-0">
                <b className="block text-[15px] leading-[22px] tracking-[-0.01em]" style={{ fontWeight: state === 'todo' ? 500 : 600, color: state === 'todo' ? K.faint : K.ink }}>
                  {label}<span className="sr-only"> ({state === 'done' ? (en ? 'done' : 'completado') : state === 'now' ? (en ? 'in progress' : 'en curso') : (en ? 'pending' : 'pendiente')})</span>
                </b>
                {sub && <span className="block text-[13px] mt-px" style={{ color: K.sub }}>{sub}</span>}
              </span>
              <time className="text-[12.5px] leading-[22px] tabular-nums" style={{ fontFamily: K.mono, color: K.faint }}>{showTime ? hm(s.at) : ''}</time>
            </li>
          );
        })}
      </ol>
    </div>
  ) : null;

  // At the door the map adds nothing (the driver pin sat on the house pin).
  const mapBlock = isDelivery && onTheWay && !atDoor && hasDriverGps ? (
    <section className={`relative ${groupCls}`} style={{ ...groupStyle, ['--map-h' as string]: isDesktop ? '260px' : '176px' }}>
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
        onEtaUpdate={onLiveEta}
      />
      <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: K.card, boxShadow: K.shadow }}>
        {locAgeMin != null && locAgeMin >= 2 || offline
          ? (en ? `Location from ${fmtClock(Number.isFinite(locMs) ? locMs : now)}` : `Ubicación de las ${fmtClock(Number.isFinite(locMs) ? locMs : now)}`)
          : <><i className="block w-[7px] h-[7px] rounded-full" style={{ background: K.brand }} aria-hidden />{en ? 'Live' : 'En vivo'}</>}
      </span>
    </section>
  ) : isDelivery && onTheWay && !atDoor ? (
    <p className="text-[13px] px-1" style={{ color: K.faint }}>
      {en ? 'Live location appears when the driver shares it.' : 'La ubicación en vivo aparece cuando el repartidor la comparte.'}
    </p>
  ) : null;

  const phoneCard = restaurantPhone ? (
    <div className={`${groupCls} grid grid-cols-[32px_1fr_auto] gap-3 items-center px-3.5 py-3`} style={groupStyle}>
      <span className="w-8 h-8 rounded-[9px] grid place-items-center" style={{ background: K.surface2, color: K.sub }} aria-hidden><Phone className="w-[17px] h-[17px]" /></span>
      <span className="min-w-0">
        <span className="block text-[12.5px]" style={{ color: K.faint }}>{en ? `Call ${R} from your phone` : `Llama a ${R} desde tu teléfono`}</span>
        <b className="block text-[20px] font-semibold tracking-[-0.02em] tabular-nums select-all">{phoneShown}</b>
      </span>
      <button type="button" onClick={copyPhone} className={linkCls} style={{ color: K.greenDeep }}>{copied ? (en ? 'Copied' : 'Copiado') : (en ? 'Copy' : 'Copiar')}</button>
    </div>
  ) : null;

  const callRow = (() => {
    if (isDineIn && isActive) return <WaiterCallButton orderId={o.id} tableName={o.table_name} locale={locale} />;
    if (!restaurantPhone || awaitingPayment || callState) return null;
    const q = isCancelled ? (en ? 'Questions?' : '¿Preguntas?') : (en ? 'Something wrong?' : '¿Algo no está bien?');
    if (isDesktop) {
      return (
        <div className="flex items-center justify-between gap-3 px-1.5 text-[14px]" style={{ color: K.sub }}>
          <span>{q} {en ? 'Call' : 'Llama al'} <b className="font-semibold tabular-nums select-all" style={{ color: K.ink }}>{phoneShown}</b></span>
          <button type="button" onClick={copyPhone} className={linkCls} style={{ color: K.greenDeep }}>{copied ? (en ? 'Copied' : 'Copiado') : (en ? 'Copy' : 'Copiar')}</button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between gap-3 px-1.5 text-[14px]" style={{ color: K.sub }}>
        <span>{q}</span>
        <a href={`tel:${restaurantPhone}`} className={`${linkCls} underline underline-offset-2`} style={{ color: K.greenDeep }}>{en ? `Call ${R}` : `Llamar a ${R}`}</a>
      </div>
    );
  })();

  const cashStrip = cashStripShown ? (
    <div className={`${groupCls} grid grid-cols-[32px_1fr] gap-3 items-center px-3.5 py-3`} style={groupStyle}>
      <span className="w-8 h-8 rounded-[9px] grid place-items-center" style={{ background: K.brandSoft, color: K.brand }} aria-hidden><Banknote className="w-[17px] h-[17px]" /></span>
      <span>
        <b className="mt-pretty block text-[15.5px] font-semibold tracking-[-0.01em]">{en ? `You pay ${amount} in cash ${cashWhere}` : `Pagas ${amount} en efectivo ${cashWhere}`}</b>
        {isDelivery && changeDue != null && (
          <span className="block text-[13px] mt-px" style={{ color: K.sub }}>
            {en ? `With ${formatPrice(payWith, currency)} · ${driverName ?? 'the driver'} brings your change: ${formatPrice(changeDue, currency)}` : `Con ${formatPrice(payWith, currency)} · ${driverName ?? 'el repartidor'} lleva tu cambio: ${formatPrice(changeDue, currency)}`}
          </span>
        )}
      </span>
    </div>
  ) : null;

  const rowIcon = (node: React.ReactNode) => (
    <span className="w-8 h-8 rounded-[9px] grid place-items-center flex-shrink-0" style={{ background: K.surface2, color: K.sub }} aria-hidden>{node}</span>
  );
  const rowCls = 'grid grid-cols-[32px_1fr_auto] items-center gap-3 px-3.5 py-3 min-h-[60px] text-left';
  const rowDivider = { borderTop: `1px solid ${K.line}` };
  const detailRows: React.ReactNode[] = [];
  if (isDelivery && !isCancelled && o.delivery_address) {
    detailRows.push(
      <DeliveryInstructions key="addr" orderId={o.id} token={o.authorized ? trackingToken : undefined} editable={isActive && !onTheWay}
        address={o.delivery_address} notes={visibleNotes} rawNotes={o.notes ?? ''} en={en}
        onSaved={(notes) => setOrder((prev: any) => ({ ...prev, notes }))} />,
    );
  }
  if (isDelivery && onTheWay && driverName) {
    detailRows.push(
      <div key="driver" className={rowCls}>
        <span className="w-8 h-8 rounded-full grid place-items-center text-[14px] font-bold" style={{ background: K.brandSoft, color: K.brand }} aria-hidden>{driverName.charAt(0).toUpperCase()}</span>
        <span className="min-w-0"><span className="block text-[15.5px] font-medium">{driverName}</span><span className="block text-[13px]" style={{ color: K.sub }}>{en ? `${R}'s driver` : `Repartidor de ${R}`}</span></span>
        <span />
      </div>,
    );
  }
  if (isPickup && isActive && !awaitingPayment && restaurantAddress) {
    detailRows.push(
      <div key="pickup" className={rowCls}>
        {rowIcon(<MapPin className="w-[17px] h-[17px]" />)}
        <span className="min-w-0"><span className="block text-[12.5px]" style={{ color: K.faint }}>{en ? 'Pick up at' : 'Recoger en'}</span><span className="block text-[15.5px] font-medium tracking-[-0.01em]">{restaurantAddress}</span></span>
        <a href={`https://maps.google.com/?q=${encodeURIComponent(restaurantAddress)}`} target="_blank" rel="noopener noreferrer" className={`${linkCls} underline underline-offset-2`} style={{ color: K.greenDeep }}>{en ? 'Directions' : 'Cómo llegar'}</a>
      </div>,
    );
  }
  if (isDineIn && tableName) {
    detailRows.push(
      <div key="table" className={rowCls}>
        {rowIcon(<Utensils className="w-[17px] h-[17px]" />)}
        <span className="min-w-0"><span className="block text-[12.5px]" style={{ color: K.faint }}>{en ? 'Your table' : 'Tu mesa'}</span><span className="block text-[15.5px] font-medium">{tableName}</span></span>
        <span />
      </div>,
    );
  }
  if (paidOnline && !isCancelled) {
    detailRows.push(
      <div key="pay" className={rowCls}>
        {rowIcon(<CreditCard className="w-[17px] h-[17px]" />)}
        <span className="min-w-0"><span className="block text-[12.5px]" style={{ color: K.faint }}>{en ? 'Payment' : 'Pago'}</span><span className="block text-[15.5px] font-medium">{en ? `Paid · ${amount}` : `Pagado · ${amount}`}</span>
          {tip > 0 && <span className="block text-[13px]" style={{ color: K.sub }}>{en ? `Includes ${formatPrice(tip, currency)} tip for ${isDelivery ? 'your driver' : 'the team'}` : `Incluye ${formatPrice(tip, currency)} de propina para ${isDelivery ? 'tu repartidor' : 'el equipo'}`}</span>}</span>
        <span />
      </div>,
    );
  }
  if (cashDue && isComplete) {
    detailRows.push(
      <div key="paycash" className={rowCls}>
        {rowIcon(<Banknote className="w-[17px] h-[17px]" />)}
        <span className="min-w-0"><span className="block text-[12.5px]" style={{ color: K.faint }}>{en ? 'Payment' : 'Pago'}</span><span className="block text-[15.5px] font-medium">{en ? `${amount} in cash` : `${amount} en efectivo`}</span></span>
        <span />
      </div>,
    );
  }
  if (isCancelled) {
    const paidBefore = o.payment_status === 'paid';
    detailRows.push(
      <div key="refund" className={rowCls}>
        {rowIcon(refunded || paidBefore ? <CreditCard className="w-[17px] h-[17px]" /> : <Banknote className="w-[17px] h-[17px]" />)}
        <span className="min-w-0">
          <span className="block text-[12.5px]" style={{ color: K.faint }}>{refunded || paidBefore ? (en ? 'Refund' : 'Reembolso') : (en ? 'Payment' : 'Pago')}</span>
          <span className="block text-[15.5px] font-medium">
            {refunded ? (en ? `${amount} refunded to your card` : `${amount} devueltos a tu tarjeta`)
              : paidBefore ? (en ? `${amount} refund in progress` : `Reembolso de ${amount} en trámite`)
              : (en ? "You weren't charged" : 'No se te cobró nada')}
          </span>
          {refunded && <span className="block text-[13px]" style={{ color: K.sub }}>{en ? 'You will see it in 5 to 10 days, depending on your bank' : 'Lo ves en 5 a 10 días, según tu banco'}</span>}
          {paidBefore && !refunded && restaurantPhone && <span className="block text-[13px]" style={{ color: K.sub }}>{en ? `If you don't see it in 2 days, call ${R}` : `Si en 2 días no lo ves, llama a ${R}`}</span>}
        </span>
        <span />
      </div>,
    );
  }
  if ((o.order_items?.length ?? 0) > 0) {
    detailRows.push(
      <div key="items">
        <button type="button" onClick={() => setItemsOpen((v) => !v)} aria-expanded={itemsOpen} className={`${rowCls} w-full active:bg-[var(--tk-surface-2)]`}>
          {rowIcon(<ShoppingBag className="w-[17px] h-[17px]" />)}
          <span className="min-w-0"><span className="block text-[12.5px]" style={{ color: K.faint }}>{t.yourOrderLabel}</span><span className="block text-[15.5px] font-medium tabular-nums">{itemCount} {itemCount === 1 ? t.itemSingular : t.itemPlural} · {amount}</span></span>
          <ChevronRight className="w-4 h-4 transition-transform" style={{ color: K.faint, transform: itemsOpen ? 'rotate(90deg)' : undefined }} aria-hidden />
        </button>
        {itemsOpen && (
          <div className="px-3.5 pb-3.5 grid gap-3" style={rowDivider}>
            <ul className="grid gap-2.5 pt-3">
              {(o.order_items as any[]).map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 text-[14.5px]">
                  <span className="min-w-0 flex-1">
                    <span className="tabular-nums mr-1" style={{ color: K.faint }}>{item.qty}×</span>{item.display_name ?? item.product_name ?? t.productFallback}
                    {item.variant_name && <span style={{ color: K.faint }}> · {item.variant_name}</span>}
                    {/* Una línea por cosa, como en el carrito (lib/modifier-lines). */}
                    {Array.isArray(item.lines) ? (item.lines as { text: string; price: number; indent: boolean }[]).map((l, k) => (
                      <span key={k} className="flex justify-between gap-3 text-[12.5px] leading-snug" style={{ color: K.sub, paddingLeft: l.indent ? 12 : 0 }}>
                        <span>{l.indent && <span style={{ color: K.faint }}>↳ </span>}{l.text}</span>
                        {l.price > 0 && <span className="tabular-nums flex-shrink-0" style={{ color: K.faint }}>+{formatPrice(l.price, currency)}</span>}
                      </span>
                    )) : Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                      <span className="block text-[12.5px] leading-snug" style={{ color: K.sub }}>{(item.modifiers as { name: string }[]).map((m) => m.name).join(', ')}</span>
                    )}
                    {item.notes && <span className="block text-[12.5px]" style={{ color: K.sub }}>{item.notes}</span>}
                  </span>
                  <span className="tabular-nums flex-shrink-0" style={{ color: K.sub }}>{formatPrice(Number(item.line_total ?? item.unit_price), currency)}</span>
                </li>
              ))}
            </ul>
            <div className="grid gap-1.5 pt-2.5 text-[14px] tabular-nums" style={{ borderTop: `1px dashed ${K.line}`, color: K.sub }}>
              {Number(o.discount_amount) > 0 && <div className="flex justify-between"><span>{t.discount}</span><span>-{formatPrice(Number(o.discount_amount), currency)}</span></div>}
              {isDelivery && Number(o.delivery_fee) > 0 && <div className="flex justify-between"><span>{t.deliveryFee}</span><span>{formatPrice(Number(o.delivery_fee), currency)}</span></div>}
              {Number(o.tax_amount) > 0 && <div className="flex justify-between"><span>{t.taxes}</span><span>{formatPrice(Number(o.tax_amount), currency)}</span></div>}
              {tip > 0 && <div className="flex justify-between"><span>{isDelivery ? (en ? 'Tip for your driver' : 'Propina para tu repartidor') : (en ? 'Tip for the team' : 'Propina para el equipo')}</span><span>{formatPrice(tip, currency)}</span></div>}
              <div className="flex justify-between text-[15.5px] font-semibold" style={{ color: K.ink }}><span>{t.total}</span><span>{amount}</span></div>
            </div>
            {!isDelivery && visibleNotes && <p className="text-[13px]" style={{ color: K.sub }}>{t.notes}: {visibleNotes}</p>}
          </div>
        )}
      </div>,
    );
  }
  const detailCard = detailRows.length > 0 ? (
    <div className={groupCls} style={groupStyle}>
      {detailRows.map((r, i) => <div key={i} style={i > 0 ? rowDivider : undefined}>{r}</div>)}
    </div>
  ) : null;

  const photoBlock = isComplete && o.delivery_photo_url ? (
    <a href={o.delivery_photo_url} target="_blank" rel="noopener noreferrer" className={`relative block w-full aspect-[4/3] ${groupCls}`} style={groupStyle}>
      <Image src={o.delivery_photo_url} alt={t.deliveryProofAlt} fill sizes="(max-width: 480px) 100vw, 450px" className="object-cover" />
    </a>
  ) : null;

  const feedbackBlock = isComplete && !autoClosed ? (
    <FeedbackPrompt restaurantId={restaurantId} restaurantName={R} orderId={o.id} orderType={o.order_type} customerName={o.customer_name}
      restaurantPhone={restaurantPhone} googleReviewUrl={googleReviewUrl} desktop={isDesktop} en={en} />
  ) : null;

  const footerAction: React.ReactNode = (() => {
    if (awaitingPayment) return null;
    if (callState && !isDesktop) {
      return (
        <a href={`tel:${restaurantPhone}`} className={ctaCls} style={{ background: K.btn, color: K.btnFg }}>
          <Phone className="w-[18px] h-[18px]" aria-hidden />{en ? `Call ${R}` : `Llamar a ${R}`}
        </a>
      );
    }
    if (canReorder) {
      return <button type="button" onClick={reorder} className={ctaCls} style={{ background: K.btn, color: K.btnFg }}><RotateCw className="w-[18px] h-[18px]" aria-hidden />{en ? 'Order the same again' : 'Pedir lo mismo otra vez'}</button>;
    }
    if (isDineIn && isComplete) {
      return <Link href={`/${restaurantSlug}`} className={ctaCls} style={{ background: K.btn, color: K.btnFg }}>{en ? 'Order more for the table' : 'Pedir algo más para la mesa'}</Link>;
    }
    if (isCancelled) {
      return <Link href={`/${restaurantSlug}`} className={ctaCls} style={{ background: K.btn, color: K.btnFg }}>{t.backToMenu}</Link>;
    }
    if (isDineIn && isActive) {
      return <Link href={`/${restaurantSlug}`} className={ctaSecondaryCls} style={{ background: K.card, color: K.ink, boxShadow: 'inset 0 0 0 1.5px rgba(17,17,20,.16)' }}>{en ? 'Order more for the table' : 'Pedir algo más para la mesa'}</Link>;
    }
    return null;
  })();

  const footer = footerAction ? (
    <div className="sticky bottom-0 z-20 -mx-4 mt-auto px-4 pt-3 grid gap-2 min-[860px]:static min-[860px]:mx-0 min-[860px]:px-0 min-[860px]:pt-1"
      style={{ background: isDesktop ? 'transparent' : K.surface, boxShadow: isDesktop ? undefined : `0 -1px 0 ${K.line}`, paddingBottom: isDesktop ? 0 : 'max(14px, env(safe-area-inset-bottom))' }}>
      {footerAction}
    </div>
  ) : null;

  const tailBlock = (
    <div className="grid gap-1 pt-1">
      {isComplete && currency === 'MXN' && <CfdiButton orderId={o.id} restaurantId={restaurantId} t={t} />}
      {isComplete && (o.order_items?.length ?? 0) > 0 && (
        <ShareReceiptButton orderNumber={o.order_number} restaurantName={restaurantName} restaurantSlug={restaurantSlug} total={Number(o.total)} currency={currency}
          items={(o.order_items as any[]).map((i: any) => ({ name: i.product_name ?? 'Item', qty: i.qty }))} locale={en ? 'en' : 'es'} />
      )}
      {isActive && !awaitingPayment && (
        <p className="text-[12.5px] leading-[1.6] px-1" style={{ color: K.faint }}>
          {en ? `Keep this link: your order updates here live. ${R} ${isDelivery ? 'prepares and delivers' : 'prepares'} your order.` : `Guarda este enlace: aquí ves tu pedido en vivo. ${R} ${isDelivery ? 'prepara y entrega' : 'prepara'} tu pedido.`}
        </p>
      )}
      <nav className="flex items-center gap-1 text-[13.5px] font-medium -ml-2" style={{ color: K.sub }}>
        <Link href={`/${restaurantSlug}`} className="h-11 px-2 grid place-items-center">{t.backToMenu}</Link>
        <span aria-hidden style={{ color: K.faint }}>·</span>
        <Link href={`/${restaurantSlug}/mis-pedidos`} className="h-11 px-2 grid place-items-center">{t.viewPreviousOrders}</Link>
      </nav>
      <OrderHistorySaver order={o} restaurantSlug={restaurantSlug} restaurantName={restaurantName} locale={locale} currency={currency} trackingToken={trackingToken} />
    </div>
  );

  const initials = R.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  const rootVars = { '--brand': brand.brand, '--brand-ink': brand.ink, '--brand-soft': brand.soft, background: K.surface, color: K.ink } as React.CSSProperties;

  return (
    <div className={`mt-root min-h-[100dvh] flex flex-col font-sans antialiased`} style={rootVars}>
      <style>{TRACKER_CSS}</style>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{headline}</div>

      <header className="sticky top-0 z-30 min-[860px]:static" style={{ background: K.surface, paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <div className="max-w-[1060px] mx-auto px-3 min-[860px]:px-10 h-[60px] min-[860px]:h-[76px] grid grid-cols-[44px_1fr_44px] min-[860px]:flex items-center gap-2 min-[860px]:gap-3">
          <Link href={`/${restaurantSlug}`} aria-label={`${t.backToMenu} · ${R}`} className="w-11 h-11 grid place-items-center">
            <span className="w-9 h-9 rounded-full grid place-items-center" style={{ background: K.card, boxShadow: K.shadow }}><ArrowLeft className="w-[18px] h-[18px]" aria-hidden /></span>
          </Link>
          <div className="flex items-center justify-center min-[860px]:justify-start gap-2.5 min-w-0">
            {restaurantLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurantLogo} alt="" width={38} height={38} className="w-[38px] h-[38px] rounded-full object-cover flex-shrink-0" style={{ boxShadow: `0 0 0 2px ${K.card}, 0 0 0 3px ${K.line}` }} />
            ) : (
              <span className="w-[38px] h-[38px] rounded-full grid place-items-center text-[12px] font-bold flex-shrink-0" style={{ background: K.brand, color: K.brandInk }} aria-hidden>{initials}</span>
            )}
            <b className="truncate text-[16.5px] font-semibold tracking-[-0.015em]">{R}</b>
          </div>
          <span />
        </div>
        {offline && (
          <div className="max-w-[1060px] mx-auto px-4 min-[860px]:px-10 pb-1.5">
            <div className="rounded-xl px-3 py-2 text-[13px] flex items-center gap-2" style={{ background: K.ink, color: K.surface }} role="status">
              <i className="block w-[7px] h-[7px] rounded-full bg-[#ffb547]" aria-hidden />
              {isDesktop
                ? (en ? `No internet connection · last update at ${fmtClock(lastFetchAt ?? now)}` : `Sin conexión a internet · lo último que sabemos es de las ${fmtClock(lastFetchAt ?? now)}`)
                : (en ? `Offline · data from ${fmtClock(lastFetchAt ?? now)}` : `Sin conexión · datos de las ${fmtClock(lastFetchAt ?? now)}`)}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-[1060px] mx-auto px-4 min-[860px]:px-10 pt-1 min-[860px]:pt-4 pb-0 min-[860px]:pb-10 flex flex-col min-[860px]:flex-row min-[860px]:items-start gap-4 min-[860px]:gap-14">
        <div className="px-1 min-[860px]:px-0 min-[860px]:flex-1 min-[860px]:sticky min-[860px]:top-6 grid gap-0">
          {awaitingPayment ? (
            <PaymentPendingCard orderId={o.id} restaurantSlug={restaurantSlug} paidParam={paidParam}
              createdAt={o.created_at} paymentMethod={o.payment_method} currency={currency} t={t} />
          ) : heroBlock}
          {isDesktop && (
            <div className="grid gap-3 mt-6">
              {callState && phoneCard}
              {mapBlock}
              {stepsBlock}
              {callRow}
            </div>
          )}
        </div>
        <div className="flex-1 min-[860px]:flex-none min-[860px]:w-[450px] flex flex-col gap-3.5 min-[860px]:gap-3 pt-3 min-[860px]:pt-0">
          {!isDesktop && mapBlock}
          {!isDesktop && stepsBlock}
          {cashStrip}
          {photoBlock}
          {feedbackBlock}
          {detailCard}
          {!isDesktop && callRow}
          {isDesktop ? <>{footer}{tailBlock}</> : <>{tailBlock}{footer}</>}
        </div>
      </main>
    </div>
  );
}

// Dirección + instrucciones de entrega. Editables desde el seguimiento hasta
// que el repartidor recoge (DoorDash Drive): en edificios de Queens el timbre
// o el apartamento hacen la diferencia. Va como fila de la tarjeta de detalle.
function DeliveryInstructions({ orderId, token, editable, address, notes, rawNotes, en, onSaved }: {
  orderId: string; token?: string; editable: boolean; address: string; notes: string; rawNotes: string; en: boolean; onSaved: (notes: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  // El billete con el que paga ("[Paga con: $100]") vive en las mismas notas:
  // no se muestra en el campo, pero se conserva al guardar.
  const payWithTag = (rawNotes.match(/\[(?:Paga con|Pays with):[^\]]*\]/i) ?? [''])[0];
  const save = async () => {
    if (!token) return;
    setSaving(true); setErr('');
    const full = [draft.trim(), payWithTag].filter(Boolean).join(' ');
    try {
      const res = await fetch('/api/public/order-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, t: token, action: 'notes', notes: full }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { onSaved(data.notes ?? full); setEditing(false); }
      else setErr(res.status === 409
        ? (en ? 'The driver already has your order. Call the restaurant.' : 'El repartidor ya salió con tu pedido. Llama al restaurante.')
        : (en ? 'Could not save. Try again.' : 'No se pudo guardar. Intenta de nuevo.'));
    } catch {
      setErr(en ? 'Could not save. Try again.' : 'No se pudo guardar. Intenta de nuevo.');
    }
    setSaving(false);
  };
  const canEdit = editable && !!token;
  return (
    <div className="grid grid-cols-[32px_1fr] gap-3 px-3.5 py-3 min-h-[60px]">
      <span className="w-8 h-8 rounded-[9px] grid place-items-center self-start mt-0.5" style={{ background: K.surface2, color: K.sub }} aria-hidden><MapPin className="w-[17px] h-[17px]" /></span>
      <div className="min-w-0 grid">
        <span className="text-[12.5px]" style={{ color: K.faint }}>{en ? 'Deliver to' : 'Entregar en'}</span>
        <span className="text-[15.5px] font-medium tracking-[-0.01em] leading-snug">{address}</span>
        {editing ? (
          <div className="grid gap-2 mt-2">
            <label htmlFor="delivery-notes" className="sr-only">{en ? 'Delivery instructions' : 'Instrucciones de entrega'}</label>
            <textarea id="delivery-notes" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={480} rows={3}
              placeholder={en ? 'Apt, buzzer, gate code…' : 'Apto, timbre, código del portón…'}
              className="w-full rounded-xl px-3 py-2 text-[16px] outline-none" style={{ background: K.surface2, boxShadow: `inset 0 0 0 1px ${K.line}` }} />
            {err && <p className="text-[13px] font-semibold" style={{ color: K.red }} role="alert">{err}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={save} disabled={saving} className="h-11 px-4 rounded-xl text-[14px] font-semibold disabled:opacity-60" style={{ background: K.btn, color: K.btnFg }}>
                {saving ? '…' : (en ? 'Save' : 'Guardar')}
              </button>
              <button type="button" onClick={() => { setEditing(false); setDraft(notes); setErr(''); }} className="h-11 px-4 rounded-xl text-[14px] font-medium" style={{ color: K.sub }}>
                {en ? 'Cancel' : 'Cancelar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {notes && <span className="text-[13px] mt-px" style={{ color: K.sub }}>{en ? 'Instructions: ' : 'Instrucciones: '}{notes}</span>}
            {canEdit && (
              <button type="button" onClick={() => { setDraft(notes); setEditing(true); }} className="justify-self-start min-h-[40px] -mb-2.5 text-[14px] font-semibold" style={{ color: K.greenDeep }}>
                {notes ? (en ? 'Change instructions' : 'Cambiar instrucciones') : (en ? 'Add instructions' : 'Agregar instrucciones')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Una sola pregunta al final (peak-end). El reporte le llega al dueño en
// privado. La reseña pública se ofrece a TODOS, no solo a los contentos
// (Google prohíbe el "review gating").
function FeedbackPrompt({ restaurantId, restaurantName, orderId, orderType, customerName, restaurantPhone, googleReviewUrl, desktop, en }: {
  restaurantId: string; restaurantName: string; orderId: string; orderType: string; customerName: string; restaurantPhone?: string;
  googleReviewUrl?: string | null; desktop: boolean; en: boolean;
}) {
  const [mode, setMode] = useState<'ask' | 'good' | 'issue' | 'done'>('ask');
  const [rating, setRating] = useState(5);
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState(false);
  const delivery = orderType === 'delivery';
  // "Llegó frío" solo tiene sentido si viajó hasta la casa.
  const reasons = delivery
    ? (en ? ['Something was missing', 'It arrived cold', 'It arrived late', 'Other'] : ['Faltó algo', 'Llegó frío', 'Llegó tarde', 'Otra cosa'])
    : (en ? ['Something was missing', "It wasn't what I ordered", 'Other'] : ['Faltó algo', 'No era lo que pedí', 'Otra cosa']);
  const question = delivery ? (en ? 'Did everything arrive OK?' : '¿Llegó todo bien?') : (en ? 'Was everything OK?' : '¿Estuvo todo bien?');

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

  const chip = 'min-h-[44px] px-4 rounded-full text-[14.5px] font-medium';
  const review = googleReviewUrl ? (
    <p className="text-[12.5px] leading-[1.6]" style={{ color: K.faint }}>
      {en ? 'Want to say it in public? ' : '¿Quieres contarlo en público? '}
      <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: K.sub }}>{en ? 'Leave a Google review' : 'Deja una reseña en Google'}</a>
    </p>
  ) : null;
  const errLine = sendErr ? <p className="text-[13px] font-semibold" style={{ color: K.red }} role="alert">{en ? "Couldn't send. Try again." : 'No se pudo enviar. Intenta de nuevo.'}</p> : null;

  return (
    <section className="rounded-[18px] px-3.5 py-3.5 grid gap-2.5" style={{ background: K.card, boxShadow: K.shadow }}>
      {mode === 'done' ? (
        <p className="rounded-[14px] px-3.5 py-3 text-[13.5px] leading-[1.45]" style={{ background: K.brandSoft, color: K.ink }} role="status">
          {reason
            ? <>{en ? `${restaurantName} got your report ("${reason}").` : `${restaurantName} recibió tu reporte ("${reason}").`}{' '}
                {orderType === 'dine_in'
                  ? (en ? 'Let a server know to fix it now.' : 'Avísale a un mesero para resolverlo ya.')
                  : restaurantPhone
                    ? (desktop
                      ? <>{en ? 'To fix it now, call ' : 'Para resolverlo ya, llama al '}<b className="tabular-nums">{phoneText(restaurantPhone)}</b>.</>
                      : <>{en ? 'To fix it now, call ' : 'Para resolverlo ya, llama al '}<a href={`tel:${restaurantPhone}`} className="underline font-semibold" style={{ color: K.greenDeep }}>{phoneText(restaurantPhone)}</a>.</>)
                    : null}</>
            : (en ? `Thanks! We'll tell ${restaurantName}.` : `¡Gracias! Se lo decimos a ${restaurantName}.`)}
        </p>
      ) : (
        <b className="text-[15.5px] font-semibold">{mode === 'issue' ? (en ? 'What happened?' : '¿Qué pasó?') : mode === 'good' ? (en ? 'How would you rate it?' : '¿Cómo lo calificas?') : question}</b>
      )}
      {mode === 'ask' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('good')} className={chip} style={{ background: K.surface2 }}>{en ? 'Yes, all good' : 'Sí, todo bien'}</button>
          <button type="button" onClick={() => setMode('issue')} className={chip} style={{ background: K.surface2 }}>{en ? 'There was a problem' : 'Hubo un problema'}</button>
        </div>
      )}
      {mode === 'good' && (
        <>
          <div className="flex gap-1" role="radiogroup" aria-label={en ? 'Rating' : 'Calificación'}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={en ? `${n} star${n > 1 ? 's' : ''}` : `${n} estrella${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)} className="w-11 h-11 grid place-items-center">
                <Star className="w-7 h-7" style={{ color: n <= rating ? '#F5A524' : 'rgba(17,17,20,.18)' }} fill={n <= rating ? '#F5A524' : 'none'} aria-hidden />
              </button>
            ))}
          </div>
          <label htmlFor="review-comment" className="sr-only">{en ? 'Comment' : 'Comentario'}</label>
          <textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={2}
            placeholder={en ? 'Anything to add? (optional)' : '¿Algo que agregar? (opcional)'}
            className="w-full rounded-xl px-3 py-2 text-[16px] outline-none" style={{ background: K.surface2, boxShadow: `inset 0 0 0 1px ${K.line}` }} />
          {errLine}
          <button type="button" onClick={send} disabled={sending} className="h-12 rounded-2xl text-[15px] font-semibold disabled:opacity-60" style={{ background: K.btn, color: K.btnFg }}>
            {sending ? '…' : (en ? 'Send' : 'Enviar')}
          </button>
        </>
      )}
      {mode === 'issue' && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={en ? 'What happened' : 'Qué pasó'}>
            {reasons.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r} className={chip}
                style={reason === r ? { background: K.surface2, boxShadow: `inset 0 0 0 1.5px ${K.ink}` } : { boxShadow: `inset 0 0 0 1.5px ${K.line}` }}>
                {r}
              </button>
            ))}
          </div>
          <label htmlFor="issue-comment" className="sr-only">{en ? 'Details' : 'Detalles'}</label>
          <textarea id="issue-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={400} rows={2}
            placeholder={en ? 'Tell us a bit more (optional)' : 'Cuéntanos un poco más (opcional)'}
            className="w-full rounded-xl px-3 py-2 text-[16px] outline-none" style={{ background: K.surface2, boxShadow: `inset 0 0 0 1px ${K.line}` }} />
          {errLine}
          <button type="button" onClick={send} disabled={sending || !reason} className="h-12 rounded-2xl text-[15px] font-semibold disabled:opacity-50" style={{ background: K.btn, color: K.btnFg }}>
            {sending ? '…' : (en ? `Send to ${restaurantName}` : `Enviar a ${restaurantName}`)}
          </button>
        </>
      )}
      {review}
    </section>
  );
}

// Mesa: avisar al personal desde el teléfono (el cliente está adentro, no llama).
function WaiterCallButton({ orderId, tableName, locale }: { orderId: string; tableName?: string | null; locale?: string }) {
  const t = getT(locale);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

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
    // 3 minutos entre avisos para no saturar al personal.
    let secs = 180;
    setCooldown(secs);
    timerRef.current = setInterval(() => {
      secs -= 1;
      setCooldown(secs);
      if (secs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setState('idle');
        setCooldown(0);
      }
    }, 1000);
  };

  const sent = state === 'sent' && cooldown > 0;
  const mins = Math.floor(cooldown / 60);
  const secs = cooldown % 60;
  const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
  return (
    <div className="flex items-center justify-between gap-3 px-1.5 text-[14px]" style={{ color: K.sub }}>
      <span role="status">{sent ? t.staffNotified : (t.en ? 'Need something?' : '¿Necesitas algo?')}</span>
      {sent ? (
        <span className="text-[12.5px]" style={{ color: K.faint }}>{t.callAgainIn(timeStr)}</span>
      ) : (
        <button type="button" onClick={handlePress} disabled={state === 'sending'} aria-label={t.waiterCallLabel(tableName)}
          className="inline-flex items-center min-h-[44px] text-[14px] font-semibold disabled:opacity-60" style={{ color: K.greenDeep }}>
          {state === 'sending' ? t.notifyingStaff : t.callWaiter}
        </button>
      )}
    </div>
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
      <section className="grid pt-2" role="status" aria-live="polite">
        <span className="w-10 h-10 mb-3 rounded-full border-[3px] motion-safe:animate-spin" style={{ borderColor: 'rgba(17,17,20,.1)', borderTopColor: K.brand }} aria-hidden />
        <h1 className="text-[28px] leading-[1.12] font-bold tracking-[-0.028em]">
          {paidParam === 'pending'
            ? (t.en ? 'Your payment is pending' : 'Tu pago está pendiente')
            : (t.en ? 'Confirming your payment…' : 'Confirmando tu pago…')}
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: K.sub }}>
          {paidParam === 'pending'
            ? (t.en ? 'We will let you know as soon as it is confirmed.' : 'Te avisamos apenas se confirme.')
            : (t.en ? 'This takes a few seconds.' : 'Tarda unos segundos.')}
        </p>
      </section>
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
    <section className="grid pt-2" role="alert">
      <h1 className="text-[28px] leading-[1.12] font-bold tracking-[-0.028em]">{t.payFailedTitle}</h1>
      <p className="mt-1.5 text-[15px] max-w-[36ch]" style={{ color: K.sub }}>{t.payFailedDesc}</p>
      {canRetry && (
        <button type="button" onClick={retry} disabled={busy}
          className="mt-5 w-full h-14 rounded-2xl text-[17px] font-semibold active:scale-[0.985] transition-transform disabled:opacity-60" style={{ background: K.btn, color: K.btnFg }}>
          {busy ? '…' : t.payRetry}
        </button>
      )}
      {err && <p className="mt-3 text-[14px] font-semibold" style={{ color: K.red }}>{err}</p>}
    </section>
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

// "Avisarme cuando…": enlace discreto bajo la hora (pide permiso solo al
// tocarlo, con el pedido ya hecho). En iPhone sin la app instalada no hay push:
// el aviso no se ofrece (llega el email, si lo dejó).
function PushSubscriptionPrompt({ orderId, token, locale, orderType, desktop }: { orderId: string; token: string; locale?: string; orderType?: string; desktop: boolean }) {
  const en = locale === 'en';
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
    if (readPushOrders().includes(orderId)) { setState('subscribed'); return; }
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

  if (state === 'unsupported' || state === 'denied') return null;
  if (state === 'subscribed') {
    return (
      <p className="mt-3.5 inline-flex items-center gap-2 min-h-[44px] text-[14px]" style={{ color: K.sub }}>
        <Check className="w-[17px] h-[17px]" strokeWidth={3} aria-hidden />
        {desktop ? (en ? "We'll notify you in this browser" : 'Te avisamos en este navegador') : (en ? "We'll notify you here" : 'Te avisamos aquí')}
      </p>
    );
  }
  return (
    <button type="button" onClick={handleSubscribe} className="mt-3.5 justify-self-start inline-flex items-center gap-2 min-h-[44px] text-[14px] font-semibold" style={{ color: K.greenDeep }}>
      <Bell className="w-[17px] h-[17px]" aria-hidden />
      {orderType === 'pickup' ? (en ? "Notify me when it's ready" : 'Avisarme cuando esté listo') : (en ? 'Notify me when it leaves' : 'Avisarme cuando salga')}
    </button>
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
      <button onClick={() => setShowHistory(!showHistory)} className="w-full text-center text-[13px] text-gray-600 hover:text-gray-900 py-2.5">
        {toggleLabel}
      </button>
      {showHistory && (
        <div className="space-y-2 mt-1">
          {history.map((h: any) => (
            <Link key={h.id} href={`/${restaurantSlug}/orden/${h.number}${h.t ? `?t=${encodeURIComponent(h.t)}` : ''}`}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium">#{h.number}</p>
                <p className="text-xs text-gray-600">
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
