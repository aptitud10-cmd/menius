import type { ReactNode } from 'react';
import { getLandingV2Copy, type LandingV2Locale } from '@/lib/landing-v2-copy';
import { lv2SerifItalic, lv2Stamp } from './fonts';
import { V2Nav } from './V2Header';
import { V2Footer } from './V2Closing';
import './landing-v2.css';
import './lv2-pages.css';

/**
 * Shell de las páginas de marketing fuera de la landing (fase 2 del rediseño):
 * el mismo nav y el mismo pie que `/`, con los anclajes apuntando a la landing.
 *
 * `root-scroll`: en ≤768px esta raíz es el scroller (body scroll container,
 * globals.css) por el bug del rebote de iOS Safari. El JS que lea scroll usa
 * este elemento, no window. Las páginas ponen su propio <main id="main-content">.
 *
 * `inApp`: login dentro de la app Counter (WebView): sin links del nav ni pie.
 */
export function V2Page({
  locale,
  children,
  ctaSlot,
  inApp = false,
  footer = true,
}: {
  locale: LandingV2Locale;
  children: ReactNode;
  ctaSlot?: ReactNode;
  inApp?: boolean;
  footer?: boolean;
}) {
  const c = getLandingV2Copy(locale);
  return (
    <div
      className={`lv2 lv2p root-scroll ${lv2SerifItalic.variable} ${lv2Stamp.variable}${inApp ? ' in-app' : ''}`}
      lang={locale}
    >
      <V2Nav c={c} locale={locale} base="/" ctaSlot={ctaSlot} />
      {children}
      {footer && <V2Footer c={c} locale={locale} base="/" />}
    </div>
  );
}
