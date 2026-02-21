'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { loadStripe, type Stripe, type PaymentRequest } from '@stripe/stripe-js';

interface WalletButtonProps {
  amount: number;
  currency: string;
  label: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  orderId?: string;
  orderNumber?: string;
  disabled?: boolean;
}

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export function WalletButton({
  amount,
  currency,
  label,
  onSuccess,
  onError,
  orderId,
  orderNumber,
  disabled,
}: WalletButtonProps) {
  const [canPay, setCanPay] = useState(false);
  const [walletType, setWalletType] = useState<'applePay' | 'googlePay' | 'link' | null>(null);
  const [paying, setPaying] = useState(false);
  const prRef = useRef<PaymentRequest | null>(null);
  const stripeRef = useRef<Stripe | null>(null);

  const callbacksRef = useRef({ onSuccess, onError, orderId, orderNumber, amount, currency });
  callbacksRef.current = { onSuccess, onError, orderId, orderNumber, amount, currency };

  useEffect(() => {
    if (!stripePromise) return;
    let cancelled = false;

    stripePromise.then((s) => {
      if (cancelled || !s) return;
      stripeRef.current = s;

      const paymentRequest = s.paymentRequest({
        country: 'MX',
        currency: currency.toLowerCase(),
        total: { label, amount: Math.round(amount * 100) },
        requestPayerName: false,
        requestPayerEmail: false,
      });

      paymentRequest.on('paymentmethod', async (ev) => {
        const cb = callbacksRef.current;
        try {
          const res = await fetch('/api/payments/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: cb.amount,
              currency: cb.currency.toLowerCase(),
              order_id: cb.orderId,
              order_number: cb.orderNumber,
            }),
          });
          const data = await res.json();

          if (!data.clientSecret) {
            ev.complete('fail');
            cb.onError(data.error || 'Payment failed');
            setPaying(false);
            return;
          }

          const { error, paymentIntent } = await s.confirmCardPayment(
            data.clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
          );

          if (error) {
            ev.complete('fail');
            cb.onError(error.message ?? 'Payment failed');
            setPaying(false);
            return;
          }

          if (paymentIntent?.status === 'requires_action') {
            ev.complete('success');
            const { error: confirmError } = await s.confirmCardPayment(data.clientSecret);
            if (confirmError) {
              cb.onError(confirmError.message ?? 'Payment failed');
            } else {
              cb.onSuccess();
            }
          } else {
            ev.complete('success');
            cb.onSuccess();
          }
          setPaying(false);
        } catch {
          ev.complete('fail');
          cb.onError('Connection error');
          setPaying(false);
        }
      });

      paymentRequest.on('cancel', () => {
        setPaying(false);
      });

      paymentRequest.canMakePayment().then((result) => {
        if (cancelled) return;
        if (result) {
          setCanPay(true);
          setWalletType(result.applePay ? 'applePay' : result.googlePay ? 'googlePay' : 'link');
          prRef.current = paymentRequest;
        }
      });
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prRef.current) {
      prRef.current.update({
        total: { label, amount: Math.round(amount * 100) },
      });
    }
  }, [amount, label]);

  const handleClick = useCallback(() => {
    if (!prRef.current || paying || disabled) return;
    setPaying(true);
    prRef.current.show();
  }, [paying, disabled]);

  if (!canPay) return null;

  const isApple = walletType === 'applePay';

  return (
    <button
      onClick={handleClick}
      disabled={paying || disabled}
      className={cn(
        'w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 disabled:opacity-50',
        isApple ? 'bg-black text-white' : 'bg-white text-gray-900 border-2 border-gray-200'
      )}
    >
      {paying ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : isApple ? (
        <span className="flex items-center gap-1">
          <ApplePayIcon />
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <GooglePayIcon />
        </span>
      )}
    </button>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function ApplePayIcon() {
  return (
    <svg viewBox="0 0 43 18" className="h-6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.57 3.31c-.5.59-1.3 1.05-2.1 1-.1-.8.3-1.64.74-2.16C6.71 1.56 7.58 1.06 8.29 1c.08.83-.24 1.65-.72 2.31zm.71 1.17c-1.17-.07-2.16.66-2.71.66-.56 0-1.42-.63-2.34-.61-1.2.02-2.31.7-2.93 1.78-1.25 2.16-.32 5.36.9 7.12.6.87 1.3 1.83 2.24 1.8.9-.04 1.24-.58 2.33-.58 1.09 0 1.39.58 2.33.56.97-.02 1.57-.87 2.17-1.74.68-.99.96-1.95.97-2 0-.02-1.87-.72-1.88-2.86-.02-1.78 1.46-2.64 1.52-2.68-.83-1.22-2.12-1.36-2.58-1.39l-.02-.06z"/>
      <path d="M18.02 2.14c3.04 0 5.16 2.1 5.16 5.15 0 3.07-2.15 5.18-5.22 5.18h-3.37v5.36h-2.44V2.14h5.87zm-3.43 8.27h2.8c2.12 0 3.32-1.14 3.32-3.12 0-1.98-1.2-3.11-3.31-3.11h-2.81v6.23z"/>
      <path d="M24.15 13.59c0-2 1.53-3.23 4.25-3.38l3.13-.18v-.89c0-1.27-.86-2.03-2.3-2.03-1.36 0-2.21.64-2.42 1.64h-2.23c.12-2.07 1.92-3.58 4.72-3.58 2.77 0 4.55 1.47 4.55 3.75v7.88h-2.26v-1.88h-.05c-.66 1.28-2.1 2.07-3.6 2.07-2.23 0-3.79-1.38-3.79-3.4zm7.38-1.03v-.91l-2.82.17c-1.4.09-2.2.73-2.2 1.72 0 1.01.83 1.67 2.1 1.67 1.65 0 2.92-1.13 2.92-2.65z"/>
      <path d="M36.41 21.06v-1.92c.18.05.58.05.74.05 1.06 0 1.63-.45 1.98-1.59l.21-.68-4.02-11.1h2.54l2.81 8.97h.04l2.81-8.97h2.47l-4.17 11.6c-.95 2.68-2.05 3.55-4.35 3.55-.17 0-.87-.04-1.06-.08v.17z"/>
    </svg>
  );
}

function GooglePayIcon() {
  return (
    <svg viewBox="0 0 150 22" className="h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.95 5.83c2.86 0 4.9 1.99 4.9 4.87 0 2.9-2.06 4.9-4.96 4.9H7.69v5.07h-2.3V5.83h5.56zm-3.26 7.83h2.66c2.01 0 3.15-1.08 3.15-2.96s-1.14-2.95-3.14-2.95H7.69v5.91z" fill="#3C4043"/>
      <path d="M20.28 9.08c2.18 0 3.57 1.46 3.57 3.78v.63h-5.54c.07 1.37.94 2.22 2.24 2.22.93 0 1.62-.41 1.84-1.07h1.57c-.37 1.47-1.67 2.43-3.44 2.43-2.33 0-3.82-1.59-3.82-3.99 0-2.39 1.48-4 3.58-4zm-1.98 3.14h3.94c-.03-1.18-.86-1.96-1.95-1.96-1.1 0-1.89.79-1.99 1.96z" fill="#3C4043"/>
      <path d="M25.87 17.07l2.84-7.84h1.6l-3.63 9.67c-.67 1.77-1.42 2.26-2.76 2.26-.21 0-.53-.03-.65-.06v-1.32c.13.02.38.05.55.05.62 0 .98-.27 1.28-1.04l.2-.52-3.14-9.04h1.64l2.07 7.84z" fill="#3C4043"/>
      <path d="M44.5 5.53l-5.49 12.65h-2.37l2.04-4.43L34.94 5.53h2.5L40 12.3l2.13-6.77h2.37z" fill="#4285F4"/>
      <path d="M49.63 9.15c2.19 0 3.65 1.58 3.65 3.98 0 2.4-1.46 3.98-3.65 3.98-1.28 0-2.19-.54-2.72-1.42h-.06v4.14h-1.52V9.3h1.46v1.33h.06c.55-.92 1.49-1.48 2.78-1.48zm-.39 6.56c1.5 0 2.42-1.18 2.42-2.58 0-1.41-.92-2.58-2.42-2.58-1.49 0-2.41 1.19-2.41 2.58 0 1.4.92 2.58 2.41 2.58z" fill="#4285F4"/>
      <path d="M58.58 9.3v1.25c-.13-.02-.29-.04-.47-.04-1.44 0-2.27.95-2.27 2.53v4.63h-1.52V9.3h1.46v1.47h.06c.42-1.02 1.3-1.58 2.32-1.58.15 0 .3.02.42.05v.06z" fill="#4285F4"/>
      <path d="M62.35 9.15c2.18 0 3.57 1.46 3.57 3.78v.63H60.4c.07 1.37.93 2.22 2.23 2.22.93 0 1.63-.41 1.84-1.07h1.58c-.38 1.47-1.68 2.43-3.44 2.43-2.33 0-3.82-1.59-3.82-3.99 0-2.39 1.48-4 3.58-4zm-1.98 3.14h3.94c-.04-1.18-.86-1.96-1.96-1.96-1.1 0-1.88.79-1.98 1.96z" fill="#4285F4"/>
      <path d="M70.53 9.15c1.3 0 2.24.54 2.79 1.48h.06V9.3h1.46v7.63c0 2.29-1.49 3.7-3.73 3.7-2.07 0-3.42-1.1-3.58-2.64h1.54c.2.8.92 1.29 2.05 1.29 1.37 0 2.2-.84 2.2-2.22v-1.38h-.06c-.55.89-1.5 1.42-2.73 1.42-2.2 0-3.63-1.62-3.63-3.94 0-2.32 1.44-3.94 3.63-3.94v-.01zm.24 6.5c1.47 0 2.41-1.16 2.41-2.54 0-1.38-.94-2.53-2.41-2.53-1.48 0-2.37 1.14-2.37 2.53 0 1.4.89 2.54 2.37 2.54z" fill="#4285F4"/>
      <path d="M79.75 9.15c2.19 0 3.65 1.58 3.65 3.98 0 2.4-1.46 3.98-3.65 3.98-1.28 0-2.19-.54-2.72-1.42h-.06v4.14h-1.53V9.3h1.47v1.33h.06c.55-.92 1.49-1.48 2.78-1.48zm-.38 6.56c1.5 0 2.42-1.18 2.42-2.58 0-1.41-.92-2.58-2.42-2.58-1.49 0-2.42 1.19-2.42 2.58 0 1.4.93 2.58 2.42 2.58z" fill="#4285F4"/>
      <path d="M87.33 9.15c2.18 0 3.57 1.46 3.57 3.78v.63H85.4c.07 1.37.93 2.22 2.23 2.22.93 0 1.62-.41 1.84-1.07h1.57c-.37 1.47-1.67 2.43-3.43 2.43-2.33 0-3.82-1.59-3.82-3.99 0-2.39 1.48-4 3.57-4v.04zm-1.98 3.14h3.94c-.03-1.18-.86-1.96-1.95-1.96-1.1 0-1.89.79-1.99 1.96z" fill="#4285F4"/>
      <path d="M95.05 9.15c2.18 0 3.57 1.46 3.57 3.78v.63h-5.54c.07 1.37.93 2.22 2.23 2.22.93 0 1.62-.41 1.84-1.07h1.57c-.37 1.47-1.67 2.43-3.43 2.43-2.33 0-3.82-1.59-3.82-3.99 0-2.39 1.48-4 3.58-4zm-1.98 3.14h3.94c-.03-1.18-.86-1.96-1.96-1.96-1.1 0-1.88.79-1.98 1.96z" fill="#4285F4"/>
      <path d="M103.12 9.15c1.36 0 2.36.62 2.84 1.68h.05V5.53h1.52v12.14h-1.46v-1.33h-.06c-.55.92-1.48 1.48-2.81 1.48-2.22 0-3.66-1.62-3.66-3.98 0-2.36 1.44-4.02 3.58-3.69zm.3 6.56c1.49 0 2.42-1.18 2.42-2.58 0-1.41-.93-2.58-2.42-2.58-1.49 0-2.38 1.17-2.38 2.58 0 1.4.89 2.58 2.38 2.58z" fill="#4285F4"/>
      <path d="M113.15 14.04c-.17 1.77-1.73 3.1-3.87 3.1-2.65 0-4.25-1.75-4.25-4.51v-.2c0-2.71 1.63-4.53 4.18-4.53 2.32 0 3.83 1.49 3.9 3.47h-1.86c-.1-1.18-.9-1.93-2.06-1.93-1.39 0-2.21 1.17-2.21 3v.21c0 1.86.82 3.01 2.22 3.01 1.13 0 1.93-.69 2.08-1.82l1.87.2z" fill="#EA4335" />
      <path d="M119.38 9.15c2.18 0 3.65 1.62 3.65 4.02 0 2.39-1.47 3.98-3.65 3.98s-3.66-1.58-3.66-3.98c0-2.4 1.49-4.02 3.66-4.02zm0 6.56c1.49 0 2.38-1.17 2.38-2.54 0-1.38-.89-2.58-2.38-2.58-1.5 0-2.39 1.2-2.39 2.58 0 1.37.89 2.54 2.39 2.54z" fill="#EA4335"/>
      <path d="M128.03 9.15c1.35 0 2.35.62 2.84 1.68h.05V5.53h1.52v12.14h-1.46v-1.33h-.06c-.55.92-1.48 1.48-2.81 1.48-2.22 0-3.66-1.62-3.66-3.98 0-2.36 1.44-4.02 3.58-3.69zm.3 6.56c1.49 0 2.41-1.18 2.41-2.58 0-1.41-.92-2.58-2.41-2.58-1.5 0-2.39 1.17-2.39 2.58 0 1.4.89 2.58 2.39 2.58z" fill="#EA4335"/>
      <path d="M137.21 9.15c2.18 0 3.57 1.46 3.57 3.78v.63h-5.54c.07 1.37.93 2.22 2.23 2.22.93 0 1.62-.41 1.84-1.07h1.57c-.37 1.47-1.67 2.43-3.43 2.43-2.33 0-3.82-1.59-3.82-3.99 0-2.39 1.48-4 3.58-4zm-1.98 3.14h3.94c-.03-1.18-.86-1.96-1.96-1.96-1.1 0-1.88.79-1.98 1.96z" fill="#EA4335"/>
    </svg>
  );
}
