'use client';

import type { LandingV2Locale } from '@/lib/landing-v2-copy';

/** EN · ES: guarda la cookie que lee el servidor (como LocaleSwitcher) y recarga. */
export function V2LocaleSwitch({ locale, label }: { locale: LandingV2Locale; label: string }) {
  const other: LandingV2Locale = locale === 'en' ? 'es' : 'en';
  const switchTo = () => {
    document.cookie = `menius_locale=${other};path=/;max-age=${365 * 86400};SameSite=Lax`;
    window.location.reload();
  };
  return (
    <span className="lang" role="group" aria-label={label}>
      <b lang={locale} aria-current="true">{locale.toUpperCase()}</b>
      <span aria-hidden="true"> · </span>
      <button type="button" lang={other} onClick={switchTo} aria-label={other === 'es' ? 'Español' : 'English'}>
        {other.toUpperCase()}
      </button>
    </span>
  );
}
