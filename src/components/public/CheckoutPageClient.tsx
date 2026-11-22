'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  ArrowLeft, CheckCircle, ShoppingCart, Lock, UtensilsCrossed,
  ChevronLeft, ChevronDown, MapPin, Clock, User, StickyNote, Tag, Banknote, Armchair, Star,
} from 'lucide-react';
import {
  CkGroup, CkRow, CkIcon, CkSegmented, CkCheckMark, CkSheet, CkFields, CkError, CkChoice, CkSpinner,
  ckCtaClass, ckShadow,
} from './checkout/ck-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { estimateMinutes } from '@/lib/orders/eta';
import { useCheckoutStore } from '@/lib/store/checkoutStore';
import { setPendingPayment } from '@/lib/pending-payment';
import { cn, formatPrice } from '@/lib/utils';
import { getTranslations, type Locale } from '@/lib/translations';
import type { Restaurant, OrderType, PaymentMethod } from '@/types';
import { usablePaymentMethods } from '@/lib/payments/online-ready';
import { trackEvent } from '@/lib/analytics';
import { playSuccessChime, spawnConfetti } from '@/lib/celebration';
import { computeTaxAmount } from '@/lib/tax-presets';
import {
  formatOrderSubmitError,
  formatPaymentStartError,
  errorActionFor,
  type OrderErrorAction,
  safeParseJson,
} from '@/lib/checkout-errors';
import { supabaseLoader } from '@/lib/image-loader';
import { showsAsRow, cartItemImage } from '@/lib/product-display';
import { ProductGlyph } from './ProductGlyph';
import { cartModLines, withTitle } from '@/lib/modifier-lines';
import { tipAllowedFor, tipOptions, customTipAmount } from '@/lib/order-pricing';
import { isOpenAt, inTimeZone, type OperatingHours } from '@/lib/orders/business-hours';
import {
  isPossiblePhoneNumber, formatPhoneNumber, formatPhoneNumberIntl, getCountryCallingCode, type Country,
} from 'react-phone-number-input';

const fieldSkeleton = <div className="w-full h-[52px] rounded-2xl skeleton" />;

const AddressAutocomplete = dynamic(
  () => import('@/components/ui/AddressAutocomplete').then((m) => ({ default: m.AddressAutocomplete })),
  { ssr: false, loading: () => fieldSkeleton }
);
const PhoneField = dynamic(
  () => import('@/components/ui/PhoneField').then((m) => ({ default: m.PhoneField })),
  { ssr: false, loading: () => fieldSkeleton }
);
const WalletButton = dynamic(
  () => import('./WalletButton').then((m) => ({ default: m.WalletButton })),
  { ssr: false }
);

interface CartQuoteResponse {
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  loyalty_discount: number;
  tip_amount: number;
  tax_amount: number;
  tax_included: boolean;
  tax_rate: number;
  tax_label: string;
  total: number;
  currency: string;
}

interface CheckoutPageClientProps {
  restaurant: Restaurant;
  locale: Locale;
  slug: string;
  orderToken?: string;
}

type CheckoutStep = 'form' | 'payment' | 'confirmation';

// MP only operates in LatAm — excludes USD/EUR/GBP etc.
const MP_CURRENCIES = new Set(['ARS', 'BRL', 'MXN', 'CLP', 'PEN', 'UYU', 'BOB', 'PYG', 'COP']);

// <input type="datetime-local"> da "2026-11-10T19:00" SIN zona horaria; el
// servidor lo leía como UTC (un pedido para las 19:00 en NY se activaba a las
// 14:00). Se convierte aquí, con la zona del teléfono del comensal.
function scheduledForIso(local: string): string | undefined {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// The other direction: a moment as "YYYY-MM-DDTHH:mm" in the phone's local
// time, which is what datetime-local min/value expect. toISOString() gives
// UTC: at 1:04 AM in New York the minimum became 06:14 and nothing in the
// next ~5 hours could be scheduled.
function localDateTimeInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function CheckoutPageClient({ restaurant, locale, slug, orderToken = '' }: CheckoutPageClientProps) {
  const router = useRouter();
  const t = getTranslations(locale);
  const fmtPrice = useCallback((price: number) => formatPrice(price, restaurant.currency), [restaurant.currency]);

  const items = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));
  const clearCart = useCartStore((s) => s.clearCart);
  const saveLastOrder = useCartStore((s) => s.saveLastOrder);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const tableName = useCartStore((s) => s.tableName);
  const welcomeOrderType = useCartStore((s) => s.selectedOrderType);

  const savedCustomer = useCheckoutStore((s) => s.customer);
  const saveCustomer = useCheckoutStore((s) => s.saveCustomer);
  const isReturningCustomer = useCheckoutStore((s) => s.isReturningCustomer);

  const [hasMounted, setHasMounted] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Restore table context from URL if cartStore lost it (e.g. cleared cache, new tab)
  const setCartTableName = useCartStore((s) => s.setTableName);
  useEffect(() => {
    const urlTable = new URLSearchParams(window.location.search).get('table');
    if (urlTable) setCartTableName(urlTable);
  }, [setCartTableName]);

  // Pre-fill customer info from stored data on mount
  useEffect(() => {
    setHasMounted(true);
    try {
      // Prefer Zustand persisted store (has returning-customer check + more fields)
      const stored = useCheckoutStore.getState();
      if (stored.isReturningCustomer() && stored.customer) {
        const c = stored.customer;
        if (c.name) setCustomerName(c.name);
        if (c.phone) setCustomerPhone(c.phone);
        if (c.email) setCustomerEmail(c.email);
        if (c.deliveryAddress) setDeliveryAddress(c.deliveryAddress);
        if (c.deliveryAddress && typeof c.deliveryLat === 'number' && typeof c.deliveryLng === 'number') {
          setDeliveryCoords({ lat: c.deliveryLat, lng: c.deliveryLng });
        }
        if (c.deliveryUnit) setDeliveryUnit(c.deliveryUnit);
      } else {
        // Fallback: legacy menius_guest_info for users who ordered before this change
        const saved = localStorage.getItem('menius_guest_info');
        if (saved) {
          const { name, phone, email } = JSON.parse(saved);
          if (name) setCustomerName(name);
          if (phone) setCustomerPhone(phone);
          if (email) setCustomerEmail(email);
        }
      }
    } catch {}
    // Fire begin_checkout once — tracks how many users enter the checkout page
    const cartItems = useCartStore.getState().items;
    if (cartItems.length > 0 && !restaurant.id.startsWith('demo')) {
      trackEvent('begin_checkout', {
        restaurant_id: restaurant.id,
        restaurant_slug: restaurant.slug,
        item_count: cartItems.length,
        subtotal: cartItems.reduce((s, i) => s + i.lineTotal, 0),
        currency: restaurant.currency,
      });
    }
    // Sin foco automático (Pedro 2026-11-11): enfocar "Your name" al entrar
    // bajaba la página ~360px, el cliente no veía su pedido ni el tipo de
    // pedido (Pickup viene marcado) y, al salir del campo, ya aparecía en rojo
    // "Name is required". Si falta algo al confirmar, scrollToFirstInvalidField
    // lleva al campo.
    return () => { clearTimeout(confettiTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teléfono completo según el país (US: 10 dígitos). Antes bastaban 7 caracteres
  // y "+1718555" pasaba: el restaurante no podía llamar. Acepta E.164 (lo que
  // guarda PhoneField) o un número local del país del restaurante (datos viejos).
  const phoneCountry = (restaurant.country_code?.toUpperCase() || 'US') as Country;
  const phoneLooksValid = (v: string) => {
    const s = v.trim();
    return !!s && (isPossiblePhoneNumber(s) || isPossiblePhoneNumber(s, phoneCountry));
  };
  const phoneDisplay = (v: string) => {
    const s = v.trim();
    try {
      return (s.startsWith(`+${getCountryCallingCode(phoneCountry)}`) ? formatPhoneNumber(s) : formatPhoneNumberIntl(s)) || s;
    } catch {
      return s; // country_code desconocido para la librería
    }
  };

  const enabledOrderTypes = restaurant.order_types_enabled?.length
    ? restaurant.order_types_enabled
    : (['dine_in', 'pickup', 'delivery'] as OrderType[]);
  const stripeConnectReady = !!restaurant.stripe_onboarding_complete && !!restaurant.stripe_account_id;
  // Tarjeta solo con Stripe terminado o, en CO, Wompi (lib/payments/online-ready).
  const enabledPaymentMethods = usablePaymentMethods(restaurant);

  const [step, setStep] = useState<CheckoutStep>('form');
  const [orderType, setOrderType] = useState<OrderType>(enabledOrderTypes[0]);
  useEffect(() => {
    // When there is no table context and no stored preference, prefer pickup (or delivery)
    // over dine_in so walk-in orders don't accidentally become dine-in orders.
    const noTableDefault: OrderType =
      enabledOrderTypes.find((t) => t !== 'dine_in') ?? enabledOrderTypes[0];
    const correct: OrderType = tableName ? 'dine_in' : welcomeOrderType ?? noTableDefault;
    setOrderType((prev) => (prev !== correct ? correct : prev));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, welcomeOrderType]);

  // dine_in_only products (e.g. alcohol) can't be ordered for pickup/delivery.
  // Enforced server-side too; this is the UX guard so the customer sees why before submitting.
  const dineInOnlyItems = items.filter((i) => i.product.dine_in_only === true);
  const dineInOnlyBlocked = orderType !== 'dine_in' && dineInOnlyItems.length > 0;
  // Delivery minimum — enforced server-side in /api/orders; this is the UX guard
  // so the customer finds out here, not after filling the whole form.
  const deliveryMinOrder = restaurant.delivery_min_order ?? 0;
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  // Coordinates from Google Places selection — cleared on manual edits so stale
  // coords never outlive the address they belonged to. Sent to the server for
  // delivery-radius validation and driver routing.
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Apto / piso en su propio campo: escribirlo en la dirección borraba las
  // coordenadas y obligaba a volver a elegir la sugerencia (se perdía el apto).
  const [deliveryUnit, setDeliveryUnit] = useState('');
  const fullDeliveryAddress = deliveryUnit.trim()
    ? `${deliveryAddress.trim()}, ${deliveryUnit.trim()}`
    : deliveryAddress.trim();
  const [manualTableName, setManualTableName] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(enabledPaymentMethods[0]);

  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount: number; description?: string } | null>(null);

  // Loyalty points
  const [loyaltyBalance, setLoyaltyBalance] = useState<{ points: number; account_id: string | null; config: { min_redeem_points: number; peso_per_point: number } | null } | null>(null);
  const [loyaltyApplied, setLoyaltyApplied] = useState(false);
  const loyaltyLookupTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Look up loyalty balance when phone changes (debounced)
  useEffect(() => {
    clearTimeout(loyaltyLookupTimer.current);
    setLoyaltyApplied(false);
    const digits = customerPhone.replace(/\D/g, '');
    if (digits.length < 7) { setLoyaltyBalance(null); return; }
    loyaltyLookupTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/loyalty/balance?phone=${encodeURIComponent(customerPhone)}&restaurant_id=${restaurant.id}`);
        const data = await res.json();
        setLoyaltyBalance(data);
      } catch { setLoyaltyBalance(null); }
    }, 700);
    return () => clearTimeout(loyaltyLookupTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone, restaurant.id]);

  // NYC "Skip the Stuff": sin cubiertos salvo que el cliente los pida.
  const [includeUtensils, setIncludeUtensils] = useState(false);

  // Pre-order / scheduled
  const [scheduledFor, setScheduledFor] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderId, setOrderId] = useState('');
  // Pedido creado con pago online (Wompi / Mercado Pago / Stripe sin redirect)
  // que TODAVÍA no se pagó. La confirmación dice "Completá tu pago", muestra
  // los botones de pago y no vacía el carrito (W9). Distinto de paymentMethod:
  // tras Apple/Google Pay el método sigue siendo 'online' pero ya está pagado.
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [trackingToken, setTrackingToken] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const confettiTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const submittingRef = useRef(false);
  // Generated once per checkout session — prevents duplicate orders on network retry.
  // The wallet path uses a distinct derived key so that cancelling Apple/Google Pay
  // and then using the normal button doesn't return the un-charged 'wallet' order
  // (which would skip payment). Each path still has its own retry idempotency.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const walletIdempotencyKeyRef = useRef<string>(`${idempotencyKeyRef.current}-w`);
  // True while the Apple/Google Pay sheet is open + charging, so the normal CTA
  // is disabled and the user can't submit a second order in parallel.
  const [walletPaying, setWalletPaying] = useState(false);
  // UI-only: set right before handing off to the hosted payment page. The
  // submit `finally` re-enables the CTA synchronously while the browser is still
  // navigating away, so without this the button flashed back to "Confirm" and
  // invited a second tap. Reset on bfcache restore (customer hit back).
  const [redirectingToPay, setRedirectingToPay] = useState(false);
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) setRedirectingToPay(false); };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);
  // Double-tap confirm before removing last qty of an item
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);
  const confirmRemoveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { return () => { if (confirmRemoveTimer.current) clearTimeout(confirmRemoveTimer.current); }; }, []);
  // Propina: el índice de un botón en $ (sigue al subtotal si cambia el carrito)
  // o "Otra" con lo que escribió el cliente. null = Ninguna (estado inicial).
  const [tipChoice, setTipChoice] = useState<
    null | { kind: 'preset'; index: number } | { kind: 'custom'; value: string; mode: '$' | '%' }
  >(null);

  // Checkout premium: los campos viven en hojas que se abren desde las filas.
  const [activeSheet, setActiveSheet] = useState<null | 'contact' | 'address' | 'when' | 'note' | 'promo' | 'table'>(null);
  const closeSheet = useCallback(() => setActiveSheet(null), []);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Delivery en efectivo: con cuánto paga, para que el repartidor lleve cambio.
  // Va en las notas del pedido (sin migración).
  const [cashChange, setCashChange] = useState<null | 'exact' | number>(null);
  // A9: un error del servidor trae una salida (cambiar dirección, programar…), no solo texto rojo.
  const [orderErrorAction, setOrderErrorAction] = useState<OrderErrorAction>(null);
  // Escritorio: el botón va dentro de la tarjeta de acciones, no en la barra de abajo.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 860px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Inline validation: tracks which fields the user has interacted with
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  const touch = (name: string) => setFieldTouched(prev => ({ ...prev, [name]: true }));

  // Promo code section collapsed by default
  const [promoOpen, setPromoOpen] = useState(false);

  // CTA shake animation when form not ready
  const [ctaShake, setCtaShake] = useState(false);
  const ctaShakeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { return () => { clearTimeout(ctaShakeTimer.current); }; }, []);

  // Network-error retry state
  const [networkRetrying, setNetworkRetrying] = useState(false);
  const [canManualRetry, setCanManualRetry] = useState(false);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => { clearTimeout(retryTimerRef.current); }, []);

  // Snapshot of items captured before clearCart() — shown on confirmation screen
  const [confirmedItems, setConfirmedItems] = useState<{ name: string; qty: number; variant?: string; lineTotal: number }[]>([]);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  // Tiempo prometido calculado para ESTE pedido (plato más lento + viaje en
  // delivery). Se congela al confirmar porque el carrito se vacía después.
  const [confirmedEta, setConfirmedEta] = useState<number | null>(null);

  // Demo payment simulation state
  const [demoCardNum, setDemoCardNum] = useState('4242 4242 4242 4242');
  const [demoExpiry, setDemoExpiry] = useState('12 / 28');
  const [demoCVC, setDemoCVC] = useState('123');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [demoPayProcessing, setDemoPayProcessing] = useState(false);
  // En efectivo no se ofrece propina: el cliente la da en mano (tipAllowedFor).
  const tipAllowed = tipAllowedFor(paymentMethod);
  const tipPresets = tipOptions(cartTotal);
  const tipAmount = !tipAllowed || tipChoice === null
    ? 0
    : tipChoice.kind === 'preset'
      ? (tipPresets[tipChoice.index]?.amount ?? 0)
      : customTipAmount(parseFloat(tipChoice.value.replace(',', '.')), tipChoice.mode, cartTotal);

  const [serverQuote, setServerQuote] = useState<CartQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Fetch server-authoritative pricing whenever the cart, order type, promo or tip changes.
  // Falls back to local estimate on network failure so checkout is never blocked.
  useEffect(() => {
    if (!hasMounted || items.length === 0 || restaurant.id.startsWith('demo')) {
      setServerQuote(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: restaurant.id,
            order_type: orderType,
            items: items.map((item) => ({
              product_id: item.product.id,
              variant_id: item.variant?.id ?? null,
              qty: item.qty,
              extras: item.extras.map((e) => ({ extra_id: e.id })),
              modifiers: (item.modifierSelections ?? []).flatMap((ms) =>
                ms.selectedOptions.map((opt) => ({
                  group_id: ms.group.id,
                  option_id: opt.id,
                }))
              ),
            })),
            promo_code: promoResult?.valid ? promoCode.trim() : undefined,
            loyalty_account_id: loyaltyApplied && loyaltyBalance?.account_id ? loyaltyBalance.account_id : undefined,
            loyalty_points_redeemed: loyaltyApplied ? (loyaltyBalance?.points ?? 0) : 0,
            tip_amount: tipAmount,
          }),
        });
        if (cancelled) return;
        // Si la cotización falla, se descarta la anterior: era de otro carrito
        // (otra cantidad, otro tipo de pedido) y el total grande y el del botón
        // seguían mostrándola. Mejor la estimación local, que sí es de este.
        if (!res.ok) { setServerQuote(null); return; }
        const data: CartQuoteResponse = await res.json();
        if (!cancelled) setServerQuote(data);
      } catch {
        // Network failure — local estimate of THIS cart, not a stale quote
        if (!cancelled) setServerQuote(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, items, orderType, promoResult, promoCode, loyaltyApplied, loyaltyBalance, restaurant.id, tipAmount]);

  // Pedido hecho → directo al seguimiento (A10): ahí arranca la confirmación con
  // el check. Antes había una pantalla de "Pedido enviado" de 1 s en medio.
  // El botón manual de esa pantalla queda solo para pagos online pendientes y demos.
  const trackRedirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (step !== 'confirmation' || !orderNumber || !orderId) return;
    if (orderId === 'demo-order-id') return;
    if (awaitingPayment) return;
    const tokenQs = trackingToken ? `?t=${encodeURIComponent(trackingToken)}` : '';
    trackRedirectTimer.current = setTimeout(() => {
      // replace, not push: the cart is already cleared, so "back" from the
      // tracker must not land on an empty /checkout — it goes to the menu.
      router.replace(`/${slug}/orden/${orderNumber}${tokenQs}`);
    }, 0);
    return () => {
      if (trackRedirectTimer.current) {
        clearTimeout(trackRedirectTimer.current);
        trackRedirectTimer.current = null;
      }
    };
  }, [step, orderNumber, orderId, awaitingPayment, router, slug, trackingToken]);


  const belowDeliveryMin = orderType === 'delivery' && deliveryMinOrder > 0 && cartTotal < deliveryMinOrder;

  // W7 — con radio de entrega configurado, una dirección escrita a mano (sin
  // elegir sugerencia) llega sin coordenadas y el servidor no puede comprobar
  // la zona: se aceptaban deliveries fuera del área. Si el autocompletado de
  // Google cargó, se exige elegir de la lista. Si NO cargó (sin key / bloqueado)
  // se deja pasar como antes, para no dejar a nadie sin poder pedir delivery.
  const addressNeedsPick = (): boolean =>
    orderType === 'delivery' &&
    !deliveryCoords &&
    deliveryAddress.trim().length > 0 &&
    (Number(restaurant.delivery_radius_km) || 0) > 0 &&
    restaurant.latitude != null &&
    restaurant.longitude != null &&
    typeof window !== 'undefined' &&
    !!window.google?.maps?.places;

  // En mesa no se pide teléfono (Pedro 2026-11-19): el pedido llega a la mesa.
  const phoneNeeded = orderType !== 'dine_in';
  const phoneOk = !phoneNeeded || phoneLooksValid(customerPhone);
  const phoneForOrder = phoneNeeded || phoneLooksValid(customerPhone) ? customerPhone.trim() : '';

  // Reactive form validation — drives CTA disabled state
  const isFormReady = Boolean(
    customerName.trim().length >= 2 &&
    phoneOk &&
    // Email opcional: si viene, tiene que tener formato válido.
    (!customerEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) &&
    (orderType !== 'delivery' || deliveryAddress.trim().length > 0) &&
    !belowDeliveryMin
  );

  const promoDiscount = promoResult?.valid ? promoResult.discount : 0;

  // Loyalty discount derived from applied points
  const loyaltyPointsToRedeem = (loyaltyApplied && loyaltyBalance?.config && loyaltyBalance.points >= loyaltyBalance.config.min_redeem_points)
    ? loyaltyBalance.points
    : 0;
  const loyaltyDiscount = loyaltyPointsToRedeem > 0 && loyaltyBalance?.config
    ? Math.min(
        Math.floor(loyaltyPointsToRedeem * loyaltyBalance.config.peso_per_point * 100) / 100,
        Math.max(0, cartTotal - promoDiscount)
      )
    : 0;

  const discount = promoDiscount + loyaltyDiscount;
  const deliveryFee = (orderType === 'delivery' && restaurant.delivery_fee) ? restaurant.delivery_fee : 0;

  const taxRate = restaurant.tax_rate ?? 0;
  const taxIncluded = restaurant.tax_included ?? false;
  const taxLabel = restaurant.tax_label ?? 'Tax';
  const taxableBase = Math.max(0, cartTotal - discount);
  const taxAmount = computeTaxAmount(taxableBase, taxRate, taxIncluded);

  const finalTotal = Math.max(0, cartTotal - discount + deliveryFee + tipAmount + (taxIncluded ? 0 : taxAmount));
  const displayTotal = serverQuote?.total ?? finalTotal;
  // P7: con cotización del servidor, las líneas del desglose salen de ella
  // (si un precio cambió, antes las líneas locales no sumaban el total).
  const shownSubtotal = serverQuote?.subtotal ?? cartTotal;
  const shownPromo = serverQuote ? serverQuote.discount_amount : promoDiscount;
  const shownLoyalty = serverQuote ? serverQuote.loyalty_discount : loyaltyDiscount;
  const shownDeliveryFee = serverQuote ? serverQuote.delivery_fee : deliveryFee;
  const shownTax = serverQuote ? serverQuote.tax_amount : taxAmount;

  // Did the customer reach /checkout by a client-side navigation from the menu
  // (MenuShell's cart is the only in-app entry point)? Then the previous history
  // entry IS the menu and "back" must pop it instead of pushing a duplicate —
  // pushing left menu → checkout → menu, so the phone's back gesture bounced
  // the customer into checkout again. Signals, checked once on mount:
  //  - soft navigation: the document was first loaded on another path
  //    (Next client navigations don't create a new navigation entry);
  //  - or a full load whose same-origin referrer is the menu path.
  // Anything else (deep link, refresh, return from a payment page) falls back
  // to replace(), which never leaves a stale checkout entry behind.
  const cameFromMenuRef = useRef(false);
  useEffect(() => {
    try {
      const here = window.location.pathname;
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const softNav = !!nav && new URL(nav.name).pathname !== here;
      let referrerIsMenu = false;
      if (document.referrer) {
        const ref = new URL(document.referrer);
        referrerIsMenu =
          ref.origin === window.location.origin &&
          ref.pathname.replace(/\/$/, '') === here.replace(/\/checkout\/?$/, '');
      }
      cameFromMenuRef.current = (softNav || referrerIsMenu) && window.history.length > 1;
    } catch {
      cameFromMenuRef.current = false;
    }
  }, []);

  const goBack = useCallback(() => {
    if (cameFromMenuRef.current && window.history.length > 1) {
      // The menu entry already carries its own ?table=.
      router.back();
      return;
    }
    // Keep the table context (QR dine-in) when rebuilding the menu URL — the
    // same param MenuShell uses to send the customer here.
    const table = new URLSearchParams(window.location.search).get('table') ?? useCartStore.getState().tableName;
    router.replace(table ? `/${slug}?table=${encodeURIComponent(table)}` : `/${slug}`);
  }, [router, slug]);

  const validateField = useCallback((name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'customer_name':
        if (!value.trim()) error = t.validationNameRequired;
        else if (value.trim().length < 2) error = t.validationNameMinLength;
        break;
      case 'customer_phone':
        if (orderType === 'dine_in') break;
        if (!value.trim()) error = t.validationPhoneRequired;
        else if (!phoneLooksValid(value)) error = t.validationPhoneInvalid;
        break;
      case 'customer_email':
        // Opcional: vacío es válido; si viene, se valida el formato.
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) error = t.validationEmailInvalid;
        break;
      case 'delivery_address':
        if (orderType === 'delivery' && !value.trim()) error = t.validationAddressRequired;
        break;
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  }, [orderType, locale]);

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch('/api/orders/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, restaurant_id: restaurant.id, order_total: cartTotal, locale }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromoResult(data);
        trackEvent('promo_applied', {
          restaurant_id: restaurant.id,
          code: promoCode.trim().toUpperCase(),
          discount: data.discount,
          valid: data.valid,
        });
      } else {
        // 429 y 5xx traen textos técnicos o solo en inglés: el mensaje propio es mejor.
        setPromoError(res.status === 429 || res.status >= 500 ? t.validationErrorPromo : data.error);
        setPromoResult(null);
        trackEvent('promo_failed', {
          restaurant_id: restaurant.id,
          code: promoCode.trim().toUpperCase(),
          reason: data.error,
        });
      }
    } catch {
      setPromoError(t.validationErrorPromo);
    } finally {
      setPromoLoading(false);
    }
  };

  // Los datos de contacto viven en una hoja: si falta algo, se abre con los
  // errores ya marcados (la hoja enfoca el primer campo).
  const scrollToFirstInvalidField = () => {
    validateField('customer_name', customerName);
    validateField('customer_phone', customerPhone);
    validateField('customer_email', customerEmail);
    setActiveSheet('contact');
  };

  // Builds the items array sent to /api/orders. Shared by the standard submit
  // path and the wallet (Apple/Google Pay) path so they stay byte-for-byte identical.
  const buildOrderItemsPayload = useCallback(() => {
    return items.map((item) => ({
      product_id: item.product.id,
      variant_id: item.variant?.id ?? null,
      qty: item.qty,
      unit_price:
        Number(item.product.price) +
        (item.variant?.price_delta ?? 0) +
        item.extras.reduce((s, e) => s + Number(e.price), 0) +
        (item.modifierSelections ?? []).reduce((s, ms) => s + ms.selectedOptions.reduce((ss, o) => ss + Number(o.price_delta), 0), 0),
      line_total: item.lineTotal,
      notes: item.notes,
      extras: item.extras.map((e) => ({ extra_id: e.id, price: Number(e.price) })),
      modifiers: (item.modifierSelections ?? []).flatMap((ms) =>
        ms.selectedOptions.map((opt) => ({
          group_id: ms.group.id,
          group_name: ms.group.name,
          option_id: opt.id,
          option_name: opt.name,
          price_delta: Number(opt.price_delta),
        }))
      ),
    }));
  }, [items]);

  // Wallet (Apple/Google Pay) path: creates the order WITHOUT advancing the step,
  // returning ids so WalletButton can charge the PaymentIntent. The standard flow
  // (handleSubmitOrder) is untouched and still used by the main CTA / cash / redirect.
  const createOrderForWallet = useCallback(async (): Promise<{ orderId: string; orderNumber: string } | { error: string }> => {
    if (addressNeedsPick()) return { error: t.deliveryPickFromList };
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': walletIdempotencyKeyRef.current },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          locale,
          _ot: orderToken,
          _hp: honeypot,
          customer_name: customerName.trim(),
          customer_phone: phoneForOrder,
          customer_email: customerEmail.trim() || undefined,
          notes: (() => {
            const arrival = orderType === 'dine_in' && !tableName && arrivalTime
              ? `[${t.arrivesLabel}: ${arrivalTime}] `
              : '';
            return arrival + orderNotes.trim() || undefined;
          })(),
          order_type: orderType,
          payment_method: 'wallet',
          delivery_address: orderType === 'delivery' ? fullDeliveryAddress : undefined,
          delivery_lat: orderType === 'delivery' && deliveryCoords ? deliveryCoords.lat : undefined,
          delivery_lng: orderType === 'delivery' && deliveryCoords ? deliveryCoords.lng : undefined,
          table_name: orderType === 'dine_in' ? (tableName || manualTableName.trim() || undefined) : undefined,
          promo_code: promoResult?.valid ? promoCode.trim() : undefined,
          discount_amount: discount,
          loyalty_points_redeemed: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
          loyalty_account_id: loyaltyPointsToRedeem > 0 ? loyaltyBalance?.account_id : undefined,
          tip_amount: tipAmount > 0 ? tipAmount : undefined,
          include_utensils: includeUtensils,
          scheduled_for: scheduleEnabled && scheduledFor ? scheduledForIso(scheduledFor) : undefined,
          items: buildOrderItemsPayload(),
        }),
      });
      const parsed = safeParseJson<{ error?: string; order_number?: string; order_id?: string; tracking_token?: string }>(await res.text());
      if (!parsed.ok || !res.ok || !parsed.data.order_id || !parsed.data.order_number) {
        return { error: formatOrderSubmitError(res.status, parsed.ok ? parsed.data.error : undefined, locale) };
      }
      setOrderNumber(parsed.data.order_number);
      setOrderId(parsed.data.order_id);
      if (parsed.data.tracking_token) setTrackingToken(parsed.data.tracking_token);
      return { orderId: parsed.data.order_id, orderNumber: parsed.data.order_number };
    } catch {
      return { error: t.noConnectionRetry };
    }
  }, [restaurant.id, locale, orderToken, honeypot, customerName, customerPhone, phoneForOrder, customerEmail, orderNotes, arrivalTime, orderType, deliveryAddress, deliveryUnit, deliveryCoords, fullDeliveryAddress, deliveryCoords, tableName, manualTableName, promoResult, promoCode, discount, loyaltyPointsToRedeem, loyaltyBalance, tipAmount, includeUtensils, scheduleEnabled, scheduledFor, buildOrderItemsPayload, t]);

  // B2 — la Idempotency-Key se renueva cuando cambia lo que se va a pedir.
  // Antes era una por sesión de checkout: si el cliente volvía de Stripe con
  // "atrás", cambiaba el carrito y confirmaba, el servidor devolvía el pedido
  // VIEJO (otro monto, otros platos) como si fuera un reintento. Un reintento
  // de red real no cambia nada de esto, así que conserva la clave.
  const orderPayloadSig = useMemo(
    () =>
      JSON.stringify([
        buildOrderItemsPayload(),
        orderType,
        paymentMethod,
        tipAmount,
        promoResult?.valid ? promoCode.trim() : '',
        loyaltyPointsToRedeem,
        fullDeliveryAddress,
        scheduleEnabled ? scheduledFor : '',
        customerName.trim(),
        phoneForOrder,
        customerEmail.trim(),
        orderNotes.trim(),
        includeUtensils,
        tableName || manualTableName.trim(),
      ]),
    [buildOrderItemsPayload, orderType, paymentMethod, tipAmount, promoResult, promoCode, loyaltyPointsToRedeem, fullDeliveryAddress, scheduleEnabled, scheduledFor, customerName, phoneForOrder, customerEmail, orderNotes, includeUtensils, tableName, manualTableName],
  );
  const firstPayloadSigRef = useRef(true);
  useEffect(() => {
    if (firstPayloadSigRef.current) {
      firstPayloadSigRef.current = false;
      return;
    }
    idempotencyKeyRef.current = crypto.randomUUID();
    walletIdempotencyKeyRef.current = `${idempotencyKeyRef.current}-w`;
  }, [orderPayloadSig]);

  // Wallet success: order already created + charged. Mirror the confirmation
  // bookkeeping from handleSubmitOrder (snapshot, save customer, track, confetti).
  const handleWalletSuccess = useCallback((_orderId: string, orderNum: string) => {
    saveLastOrder();
    setConfirmedItems(items.map(i => ({ name: i.product.name, qty: i.qty, variant: i.variant?.name, lineTotal: i.lineTotal })));
    setConfirmedEta(estimateMinutes({ items, orderType, restaurant, to: deliveryCoords }));
    setConfirmedTotal(displayTotal);
    try {
      if (rememberMe) {
        saveCustomer({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
          lastOrderType: orderType,
          lastPaymentMethod: 'online',
          deliveryAddress: deliveryAddress.trim() || undefined,
          deliveryUnit: deliveryUnit.trim() || undefined,
          deliveryLat: deliveryCoords?.lat,
          deliveryLng: deliveryCoords?.lng,
        });
        localStorage.setItem('menius_customer_phone', customerPhone.trim());
      }
    } catch {}
    trackEvent('order_placed', {
      restaurant_id: restaurant.id,
      restaurant_slug: restaurant.slug,
      order_number: orderNum,
      order_type: orderType,
      payment_method: 'wallet',
      item_count: items.length,
      total: cartTotal,
      currency: restaurant.currency,
    });
    clearCart();
    setStep('confirmation');
    playSuccessChime();
    confettiTimer.current = setTimeout(() => { if (confirmRef.current) spawnConfetti(confirmRef.current); }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveLastOrder, items, displayTotal, rememberMe, saveCustomer, customerName, customerPhone, customerEmail, orderType, deliveryAddress, deliveryUnit, deliveryCoords, restaurant, cartTotal, clearCart]);

  const handleSubmitOrder = async () => {
    if (submittingRef.current) return;
    setOrderErrorAction(null);
    if (customerName.trim().length < 2 || !phoneOk) {
      setOrderError(phoneNeeded ? t.validationNamePhoneRequired : t.validationNameOnlyRequired);
      trackEvent('checkout_validation_error', { restaurant_id: restaurant.id, field: 'name_or_phone', order_type: orderType });
      // Trigger shake + scroll to first invalid field
      setCtaShake(true);
      clearTimeout(ctaShakeTimer.current);
      ctaShakeTimer.current = setTimeout(() => setCtaShake(false), 600);
      scrollToFirstInvalidField();
      return;
    }
    // Email opcional: solo frena si vino con formato inválido.
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setOrderError(t.validationEmailInvalid);
      validateField('customer_email', customerEmail);
      trackEvent('checkout_validation_error', { restaurant_id: restaurant.id, field: 'email', order_type: orderType });
      setCtaShake(true);
      clearTimeout(ctaShakeTimer.current);
      ctaShakeTimer.current = setTimeout(() => setCtaShake(false), 600);
      scrollToFirstInvalidField();
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setOrderError(t.validationDeliveryAddressRequired);
      trackEvent('checkout_validation_error', { restaurant_id: restaurant.id, field: 'delivery_address', order_type: orderType });
      setActiveSheet('address');
      setCtaShake(true);
      clearTimeout(ctaShakeTimer.current);
      ctaShakeTimer.current = setTimeout(() => setCtaShake(false), 600);
      return;
    }
    if (addressNeedsPick()) {
      setOrderError(t.deliveryPickFromList);
      trackEvent('checkout_validation_error', { restaurant_id: restaurant.id, field: 'delivery_address_unverified', order_type: orderType });
      setActiveSheet('address');
      setCtaShake(true);
      clearTimeout(ctaShakeTimer.current);
      ctaShakeTimer.current = setTimeout(() => setCtaShake(false), 600);
      return;
    }
    if (dineInOnlyBlocked) {
      setOrderError(t.validationDineInOnlyItems);
      trackEvent('checkout_validation_error', { restaurant_id: restaurant.id, field: 'dine_in_only', order_type: orderType });
      setCtaShake(true);
      clearTimeout(ctaShakeTimer.current);
      ctaShakeTimer.current = setTimeout(() => setCtaShake(false), 600);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setOrderError('');
    setCanManualRetry(false);
    try {
      // Demo restaurants: simulate success without hitting the real orders API
      if (restaurant.id.startsWith('demo')) {
        await new Promise((r) => setTimeout(r, 1200));
        saveLastOrder();
        const demoSnapshot = items.map((i) => ({ name: i.product.name, qty: i.qty, variant: i.variant?.name, lineTotal: i.lineTotal }));
        setConfirmedItems(demoSnapshot);
        setConfirmedTotal(displayTotal);
        clearCart();
        setOrderNumber('DEMO-0042');
        setOrderId('demo-order-id');
        setStep('confirmation');
        playSuccessChime();
        confettiTimer.current = setTimeout(() => { if (confirmRef.current) spawnConfetti(confirmRef.current); }, 200);
        // If visitor entered a real email, send them a branded demo confirmation
        if (customerEmail?.trim() && customerEmail.includes('@')) {
          fetch('/api/demo/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: customerEmail.trim(), items: demoSnapshot, total: finalTotal }),
          }).catch(() => {});
        }
        return;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKeyRef.current },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          locale,
          _ot: orderToken,
          _hp: honeypot,
          customer_name: customerName.trim(),
          customer_phone: phoneForOrder,
          customer_email: customerEmail.trim() || undefined,
          notes: (() => {
            const arrival = orderType === 'dine_in' && !tableName && arrivalTime
              ? `[${t.arrivesLabel}: ${arrivalTime}] `
              : '';
            // Delivery en efectivo: el repartidor sabe cuánto cambio llevar.
            // Un billete que ya no alcanza (el total subió después de elegirlo) no se manda.
            const change = orderType === 'delivery' && paymentMethod === 'cash' && cashChange !== null &&
              (cashChange === 'exact' || cashChange > displayTotal)
              ? `[${t.ckPaysWith}: ${cashChange === 'exact' ? t.ckExact : fmtPrice(cashChange)}] `
              : '';
            return arrival + change + orderNotes.trim() || undefined;
          })(),
          order_type: orderType,
          payment_method: paymentMethod,
          delivery_address: orderType === 'delivery' ? fullDeliveryAddress : undefined,
          delivery_lat: orderType === 'delivery' && deliveryCoords ? deliveryCoords.lat : undefined,
          delivery_lng: orderType === 'delivery' && deliveryCoords ? deliveryCoords.lng : undefined,
          table_name: orderType === 'dine_in' ? (tableName || manualTableName.trim() || undefined) : undefined,
          promo_code: promoResult?.valid ? promoCode.trim() : undefined,
          discount_amount: discount,
          loyalty_points_redeemed: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
          loyalty_account_id: loyaltyPointsToRedeem > 0 ? loyaltyBalance?.account_id : undefined,
          tip_amount: tipAmount > 0 ? tipAmount : undefined,
          include_utensils: includeUtensils,
          scheduled_for: scheduleEnabled && scheduledFor ? scheduledForIso(scheduledFor) : undefined,
          items: items.map((item) => ({
            product_id: item.product.id,
            variant_id: item.variant?.id ?? null,
            qty: item.qty,
            unit_price:
              Number(item.product.price) +
              (item.variant?.price_delta ?? 0) +
              item.extras.reduce((s, e) => s + Number(e.price), 0) +
              (item.modifierSelections ?? []).reduce((s, ms) => s + ms.selectedOptions.reduce((ss, o) => ss + Number(o.price_delta), 0), 0),
            line_total: item.lineTotal,
            notes: item.notes,
            extras: item.extras.map((e) => ({ extra_id: e.id, price: Number(e.price) })),
            modifiers: (item.modifierSelections ?? []).flatMap((ms) =>
              ms.selectedOptions.map((opt) => ({
                group_id: ms.group.id,
                group_name: ms.group.name,
                option_id: opt.id,
                option_name: opt.name,
                price_delta: Number(opt.price_delta),
              }))
            ),
          })),
        }),
      });
      const text = await res.text();
      const parsed = safeParseJson<{
        error?: string;
        order_number?: string;
        order_id?: string;
        total?: number;
        stripe_url?: string;
        tracking_token?: string;
        idempotent?: boolean;
        code?: string;
      }>(text);
      // A server error (not paused/closed) can be retried with the same
      // Idempotency-Key: the server rolled the order back, or returns it if
      // it did get created. Before, Retry only appeared on network failures.
      if (res.status >= 500 && res.status !== 503) setCanManualRetry(true);
      if (!parsed.ok) {
        setOrderError(formatOrderSubmitError(res.status, undefined, locale));
        trackEvent('checkout_error', { restaurant_id: restaurant.id, reason: 'parse_error', status: res.status, order_type: orderType });
        return;
      }
      const data = parsed.data;
      if (!res.ok) {
        // Cliente marcado (customer-incidents): este pedido se paga online.
        // Se deja la tarjeta elegida para que reintente con un toque.
        if (data.code === 'PREPAY_REQUIRED' && enabledPaymentMethods.includes('online')) {
          setPaymentMethod('online');
        }
        setOrderErrorAction(errorActionFor(data.code));
        setOrderError(formatOrderSubmitError(res.status, data.error, locale));
        trackEvent('checkout_error', { restaurant_id: restaurant.id, reason: data.error ?? 'server_error', status: res.status, order_type: orderType, payment_method: paymentMethod });
        return;
      }
      // Online payment: redirect immediately — no need for order id in local state
      if (data.stripe_url) {
        // B1: el carrito queda intacto hasta que el seguimiento vea el pedido
        // pagado (si cancela en Stripe, vuelve con su carrito).
        if (data.order_id) setPendingPayment({ restaurantId: restaurant.id, orderId: data.order_id });
        setRedirectingToPay(true);
        window.location.href = data.stripe_url;
        return;
      }
      if (!data.order_number || !data.order_id) {
        setOrderError(formatOrderSubmitError(res.status, undefined, locale));
        return;
      }
      setOrderNumber(data.order_number);
      setOrderId(data.order_id);
      if (data.tracking_token) setTrackingToken(data.tracking_token);
      // Demo restaurant + online payment → show simulated card payment step
      if (restaurant.id.startsWith('demo') && paymentMethod === 'online') {
        setStep('payment');
        return;
      }
      // W9 — pago online sin redirect inmediato (Wompi, Mercado Pago, o el
      // mismo pedido devuelto por idempotencia): el pedido NO está pagado.
      // Antes se mostraba "¡Pedido enviado!" + "Total cobrado" y se vaciaba el
      // carrito antes de pagar. Ahora: "Completá tu pago", carrito intacto, y
      // en Colombia se abre Wompi directo.
      if (paymentMethod === 'online') {
        setPendingPayment({ restaurantId: restaurant.id, orderId: data.order_id });
        setConfirmedItems(items.map(i => ({ name: i.product.name, qty: i.qty, variant: i.variant?.name, lineTotal: i.lineTotal })));
        setConfirmedEta(estimateMinutes({ items, orderType, restaurant, to: deliveryCoords }));
        setConfirmedTotal(typeof data.total === 'number' ? data.total : displayTotal);
        setAwaitingPayment(true);
        setStep('confirmation');
        if (isColombianRestaurant) void handlePayWompi(data.order_id);
        return;
      }
      saveLastOrder();
      // Capture snapshot before clearing cart — used in confirmation screen
      setConfirmedItems(items.map(i => ({ name: i.product.name, qty: i.qty, variant: i.variant?.name, lineTotal: i.lineTotal })));
      setConfirmedEta(estimateMinutes({ items, orderType, restaurant, to: deliveryCoords }));
      setConfirmedTotal(typeof data.total === 'number' ? data.total : displayTotal);
      // Save customer info for next visit
      try {
        if (rememberMe) {
          saveCustomer({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim(),
            lastOrderType: orderType,
            lastPaymentMethod: paymentMethod,
            deliveryAddress: deliveryAddress.trim() || undefined,
          deliveryUnit: deliveryUnit.trim() || undefined,
          deliveryLat: deliveryCoords?.lat,
          deliveryLng: deliveryCoords?.lng,
          });
          localStorage.setItem('menius_customer_phone', customerPhone.trim());
        } else {
          useCheckoutStore.getState().clearCustomer();
          localStorage.removeItem('menius_guest_info');
          localStorage.removeItem('menius_customer_phone');
        }
      } catch {}
      trackEvent('order_placed', {
        restaurant_id: restaurant.id,
        restaurant_slug: restaurant.slug,
        order_number: data.order_number,
        order_type: orderType,
        payment_method: paymentMethod,
        item_count: items.length,
        total: cartTotal,
        currency: restaurant.currency,
      });
      clearCart();
      setStep('confirmation');
      playSuccessChime();
      confettiTimer.current = setTimeout(() => { if (confirmRef.current) spawnConfetti(confirmRef.current); }, 200);
    } catch {
      if (retryAttemptRef.current === 0) {
        // First network failure — auto-retry silently after 2s
        retryAttemptRef.current = 1;
        setNetworkRetrying(true);
        retryTimerRef.current = setTimeout(async () => {
          setNetworkRetrying(false);
          await handleSubmitOrder();
        }, 2000);
      } else {
        // Second failure — give up and let user retry manually
        retryAttemptRef.current = 0;
        setCanManualRetry(true);
        setOrderError(t.noConnectionRetry);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDemoPayment = useCallback(async () => {
    setDemoPayProcessing(true);
    // Simulate network processing delay
    await new Promise((r) => setTimeout(r, 1800));
    saveLastOrder();
    // Capture snapshot before clearing cart — used in confirmation screen
    setConfirmedItems(items.map(i => ({ name: i.product.name, qty: i.qty, variant: i.variant?.name, lineTotal: i.lineTotal })));
    setConfirmedEta(estimateMinutes({ items, orderType, restaurant, to: deliveryCoords }));
    setConfirmedTotal(displayTotal);
    try {
      if (rememberMe) {
        saveCustomer({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
          lastOrderType: orderType,
          lastPaymentMethod: paymentMethod,
          deliveryAddress: deliveryAddress.trim() || undefined,
          deliveryUnit: deliveryUnit.trim() || undefined,
          deliveryLat: deliveryCoords?.lat,
          deliveryLng: deliveryCoords?.lng,
        });
        localStorage.setItem('menius_customer_phone', customerPhone.trim());
      } else {
        useCheckoutStore.getState().clearCustomer();
        localStorage.removeItem('menius_guest_info');
        localStorage.removeItem('menius_customer_phone');
      }
    } catch {}
    trackEvent('order_placed', {
      restaurant_id: restaurant.id,
      restaurant_slug: restaurant.slug,
      order_number: orderNumber,
      order_type: orderType,
      payment_method: 'online',
      item_count: items.length,
      total: cartTotal,
      currency: restaurant.currency,
    });
    clearCart();
    setDemoPayProcessing(false);
    setStep('confirmation');
    playSuccessChime();
    confettiTimer.current = setTimeout(() => { if (confirmRef.current) spawnConfetti(confirmRef.current); }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveLastOrder, rememberMe, saveCustomer, customerName, customerPhone, customerEmail, deliveryAddress, deliveryUnit, deliveryCoords, paymentMethod, restaurant, orderNumber, orderType, items, cartTotal, displayTotal, clearCart, confettiTimer]);

  const currencyUpper = restaurant.currency?.toUpperCase() ?? '';
  const isColombianRestaurant = currencyUpper === 'COP';
  const isMpSupportedCurrency = MP_CURRENCIES.has(currencyUpper);

  // `id` explícito cuando se llama justo después de crear el pedido (el estado
  // orderId todavía no se actualizó). Desde un onClick llega el evento → se ignora.
  const handlePayOnline = async (id?: unknown) => {
    const oid = typeof id === 'string' ? id : orderId;
    if (isColombianRestaurant) {
      await handlePayWompi(oid);
      return;
    }
    setPayLoading(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: oid, slug: restaurant.slug }),
      });
      const text = await res.text();
      const parsed = safeParseJson<{ error?: string; url?: string | null }>(text);
      if (!parsed.ok) {
        setOrderError(formatPaymentStartError(res.status, undefined, locale));
        setPayLoading(false);
        return;
      }
      const data = parsed.data;
      if (data.url) {
        window.location.href = data.url;
      } else {
        setOrderError(formatPaymentStartError(res.status, data.error, locale));
        setPayLoading(false);
      }
    } catch {
      setOrderError(t.noConnectionPayment);
      setPayLoading(false);
    }
  };

  const handlePayWompi = async (id?: unknown) => {
    const oid = typeof id === 'string' ? id : orderId;
    setPayLoading(true);
    try {
      const res = await fetch('/api/payments/wompi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: oid, slug: restaurant.slug }),
      });
      const text = await res.text();
      const parsed = safeParseJson<{
        error?: string;
        publicKey?: string;
        currency?: string;
        amountInCents?: number;
        reference?: string;
        integrityHash?: string;
        redirectUrl?: string;
        customerData?: { email?: string; fullName?: string; phoneNumber?: string; phonePrefix?: string };
      }>(text);
      if (!parsed.ok) {
        setOrderError(formatPaymentStartError(res.status, undefined, locale));
        setPayLoading(false);
        return;
      }
      const data = parsed.data;
      if (data.error) {
        setOrderError(formatPaymentStartError(res.status, data.error, locale));
        setPayLoading(false);
        return;
      }
      const {
        publicKey,
        currency,
        amountInCents,
        reference,
        integrityHash,
        redirectUrl,
      } = data;
      if (
        !publicKey ||
        !currency ||
        amountInCents === undefined ||
        !reference ||
        !integrityHash ||
        !redirectUrl
      ) {
        setOrderError(formatPaymentStartError(res.status, undefined, locale));
        setPayLoading(false);
        return;
      }
      // Use Wompi Web Checkout redirect (most compatible approach)
      const params = new URLSearchParams({
        'public-key': publicKey,
        currency,
        'amount-in-cents': String(amountInCents),
        reference,
        'signature:integrity': integrityHash,
        'redirect-url': redirectUrl,
      });
      if (data.customerData?.email) params.append('customer-data:email', data.customerData.email);
      if (data.customerData?.fullName) params.append('customer-data:full-name', data.customerData.fullName);
      if (data.customerData?.phoneNumber) {
        params.append('customer-data:phone-number', data.customerData.phoneNumber);
        // Use prefix from API response if provided, otherwise default to Colombia (+57) for Wompi
        const prefix = data.customerData?.phonePrefix ?? '+57';
        params.append('customer-data:phone-number-prefix', prefix);
      }
      window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`;
    } catch {
      setOrderError(t.noConnectionPayment);
      setPayLoading(false);
    }
  };

  const handlePayMercadoPago = async () => {
    setPayLoading(true);
    try {
      const res = await fetch('/api/payments/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, slug: restaurant.slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setOrderError(formatPaymentStartError(res.status, data.error, locale));
        setPayLoading(false);
        return;
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setOrderError(formatPaymentStartError(res.status, undefined, locale));
      setPayLoading(false);
    } catch {
      setOrderError(t.noConnectionPayment);
      setPayLoading(false);
    }
  };

  // Desktop: the actions column is sticky. When it is taller than the visible
  // area (707px against 692px on a 1024x768 iPad), sticking it by its top let
  // the end of the page push it up and cut off Pickup/Delivery, and on short
  // screens "Confirm order" could sit below the fold. A negative top equal to
  // the overflow sticks it by its bottom instead: the button stays in view and
  // only the top of the column scrolls away — and only when it doesn't fit.
  // (The page's bottom padding lives on the left column, not on their flex
  // parent: a sticky child can't go past its parent's content box, so 40px
  // of padding there pushed the column 40px up at the end of the page.)
  const [actionsEl, setActionsEl] = useState<HTMLElement | null>(null);
  const [actionsTop, setActionsTop] = useState(0);
  useEffect(() => {
    const scroller = actionsEl?.parentElement?.parentElement;
    if (!actionsEl || !scroller || typeof ResizeObserver === 'undefined') return;
    const update = () => setActionsTop(Math.min(0, scroller.clientHeight - actionsEl.offsetHeight));
    const ro = new ResizeObserver(update);
    ro.observe(actionsEl);
    ro.observe(scroller);
    update();
    return () => ro.disconnect();
  }, [actionsEl]);

  if (!hasMounted) {
    return (
      <div className="h-[100dvh] bg-[#f5f5f5] flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4">
          <div className="h-5 w-24 skeleton rounded-full" />
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
          <div className="h-2.5 w-20 skeleton rounded-full" />
          <div className="bg-white rounded-2xl p-5 space-y-3 border border-gray-200">
            <div className="h-12 skeleton rounded-xl" />
            <div className="h-12 skeleton rounded-xl" />
            <div className="h-12 skeleton rounded-xl" />
          </div>
          <div className="h-2.5 w-16 skeleton rounded-full mt-2" />
          <div className="bg-white rounded-2xl p-5 space-y-3 border border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 skeleton rounded-xl" />
              <div className="h-12 skeleton rounded-xl" />
            </div>
          </div>
          <div className="h-2.5 w-24 skeleton rounded-full mt-2" />
          <div className="bg-white rounded-2xl p-5 space-y-3 border border-gray-200">
            <div className="h-12 skeleton rounded-xl" />
            <div className="h-12 skeleton rounded-xl" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="h-14 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="h-[100dvh] bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4">
          <button onClick={goBack} aria-label={t.backToMenu} className="flex items-center gap-2 text-gray-600 active:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{t.backToMenu}</span>
          </button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5">
            <ShoppingCart className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t.cartEmpty}</h2>
          <p className="text-sm text-gray-500 text-center mb-6">{t.cartEmptyDesc}</p>
          <button onClick={goBack} className="px-6 py-3 rounded-xl bg-[#05c8a7] text-[#04241E] font-semibold text-sm active:scale-[0.98] transition-all">
            {t.backToMenu}
          </button>
        </div>
      </div>
    );
  }

  // ── Demo payment simulation ─────────────────────────────────────────────
  if (step === 'payment') {
    const formatCardNum = (v: string) => {
      const digits = v.replace(/\D/g, '').slice(0, 16);
      return digits.replace(/(.{4})/g, '$1 ').trim();
    };
    const formatExpiry = (v: string) => {
      const digits = v.replace(/\D/g, '').slice(0, 4);
      if (digits.length <= 2) return digits;
      return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
    };

    const cardDigits = demoCardNum.replace(/\s/g, '');
    const isVisa = cardDigits.startsWith('4');
    const isMastercard = /^5[1-5]/.test(cardDigits) || /^2[2-7]/.test(cardDigits);
    const isAmex = /^3[47]/.test(cardDigits);

    const VisaSvg = () => (
      <svg viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
        <text x="0" y="14" fontFamily="Arial" fontWeight="900" fontSize="16" fontStyle="italic" fill="#1A1F71">VISA</text>
      </svg>
    );
    const MastercardSvg = () => (
      <svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
        <circle cx="15" cy="12" r="10" fill="#EB001B" />
        <circle cx="23" cy="12" r="10" fill="#F79E1B" />
        <path d="M19 5.3a10 10 0 010 13.4A10 10 0 0119 5.3z" fill="#FF5F00" />
      </svg>
    );
    const AmexSvg = () => (
      <svg viewBox="0 0 48 16" xmlns="http://www.w3.org/2000/svg" className="h-5 w-auto">
        <rect width="48" height="16" rx="2" fill="#007BC1"/>
        <text x="4" y="12" fontFamily="Arial" fontWeight="900" fontSize="9" fill="white" letterSpacing="0.5">AMERICAN EXPRESS</text>
      </svg>
    );

    const restaurantInitial = restaurant.name.charAt(0).toUpperCase();

    return (
      <div className="h-[100dvh] flex flex-col" style={{ backgroundColor: '#f6f9fc' }}>

        {/* Stripe-style header */}
        <div className="w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-xs text-gray-500 font-medium">{t.securePayment}</span>
          </div>
          <svg viewBox="0 0 60 25" className="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 01-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 013.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.87zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 01-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.84zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 01-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 00-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.77z" fill="#635BFF"/>
          </svg>
        </div>

        {/* TEST MODE banner */}
        <div className="w-full bg-orange-500 px-4 py-1.5 text-center">
          <p className="text-white text-xs font-semibold tracking-wide">
            {t.testModeDemo}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-5 py-8 space-y-5">

            {/* Merchant info — like Stripe shows brand + amount */}
            <div className="flex flex-col items-center text-center gap-3 pb-2">
              {/* Logo */}
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
                {restaurant.logo_url ? (
                  <Image src={restaurant.logo_url} alt={restaurant.name} width={56} height={56} className="object-cover w-full h-full rounded-2xl" />
                ) : (
                  <span className="text-2xl font-black text-gray-700">{restaurantInitial}</span>
                )}
              </div>
              {/* Name */}
              <p className="text-sm text-gray-500 font-medium">{restaurant.name}</p>
              {/* Amount */}
              <p className={`text-4xl font-black text-gray-900 tabular-nums tracking-tight transition-opacity ${quoteLoading ? 'opacity-50' : 'opacity-100'}`}>{fmtPrice(displayTotal)}</p>
            </div>

            {/* Order summary — collapsible like Stripe */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setSummaryOpen((o) => !o)}
                aria-expanded={summaryOpen}
                aria-controls="order-summary-content"
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>{t.orderSummaryLabel} ({items.length} items)</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${summaryOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {summaryOpen && (
                <div id="order-summary-content" className="border-t border-gray-100 px-4 py-3 space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-600">
                      <span className="flex-1 truncate pr-2">{item.qty > 1 ? `${item.qty}× ` : ''}{withTitle(item.product.name, cartModLines(item.modifierSelections)).name}{item.variant ? ` · ${item.variant.name}` : ''}</span>
                      <span className="tabular-nums font-medium text-gray-800 shrink-0">{fmtPrice(item.lineTotal)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-semibold text-gray-800">
                    <span>{t.total}</span>
                    <span className={`tabular-nums transition-opacity ${quoteLoading ? 'opacity-50' : 'opacity-100'}`}>{fmtPrice(displayTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card holder name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t.nameOnCard}
              </label>
              <input
                type="text"
                defaultValue="Test User"
                placeholder={t.cardFullNamePlaceholder}
                className="w-full px-3.5 py-3 rounded-lg border border-gray-300 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/20 focus:outline-none text-sm text-gray-900 bg-white transition-all"
              />
            </div>

            {/* Unified card input — Stripe style */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t.cardInformation}
              </label>
              <div className="rounded-lg border border-gray-300 overflow-hidden shadow-sm focus-within:border-[#635BFF] focus-within:ring-2 focus-within:ring-[#635BFF]/20 transition-all bg-white">
                {/* Card number row */}
                <div className="flex items-center px-3.5 py-3 border-b border-gray-200">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={demoCardNum}
                    onChange={(e) => setDemoCardNum(formatCardNum(e.target.value))}
                    placeholder="1234 1234 1234 1234"
                    maxLength={19}
                    className="flex-1 text-base font-mono tracking-wider text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
                  />
                  <div className="ml-2 shrink-0 h-5 flex items-center">
                    {isVisa && <VisaSvg />}
                    {isMastercard && <MastercardSvg />}
                    {isAmex && <AmexSvg />}
                    {!isVisa && !isMastercard && !isAmex && (
                      <svg className="w-8 h-5 text-gray-300" viewBox="0 0 32 20" fill="none">
                        <rect x="0.5" y="0.5" width="31" height="19" rx="3.5" stroke="currentColor"/>
                        <rect x="4" y="7" width="24" height="2" rx="1" fill="currentColor"/>
                        <rect x="4" y="11" width="8" height="2" rx="1" fill="currentColor"/>
                      </svg>
                    )}
                  </div>
                </div>
                {/* Expiry + CVC row */}
                <div className="flex">
                  <div className="flex-1 px-3.5 py-3 border-r border-gray-200">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={demoExpiry}
                      onChange={(e) => setDemoExpiry(formatExpiry(e.target.value))}
                      placeholder="MM / YY"
                      maxLength={7}
                      className="w-full text-base font-mono tracking-wider text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
                    />
                  </div>
                  <div className="flex-1 px-3.5 py-3 flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={demoCVC}
                      onChange={(e) => setDemoCVC(e.target.value.replace(/\D/g, '').slice(0, isAmex ? 4 : 3))}
                      placeholder={isAmex ? '1234' : 'CVC'}
                      maxLength={isAmex ? 4 : 3}
                      className="flex-1 text-base font-mono tracking-wider text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
                    />
                    <svg className="w-5 h-5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                      <path d="M7 15h2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handleDemoPayment}
              disabled={demoPayProcessing}
              className="w-full py-4 rounded-lg font-bold text-[15px] text-white transition-all duration-150 disabled:opacity-80 active:scale-[0.99] shadow-md"
              style={{ backgroundColor: demoPayProcessing ? '#8b85f0' : '#635BFF' }}
            >
              {demoPayProcessing ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.processingLabel}
                </span>
              ) : (
                `${t.payAmountPrefix} ${fmtPrice(displayTotal)}`
              )}
            </button>

            {/* Back link */}
            <button
              onClick={() => setStep('form')}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-[#6b6b74] hover:text-[#111114] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t.backToForm}
            </button>

            {/* Powered by Stripe footer */}
            <div className="flex flex-col items-center gap-2 pt-2 pb-4">
              <div className="flex items-center gap-1.5 text-[#6b6b74]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6 1a5 5 0 100 10A5 5 0 006 1zM5 4a1 1 0 112 0v3a1 1 0 11-2 0V4zm1 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z" fill="currentColor"/>
                </svg>
                <span className="text-[13px]">
                  {t.secureEncryptedPayment}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#6b6b74]">
                <span className="text-[13px]">Powered by</span>
                <svg className="h-[14px] w-auto" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 01-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.44.94V5.2h3.94l.14 1.07c.6-.72 1.7-1.33 3.29-1.33 3.01 0 5.7 2.68 5.7 7.5-.02 5.29-2.67 7.86-5.71 7.86zm-.95-11.64c-.95 0-1.55.35-1.97.8l.05 5.99c.42.47 1.01.8 1.92.8 1.51 0 2.54-1.65 2.54-3.81-.01-2.22-.99-3.78-2.54-3.78zM28.24 5.2h4.44v14.83h-4.44V5.2zm0-4.75l4.44-.94v3.56l-4.44.94V.45zM19.69 20.03c-1.87 0-3.49-.75-3.49-3.83V8.43h-1.89V5.2h1.89V1.51l4.42-.93V5.2h2.56v3.23h-2.56v6.82c0 1.14.49 1.63 1.55 1.63.36 0 .74-.07 1.01-.15v3.2c-.43.12-1.16.1-1.49.1zM12.06 6.01l-.17-1.15c-.62-.56-1.72-1.1-3.07-1.1C5.49 3.76 3.01 6.24 3.01 10c0 4.01 2.61 6.26 5.81 6.26 1.35 0 2.45-.52 3.07-1.07l.17-1.14v1.99H16V5.2h-3.94v.81zm-3.07 8.08c-1.51 0-2.62-1.24-2.62-3.11 0-1.87 1.11-3.11 2.62-3.11 1.5 0 2.63 1.24 2.63 3.11 0 1.87-1.13 3.11-2.63 3.11z" fill="#6772E5"/>
                </svg>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-[#6b6b74]">
                <a href={`/${slug}/legal/refunds`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] underline underline-offset-2 hover:text-[#111114] transition-colors">{t.ckRefunds}</a>
                <span aria-hidden="true">·</span>
                <a href={`/${slug}/legal/privacy`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] underline underline-offset-2 hover:text-[#111114] transition-colors">{t.privacyLabel}</a>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Mientras navega al seguimiento: la misma superficie, sin pantalla intermedia.
  if (step === 'confirmation' && orderNumber && orderId && orderId !== 'demo-order-id' && !awaitingPayment) {
    return <div className="h-[100dvh] bg-[#f2f2f6]" aria-busy="true" />;
  }
  if (step === 'confirmation') {
    return (
      <div className="h-[100dvh] bg-white flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900">{restaurant.name}</span>
          <button onClick={goBack} className="text-sm text-[#047a65] font-medium">{t.backToMenu}</button>
        </header>
        <motion.div
          ref={confirmRef}
          className="flex-1 flex flex-col items-center justify-start px-6 pt-8 pb-10 relative overflow-y-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="w-20 h-20 rounded-full bg-[#e6faf7] flex items-center justify-center mb-6">
            {awaitingPayment
              ? <Lock className="w-9 h-9 text-[#047a65]" />
              : <CheckCircle className="w-10 h-10 text-[#047a65]" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{awaitingPayment ? t.completePaymentTitle : t.orderSent}</h2>
          <p className="text-sm text-gray-500 mb-3">{awaitingPayment ? t.completePaymentDesc : t.orderSentDesc}</p>
          <p className="text-4xl font-bold text-gray-900 mb-5 tabular-nums">#{orderNumber}</p>

          {/* Order summary — reassures user of what they ordered */}
          {confirmedItems.length > 0 && (
            <div className="w-full max-w-sm mb-5 bg-gray-50 rounded-2xl p-4 space-y-2 text-left">
              {confirmedItems.map((item, i) => (
                <div key={i} className="flex justify-between items-baseline gap-3">
                  <span className="text-sm text-gray-700 leading-snug">
                    <span className="font-semibold text-gray-900">{item.qty}×</span>{' '}
                    {item.name}{item.variant ? <span className="text-[#6b6b74]"> ({item.variant})</span> : ''}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">{fmtPrice(item.lineTotal)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-900">{awaitingPayment ? t.totalToPay : t.totalCharged}</span>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">{fmtPrice(confirmedTotal)}</span>
              </div>
            </div>
          )}

          {/* Auto-redirect hint — shown for non-online, non-demo orders */}
          {orderId && orderId !== 'demo-order-id' && !awaitingPayment && (
            <p className="text-[13px] text-[#6b6b74] mb-2 animate-pulse">
              {t.redirectingToTracking}
            </p>
          )}

          {/* Estimated time badge — shown for delivery and pickup */}
          {!!confirmedEta && (orderType === 'delivery' || orderType === 'pickup') && (
            <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
              </svg>
              <p className="text-sm text-amber-700 font-medium">
                {orderType === 'delivery'
                  ? t.estimatedDelivery
                  : t.readyInApprox}
                {' '}~{confirmedEta} min
              </p>
            </div>
          )}

          <div className="w-full space-y-3 max-w-sm">
            {orderError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center">
                {orderError}
              </div>
            )}
            {awaitingPayment && orderId && !restaurant.id.startsWith('demo') && (
              <button
                onClick={handlePayOnline}
                disabled={payLoading}
                className={cn(
                  'w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2',
                  isColombianRestaurant
                    ? 'bg-[#FDDA24] text-[#002C76] hover:bg-[#f5d01e]'
                    : 'bg-[#05c8a7] text-[#04241E] hover:bg-[#04b096]'
                )}
              >
                {payLoading ? (
                  t.redirecting
                ) : isColombianRestaurant ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="40" rx="8" fill="#002C76"/>
                      <path d="M8 20C8 13.373 13.373 8 20 8s12 5.373 12 12-5.373 12-12 12S8 26.627 8 20z" fill="#FDDA24"/>
                      <path d="M16 17h8v6h-8z" fill="#002C76"/>
                    </svg>
                    {t.payWithWompi}
                  </>
                ) : t.payNow}
              </button>
            )}

            {/* MercadoPago button — LatAm currencies only; COP goes through Wompi */}
            {awaitingPayment && orderId && !restaurant.id.startsWith('demo') && restaurant.mp_enabled && isMpSupportedCurrency && !isColombianRestaurant && (
              <button
                onClick={handlePayMercadoPago}
                disabled={payLoading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2 bg-[#009EE3] hover:bg-[#008ccc] text-white"
              >
                {payLoading ? (
                  t.redirecting
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="40" rx="8" fill="#009EE3"/>
                      <text x="7" y="27" fontSize="18" fontWeight="bold" fill="white">MP</text>
                    </svg>
                    {t.payWithMercadoPago}
                  </>
                )}
              </button>
            )}
            {!restaurant.id.startsWith('demo') && orderNumber && (
              <a
                href={`/${slug}/orden/${orderNumber}${trackingToken ? `?t=${encodeURIComponent(trackingToken)}` : ''}`}
                onClick={(e) => {
                  if (trackRedirectTimer.current) {
                    clearTimeout(trackRedirectTimer.current);
                    trackRedirectTimer.current = null;
                  }
                  // Same reason as the auto-redirect: replace the emptied
                  // checkout entry. Stays a hard navigation (the fallback for
                  // flaky connections), just without adding a history entry.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  window.location.replace(e.currentTarget.href);
                }}
                className={cn(
                  'relative w-full py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 touch-manipulation no-underline',
                  paymentMethod === 'cash'
                    ? 'bg-[#05c8a7] text-[#04241E] hover:bg-[#04b096] active:bg-[#04b096]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-200'
                )}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t.trackOrderLive}
              </a>
            )}
            {paymentMethod !== 'cash' && (
              <button onClick={goBack} className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
                {t.backToMenu}
              </button>
            )}
            {paymentMethod === 'cash' && (
              <button onClick={goBack} className="w-full py-2 text-[15px] text-[#4f4f57] hover:text-[#111114] transition-colors">
                {t.backToMenu}
              </button>
            )}
            {!restaurant.id.startsWith('demo') && (
              <button
                onClick={() => {
                  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
                  const msg = encodeURIComponent(
                    t.hungerModeMsg
                      .replace('{name}', restaurant.name)
                      .replace('{url}', `${appUrl}/${restaurant.slug}`)
                  );
                  window.location.href = `whatsapp://send?text=${msg}`;
                  setTimeout(() => {
                    window.open(`https://wa.me/?text=${msg}`, '_blank');
                  }, 1500);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-[#05c8a7] hover:text-[#047a65] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {t.shareWithFriends}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Checkout premium (SPEC §4): total como ancla + filas agrupadas + un botón ──
  const emailOk = !customerEmail.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const contactReady = customerName.trim().length >= 2 && phoneOk && emailOk;
  const addressReady = orderType !== 'delivery' || (deliveryAddress.trim().length > 0 && !addressNeedsPick());
  const itemCount = items.reduce((s, i) => s + i.qty, 0);
  const optLabel = t.optional.charAt(0).toUpperCase() + t.optional.slice(1);
  // D1: Mesa solo llega por QR (tableName). Sin QR no se ofrece, salvo que sea lo único que hay.
  const segOrderTypes: OrderType[] = tableName
    ? []
    : (() => { const v = enabledOrderTypes.filter((o) => o !== 'dine_in'); return v.length ? v : enabledOrderTypes; })();
  const hasOnline = enabledPaymentMethods.includes('online');
  const hasCash = enabledPaymentMethods.includes('cash');
  const eta = estimateMinutes({ items, orderType, restaurant, to: deliveryCoords });
  const scheduleOn = scheduleEnabled && !!scheduledFor;
  // A9: el mismo chequeo de horario que hace /api/orders, para avisar ANTES de
  // que el cliente apriete el botón (antes se enteraba con un error rojo al final).
  // Los demos (La Casa del Sabor, The Grill House) tienen horario cargado, pero
  // sus pedidos son simulados: un prospecto que prueba de noche no debe chocar
  // con "cerrado" ni con la pausa.
  const isDemoRestaurant = restaurant.id.startsWith('demo');
  const opHours = restaurant.operating_hours as OperatingHours | undefined;
  const hasHours = !isDemoRestaurant && !!opHours && Object.keys(opHours).length > 0;
  const restTz = restaurant.timezone || 'UTC';
  const pausedNow = !isDemoRestaurant && !!restaurant.orders_paused_until && new Date(restaurant.orders_paused_until) > new Date();
  const closedNow = hasHours && !isOpenAt(opHours as OperatingHours, inTimeZone(new Date(), restTz));
  const scheduledClosed = hasHours && scheduleOn && !Number.isNaN(new Date(scheduledFor).getTime())
    && !isOpenAt(opHours as OperatingHours, inTimeZone(new Date(scheduledFor), restTz));
  // Hora pasada o a menos de 5 min: el servidor la rechaza (SCHEDULE_TOO_SOON).
  // Antes la tomaba como "lo antes posible" y la cocina lo hacía en el acto
  // aunque la pantalla dijera "mañana 8:00" (iOS no respeta el min del input).
  const scheduledTooSoon = scheduleOn && !(new Date(scheduledFor).getTime() > Date.now() + 5 * 60_000);
  const needsSchedule = closedNow && !scheduleOn && orderType !== 'dine_in';
  const openScheduler = () => { setScheduleEnabled(true); setActiveSheet('when'); };
  const runErrorAction = () => {
    const action = orderErrorAction;
    setOrderError('');
    setOrderErrorAction(null);
    if (action === 'address') setActiveSheet('address');
    else if (action === 'contact') setActiveSheet('contact');
    else if (action === 'schedule') openScheduler();
    else if (action === 'when') setActiveSheet('when');
    else if (action === 'menu') goBack();
    else if (action === 'items') {
      setDetailsOpen(true);
      setTimeout(() => document.getElementById('ck-items')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
    }
  };
  const errorActionLabel =
    orderErrorAction === 'address' ? t.ckFixAddress
    : orderErrorAction === 'contact' ? t.ckFixContact
    : orderErrorAction === 'schedule' ? t.ckScheduleCta
    : orderErrorAction === 'when' ? t.ckChangeTime
    : orderErrorAction === 'items' ? t.ckReviewItems
    : orderErrorAction === 'menu' ? t.ckEditInMenu
    : null;
  const whenValue = scheduleOn
    ? new Date(scheduledFor).toLocaleString(locale === 'en' ? 'en-US' : 'es', { weekday: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : t.ckAsap;
  const etaText = eta ? (orderType === 'delivery' ? t.ckArrivesIn : t.ckReadyIn).replace('{n}', String(eta)) : undefined;
  const ctaBusy = submitting || networkRetrying || redirectingToPay;
  const orderTypeLabel = (v: OrderType) => (v === 'pickup' ? t.pickup : v === 'delivery' ? t.delivery : t.dineIn);
  const changeOrderType = (type: OrderType) => {
    if (type === orderType) return;
    trackEvent('fulfillment_mode_changed', { restaurant_id: restaurant.id, from: orderType, to: type });
    setOrderType(type);
  };

  // El botón principal dice lo que falta y lleva ahí (nextStep).
  const next: { label: string; run: () => void; disabled?: boolean } =
    items.length === 0 ? { label: t.confirmOrder, run: () => {}, disabled: true }
    : pausedNow ? { label: t.ckPausedCta, run: () => {}, disabled: true }
    : closedNow && orderType === 'dine_in' ? { label: t.ckClosedNow, run: () => {}, disabled: true }
    : needsSchedule ? { label: t.ckScheduleCta, run: openScheduler }
    : scheduledTooSoon || scheduledClosed ? { label: t.ckChangeTime, run: () => setActiveSheet('when') }
    : belowDeliveryMin ? { label: t.ckAddItems.replace('{x}', fmtPrice(Math.max(0, deliveryMinOrder - cartTotal))), run: goBack }
    : dineInOnlyBlocked ? { label: t.confirmOrder, run: handleSubmitOrder }
    : !addressReady ? { label: t.ckAddAddress, run: () => setActiveSheet('address') }
    : !contactReady ? { label: phoneNeeded ? t.ckAddContact : t.ckAddName, run: () => setActiveSheet('contact') }
    : {
        label: paymentMethod === 'online' ? `${t.payLabel} ${fmtPrice(displayTotal)}` : `${t.confirmOrder} · ${fmtPrice(displayTotal)}`,
        run: handleSubmitOrder,
      };

  const miniBreakdown = [
    `${t.subtotal} ${fmtPrice(shownSubtotal)}`,
    shownDeliveryFee > 0 ? `${t.deliveryLabel} ${fmtPrice(shownDeliveryFee)}` : null,
    shownTax > 0 && !taxIncluded ? `${taxLabel} ${fmtPrice(shownTax)}` : null,
    tipAmount > 0 ? `${t.tipLabel} ${fmtPrice(tipAmount)}` : null,
  ].filter(Boolean).join(' · ');

  const thumbs = items.filter((i) => i.product.image_url && !showsAsRow(i.product)).slice(0, 3);

  // Con una hoja abierta, lo de atrás queda inerte: las flechas del teclado de
  // iOS (anterior/siguiente) saltaban a la propina detrás del velo.
  // React 18 no tipa `inert`; como atributo string llega igual al DOM.
  const behindSheet = (activeSheet ? { inert: '' } : {}) as Record<string, string>;
  const fieldLabelCls = 'absolute left-3.5 top-2 text-xs text-[#6b6b74] pointer-events-none';
  const fieldInputCls = 'w-full bg-transparent border-0 text-[#111114] text-[17px] leading-tight pt-[23px] pb-2 px-3.5 outline-none placeholder:text-[#9a9aa2]';

  const itemsList = items.map((item, idx) => {
    // "Cheeseburger" + Deluxe → "Cheeseburger Deluxe", como en el carrito y el ticket.
    const { name: itemName, lines: modLines } = withTitle(item.product.name, cartModLines(item.modifierSelections));
    const confirmingRemove = confirmRemoveIdx === idx;
    const thumb = cartItemImage(item);
    return (
      <div key={`${item.product.id}-${item.variant?.id ?? 'base'}-${idx}`} className="grid grid-cols-[52px_1fr_auto] min-[860px]:grid-cols-[64px_1fr_auto] gap-3 items-start">
        {thumb ? (
          <div className="relative w-[52px] h-[52px] min-[860px]:w-16 min-[860px]:h-16 rounded-xl min-[860px]:rounded-[14px] overflow-hidden bg-[#e9e9ee]">
            <Image
              src={thumb.src}
              alt=""
              fill
              sizes="64px"
              unoptimized={thumb.option}
              loader={!thumb.option && thumb.src.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
              className="object-cover opacity-0 transition-opacity duration-300"
              onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')}
            />
          </div>
        ) : (
          // Sin foto: el mismo cuadrito con ícono que el carrito (antes, un cuadro gris vacío).
          <ProductGlyph
            name={item.product.name}
            className="w-[52px] h-[52px] min-[860px]:w-16 min-[860px]:h-16 rounded-xl min-[860px]:rounded-[14px]"
          />
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#111114] leading-snug">
            {itemName}{item.variant ? ` (${item.variant.name})` : ''}
          </p>
          {modLines.length > 0 && (
            /* Sin truncate: las exclusiones ("No Onion") son lo que el cliente más necesita confirmar. */
            <div className="mt-0.5 space-y-0.5">
              {modLines.map((line, k) => (
                // Sin el recargo de cada opción (Pedro 2026-11-22): el precio del plato a la
                // derecha ya lo incluye, y el "+$1.70" quedaba flotando en el medio de la fila.
                <p key={k} className={cn('text-[13px] text-[#4f4f57] leading-snug break-words', line.indent && 'pl-3')}>
                  {line.indent && <span className="text-[#9a9aa2]">↳ </span>}{line.text}
                </p>
              ))}
            </div>
          )}
          <div className={cn('inline-flex items-center mt-1.5 bg-white rounded-full', ckShadow)}>
            <button
              type="button"
              onClick={() => {
                if (item.qty > 1) { updateQty(idx, item.qty - 1); return; }
                if (confirmingRemove) {
                  if (confirmRemoveTimer.current) clearTimeout(confirmRemoveTimer.current);
                  setConfirmRemoveIdx(null);
                  removeItem(idx);
                } else {
                  setConfirmRemoveIdx(idx);
                  confirmRemoveTimer.current = setTimeout(() => setConfirmRemoveIdx(null), 2500);
                }
              }}
              aria-label={confirmingRemove ? t.removeItem : t.decreaseQuantity}
              className={cn(
                'h-9 min-w-[44px] rounded-full text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]',
                confirmingRemove ? 'px-3 text-[13.5px] font-semibold text-[#c4321b]' : 'text-[#4f4f57]',
              )}
            >
              {confirmingRemove ? t.removeItem : '−'}
            </button>
            <span className="min-w-[18px] text-center text-sm font-semibold tabular-nums" aria-live="polite">{item.qty}</span>
            <button
              type="button"
              onClick={() => updateQty(idx, item.qty + 1)}
              aria-label={t.increaseQuantity}
              className="h-9 min-w-[44px] rounded-full text-lg text-[#4f4f57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
            >
              +
            </button>
          </div>
        </div>
        <span className="text-[15px] font-medium tabular-nums text-[#111114]">{fmtPrice(item.lineTotal)}</span>
      </div>
    );
  });

  const breakdown = (
    <div className="grid gap-2 px-1 pt-1.5 text-sm text-[#4f4f57] tabular-nums">
      <div className="flex justify-between"><span>{t.subtotal}</span><span>{fmtPrice(shownSubtotal)}</span></div>
      {shownPromo > 0 && (
        <div className="flex justify-between text-[#047a65]"><span>{t.discount}</span><span>-{fmtPrice(shownPromo)}</span></div>
      )}
      {shownLoyalty > 0 && (
        <div className="flex justify-between text-[#047a65]"><span>{t.pointsLabel}</span><span>-{fmtPrice(shownLoyalty)}</span></div>
      )}
      {orderType === 'delivery' && (
        shownDeliveryFee > 0
          ? <div className="flex justify-between"><span>{t.deliveryLabel}</span><span>{fmtPrice(shownDeliveryFee)}</span></div>
          : <div className="flex justify-between text-[#047a65]"><span>{t.deliveryLabel}</span><span>{t.freeLabel}</span></div>
      )}
      {shownTax > 0 && (
        <div className="flex justify-between">
          <span>{taxLabel} {taxIncluded ? `(${t.includedLabel})` : `(${taxRate}%)`}</span>
          <span>{fmtPrice(shownTax)}</span>
        </div>
      )}
      {tipAmount > 0 && (
        <div className="flex justify-between"><span>{t.tipLabel}</span><span>{fmtPrice(tipAmount)}</span></div>
      )}
      <div className="flex justify-between items-center pt-2.5 mt-0.5 border-t border-black/[0.09] text-lg font-semibold text-[#111114]">
        <span className="flex items-center gap-2">
          {t.total}
          {quoteLoading && <span className="w-3 h-3 rounded-full border-2 border-[#d4d4da] border-t-[#4f4f57] animate-spin" aria-hidden="true" />}
        </span>
        <span>{fmtPrice(displayTotal)}</span>
      </div>
    </div>
  );

  // Las políticas se abren en otra pestaña (el checkout no pierde lo escrito);
  // ?from=checkout hace que su botón diga "Back to checkout" y cierre esa pestaña.
  const legalLinkCls = 'inline-flex items-center min-h-[44px] whitespace-nowrap text-[#4f4f57] font-medium underline underline-offset-2';
  const legal = (
    <div className="text-[12.5px] leading-relaxed text-[#6b6b74] px-1">
      <p className="m-0">{t.ckLegal.replace('{name}', restaurant.name)}</p>
      <div className="flex flex-wrap gap-x-5 -mb-2">
        <a href={`/${slug}/legal/refunds?from=checkout`} target="_blank" rel="noopener noreferrer" className={legalLinkCls}>{t.ckRefunds}</a>
        <a href={`/${slug}/legal/privacy?from=checkout`} target="_blank" rel="noopener noreferrer" className={legalLinkCls}>{t.ckPrivacy}</a>
        {restaurant.phone && (
          <a href={`tel:${restaurant.phone.replace(/[^\d+]/g, '')}`} className={legalLinkCls}>{t.ckCall}</a>
        )}
      </div>
    </div>
  );

  const tipBlock = tipAllowed && (
    <div className="pb-1">
      <p id="tip-title" className="px-1 text-[15px] font-semibold text-[#111114]">
        {orderType === 'delivery' ? t.tipTitleDriver : t.tipTitleTeam}{' '}
        <span className="text-[#6b6b74] font-normal text-[13px]">({t.optional})</span>
      </p>
      <p className="px-1 text-[13px] text-[#4f4f57] mt-px">
        {(orderType === 'delivery' ? t.tipHintDriver : t.tipHintTeam).replace('{name}', restaurant.name)}
      </p>
      <div role="radiogroup" aria-labelledby="tip-title" className="grid grid-cols-5 gap-1.5 mt-2.5">
        {[
          { key: 'none', label: t.tipNone, sub: null as string | null, active: tipChoice === null, onSelect: () => setTipChoice(null) },
          ...tipPresets.map((o, index) => ({
            key: `p${index}`,
            label: fmtPrice(o.amount).replace(/[.,]00(?=\D*$)/, ''),
            sub: o.pct > 0 ? `${o.pct}%` : null,
            active: tipChoice?.kind === 'preset' && tipChoice.index === index,
            onSelect: () => setTipChoice({ kind: 'preset', index }),
          })),
          {
            key: 'other',
            label: t.tipOther,
            sub: null,
            active: tipChoice?.kind === 'custom',
            onSelect: () => { if (tipChoice?.kind !== 'custom') setTipChoice({ kind: 'custom', value: '', mode: '$' }); },
          },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={opt.active}
            onClick={opt.onSelect}
            className={cn(
              'grid content-center gap-px min-h-[52px] px-0.5 rounded-xl transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] focus-visible:ring-offset-1',
              opt.active ? 'bg-[#e2f7f3] shadow-[inset_0_0_0_1.5px_#05c8a7]' : 'bg-[#f5f5f8]',
            )}
          >
            <span className="text-[15px] font-semibold tabular-nums leading-tight text-[#111114]">{opt.label}</span>
            {opt.sub && <span className={cn('text-[12.5px] tabular-nums leading-tight', opt.active ? 'text-[#047a65]' : 'text-[#6b6b74]')}>{opt.sub}</span>}
          </button>
        ))}
      </div>
      {tipChoice?.kind === 'custom' && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex rounded-xl bg-[#f0f0f4] p-[3px] shrink-0" role="group" aria-label={t.tipCustomLabel}>
            {(['$', '%'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={tipChoice.mode === m}
                onClick={() => setTipChoice({ ...tipChoice, mode: m })}
                className={cn(
                  'w-10 h-10 rounded-[9px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]',
                  tipChoice.mode === m ? 'bg-white text-[#111114] shadow-[0_1px_3px_rgba(0,0,0,.12)]' : 'text-[#4f4f57]',
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            aria-label={t.tipCustomLabel}
            placeholder={tipChoice.mode === '$' ? '0.00' : '18'}
            value={tipChoice.value}
            onChange={(e) => setTipChoice({ ...tipChoice, value: e.target.value.replace(/[^0-9.,]/g, '').slice(0, 6) })}
            className="flex-1 min-w-0 h-[46px] rounded-xl bg-[#f5f5f8] px-3.5 text-base tabular-nums text-[#111114] outline-none focus:shadow-[inset_0_0_0_1.5px_#05c8a7]"
          />
          {tipChoice.mode === '%' && tipAmount > 0 && (
            <span className="text-sm font-semibold text-[#111114] tabular-nums shrink-0">= {fmtPrice(tipAmount)}</span>
          )}
        </div>
      )}
    </div>
  );

  const ctaBlock = (
    <div className="space-y-2.5">
      <AnimatePresence>
        {networkRetrying && (
          <motion.div
            key="retrying"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#fff6e0] text-[#7a4d00] text-[13.5px] font-medium leading-snug"
          >
            <CkSpinner />
            <span>{t.retryingBanner}</span>
          </motion.div>
        )}
        {orderError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-[#fdecea] text-[#c4321b] text-[13.5px] font-medium leading-snug"
          >
            <span className="flex-1">{orderError}</span>
            {errorActionLabel && (
              <button type="button" onClick={runErrorAction} className="shrink-0 font-semibold underline underline-offset-2">
                {errorActionLabel}
              </button>
            )}
            {canManualRetry && (
              <button
                type="button"
                onClick={() => { retryAttemptRef.current = 0; handleSubmitOrder(); }}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                {t.retryLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Apple Pay / Google Pay / Link — arriba del botón principal. Solo mercados
          Stripe (sin Colombia/Wompi). Un toque: Face ID → crea el pedido → cobra. */}
      {paymentMethod === 'online' && stripeConnectReady && !isColombianRestaurant && isFormReady && (
        <div className="space-y-2">
          <WalletButton
            amount={displayTotal}
            currency={restaurant.currency}
            country={restaurant.country_code || 'US'}
            label={restaurant.name}
            onCreateOrder={createOrderForWallet}
            onSuccess={(oid, onum) => { setWalletPaying(false); handleWalletSuccess(oid, onum); }}
            onError={(msg) => { setWalletPaying(false); setOrderErrorAction(null); setOrderError(msg); }}
            onPayingChange={setWalletPaying}
            disabled={submitting || items.length === 0}
          />
          <div className="flex items-center gap-3 py-0.5" aria-hidden="true">
            <div className="flex-1 h-px bg-black/[0.09]" />
            <span className="text-[12.5px] text-[#6b6b74] font-medium uppercase tracking-wide">{locale === 'en' ? 'or' : 'o'}</span>
            <div className="flex-1 h-px bg-black/[0.09]" />
          </div>
        </div>
      )}
      <motion.button
        type="button"
        onClick={next.run}
        disabled={next.disabled || ctaBusy || walletPaying}
        aria-label={next.label === t.confirmOrder ? t.placeOrderAriaLabel : undefined}
        aria-busy={ctaBusy}
        animate={ctaShake ? { x: [0, -8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className={ckCtaClass(next.disabled || walletPaying || ctaBusy)}
      >
        {ctaBusy ? (
          <>
            <CkSpinner />
            {networkRetrying ? t.retryingLabel : redirectingToPay ? t.redirecting : t.sending}
          </>
        ) : (
          <span className="tabular-nums">{next.label}</span>
        )}
      </motion.button>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-[#f2f2f6] flex flex-col text-[#111114] antialiased">
      {/* Honeypot — invisible para personas, los bots lo llenan */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        <label>Website</label>
        <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
      </div>

      <header {...behindSheet} className="shrink-0 z-10 w-full max-w-lg mx-auto grid grid-cols-[44px_1fr_44px] items-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 min-[860px]:grid-cols-[auto_1fr_auto] min-[860px]:max-w-[1140px] min-[860px]:px-10 min-[860px]:pt-5 min-[860px]:pb-3">
        <button
          type="button"
          onClick={goBack}
          aria-label={t.backToMenu}
          className={cn('relative w-9 h-9 rounded-full bg-white grid place-items-center text-[#111114] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] after:absolute after:-inset-1 after:content-[""]', ckShadow)}
        >
          <ChevronLeft className="w-[18px] h-[18px]" aria-hidden="true" />
        </button>
        <p className="text-center min-[860px]:text-left min-[860px]:pl-3 text-[15px] min-[860px]:text-base font-semibold tracking-[-0.01em] truncate">{restaurant.name}</p>
        <span />
      </header>

      {/* Scroll en un contenedor (no en el root): iOS respeta overscroll-behavior. */}
      <div {...behindSheet} className={cn('flex-1 overflow-y-auto overscroll-contain', activeSheet && 'overflow-hidden')}>
        <div className="max-w-lg mx-auto min-[860px]:max-w-[1060px] min-[860px]:flex min-[860px]:items-start min-[860px]:gap-14 min-[860px]:px-10">

          {/* Resumen: el total manda */}
          <section className="px-5 pt-1 pb-1 min-[860px]:flex-1 min-[860px]:px-0 min-[860px]:pt-2 min-[860px]:pb-10">
            <p className="text-sm text-[#4f4f57] mt-1.5 mb-0.5">{t.ckYourOrder}</p>
            <p aria-live="polite" className={cn('m-0 text-[46px] min-[860px]:text-[56px] leading-[1.05] font-semibold tracking-[-0.035em] tabular-nums transition-opacity', quoteLoading && 'opacity-60')}>
              {fmtPrice(displayTotal)}
            </p>
            <p className="min-[860px]:hidden mt-1.5 text-[13px] text-[#4f4f57] tabular-nums">{miniBreakdown}</p>
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              aria-expanded={detailsOpen}
              aria-controls="ck-items"
              className="min-[860px]:hidden mt-2 inline-flex items-center gap-2 py-1.5 text-[15px] font-medium text-[#047a65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] rounded-lg"
            >
              {thumbs.length > 0 && (
                <span className="inline-flex" aria-hidden="true">
                  {thumbs.map((i, k) => (
                    <span key={i.uid ?? k} className={cn('relative w-[26px] h-[26px] rounded-full overflow-hidden border-2 border-[#f2f2f6] bg-[#e9e9ee]', k > 0 && '-ml-2')}>
                      <Image
                        src={i.product.image_url as string}
                        alt=""
                        fill
                        sizes="26px"
                        loader={(i.product.image_url as string).includes('.supabase.co/storage/') ? supabaseLoader : undefined}
                        className="object-cover"
                      />
                    </span>
                  ))}
                </span>
              )}
              <span>{itemCount} {itemCount === 1 ? t.itemSingular : t.items} · {detailsOpen ? t.ckHideDetails : t.ckViewDetails}</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', detailsOpen && 'rotate-180')} aria-hidden="true" />
            </button>
            <div id="ck-items" className={cn(detailsOpen ? 'grid' : 'hidden', 'min-[860px]:grid gap-3.5 pt-3 pb-1.5 min-[860px]:pt-6 min-[860px]:gap-[18px]')}>
              {itemsList}
            </div>
            <div className="hidden min-[860px]:block pt-5">{breakdown}</div>
            <div className="hidden min-[860px]:block pt-7">{legal}</div>
          </section>

          {/* Acciones — sticky en escritorio: con un pedido largo la lista de la
              izquierda scrollea y el pago + "Confirm order" quedan a la vista.
              Antes el sticky estaba en el resumen (más alto que la pantalla →
              no hacía nada) y esta columna se iba con el scroll. */}
          <section
            ref={setActionsEl}
            style={{ top: actionsTop }}
            className="px-4 pt-2.5 pb-5 flex flex-col gap-3.5 min-[860px]:w-[450px] min-[860px]:shrink-0 min-[860px]:px-0 min-[860px]:pt-2 min-[860px]:gap-3 min-[860px]:sticky"
          >

            {/* Cómo y cuándo */}
            <CkGroup>
              {segOrderTypes.length > 1 && (
                <CkSegmented
                  ariaLabel={t.orderType}
                  options={segOrderTypes.map((v) => ({ value: v, label: orderTypeLabel(v) }))}
                  value={orderType}
                  onChange={changeOrderType}
                />
              )}
              {orderType === 'dine_in' && tableName && (
                <CkRow icon={<Armchair />} value={t.ckTable.replace('{name}', tableName)} sub={t.ckTableSub} />
              )}
              {orderType === 'dine_in' && !tableName && (
                <CkRow
                  icon={<Armchair />}
                  label={t.ckTableTitle}
                  value={manualTableName.trim() || optLabel}
                  muted={!manualTableName.trim()}
                  sub={arrivalTime ? `${t.arrivesLabel}: ${arrivalTime}` : undefined}
                  onClick={() => setActiveSheet('table')}
                />
              )}
              {pausedNow && (
                <div className="m-3 px-3 py-2.5 rounded-xl bg-[#fff6e0] text-[#7a4d00] text-[13.5px] leading-snug" role="status">
                  {t.ckPaused.replace('{name}', restaurant.name)}
                </div>
              )}
              {!pausedNow && closedNow && !scheduleOn && (
                <div className="m-3 px-3 py-2.5 rounded-xl bg-[#fff6e0] text-[#7a4d00] text-[13.5px] leading-snug" role="status">
                  {t.ckClosedBanner.replace('{name}', restaurant.name)}
                </div>
              )}
              {dineInOnlyBlocked && (
                <div className="m-3 px-3 py-2.5 rounded-xl bg-[#fff6e0] text-[#7a4d00] text-[13.5px] leading-snug" role="alert">
                  <p className="font-medium">{t.validationDineInOnlyItems}</p>
                  <ul className="mt-1.5 space-y-1">
                    {dineInOnlyItems.map((item) => (
                      <li key={item.uid} className="flex items-center justify-between gap-2">
                        <span className="truncate">{item.qty}× {item.product.name}</span>
                        <button type="button" onClick={() => removeItem(items.indexOf(item))} className="shrink-0 font-semibold underline underline-offset-2">
                          {t.removeItem}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {belowDeliveryMin && (
                <div className="m-3 px-3 py-2.5 rounded-xl bg-[#fff6e0] text-[#7a4d00] text-[13.5px] leading-snug">
                  {t.deliveryMinimum}: <strong>{fmtPrice(deliveryMinOrder)}</strong>
                  {' — '}{t.deliveryMinimumMissing} {fmtPrice(Math.max(0, deliveryMinOrder - cartTotal))}
                </div>
              )}
              {orderType === 'delivery' && (
                <CkRow
                  icon={<MapPin />}
                  label={t.ckDeliverTo}
                  value={fullDeliveryAddress || t.ckAddAddress}
                  need={!deliveryAddress.trim()}
                  sub={addressNeedsPick() ? <span className="text-[#7a4d00]">{t.deliveryPickFromList}</span> : undefined}
                  onClick={() => setActiveSheet('address')}
                />
              )}
              {orderType === 'pickup' && restaurant.address && (
                <CkRow
                  icon={<MapPin />}
                  label={t.ckPickupAt}
                  value={restaurant.address}
                  sub={
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        restaurant.latitude != null && restaurant.longitude != null
                          ? `${restaurant.latitude},${restaurant.longitude}`
                          : `${restaurant.name}, ${restaurant.address}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center min-h-[32px] font-medium text-[#047a65] underline underline-offset-2"
                    >
                      {t.getDirections}
                    </a>
                  }
                />
              )}
              {orderType !== 'dine_in' && (
                <CkRow
                  icon={<Clock />}
                  label={t.ckWhen}
                  value={whenValue}
                  sub={
                    scheduledTooSoon ? <span className="text-[#7a4d00]">{t.ckTimeTooSoon}</span>
                    : scheduledClosed ? <span className="text-[#7a4d00]">{t.ckClosedAtTime}</span>
                    : closedNow && !scheduleOn ? <span className="text-[#7a4d00]">{t.ckClosedNow}</span>
                    : !scheduleOn ? etaText
                    : undefined
                  }
                  onClick={() => setActiveSheet('when')}
                />
              )}
            </CkGroup>

            {/* Pago */}
            <CkGroup>
              {hasOnline && hasCash && (
                <CkSegmented
                  ariaLabel={t.paymentMethod}
                  options={[{ value: 'online' as PaymentMethod, label: t.ckPayNow }, { value: 'cash' as PaymentMethod, label: t.ckPayCash }]}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                />
              )}
              {paymentMethod === 'online' ? (
                <div className={cn('px-3 pb-3.5', !(hasOnline && hasCash) && 'pt-3.5')}>
                  {tipBlock}
                  <p className={cn('mx-1 flex items-start gap-1.5 text-[12.5px] leading-snug text-[#6b6b74]', tipAllowed && 'mt-3')}>
                    <Lock className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
                    {t.ckOnlineHint}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 grid grid-cols-[32px_1fr] gap-3 items-start">
                  <CkIcon><Banknote /></CkIcon>
                  <div>
                    <b className="block text-base font-semibold">
                      {orderType === 'delivery' ? t.ckCashDelivery : orderType === 'dine_in' ? t.ckCashDineIn : t.ckCashPickup}
                    </b>
                    {/* The tip line only for delivery, worded as an invitation (Pedro,
                        2026-11-17): at the counter or the table there's nobody to
                        hand it to through the app, and "tip in person" read as a request. */}
                    {(!hasOnline || orderType === 'delivery') && (
                      <span className="block text-[13.5px] text-[#4f4f57] mt-0.5">
                        {[!hasOnline && t.ckCashOnly, orderType === 'delivery' && t.ckCashTip].filter(Boolean).join(' ')}
                      </span>
                    )}
                    {orderType === 'delivery' && (
                      <>
                        <span className="block text-[13.5px] text-[#4f4f57] mt-2.5">{t.ckChangeQuestion}</span>
                        <div className="flex flex-wrap gap-2 mt-2.5" role="radiogroup" aria-label={t.ckChangeQuestion}>
                          {([
                            { v: 'exact' as const, label: t.ckExact },
                            ...[10, 20, 40, 50, 100].filter((n) => n > displayTotal).slice(0, 3).map((n) => ({ v: n, label: fmtPrice(n).replace(/[.,]00(?=\D*$)/, '') })),
                          ]).map((c) => (
                            <button
                              key={String(c.v)}
                              type="button"
                              role="radio"
                              aria-checked={cashChange === c.v}
                              onClick={() => setCashChange(cashChange === c.v ? null : c.v)}
                              className={cn(
                                'px-3.5 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]',
                                cashChange === c.v ? 'bg-[#111114] text-white' : 'bg-[#f5f5f8] text-[#111114]',
                              )}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CkGroup>

            {/* Contacto */}
            <CkGroup>
              <CkRow
                icon={<User />}
                label={t.ckContact}
                value={contactReady ? [customerName.trim(), phoneForOrder && phoneDisplay(phoneForOrder)].filter(Boolean).join(' · ') : phoneNeeded ? t.ckAddContact : t.ckAddName}
                need={!contactReady}
                sub={contactReady && customerEmail.trim() ? customerEmail.trim() : undefined}
                onClick={() => setActiveSheet('contact')}
              />
            </CkGroup>

            {/* Opcionales */}
            <CkGroup>
              <CkRow
                icon={<StickyNote />}
                label={t.ckNote}
                value={orderNotes.trim() || optLabel}
                muted={!orderNotes.trim()}
                onClick={() => setActiveSheet('note')}
              />
              <CkRow
                icon={<Tag />}
                label={t.promoCode}
                value={promoResult?.valid ? t.ckPromoApplied.replace('{x}', fmtPrice(promoResult.discount)) : optLabel}
                muted={!promoResult?.valid}
                onClick={() => setActiveSheet('promo')}
              />
              {loyaltyBalance?.config && loyaltyBalance.points >= loyaltyBalance.config.min_redeem_points && (
                <CkRow
                  icon={<Star />}
                  label={t.ckLoyalty}
                  value={t.youHavePoints.replace('{n}', String(loyaltyBalance.points))}
                  sub={`= ${fmtPrice(Math.floor(loyaltyBalance.points * loyaltyBalance.config.peso_per_point * 100) / 100)} ${t.ofDiscount}`}
                  checked={loyaltyApplied}
                  onClick={() => setLoyaltyApplied((v) => !v)}
                  trailing={<CkCheckMark checked={loyaltyApplied} />}
                />
              )}
              {orderType !== 'dine_in' && (
                <CkRow
                  icon={<UtensilsCrossed />}
                  value={<span className="text-[15.5px]">{t.ckUtensilsTitle}</span>}
                  sub={t.ckUtensilsSub}
                  checked={includeUtensils}
                  onClick={() => setIncludeUtensils((v) => !v)}
                  trailing={<CkCheckMark checked={includeUtensils} />}
                />
              )}
            </CkGroup>

            <div className="min-[860px]:hidden">{breakdown}</div>
            <div className="min-[860px]:hidden">{legal}</div>

            {isDesktop && (
              // Franja del color de la página bajo la tarjeta + degradé arriba:
              // lo que scrollea por detrás se desvanece en vez de asomar cortado
              // entre la tarjeta y el borde (iPad acostado, pantallas bajas).
              <div className="sticky bottom-0 mt-1 -mb-5 pb-5 bg-[#f2f2f6] before:content-[''] before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-b before:from-[#f2f2f6]/0 before:to-[#f2f2f6] before:pointer-events-none">
                <div className="bg-white rounded-[18px] p-4 shadow-[0_0_0_1px_rgba(17,17,20,.09),0_12px_32px_rgba(17,17,20,.10)]">
                  {ctaBlock}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Botón fijo: barra opaca, nada asoma por detrás */}
      {!isDesktop && (
        <div {...behindSheet} className="shrink-0 bg-[#f2f2f6] shadow-[0_-1px_0_rgba(17,17,20,.09)] px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto">{ctaBlock}</div>
        </div>
      )}

      {/* ── Hojas ── */}
      <CkSheet open={activeSheet === 'contact'} onClose={closeSheet} title={t.ckContactTitle} closeLabel={t.close} desktop={isDesktop}>
        <CkFields error={!!fieldErrors.customer_name}>
          <label className="relative block">
            <span className={fieldLabelCls}>{t.yourName}</span>
            <input
              id="checkout-name"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              aria-required="true"
              aria-invalid={!!fieldErrors.customer_name}
              aria-describedby={fieldErrors.customer_name ? 'checkout-name-error' : undefined}
              value={customerName}
              onChange={(e) => { setCustomerName(e.target.value); touch('customer_name'); if (fieldErrors.customer_name) validateField('customer_name', e.target.value); }}
              onBlur={(e) => { if (fieldTouched.customer_name) validateField('customer_name', e.target.value); }}
              placeholder={t.yourNamePlaceholder}
              className={fieldInputCls}
            />
          </label>
        </CkFields>
        {fieldErrors.customer_name && <CkError id="checkout-name-error">{fieldErrors.customer_name}</CkError>}
        {phoneNeeded && (<>
        <div id="checkout-phone-wrapper" className="mt-2">
          <PhoneField
            ios
            locale={locale === 'es' ? 'es' : 'en'}
            id="checkout-phone"
            label={t.yourPhone}
            value={customerPhone}
            onChange={(v) => { setCustomerPhone(v); touch('customer_phone'); if (fieldErrors.customer_phone) validateField('customer_phone', v); }}
            onBlur={() => { if (fieldTouched.customer_phone) validateField('customer_phone', customerPhone); }}
            placeholder={t.yourPhonePlaceholder}
            required
            dark={false}
            country={restaurant.country_code ?? undefined}
            error={!!fieldErrors.customer_phone}
            valid={fieldTouched.customer_phone && !fieldErrors.customer_phone && phoneLooksValid(customerPhone)}
          />
        </div>
        {fieldErrors.customer_phone && <CkError>{fieldErrors.customer_phone}</CkError>}
        </>)}
        <div className="mt-2">
          <CkFields error={!!fieldErrors.customer_email}>
            <label className="relative block">
              <span className={fieldLabelCls}>{t.yourEmail} ({t.optional})</span>
              <input
                id="checkout-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="done"
                aria-required="false"
                aria-invalid={!!fieldErrors.customer_email}
                aria-describedby={fieldErrors.customer_email ? 'checkout-email-error' : 'checkout-email-hint'}
                value={customerEmail}
                onChange={(e) => { setCustomerEmail(e.target.value); touch('customer_email'); if (fieldErrors.customer_email) validateField('customer_email', e.target.value); }}
                onBlur={(e) => validateField('customer_email', e.target.value)}
                placeholder={t.yourEmailPlaceholder}
                className={fieldInputCls}
              />
            </label>
          </CkFields>
        </div>
        {fieldErrors.customer_email
          ? <CkError id="checkout-email-error">{fieldErrors.customer_email}</CkError>
          : <p id="checkout-email-hint" className="text-[12.5px] text-[#6b6b74] mt-1.5 mx-1">{t.emailHint}</p>}
        <label className="flex items-center gap-2.5 mt-2 mx-1 min-h-[44px] text-sm text-[#4f4f57]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-[22px] h-[22px] shrink-0 accent-[#05c8a7]"
          />
          <span>
            {t.rememberMeLabel}{' · '}
            <a href={`/${slug}/legal/privacy?from=checkout`} target="_blank" rel="noopener noreferrer" className="inline-block py-3 -my-3 px-1 -mx-1 text-[#047a65] font-medium underline underline-offset-2">{t.ckPrivacy}</a>
          </span>
        </label>
        <button
          type="button"
          className={cn(ckCtaClass(), 'mt-[18px]')}
          onClick={() => {
            const ok = [
              validateField('customer_name', customerName),
              validateField('customer_phone', customerPhone),
              validateField('customer_email', customerEmail),
            ].every(Boolean);
            if (ok) { setOrderError(''); closeSheet(); }
          }}
        >
          {t.ckDone}
        </button>
      </CkSheet>

      <CkSheet open={activeSheet === 'address'} onClose={closeSheet} title={t.ckAddressTitle} closeLabel={t.close} desktop={isDesktop}>
        <AddressAutocomplete
          label={t.deliveryAddress}
          value={deliveryAddress}
          onChange={(v) => { setDeliveryAddress(v); setDeliveryCoords(null); }}
          onPlaceSelect={(p) => {
            if (p.lat != null && p.lng != null) setDeliveryCoords({ lat: p.lat, lng: p.lng });
          }}
          placeholder={t.deliveryAddressPlaceholder}
          dark={false}
          required
          error={!!fieldErrors.delivery_address}
          near={restaurant.latitude != null && restaurant.longitude != null ? { lat: restaurant.latitude, lng: restaurant.longitude } : null}
          country={restaurant.country_code ?? null}
        />
        {fieldErrors.delivery_address && <CkError>{fieldErrors.delivery_address}</CkError>}
        {addressNeedsPick() && (
          <p className="mt-2.5 px-3 py-2.5 rounded-xl bg-[#fff6e0] text-[#7a4d00] text-[13.5px] leading-snug">{t.deliveryPickFromList}</p>
        )}
        <div className="mt-2.5">
          <CkFields>
            <label className="relative block">
              <span className={fieldLabelCls}>{t.ckUnitLabel}</span>
              <input
                type="text"
                autoComplete="address-line2"
                value={deliveryUnit}
                maxLength={60}
                onChange={(e) => setDeliveryUnit(e.target.value)}
                placeholder={t.ckUnitPlaceholder}
                className={fieldInputCls}
              />
            </label>
          </CkFields>
        </div>
        <button
          type="button"
          className={cn(ckCtaClass(!deliveryAddress.trim()), 'mt-[18px]')}
          onClick={() => {
            if (validateField('delivery_address', deliveryAddress) && !addressNeedsPick()) { setOrderError(''); closeSheet(); }
          }}
        >
          {t.ckUseAddress}
        </button>
      </CkSheet>

      <CkSheet open={activeSheet === 'when'} onClose={closeSheet} title={t.ckWhenTitle} closeLabel={t.close} desktop={isDesktop}>
        <div role="radiogroup" aria-label={t.ckWhenTitle} className="grid gap-2">
          <CkChoice
            title={t.ckAsap}
            sub={closedNow ? t.ckClosedNow : etaText}
            selected={!scheduleEnabled}
            disabled={closedNow}
            onClick={() => setScheduleEnabled(false)}
          />
          <CkChoice title={t.ckScheduleLater} selected={scheduleEnabled} onClick={() => setScheduleEnabled(true)} />
        </div>
        {scheduleEnabled && (
          <div className="mt-2.5">
            <CkFields>
              <label className="relative block">
                <span className={fieldLabelCls}>{t.ckDateTime}</span>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={localDateTimeInput(Date.now() + 10 * 60_000)}
                  className={fieldInputCls}
                />
              </label>
            </CkFields>
            {(scheduledTooSoon || scheduledClosed) && (
              <p className="mt-2.5 px-3 py-2.5 rounded-xl bg-[#fff6e0] text-[#7a4d00] text-[13.5px] leading-snug" role="alert">{scheduledTooSoon ? t.ckTimeTooSoon : t.ckClosedAtTime}</p>
            )}
          </div>
        )}
        <button
          type="button"
          className={cn(ckCtaClass((scheduleEnabled && !scheduledFor) || scheduledTooSoon || scheduledClosed || (!scheduleEnabled && closedNow)), 'mt-[18px]')}
          onClick={() => { setOrderError(''); setOrderErrorAction(null); closeSheet(); }}
        >
          {t.ckDone}
        </button>
      </CkSheet>

      <CkSheet open={activeSheet === 'note'} onClose={closeSheet} title={t.ckNote} closeLabel={t.close} desktop={isDesktop}>
        <CkFields>
          <label className="relative block">
            <span className={fieldLabelCls}>{t.orderNotes} ({t.optional})</span>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={t.orderNotesPlaceholder}
              rows={4}
              maxLength={500}
              className={cn(fieldInputCls, 'resize-none min-h-[110px]')}
            />
          </label>
        </CkFields>
        <button type="button" className={cn(ckCtaClass(), 'mt-[18px]')} onClick={closeSheet}>{t.ckDone}</button>
      </CkSheet>

      <CkSheet open={activeSheet === 'promo'} onClose={closeSheet} title={t.promoCode} closeLabel={t.close} desktop={isDesktop}>
        <CkFields error={!!promoError}>
          <label className="relative block">
            <span className={fieldLabelCls}>{t.promoCode}</span>
            <input
              type="text"
              autoCapitalize="characters"
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); setPromoResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validatePromo(); } }}
              placeholder={t.promoCodePlaceholder}
              className={cn(fieldInputCls, 'uppercase placeholder:normal-case')}
            />
          </label>
        </CkFields>
        {promoError && <CkError>{promoError}</CkError>}
        {promoResult?.valid && (
          <div className="mt-2.5 flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#e2f7f3] text-[#047a65] text-[13.5px] font-medium">
            <span>{t.discount}: -{fmtPrice(promoResult.discount)}{promoResult.description && ` — ${promoResult.description}`}</span>
            <button
              type="button"
              onClick={() => { setPromoResult(null); setPromoCode(''); }}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              {t.ckRemove}
            </button>
          </div>
        )}
        {promoResult?.valid ? (
          <button type="button" className={cn(ckCtaClass(), 'mt-[18px]')} onClick={closeSheet}>{t.ckDone}</button>
        ) : (
          <button
            type="button"
            className={cn(ckCtaClass(promoLoading || !promoCode.trim()), 'mt-[18px]')}
            onClick={validatePromo}
          >
            {promoLoading ? <><CkSpinner />{t.applyingLabel}</> : t.apply}
          </button>
        )}
      </CkSheet>

      <CkSheet open={activeSheet === 'table'} onClose={closeSheet} title={t.ckTableTitle} closeLabel={t.close} desktop={isDesktop}>
        <CkFields>
          <label className="relative block">
            <span className={fieldLabelCls}>{t.tableQuestion} ({t.optional})</span>
            <input
              type="text"
              value={manualTableName}
              onChange={(e) => setManualTableName(e.target.value)}
              placeholder={t.tablePlaceholder}
              className={fieldInputCls}
            />
          </label>
          <label className="relative block">
            <span className={fieldLabelCls}>{t.arrivalTimeQuestion} ({t.optional})</span>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className={fieldInputCls}
            />
          </label>
        </CkFields>
        <button type="button" className={cn(ckCtaClass(), 'mt-[18px]')} onClick={closeSheet}>{t.ckDone}</button>
      </CkSheet>
    </div>
  );
}
