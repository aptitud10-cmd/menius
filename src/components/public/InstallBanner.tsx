'use client';

import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';
import Image from 'next/image';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { getTranslations } from '@/lib/translations';

interface InstallBannerProps {
  restaurantName: string;
  slug: string;
  logoUrl?: string | null;
  locale?: 'es' | 'en';
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function InstallBanner({ restaurantName, slug, logoUrl, locale = 'es' }: InstallBannerProps) {
  const t = getTranslations(locale);
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);

  const DISMISS_KEY = `install-dismissed-${slug}`;

  useEffect(() => {
    if (isInStandaloneMode()) return;
    const wasDismissed = localStorage.getItem(DISMISS_KEY);
    if (wasDismissed) return;
    setDismissed(false);

    // On iOS there's no beforeinstallprompt — show manual hint instead
    if (isIOS() && !canInstall) {
      // Delay so the user has time to browse first
      const timer = setTimeout(() => setIosHint(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [DISMISS_KEY, canInstall]);

  const dismiss = () => {
    setDismissed(true);
    setIosHint(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const handleInstall = async () => {
    setInstalling(true);
    const ok = await install();
    if (ok) setDismissed(true);
    setInstalling(false);
  };

  // Android/Chrome: native install prompt available
  if (!dismissed && canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[80] safe-bottom">
        <div className="mx-3 mb-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#e6faf7] flex items-center justify-center">
              {logoUrl ? (
                <Image src={logoUrl} alt={restaurantName} width={48} height={48} className="object-cover w-full h-full" />
              ) : (
                <span className="text-2xl">🍽️</span>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {t.installApp} {restaurantName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t.installQuickAccess}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0 transition-colors"
              aria-label={t.installClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Install button */}
          <div className="px-4 pb-4">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#05c8a7] hover:bg-[#04b096] active:scale-[0.98] text-white text-sm font-semibold transition-all disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {installing ? t.installInstalling : t.installAdd}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari: manual share hint
  if (!dismissed && iosHint && !canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[80] safe-bottom">
        <div className="mx-3 mb-3 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden text-white">
          <div className="flex items-start justify-between px-4 pt-4 pb-3 gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold">
                {t.installIosTitle} {restaurantName}
              </p>
              <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                Toca <Share className="inline w-3.5 h-3.5 mx-0.5 align-middle" /> {t.installIosThen} <strong>{t.installIosAddToHome}</strong>
              </p>
            </div>
            <button
              onClick={dismiss}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-white flex-shrink-0 mt-0.5 transition-colors"
              aria-label={t.installClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Arrow pointing down toward Safari share button */}
          <div className="flex justify-center pb-2">
            <div className="w-4 h-4 rotate-45 bg-gray-900 translate-y-2 border-r border-b border-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
