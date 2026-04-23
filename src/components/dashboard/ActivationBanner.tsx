'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, QrCode, ArrowRight, Zap } from 'lucide-react';

interface ActivationBannerProps {
  slug: string;
  restaurantName: string;
  locale?: 'es' | 'en';
}

const t = {
  es: {
    eyebrow: 'Paso clave',
    headline: '¿Ya pusiste tu QR en las mesas?',
    sub: 'Es el único paso que falta para recibir tu primer pedido real.',
    cta: 'Ver mis QR',
    secondary: 'Ver mi menú como cliente',
    dismiss: 'Lo haré después',
  },
  en: {
    eyebrow: 'Key step',
    headline: 'Have you placed your QR on the tables?',
    sub: "It's the only step left to receive your first real order.",
    cta: 'View my QR codes',
    secondary: 'View menu as customer',
    dismiss: "I'll do it later",
  },
} as const;

export function ActivationBanner({ slug, restaurantName, locale = 'es' }: ActivationBannerProps) {
  const storageKey = `menius-activation-dismissed-${slug}`;
  const [visible, setVisible] = useState(false);
  const s = t[locale];

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) setVisible(true);
  }, [storageKey]);

  const dismiss = () => {
    // Re-shows after 3 days so the reminder persists
    const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem(storageKey, String(threeDaysFromNow));
    setVisible(false);
  };

  // Check if dismissal has expired
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored && !isNaN(Number(stored))) {
      if (Date.now() > Number(stored)) {
        localStorage.removeItem(storageKey);
        setVisible(true);
      }
    }
  }, [storageKey]);

  if (!visible) return null;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app').replace(/\/$/, '');
  const menuUrl = `${appUrl}/${slug}`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4 md:p-5 mb-6">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/60 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />

      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center transition-colors flex-shrink-0"
        aria-label={locale === 'en' ? 'Close' : 'Cerrar'}
      >
        <X className="w-3.5 h-3.5 text-amber-700" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-8">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
          <QrCode className="w-5 h-5 text-amber-700" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
              <Zap className="w-2.5 h-2.5" />
              {s.eyebrow}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{s.headline}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {s.secondary}
          </a>
          <Link
            href="/app/tables"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors shadow-sm shadow-amber-200"
          >
            {s.cta}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
