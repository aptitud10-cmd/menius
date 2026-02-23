'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ArrowLeft, CheckCircle, ShoppingCart, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { cn, formatPrice } from '@/lib/utils';
import { getTranslations, type Locale } from '@/lib/translations';
import type { Restaurant, OrderType, PaymentMethod } from '@/types';
import { WalletButton } from './WalletButton';
import { PushOptIn } from './PushOptIn';

const AddressAutocomplete = dynamic(
  () => import('@/components/ui/AddressAutocomplete').then((m) => ({ default: m.AddressAutocomplete })),
  { ssr: false }
);
const PhoneField = dynamic(
  () => import('@/components/ui/PhoneField').then((m) => ({ default: m.PhoneField })),
  { ssr: false }
);

interface CheckoutPageClientProps {
  restaurant: Restaurant;
  locale: Locale;
  slug: string;
}

type CheckoutStep = 'form' | 'confirmation';

export function CheckoutPageClient({ restaurant, locale, slug }: CheckoutPageClientProps) {
  const router = useRouter();
  const t = getTranslations(locale);
  const fmtPrice = useCallback((price: number) => formatPrice(price, restaurant.currency), [restaurant.currency]);

  const items = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));
  const clearCart = useCartStore((s) => s.clearCart);
  const saveLastOrder = useCartStore((s) => s.saveLastOrder);
  const tableName = useCartStore((s) => s.tableName);
  const welcomeOrderType = useCartStore((s) => s.selectedOrderType);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const enabledOrderTypes = restaurant.order_types_enabled?.length
    ? restaurant.order_types_enabled
    : (['dine_in', 'pickup', 'delivery'] as OrderType[]);
  const enabledPaymentMethods = restaurant.payment_methods_enabled?.length
    ? restaurant.payment_methods_enabled
    : (['cash'] as PaymentMethod[]);

  const [step, setStep] = useState<CheckoutStep>('form');
  const [orderType, setOrderType] = useState<OrderType>(
    tableName ? 'dine_in' : welcomeOrderType ?? enabledOrderTypes[0]
  );
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(enabledPaymentMethods[0]);

  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount: number; description?: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderId, setOrderId] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const tipAmount = tipPercent !== null
    ? Math.round(cartTotal * tipPercent) / 100
    : (parseFloat(customTip) || 0);

  const discount = promoResult?.valid ? promoResult.discount : 0;
  const deliveryFee = (orderType === 'delivery' && restaurant.delivery_fee) ? restaurant.delivery_fee : 0;
  const finalTotal = Math.max(0, cartTotal - discount + deliveryFee + tipAmount);

  const goBack = useCallback(() => router.push(`/r/${slug}`), [router, slug]);

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch('/api/orders/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, restaurant_id: restaurant.id, order_total: cartTotal }),
      });
      const data = await res.json();
      if (res.ok) setPromoResult(data);
      else { setPromoError(data.error); setPromoResult(null); }
    } catch {
      setPromoError('Error validando código');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setOrderError(locale === 'es' ? 'Nombre y teléfono son requeridos' : 'Name and phone required');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setOrderError(locale === 'es' ? 'Dirección de entrega requerida' : 'Delivery address required');
      return;
    }
    setSubmitting(true);
    setOrderError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || undefined,
          notes: orderNotes.trim(),
          order_type: orderType,
          payment_method: paymentMethod,
          delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
          promo_code: promoResult?.valid ? promoCode.trim() : undefined,
          discount_amount: discount,
          tip_amount: tipAmount > 0 ? tipAmount : undefined,
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
      if (!res.ok) { setOrderError(data.error || 'Error enviando orden'); return; }
      setOrderNumber(data.order_number);
      setOrderId(data.order_id);
      saveLastOrder();
      clearCart();
      setStep('confirmation');
    } catch {
      setOrderError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayOnline = async () => {
    setPayLoading(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, slug: restaurant.slug }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPayLoading(false);
    } catch {
      setPayLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white';

  if (!hasMounted) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4">
          <button onClick={goBack} className="flex items-center gap-2 text-gray-600 active:text-gray-900 transition-colors">
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
          <button onClick={goBack} className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:scale-[0.98] transition-all">
            {t.backToMenu}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirmation') {
    return (
      <div className="min-h-[100dvh] bg-white flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900">{restaurant.name}</span>
          <button onClick={goBack} className="text-sm text-emerald-600 font-medium">{t.backToMenu}</button>
        </header>
        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{t.orderSent}</h2>
          <p className="text-sm text-gray-500 mb-3">{t.orderSentDesc}</p>
          <p className="text-4xl font-bold text-gray-900 mb-4 tabular-nums">#{orderNumber}</p>
          {restaurant.estimated_delivery_minutes && orderType === 'delivery' && (
            <p className="text-sm text-gray-400 mb-8">
              {locale === 'es' ? 'Tiempo estimado' : 'Estimated time'}: ~{restaurant.estimated_delivery_minutes} min
            </p>
          )}
          <div className="w-full space-y-3 max-w-sm">
            {paymentMethod === 'online' && orderId && (
              restaurant.id.startsWith('demo') ? (
                <div className="w-full py-3 rounded-xl bg-gray-100 text-center">
                  <p className="text-sm font-semibold text-gray-500">{locale === 'es' ? 'Pago con tarjeta via Stripe' : 'Card payment via Stripe'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{locale === 'es' ? 'Disponible en produccion' : 'Available in production'}</p>
                </div>
              ) : (
                <button onClick={handlePayOnline} disabled={payLoading} className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {payLoading ? t.redirecting : t.payNow}
                </button>
              )
            )}
            {!restaurant.id.startsWith('demo') && (
              <a href={`/r/${restaurant.slug}/orden/${orderNumber}`} className="block w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm text-center hover:bg-gray-800 transition-colors">
                {t.trackOrder}
              </a>
            )}
            {orderId && !restaurant.id.startsWith('demo') && <PushOptIn orderId={orderId} />}
            <button onClick={goBack} className="w-full py-3 rounded-xl text-gray-500 text-sm hover:bg-gray-50 transition-colors">
              {t.backToMenu}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
        <button onClick={goBack} className="flex items-center gap-2 text-gray-600 active:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{t.backToMenu}</span>
        </button>
        <h1 className="text-base font-bold text-gray-900">{t.checkout}</h1>
        <div className="flex items-center gap-1.5 text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{locale === 'es' ? 'Seguro' : 'Secure'}</span>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-6 space-y-6">

          {/* Order summary */}
          <div className="bg-white rounded-2xl p-5 space-y-3 border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t.myOrder}</p>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-start">
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
                      {item.qty}x {item.product.name}
                      {item.variant ? ` (${item.variant.name})` : ''}
                    </span>
                    <span className="font-semibold text-gray-900 flex-shrink-0 tabular-nums text-[15px]">{fmtPrice(item.lineTotal)}</span>
                  </div>
                  {(item.modifierSelections ?? []).length > 0 && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {(item.modifierSelections ?? []).flatMap(ms => ms.selectedOptions.map(o => o.name)).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {discount > 0 && (
              <div className="flex justify-between text-[15px] text-emerald-600 pt-1">
                <span>{t.discount}</span>
                <span className="font-semibold">-{fmtPrice(discount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-[15px] text-gray-500">
                <span>{locale === 'es' ? 'Envio' : 'Delivery'}</span>
                <span className="font-semibold tabular-nums">+{fmtPrice(deliveryFee)}</span>
              </div>
            )}
            {orderType === 'delivery' && deliveryFee === 0 && restaurant.order_types_enabled?.includes('delivery') && (
              <div className="flex justify-between text-[15px] text-emerald-600">
                <span>{locale === 'es' ? 'Envio' : 'Delivery'}</span>
                <span className="font-semibold">{locale === 'es' ? 'Gratis' : 'Free'}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-[15px] text-gray-500">
                <span>{locale === 'es' ? 'Propina' : 'Tip'}</span>
                <span className="font-semibold tabular-nums">+{fmtPrice(tipAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg">
              <span>{t.total}</span>
              <span className="tabular-nums">{fmtPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Order type */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">{t.orderType}</label>
            <div className={cn('grid gap-2', enabledOrderTypes.length === 3 ? 'grid-cols-3' : enabledOrderTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
              {enabledOrderTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    'py-3.5 px-3 rounded-xl text-[15px] font-semibold text-center transition-all duration-150 border-2',
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
                <AddressAutocomplete label={t.deliveryAddress} value={deliveryAddress} onChange={setDeliveryAddress} placeholder={t.deliveryAddressPlaceholder} dark={false} required />
              </div>
            )}
          </div>

          {/* Customer details */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{locale === 'es' ? 'Tus datos' : 'Your details'}</p>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">{t.yourName} <span className="text-red-500">*</span></label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t.yourNamePlaceholder} className={inputClass} />
            </div>
            <PhoneField label={t.yourPhone} value={customerPhone} onChange={setCustomerPhone} placeholder={t.yourPhonePlaceholder} required dark={false} />
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">{t.yourEmail} <span className="text-gray-400 font-normal text-xs">({t.optional})</span></label>
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder={t.yourEmailPlaceholder} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">{t.orderNotes} <span className="text-gray-400 font-normal text-xs">({t.optional})</span></label>
              <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder={t.orderNotesPlaceholder} rows={2} className={cn(inputClass, 'resize-none')} />
            </div>
          </div>

          {/* Payment method */}
          {enabledPaymentMethods.length > 1 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <label className="block text-sm font-semibold text-gray-900 mb-3">{t.paymentMethod}</label>
              <div className="space-y-2">
                {enabledPaymentMethods.map((method) => (
                  <label key={method} className={cn('flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150', paymentMethod === method ? 'border-gray-900 bg-gray-50' : 'border-gray-200')}>
                    <input type="radio" name="paymentMethod" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} className="w-5 h-5 text-gray-900 focus:ring-gray-900/20" />
                    <span className="text-[15px] font-medium text-gray-800">{method === 'cash' ? t.payCash : t.payOnline}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Promo code */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-2">{t.promoCode}</label>
            <div className="flex gap-2">
              <input type="text" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); setPromoResult(null); }} placeholder={t.promoCodePlaceholder} className={cn(inputClass, 'flex-1 uppercase')} />
              <button onClick={validatePromo} disabled={promoLoading || !promoCode.trim()} className="px-5 py-3.5 rounded-xl bg-gray-900 text-white text-[15px] font-semibold disabled:opacity-30 transition-colors">
                {promoLoading ? '...' : t.apply}
              </button>
            </div>
            {promoError && <p className="text-sm text-red-500 mt-2">{promoError}</p>}
            {promoResult?.valid && (
              <p className="text-sm text-emerald-600 mt-2 font-medium">{t.discount}: -{fmtPrice(promoResult.discount)}{promoResult.description && ` — ${promoResult.description}`}</p>
            )}
          </div>

          {/* Tip */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 mb-3">{locale === 'es' ? 'Deseas dejar propina?' : 'Add a tip?'}</label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20].map((pct) => {
                const isActive = tipPercent === pct && !customTip;
                const amt = Math.round(cartTotal * pct) / 100;
                return (
                  <button key={pct} type="button" onClick={() => { setTipPercent(isActive ? null : pct); setCustomTip(''); }} className={cn('flex flex-col items-center py-3 rounded-xl border-2 transition-all duration-150', isActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 active:border-gray-400')}>
                    <span className={cn('text-sm font-bold', isActive ? 'text-emerald-700' : 'text-gray-700')}>{pct}%</span>
                    <span className={cn('text-[11px] tabular-nums', isActive ? 'text-emerald-500' : 'text-gray-400')}>{fmtPrice(amt)}</span>
                  </button>
                );
              })}
              <div className="relative">
                <input type="number" min="0" step="0.5" value={customTip} onChange={(e) => { setCustomTip(e.target.value); setTipPercent(null); }} placeholder={locale === 'es' ? 'Otro' : 'Other'} className={cn('w-full h-full text-center rounded-xl border-2 text-sm font-bold transition-all duration-150 focus:outline-none placeholder-gray-400', customTip ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-700 focus:border-gray-400')} />
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t-2 border-gray-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
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
        {paymentMethod === 'online' && (
          <WalletButton
            amount={finalTotal}
            currency={restaurant.currency ?? 'MXN'}
            label={restaurant.name}
            disabled={submitting || items.length === 0 || !customerName.trim() || !customerPhone.trim()}
            onSuccess={() => { saveLastOrder(); clearCart(); setOrderNumber('WALLET'); setStep('confirmation'); }}
            onError={(msg) => setOrderError(msg)}
          />
        )}
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmitOrder}
            disabled={submitting || items.length === 0}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
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
    </div>
  );
}
