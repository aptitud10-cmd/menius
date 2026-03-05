'use client';

import type { LandingLocale } from '@/lib/landing-translations';

export function LocaleSwitcher({ locale }: { locale: LandingLocale }) {
  const switchLocale = (l: LandingLocale) => {
    if (l === locale) return;
    document.cookie = `menius_locale=${l};path=/;max-age=${365 * 86400};SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => switchLocale('es')}
        aria-label="Español"
        className={`px-1.5 py-0.5 rounded transition-colors ${locale === 'es' ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}
      >
        ES
      </button>
      <span className="text-gray-700">|</span>
      <button
        onClick={() => switchLocale('en')}
        aria-label="English"
        className={`px-1.5 py-0.5 rounded transition-colors ${locale === 'en' ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}
      >
        EN
      </button>
    </div>
  );
}
