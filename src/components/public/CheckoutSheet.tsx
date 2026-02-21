'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, ArrowLeft, CheckCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import type { Restaurant, OrderType, PaymentMethod } from '@/types';
import type { Translations, Locale } from '@/lib/translations';

const AddressAutocomplete = dynamic(
  () => import('@/components/ui/AddressAutocomplete').then((m) => ({ default: m.AddressAutocomplete })),
  { ssr: false }
);
const PhoneField = dynamic(
  () => import('@/components/ui/PhoneField').then((m) => ({ default: m.PhoneField })),
  { ssr: false }
);

interface CheckoutSheetProps {
  restaurant: Restaurant;
  onClose: () => void;
  fmtPrice: (n: number) => string;
  t: Translations;
  locale: Locale;
}

type CheckoutStep = 'form' | 'confirmation';

export function CheckoutSheet({
  restaurant,
  onClose,
  fmtPrice,
  t,
  locale,
}: CheckoutSheetProps) {
  const items = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));
  const clearCart = useCartStore((s) => s.clearCart);
  const tableName = useCartStore((s) => s.tableName);
  const welcomeOrderType = useCartStore((s) => s.selectedOrderType);

  const enabledOrderTypes = restaurant.order_types_enabled?.length
    ? restaurant.order_types_enabled
    : (['dine_in', 'pickup', 'delivery'] as OrderType[]);
  const enabledPaymentMethods = restaurant.payment_methods_enabled?.length
    ? restaurant.payment_methods_enabled
    : (['cash'] as PaymentMethod[]);

  const [step, setStep] = useState<CheckoutStep>('form');
  const [closing, setClosing] = useState(false);

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

  const discount = promoResult?.valid ? promoResult.discount : 0;
  const finalTotal = Math.max(0, cartTotal - discount);

  const [vvH, setVvH] = useState<string>('100dvh');

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const vv = window.visualViewport;
    if (vv) {
      const sync = () => {
        setVvH(`${vv.height}px`);
        document.documentElement.style.setProperty('--vv-top', `${vv.offsetTop}px`);
      };
      sync();
      vv.addEventListener('resize', sync);
      vv.addEventListener('scroll', sync);
      return () => {
        document.body.style.overflow = '';
        vv.removeEventListener('resize', sync);
        vv.removeEventListener('scroll', sync);
        document.documentElement.style.removeProperty('--vv-top');
      };
    }

    return () => { document.body.style.overflow = ''; };
  }, []);

  const animateClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch('/api/orders/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          restaurant_id: restaurant.id,
          order_total: cartTotal,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromoResult(data);
      } else {
        setPromoError(data.error);
        setPromoResult(null);
      }
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

      if (!res.ok) {
        setOrderError(data.error || 'Error enviando orden');
        return;
      }

      setOrderNumber(data.order_number);
      setOrderId(data.order_id);
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
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPayLoading(false);
      }
    } catch {
      setPayLoading(false);
    }
  };

  // ── Confirmation step ──
  if (step === 'confirmation') {
    return (
      <div className="fixed inset-0 z-50">
        <div className={cn('absolute inset-0 bg-black/40 transition-opacity duration-200', closing ? 'opacity-0' : 'opacity-100')} onClick={animateClose} />
        <div className={cn('absolute inset-y-0 right-0 w-full sm:w-[500px] lg:w-[600px] bg-white flex flex-col shadow-2xl transition-transform duration-250 ease-out', closing ? 'translate-x-full' : 'translate-x-0')}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
            <span />
            <button onClick={animateClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t.orderSent}</h2>
            <p className="text-sm text-gray-500 mb-2">{t.orderSentDesc}</p>
            <p className="text-3xl font-bold text-gray-900 mb-3 tabular-nums">#{orderNumber}</p>
            {restaurant.estimated_delivery_minutes && orderType === 'delivery' && (
              <p className="text-sm text-gray-400 mb-6">
                ⏱ {locale === 'es' ? 'Tiempo estimado' : 'Estimated time'}: ~{restaurant.estimated_delivery_minutes} min
              </p>
            )}

            <div className="w-full space-y-3 max-w-xs">
              {paymentMethod === 'online' && orderId && (
                restaurant.id.startsWith('demo') ? (
                  <div className="w-full py-3 rounded-xl bg-gray-100 text-center">
                    <p className="text-sm font-semibold text-gray-500">{locale === 'es' ? '💳 Pago con tarjeta vía Stripe' : '💳 Card payment via Stripe'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{locale === 'es' ? 'Disponible en producción' : 'Available in production'}</p>
                  </div>
                ) : (
                  <button
                    onClick={handlePayOnline}
                    disabled={payLoading}
                    className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {payLoading ? t.redirecting : t.payNow}
                  </button>
                )
              )}
              {!restaurant.id.startsWith('demo') && (
                <a
                  href={`/r/${restaurant.slug}/orden/${orderNumber}`}
                  className="block w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm text-center hover:bg-gray-800 transition-colors"
                >
                  {t.trackOrder}
                </a>
              )}
              <button
                onClick={animateClose}
                className="w-full py-2.5 rounded-xl text-gray-500 text-sm hover:bg-gray-50 transition-colors"
              >
                {t.backToMenu}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white';

  // ── Checkout form ──
  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn('absolute inset-0 bg-black/50 transition-opacity duration-200', closing ? 'opacity-0' : 'opacity-100')}
        onClick={animateClose}
      />
      <div
        className={cn(
          'fixed top-0 left-0 right-0 lg:left-auto lg:w-[600px]',
          'bg-white flex flex-col shadow-2xl',
          'transition-transform duration-250 ease-out',
          closing ? 'translate-y-full lg:translate-y-0 lg:translate-x-full' : 'translate-y-0 lg:translate-x-0'
        )}
        style={{ height: vvH, top: 'var(--vv-top, 0px)' }}
      >
        {/* Header — always visible */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <button onClick={animateClose} className="flex items-center gap-1.5 p-2 -ml-2 rounded-lg active:bg-gray-100 transition-colors" aria-label="Back">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-500 lg:hidden">{t.backToMenu}</span>
            </button>
          </div>
          <h2 className="text-base font-bold text-gray-900 absolute left-1/2 -translate-x-1/2">{t.checkout}</h2>
          <button onClick={animateClose} className="p-2 rounded-lg active:bg-gray-100 transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 space-y-6">

          {/* Order summary — at top for context */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              {t.myOrder}
            </p>
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[15px]">
                <span className="text-gray-700 truncate mr-3">
                  {item.qty}x {item.product.name}
                  {item.variant ? ` (${item.variant.name})` : ''}
                </span>
                <span className="font-semibold text-gray-900 flex-shrink-0 tabular-nums">
                  {fmtPrice(item.lineTotal)}
                </span>
              </div>
            ))}
            {discount > 0 && (
              <div className="flex justify-between text-[15px] text-emerald-600">
                <span>{t.discount}</span>
                <span className="font-semibold">-{fmtPrice(discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg">
              <span>{t.total}</span>
              <span className="tabular-nums">{fmtPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Order type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {t.orderType}
            </label>
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
          </div>

          {orderType === 'delivery' && (
            <AddressAutocomplete
              label={t.deliveryAddress}
              value={deliveryAddress}
              onChange={setDeliveryAddress}
              placeholder={t.deliveryAddressPlaceholder}
              dark={false}
              required
            />
          )}

          {/* Customer details */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t.yourName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t.yourNamePlaceholder}
                className={inputClass}
              />
            </div>
            <PhoneField
              label={t.yourPhone}
              value={customerPhone}
              onChange={setCustomerPhone}
              placeholder={t.yourPhonePlaceholder}
              required
              dark={false}
            />
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t.yourEmail} <span className="text-gray-400 font-normal text-xs">({t.optional})</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder={t.yourEmailPlaceholder}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {t.orderNotes} <span className="text-gray-400 font-normal text-xs">({t.optional})</span>
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={t.orderNotesPlaceholder}
                rows={2}
                className={cn(inputClass, 'resize-none')}
              />
            </div>
          </div>

          {/* Payment method */}
          {enabledPaymentMethods.length > 1 && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                {t.paymentMethod}
              </label>
              <div className="space-y-2">
                {enabledPaymentMethods.map((method) => (
                  <label
                    key={method}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150',
                      paymentMethod === method
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200'
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="w-5 h-5 text-gray-900 focus:ring-gray-900/20"
                    />
                    <span className="text-[15px] font-medium text-gray-800">
                      {method === 'cash' ? t.payCash : t.payOnline}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Promo code */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              {t.promoCode}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); setPromoResult(null); }}
                placeholder={t.promoCodePlaceholder}
                className={cn(inputClass, 'flex-1 uppercase')}
              />
              <button
                onClick={validatePromo}
                disabled={promoLoading || !promoCode.trim()}
                className="px-5 py-3.5 rounded-xl bg-gray-900 text-white text-[15px] font-semibold disabled:opacity-30 transition-colors"
              >
                {promoLoading ? '...' : t.apply}
              </button>
            </div>
            {promoError && <p className="text-sm text-red-500 mt-2">{promoError}</p>}
            {promoResult?.valid && (
              <p className="text-sm text-emerald-600 mt-2 font-medium">
                {t.discount}: -{fmtPrice(promoResult.discount)}
                {promoResult.description && ` — ${promoResult.description}`}
              </p>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t-2 border-gray-100 px-5 py-4 flex-shrink-0 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
          {orderError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 mb-3">
              <span className="text-red-700 text-sm font-medium">{orderError}</span>
            </div>
          )}
          <button
            onClick={handleSubmitOrder}
            disabled={submitting || items.length === 0}
            className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold text-base active:scale-[0.98] transition-all duration-150 disabled:opacity-50 shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
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
