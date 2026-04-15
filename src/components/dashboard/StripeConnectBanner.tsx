'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, X } from 'lucide-react';

const DISMISSED_KEY = 'stripe-banner-dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StripeConnectBannerProps {
  stripeOnboardingComplete: boolean;
  isEn?: boolean;
}

export function StripeConnectBanner({ stripeOnboardingComplete, isEn = false }: StripeConnectBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (stripeOnboardingComplete) return;
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (raw) {
        const dismissedAt = parseInt(raw, 10);
        if (Date.now() - dismissedAt < DISMISS_TTL_MS) return;
      }
    } catch {
      // localStorage not available
    }
    setVisible(true);
  }, [stripeOnboardingComplete]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative flex items-center gap-3 bg-indigo-600 px-4 py-2.5 text-white text-sm">
      <CreditCard className="w-4 h-4 flex-shrink-0 opacity-90" />
      <p className="flex-1 text-center font-medium">
        {isEn
          ? 'Accept card payments and sell up to 30% more'
          : 'Acepta pagos con tarjeta y vende hasta 30% más'}
        {' — '}
        <Link
          href="/app/settings"
          className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
        >
          {isEn ? 'Set up now' : 'Configúralo ahora'}
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label={isEn ? 'Dismiss' : 'Cerrar'}
        className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
