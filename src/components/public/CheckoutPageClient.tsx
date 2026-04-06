'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ArrowLeft, CheckCircle, ShoppingCart, Lock, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { cn, formatPrice } from '@/lib/utils';
import { getTranslations, type Locale } from '@/lib/translations';
import type { Restaurant, OrderType, PaymentMethod } from '@/types';
import { trackEvent } from '@/lib/analytics';
import { playSuccessChime, spawnConfetti } from '@/lib/celebration';
import { computeTaxAmount } from '@/lib/tax-presets';

const fieldSkeleton = <div className="w-full h-[52px] rounded-2xl skeleton" />;

const AddressAutocomplete = dynamic(
  () => import('@/components/ui/AddressAutocomplete').then((m) => ({ default: m.AddressAutocomplete })),
  { ssr: false, loading: () => fieldSkeleton }
);
const PhoneField = dynamic(
  () => import('@/components/ui/PhoneField').then((m) => ({ default: m.PhoneField })),
  { ssr: false, loading: () => fieldSkeleton }
);

interface CheckoutPageClientProps {
  restaurant: Restaurant;
  locale: Locale;
  slug: string;
  orderToken?: string;
}

type CheckoutStep = 'form' | 'payment' | 'confirmation';

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

  const [hasMounted, setHasMounted] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Pre-fill customer info from localStorage on mount
  useEffect(() => {
    setHasMounted(true);
    try {
      const saved = localStorage.getItem('menius_guest_info');
      if (saved) {
        const { name, phone, email } = JSON.parse(saved);
        if (name) setCustomerName(name);
        if (phone) setCustomerPhone(phone);
        if (email) setCustomerEmail(email);
      }
    } catch {}
    return () => { clearTimeout(confettiTimer.current); };
  }, []);

  const enabledOrderTypes = restaurant.order_types_enabled?.length
    ? restaurant.order_types_enabled
    : (['dine_in', 'pickup', 'delivery'] as OrderType[]);
  const stripeConnectReady = !!restaurant.stripe_onboarding_complete && !!restaurant.stripe_account_id;
  const enabledPaymentMethods = (restaurant.payment_methods_enabled?.length
    ? restaurant.payment_methods_enabled
    : (['cash'] as PaymentMethod[])
  ).filter((m) => m !== 'online' || stripeConnectReady);

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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
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

  const [includeUtensils, setIncludeUtensils] = useState(true);

  // Pre-order / scheduled
  const [scheduledFor, setScheduledFor] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderId, setOrderId] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const confettiTimer = useRef<ReturnType<typeof setTimeout>>();
  const submittingRef = useRef(false);
  // Generated once per checkout session — prevents duplicate orders on network retry
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  // Double-tap confirm before removing last qty of an item
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);
  const confirmRemoveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { return () => { if (confirmRemoveTimer.current) clearTimeout(confirmRemoveTimer.current); }; }, []);
  const [tipPercent, setTipPercent] = useState<number | null>(null);

  // Snapshot of items captured before clearCart() — shown on confirmation screen
  const [confirmedItems, setConfirmedItems] = useState<{ name: string; qty: number; variant?: string; lineTotal: number }[]>([]);
  const [confirmedTotal, setConfirmedTotal] = useState(0);

  // Demo payment simulation state
  const [demoCardNum, setDemoCardNum] = useState('4242 4242 4242 4242');
  const [demoExpiry, setDemoExpiry] = useState('12 / 28');
  const [demoCVC, setDemoCVC] = useState('123');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [demoPayProcessing, setDemoPayProcessing] = useState(false);
  const tipAmount = tipPercent !== null ? Math.round(cartTotal * tipPercent) / 100 : 0;

  // Reactive form validation — drives CTA disabled state
  const isFormReady = Boolean(
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 7 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) &&
    (orderType !== 'delivery' || deliveryAddress.trim().length > 0)
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

  const goBack = useCallback(() => router.push(`/${slug}`), [router, slug]);

  const validateField = useCallback((name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'customer_name':
        if (!value.trim()) error = locale === 'es' ? 'El nombre es obligatorio' : 'Name is required';
        else if (value.trim().length < 2) error = locale === 'es' ? 'Mínimo 2 caracteres' : 'Minimum 2 characters';
        break;
      case 'customer_phone':
        if (!value.trim()) error = locale === 'es' ? 'El teléfono es obligatorio' : 'Phone is required';
        else if (!/^\+?[\d\s()-]{7,}$/.test(value)) error = locale === 'es' ? 'Teléfono no válido' : 'Invalid phone number';
        break;
      case 'customer_email':
        if (!value.trim()) error = locale === 'es' ? 'El email es obligatorio para recibir tu confirmación' : 'Email is required to receive your confirmation';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = locale === 'es' ? 'Email no válido' : 'Invalid email';
        break;
      case 'delivery_address':
        if (orderType === 'delivery' && !value.trim()) error = locale === 'es' ? 'La dirección es obligatoria para delivery' : 'Delivery address is required';
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
      if (res.ok) setPromoResult(data);
      else { setPromoError(data.error); setPromoResult(null); }
    } catch {
      setPromoError(locale === 'es' ? 'Error validando código' : 'Error validating code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (submittingRef.current) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      setOrderError(locale === 'es' ? 'Nombre y teléfono son requeridos' : 'Name and phone required');
      return;
    }
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setOrderError(locale === 'es' ? 'Email requerido para recibir tu confirmación de pedido' : 'Email required to receive your order confirmation');
      validateField('customer_email', customerEmail);
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setOrderError(locale === 'es' ? 'Dirección de entrega requerida' : 'Delivery address required');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setOrderError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKeyRef.current },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          locale,
          _ot: orderToken,
          _hp: honeypot,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || undefined,
          notes: (() => {
            const arrival = orderType === 'dine_in' && !tableName && arrivalTime
              ? `[${locale === 'es' ? 'Llega' : 'Arrives'}: ${arrivalTime}] `
              : '';
            return arrival + orderNotes.trim() || undefined;
          })(),
          order_type: orderType,
          payment_method: paymentMethod,
          delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
          table_name: orderType === 'dine_in' ? (tableName || manualTableName.trim() || undefined) : undefined,
          promo_code: promoResult?.valid ? promoCode.trim() : undefined,
          discount_amount: discount,
          loyalty_points_redeemed: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
          loyalty_account_id: loyaltyPointsToRedeem > 0 ? loyaltyBalance?.account_id : undefined,
          tip_amount: tipAmount > 0 ? tipAmount : undefined,
          include_utensils: includeUtensils,
          scheduled_for: scheduleEnabled && scheduledFor ? scheduledFor : undefined,
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
      const data = await res.json();
      if (!res.ok) { setOrderError(data.error || (locale === 'en' ? 'Error sending order' : 'Error enviando orden')); return; }
      setOrderNumber(data.order_number);
      setOrderId(data.order_id);
      // For online payments: redirect immediately to Stripe
      if (data.stripe_url) {
        window.location.href = data.stripe_url;
        return;
      }
      // Demo restaurant + online payment → show simulated card payment step
      if (restaurant.id.startsWith('demo') && paymentMethod === 'online') {
        setStep('payment');
        return;
      }
      saveLastOrder();
      // Capture snapshot before clearing cart — used in confirmation screen
      setConfirmedItems(items.map(i => ({ name: i.product.name, qty: i.qty, variant: i.variant?.name, lineTotal: i.lineTotal })));
      setConfirmedTotal(finalTotal);
      // Save customer info for next visit
      try {
        if (rememberMe) {
          localStorage.setItem('menius_guest_info', JSON.stringify({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim(),
          }));
        } else {
          localStorage.removeItem('menius_guest_info');
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
      setOrderError(locale === 'en' ? 'Connection error' : 'Error de conexión');
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
    setConfirmedTotal(finalTotal);
    try {
      if (rememberMe) {
        localStorage.setItem('menius_guest_info', JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
        }));
      } else {
        localStorage.removeItem('menius_guest_info');
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
  }, [saveLastOrder, rememberMe, customerName, customerPhone, customerEmail, restaurant, orderNumber, orderType, items, cartTotal, clearCart, confettiTimer]);

  const isColombianRestaurant = restaurant.currency?.toUpperCase() === 'COP';

  const handlePayOnline = async () => {
    if (isColombianRestaurant) {
      await handlePayWompi();
      return;
    }
    setPayLoading(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, slug: restaurant.slug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setOrderError(data.error || (locale === 'es' ? 'Error al iniciar el pago. Intenta de nuevo.' : 'Payment failed. Please try again.'));
        setPayLoading(false);
      }
    } catch {
      setOrderError(locale === 'es' ? 'Error de conexión al procesar el pago.' : 'Connection error processing payment.');
      setPayLoading(false);
    }
  };

  const handlePayWompi = async () => {
    setPayLoading(true);
    try {
      const res = await fetch('/api/payments/wompi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, slug: restaurant.slug }),
      });
      const data = await res.json();
      if (data.error) {
        setOrderError(data.error);
        setPayLoading(false);
        return;
      }
      // Use Wompi Web Checkout redirect (most compatible approach)
      const params = new URLSearchParams({
        'public-key': data.publicKey,
        'currency': data.currency,
        'amount-in-cents': String(data.amountInCents),
        'reference': data.reference,
        'signature:integrity': data.integrityHash,
        'redirect-url': data.redirectUrl,
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
      setOrderError(locale === 'es' ? 'Error de conexión al procesar el pago.' : 'Connection error processing payment.');
      setPayLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white';

  if (!hasMounted) {
    return (
      <div className="h-[100dvh] bg-[#f5f5f5] flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4">
          <div className="h-5 w-24 skeleton rounded-full" />
        </header>
        <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
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
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4">
          <button onClick={goBack} aria-label={locale === 'es' ? 'Volver al menú' : 'Back to menu'} className="flex items-center gap-2 text-gray-600 active:text-gray-900 transition-colors">
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
          <button onClick={goBack} className="px-6 py-3 rounded-xl bg-[#05c8a7] text-white font-semibold text-sm active:scale-[0.98] transition-all">
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
      <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: '#f6f9fc' }}>

        {/* Stripe-style header */}
        <div className="w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-xs text-gray-500 font-medium">{locale === 'es' ? 'Pago seguro' : 'Secure payment'}</span>
          </div>
          <svg viewBox="0 0 60 25" className="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 01-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 013.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.87zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 01-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.84zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 01-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 00-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.77z" fill="#635BFF"/>
          </svg>
        </div>

        {/* TEST MODE banner */}
        <div className="w-full bg-orange-500 px-4 py-1.5 text-center">
          <p className="text-white text-xs font-semibold tracking-wide">
            {locale === 'es' ? '🧪 MODO DEMO — Sin cobro real. Datos pre-llenados.' : '🧪 TEST MODE — No real charge. Data pre-filled.'}
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
              <p className="text-4xl font-black text-gray-900 tabular-nums tracking-tight">{fmtPrice(finalTotal)}</p>
            </div>

            {/* Order summary — collapsible like Stripe */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setSummaryOpen((o) => !o)}
                aria-expanded={summaryOpen}
                aria-controls="order-summary-content"
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>{locale === 'es' ? 'Resumen del pedido' : 'Order summary'} ({items.length} {items.length === 1 ? (locale === 'es' ? 'item' : 'item') : (locale === 'es' ? 'items' : 'items')})</span>
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
                      <span className="flex-1 truncate pr-2">{item.qty > 1 ? `${item.qty}× ` : ''}{item.product.name}{item.variant ? ` · ${item.variant.name}` : ''}</span>
                      <span className="tabular-nums font-medium text-gray-800 shrink-0">{fmtPrice(item.lineTotal)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-semibold text-gray-800">
                    <span>{locale === 'es' ? 'Total' : 'Total'}</span>
                    <span className="tabular-nums">{fmtPrice(finalTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card holder name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {locale === 'es' ? 'Nombre en la tarjeta' : 'Name on card'}
              </label>
              <input
                type="text"
                defaultValue="Test User"
                placeholder={locale === 'es' ? 'Nombre completo' : 'Full name'}
                className="w-full px-3.5 py-3 rounded-lg border border-gray-300 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/20 focus:outline-none text-sm text-gray-900 bg-white transition-all"
              />
            </div>

            {/* Unified card input — Stripe style */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {locale === 'es' ? 'Información de tarjeta' : 'Card information'}
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
                    className="flex-1 text-sm font-mono tracking-wider text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
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
                      className="w-full text-sm font-mono tracking-wider text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
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
                      className="flex-1 text-sm font-mono tracking-wider text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
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
                  {locale === 'es' ? 'Procesando…' : 'Processing…'}
                </span>
              ) : (
                `${locale === 'es' ? 'Pagar' : 'Pay'} ${fmtPrice(finalTotal)}`
              )}
            </button>

            {/* Back link */}
            <button
              onClick={() => setStep('form')}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {locale === 'es' ? 'Volver al formulario' : 'Back to form'}
            </button>

            {/* Powered by Stripe footer */}
            <div className="flex flex-col items-center gap-2 pt-2 pb-4">
              <div className="flex items-center gap-1.5 text-gray-400">
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M6 1a5 5 0 100 10A5 5 0 006 1zM5 4a1 1 0 112 0v3a1 1 0 11-2 0V4zm1 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z" fill="currentColor"/>
                </svg>
                <span className="text-[11px]">
                  {locale === 'es' ? 'Pago seguro y cifrado' : 'Secure encrypted payment'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <span className="text-[11px]">Powered by</span>
                <svg className="h-[14px] w-auto" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 01-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.44.94V5.2h3.94l.14 1.07c.6-.72 1.7-1.33 3.29-1.33 3.01 0 5.7 2.68 5.7 7.5-.02 5.29-2.67 7.86-5.71 7.86zm-.95-11.64c-.95 0-1.55.35-1.97.8l.05 5.99c.42.47 1.01.8 1.92.8 1.51 0 2.54-1.65 2.54-3.81-.01-2.22-.99-3.78-2.54-3.78zM28.24 5.2h4.44v14.83h-4.44V5.2zm0-4.75l4.44-.94v3.56l-4.44.94V.45zM19.69 20.03c-1.87 0-3.49-.75-3.49-3.83V8.43h-1.89V5.2h1.89V1.51l4.42-.93V5.2h2.56v3.23h-2.56v6.82c0 1.14.49 1.63 1.55 1.63.36 0 .74-.07 1.01-.15v3.2c-.43.12-1.16.1-1.49.1zM12.06 6.01l-.17-1.15c-.62-.56-1.72-1.1-3.07-1.1C5.49 3.76 3.01 6.24 3.01 10c0 4.01 2.61 6.26 5.81 6.26 1.35 0 2.45-.52 3.07-1.07l.17-1.14v1.99H16V5.2h-3.94v.81zm-3.07 8.08c-1.51 0-2.62-1.24-2.62-3.11 0-1.87 1.11-3.11 2.62-3.11 1.5 0 2.63 1.24 2.63 3.11 0 1.87-1.13 3.11-2.63 3.11z" fill="#6772E5"/>
                </svg>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">{locale === 'es' ? 'Términos' : 'Terms'}</a>
                <span>·</span>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">{locale === 'es' ? 'Privacidad' : 'Privacy'}</a>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirmation') {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900">{restaurant.name}</span>
          <button onClick={goBack} className="text-sm text-[#05c8a7] font-medium">{t.backToMenu}</button>
        </header>
        <motion.div
          ref={confirmRef}
          className="flex-1 flex flex-col items-center justify-start px-6 pt-8 pb-10 relative overflow-y-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="w-20 h-20 rounded-full bg-[#e6faf7] flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-[#05c8a7]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{t.orderSent}</h2>
          <p className="text-sm text-gray-500 mb-3">{t.orderSentDesc}</p>
          <p className="text-4xl font-bold text-gray-900 mb-5 tabular-nums">#{orderNumber}</p>

          {/* Order summary — reassures user of what they ordered */}
          {confirmedItems.length > 0 && (
            <div className="w-full max-w-sm mb-5 bg-gray-50 rounded-2xl p-4 space-y-2 text-left">
              {confirmedItems.map((item, i) => (
                <div key={i} className="flex justify-between items-baseline gap-3">
                  <span className="text-sm text-gray-700 leading-snug">
                    <span className="font-semibold text-gray-900">{item.qty}×</span>{' '}
                    {item.name}{item.variant ? <span className="text-gray-400"> ({item.variant})</span> : ''}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">{fmtPrice(item.lineTotal)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-900">{locale === 'es' ? 'Total' : 'Total'}</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtPrice(confirmedTotal)}</span>
              </div>
            </div>
          )}

          {restaurant.estimated_delivery_minutes && orderType === 'delivery' && (
            <p className="text-sm text-gray-400 mb-5">
              {locale === 'es' ? 'Tiempo estimado' : 'Estimated time'}: ~{restaurant.estimated_delivery_minutes} min
            </p>
          )}
          <div className="w-full space-y-3 max-w-sm">
            {orderError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center">
                {orderError}
              </div>
            )}
            {paymentMethod === 'online' && orderId && !restaurant.id.startsWith('demo') && (
              <button
                onClick={handlePayOnline}
                disabled={payLoading}
                className={cn(
                  'w-full py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2',
                  isColombianRestaurant
                    ? 'bg-[#FDDA24] text-[#002C76] hover:bg-[#f5d01e]'
                    : 'bg-[#05c8a7] text-white hover:bg-[#04b096]'
                )}
              >
                {payLoading ? (
                  locale === 'es' ? 'Redirigiendo...' : 'Redirecting...'
                ) : isColombianRestaurant ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="40" rx="8" fill="#002C76"/>
                      <path d="M8 20C8 13.373 13.373 8 20 8s12 5.373 12 12-5.373 12-12 12S8 26.627 8 20z" fill="#FDDA24"/>
                      <path d="M16 17h8v6h-8z" fill="#002C76"/>
                    </svg>
                    {locale === 'es' ? 'Pagar con Wompi' : 'Pay with Wompi'}
                  </>
                ) : t.payNow}
              </button>
            )}
            {!restaurant.id.startsWith('demo') && orderNumber && (
              <button
                onClick={() => router.push(`/${slug}/orden/${orderNumber}`)}
                className="w-full py-3.5 rounded-xl bg-[#05c8a7] text-white font-semibold text-sm hover:bg-[#04b096] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {locale === 'es' ? 'Seguir mi pedido en vivo' : 'Track my order live'}
              </button>
            )}
            <button onClick={goBack} className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors">
              {t.backToMenu}
            </button>
            {!restaurant.id.startsWith('demo') && (
              <button
                onClick={() => {
                  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
                  const msg = encodeURIComponent(
                    locale === 'es'
                      ? `hambre mode: ON 😤🍽️\nPedí en *${restaurant.name}* — ¿alguien más quiere algo?\n👇 Pide aquí: ${appUrl}/${restaurant.slug}`
                      : `hunger mode: ON 😤🍽️\nJust ordered at *${restaurant.name}* — anyone else want something?\n👇 Order here: ${appUrl}/${restaurant.slug}`
                  );
                  window.location.href = `whatsapp://send?text=${msg}`;
                  setTimeout(() => {
                    window.open(`https://wa.me/?text=${msg}`, '_blank');
                  }, 1500);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-400 hover:text-[#05c8a7] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {locale === 'es' ? 'Compartir con amigos' : 'Share with friends'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="h-[100dvh] bg-[#f5f5f5] flex flex-col overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <button onClick={goBack} className="flex items-center gap-2 text-gray-600 active:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t.backToMenu}</span>
        </button>
        <h1 className="text-base font-bold text-gray-900">
          {locale === 'es' ? 'Pagar' : 'Pay'} {fmtPrice(finalTotal)}
        </h1>
        <div className="flex items-center gap-1.5 text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{locale === 'es' ? 'Seguro' : 'Secure'}</span>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-6 space-y-4">

          {/* Section: Tu pedido */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1">
            {locale === 'es' ? '1 · Tu pedido' : '1 · Your order'}
          </p>

          {/* Order summary */}
          <div className="bg-white rounded-2xl p-5 space-y-3 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">{t.myOrder}</p>
              <span className="ml-auto text-xs font-medium text-gray-400">
                {items.reduce((s, i) => s + i.qty, 0)} {t.items}
              </span>
            </div>
            {items.map((item, idx) => (
              <div key={`${item.product.id}-${item.variant?.id ?? 'base'}-${idx}`} className="flex gap-3 items-start">
                {item.product.image_url && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name}
                      fill
                      sizes="48px"
                      className="object-cover opacity-0 transition-opacity duration-300"
                      onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-[15px] text-gray-800 font-medium truncate">
                      {item.product.name}
                      {item.variant ? ` (${item.variant.name})` : ''}
                    </span>
                    <span className="font-semibold text-gray-900 flex-shrink-0 tabular-nums text-[15px]">{fmtPrice(item.lineTotal)}</span>
                  </div>
                  {(item.modifierSelections ?? []).length > 0 && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {(item.modifierSelections ?? []).flatMap(ms => ms.selectedOptions.map(o => o.name)).join(', ')}
                    </p>
                  )}
                  <div className="flex items-center gap-0 mt-2">
                    {/* 44px touch target wrapping the visible 28px circle */}
                    <button
                      onClick={() => {
                        if (item.qty > 1) { updateQty(idx, item.qty - 1); return; }
                        if (confirmRemoveIdx === idx) {
                          if (confirmRemoveTimer.current) clearTimeout(confirmRemoveTimer.current);
                          setConfirmRemoveIdx(null);
                          removeItem(idx);
                        } else {
                          setConfirmRemoveIdx(idx);
                          confirmRemoveTimer.current = setTimeout(() => setConfirmRemoveIdx(null), 2000);
                        }
                      }}
                      className="w-11 h-11 flex items-center justify-center flex-shrink-0"
                      aria-label={locale === 'es' ? 'Reducir cantidad' : 'Decrease quantity'}
                    >
                      <span className={cn(
                        'w-7 h-7 rounded-full border flex items-center justify-center transition-colors text-lg leading-none pointer-events-none',
                        confirmRemoveIdx === idx
                          ? 'border-red-300 bg-red-50 text-red-500'
                          : 'border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500'
                      )}>
                        −
                      </span>
                    </button>
                    <span className="text-sm font-semibold text-gray-900 w-4 text-center tabular-nums">{item.qty}</span>
                    {/* 44px touch target wrapping the visible 28px circle */}
                    <button
                      onClick={() => updateQty(idx, item.qty + 1)}
                      className="w-11 h-11 flex items-center justify-center flex-shrink-0"
                      aria-label={locale === 'es' ? 'Aumentar cantidad' : 'Increase quantity'}
                    >
                      <span className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-[#e6faf7] hover:border-[#b3efe6] hover:text-[#05c8a7] transition-colors text-lg leading-none pointer-events-none">
                        +
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {promoDiscount > 0 && (
              <div className="flex justify-between text-[15px] text-[#05c8a7] pt-1">
                <span>{t.discount}</span>
                <span className="font-semibold">-{fmtPrice(promoDiscount)}</span>
              </div>
            )}
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-[15px] text-[#05c8a7] pt-1">
                <span>⭐ {locale === 'es' ? 'Puntos' : 'Points'}</span>
                <span className="font-semibold">-{fmtPrice(loyaltyDiscount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-[15px] text-gray-500">
                <span>{locale === 'es' ? 'Envío' : 'Delivery'}</span>
                <span className="font-semibold tabular-nums">+{fmtPrice(deliveryFee)}</span>
              </div>
            )}
            {orderType === 'delivery' && deliveryFee === 0 && restaurant.order_types_enabled?.includes('delivery') && (
              <div className="flex justify-between text-[15px] text-[#05c8a7]">
                <span>{locale === 'es' ? 'Envío' : 'Delivery'}</span>
                <span className="font-semibold">{locale === 'es' ? 'Gratis' : 'Free'}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-[15px] text-gray-500">
                <span>{locale === 'es' ? 'Propina' : 'Tip'}</span>
                <span className="font-semibold tabular-nums">+{fmtPrice(tipAmount)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-[15px] text-gray-500">
                <span>
                  {taxLabel}{' '}
                  {taxIncluded
                    ? `(${locale === 'es' ? 'incluido' : 'included'})`
                    : `(${taxRate}%)`}
                </span>
                <span className="font-semibold tabular-nums">
                  {taxIncluded ? '' : '+'}{fmtPrice(taxAmount)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg">
              <span>{t.total}</span>
              <span className="tabular-nums">{fmtPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Order type */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">{t.orderType}</label>
            <div className={cn('grid gap-2', enabledOrderTypes.length === 3 ? 'grid-cols-3' : enabledOrderTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
              {enabledOrderTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    'py-3.5 px-3 rounded-xl text-[15px] font-bold text-center transition-all duration-150 border',
                    orderType === type
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 active:border-gray-400'
                  )}
                >
                  {type === 'dine_in' ? t.dineIn : type === 'pickup' ? t.pickup : t.delivery}
                </button>
              ))}
            </div>
            {orderType === 'delivery' && (
              <div className="mt-4">
                <AddressAutocomplete
                  label={t.deliveryAddress}
                  value={deliveryAddress}
                  onChange={setDeliveryAddress}
                  onBlur={() => validateField('delivery_address', deliveryAddress)}
                  placeholder={t.deliveryAddressPlaceholder}
                  dark={false}
                  required
                  error={!!fieldErrors.delivery_address}
                />
                {fieldErrors.delivery_address && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.delivery_address}</p>
                )}
              </div>
            )}
            {orderType === 'dine_in' && !tableName && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {locale === 'es' ? '¿En qué mesa estás?' : 'Which table are you at?'}
                    <span className="ml-1 text-gray-400 font-normal">({locale === 'es' ? 'opcional' : 'optional'})</span>
                  </label>
                  <input
                    type="text"
                    value={manualTableName}
                    onChange={(e) => setManualTableName(e.target.value)}
                    placeholder={locale === 'es' ? 'Ej: Mesa 4, Terraza, Barra…' : 'E.g. Table 4, Patio, Bar…'}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {locale === 'es' ? '¿A qué hora planeas llegar?' : 'What time do you plan to arrive?'}
                    <span className="ml-1 text-gray-400 font-normal">({locale === 'es' ? 'opcional' : 'optional'})</span>
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section: Tus datos */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1 pt-2">
            {locale === 'es' ? '2 · Tus datos' : '2 · Your info'}
          </p>

          {/* Customer details */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-5">
            <div>
              {/* Honeypot — invisible to real users, filled automatically by bots */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                <label>Website</label>
                <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">{t.yourName} <span className="text-red-500">*</span></label>
              <input
                type="text"
                inputMode="text"
                autoComplete="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onBlur={(e) => validateField('customer_name', e.target.value)}
                onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320); }}
                placeholder={t.yourNamePlaceholder}
                className={cn(inputClass, fieldErrors.customer_name ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : '')}
              />
              {fieldErrors.customer_name && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.customer_name}</p>
              )}
            </div>
            <div>
              <PhoneField
                label={t.yourPhone}
                value={customerPhone}
                onChange={setCustomerPhone}
                onBlur={() => validateField('customer_phone', customerPhone)}
                placeholder={t.yourPhonePlaceholder}
                required
                dark={false}
                error={!!fieldErrors.customer_phone}
              />
              {fieldErrors.customer_phone && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.customer_phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t.yourEmail}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                onBlur={(e) => validateField('customer_email', e.target.value)}
                onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320); }}
                placeholder={t.yourEmailPlaceholder}
                className={cn(inputClass, fieldErrors.customer_email ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : '')}
                required
              />
              {fieldErrors.customer_email ? (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.customer_email}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  {locale === 'es' ? 'Te enviaremos la confirmación y actualizaciones de tu pedido.' : 'We\'ll send you order confirmation and updates.'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">{t.orderNotes} <span className="text-gray-400 font-normal text-xs">({t.optional})</span></label>
              <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder={t.orderNotesPlaceholder} rows={2} className={cn(inputClass, 'resize-none')} />
            </div>

            <button
              type="button"
              onClick={() => setIncludeUtensils(v => !v)}
              aria-pressed={includeUtensils}
              className="flex items-center gap-3 w-full py-1 group"
            >
              <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors', includeUtensils ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white')}>
                {includeUtensils && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <UtensilsCrossed className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors text-left">
                {locale === 'es' ? 'Incluir cubiertos y servilletas' : 'Include utensils & napkins'}
              </span>
            </button>

            {/* Schedule for later */}
            <div className="border border-dashed border-gray-200 rounded-2xl p-4 space-y-3">
              <button
                type="button"
                onClick={() => setScheduleEnabled(v => !v)}
                aria-pressed={scheduleEnabled}
                className="flex items-center gap-3 w-full group"
              >
                <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors', scheduleEnabled ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white')}>
                  {scheduleEnabled && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {locale === 'en' ? 'Schedule for later' : 'Programar para después'}
                </span>
              </button>
              {scheduleEnabled && (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)}
                  min={new Date(Date.now() + 10 * 60_000).toISOString().slice(0, 16)}
                  className={cn(inputClass)}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setRememberMe((v) => !v)}
              aria-pressed={rememberMe}
              className="flex items-center gap-3 w-full py-1 group"
            >
              <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors', rememberMe ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white')}>
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors text-left">
                {locale === 'es' ? 'Recordar mis datos para la próxima vez' : 'Remember my info for next time'}
              </span>
            </button>
          </div>

          {/* Section: Forma de pago */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1 pt-2">
            {locale === 'es' ? '3 · Forma de pago' : '3 · Payment'}
          </p>

          {/* Payment method */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">{t.paymentMethod}</label>
            <div className="space-y-2">
              {enabledPaymentMethods.map((method) => (
                <label key={method} className={cn('flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150', paymentMethod === method ? 'border-gray-900 bg-gray-50' : 'border-gray-200')}>
                  <input type="radio" name="paymentMethod" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} className="w-5 h-5 text-gray-900 focus:ring-gray-900/20" />
                  <span className="text-[15px] font-medium text-gray-800">{method === 'cash' ? t.payCash : t.payOnline}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Loyalty points redemption */}
          {loyaltyBalance?.config && loyaltyBalance.points >= loyaltyBalance.config.min_redeem_points && (
            <div className="bg-[#e6faf7] rounded-2xl p-5 border border-[#b3efe6] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {locale === 'es' ? 'Tienes' : 'You have'} {loyaltyBalance.points} {locale === 'es' ? 'puntos' : 'points'}
                    </p>
                    <p className="text-xs text-[#047a65]">
                      = {fmtPrice(Math.floor(loyaltyBalance.points * loyaltyBalance.config.peso_per_point * 100) / 100)} {locale === 'es' ? 'de descuento' : 'discount'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLoyaltyApplied((v) => !v)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    loyaltyApplied
                      ? 'bg-[#05c8a7] text-white shadow-sm'
                      : 'bg-white text-[#047a65] border border-[#b3efe6] hover:bg-[#e6faf7]'
                  )}
                >
                  {loyaltyApplied
                    ? (locale === 'es' ? '✓ Aplicado' : '✓ Applied')
                    : (locale === 'es' ? 'Canjear' : 'Redeem')}
                </button>
              </div>
            </div>
          )}

          {/* Promo code */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-2">{t.promoCode}</label>
            <div className="flex gap-2">
              <input type="text" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); setPromoResult(null); }} placeholder={t.promoCodePlaceholder} className={cn(inputClass, 'flex-1 uppercase')} />
              <button onClick={validatePromo} disabled={promoLoading || !promoCode.trim()} className="px-5 py-3.5 rounded-xl bg-gray-900 text-white text-[15px] font-semibold disabled:opacity-30 transition-colors">
                {promoLoading ? (locale === 'es' ? 'Aplicando…' : 'Applying…') : t.apply}
              </button>
            </div>
            {promoError && <p className="text-sm text-red-500 mt-2">{promoError}</p>}
            {promoResult?.valid && (
              <p className="text-sm text-[#05c8a7] mt-2 font-medium">{t.discount}: -{fmtPrice(promoResult.discount)}{promoResult.description && ` — ${promoResult.description}`}</p>
            )}
          </div>

          {/* Tip */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">{locale === 'es' ? '¿Deseas dejar propina?' : 'Add a tip?'}</label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 15, 20].map((pct) => {
                const isActive = tipPercent === pct;
                const amt = Math.round(cartTotal * pct) / 100;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => { setTipPercent(isActive ? null : pct); }}
                    className={cn(
                      'flex flex-col items-center py-3 rounded-xl border transition-all duration-150',
                      isActive ? 'border-[#05c8a7] bg-[#e6faf7]' : 'border-gray-200 active:border-gray-400'
                    )}
                  >
                    <span className={cn('text-sm font-bold', isActive ? 'text-[#047a65]' : 'text-gray-700')}>{pct}%</span>
                    <span className={cn('text-[11px] tabular-nums', isActive ? 'text-[#05c8a7]' : 'text-gray-400')}>{fmtPrice(amt)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <AnimatePresence>
          {orderError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200"
            >
              <span className="text-red-700 text-sm font-medium">{orderError}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="max-w-lg mx-auto space-y-2">
          {!isFormReady && !submitting && items.length > 0 && (
            <p className="text-center text-xs text-gray-400">
              {locale === 'es'
                ? 'Completa nombre, teléfono y email para continuar'
                : 'Enter your name, phone and email to continue'}
            </p>
          )}
          <button
            onClick={handleSubmitOrder}
            disabled={submitting || items.length === 0 || !isFormReady}
            aria-label={locale === 'es' ? 'Confirmar orden' : 'Place order'}
            className="w-full py-5 rounded-2xl bg-[#05c8a7] text-white font-extrabold text-[17px] active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(5,200,167,0.35)]"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                {t.sending}
              </span>
            ) : (
              `${t.confirmOrder} · ${fmtPrice(finalTotal)}`
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
