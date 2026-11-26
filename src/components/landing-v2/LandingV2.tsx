import type { ReactNode } from 'react';
import { getLandingV2Copy, type LandingV2Locale } from '@/lib/landing-v2-copy';
import { lv2SerifItalic, lv2Stamp } from './fonts';
import { V2Hero, V2Nav } from './V2Header';
import { V2Site, V2Story, V2Zero } from './V2Story';
import { V2Faq, V2Month, V2Pricing, V2Setup } from './V2Business';
import { V2Closing, V2Footer } from './V2Closing';
import { V2StickyCta } from './V2StickyCta';
import './landing-v2.css';

/**
 * Landing "One order, start to finish." (maqueta aprobada 2026-11-26).
 * `root-scroll`: en ≤768px esta raíz es el scroller (body scroll container,
 * globals.css) por el bug del rebote de iOS Safari; el JS que lee scroll usa
 * su scrollTop, no window.
 */
export function LandingV2({ locale, children }: { locale: LandingV2Locale; children?: ReactNode }) {
  const c = getLandingV2Copy(locale);
  return (
    <div className={`lv2 root-scroll ${lv2SerifItalic.variable} ${lv2Stamp.variable}`} lang={locale}>
      {children}
      <V2Nav c={c} locale={locale} />
      <main id="main-content">
        <V2Hero c={c} />
        <V2Zero c={c} />
        <V2Story c={c} />
        <V2Site c={c} />
        <V2Month c={c} />
        <V2Setup c={c} />
        <V2Pricing c={c} />
        <V2Faq c={c} />
        <V2Closing c={c} />
      </main>
      <V2Footer c={c} locale={locale} />
      <V2StickyCta b={c.sticky.b} t={c.sticky.t} cta={c.nav.tryPro} closeLabel={c.sticky.close} />
    </div>
  );
}
