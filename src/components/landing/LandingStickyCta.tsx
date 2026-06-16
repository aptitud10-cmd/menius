'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LandingLocale } from '@/lib/landing-translations';

export function LandingStickyCta({ locale }: { locale: LandingLocale }) {
  const [visible, setVisible] = useState(false);
  // Dismissed for the session — 2026 best practice: a persistent CTA must be
  // closable or it reads as nagging. sessionStorage so it returns next visit.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('menius_sticky_cta_dismissed') === '1') {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    // IntersectionObserver on a sentinel div injected into document.body.
    // Immune to Safari's dynamic viewport (address bar show/hide changes
    // window.innerHeight, breaking scroll-based calculations).
    const topSentinel = document.createElement('div');
    topSentinel.style.cssText = 'position:absolute;top:500px;left:0;height:1px;width:1px;pointer-events:none';
    document.body.appendChild(topSentinel);

    const footer = document.querySelector('footer');

    let pastTop = false;
    let nearBottom = false;
    const update = () => setVisible(pastTop && !nearBottom);

    const topObs = new IntersectionObserver(
      ([e]) => { pastTop = !e.isIntersecting; update(); },
    );
    topObs.observe(topSentinel);

    let bottomObs: IntersectionObserver | null = null;
    if (footer) {
      bottomObs = new IntersectionObserver(
        ([e]) => { nearBottom = e.isIntersecting; update(); },
        { rootMargin: '200px 0px 0px 0px' },
      );
      bottomObs.observe(footer);
    }

    return () => {
      topObs.disconnect();
      bottomObs?.disconnect();
      topSentinel.remove();
    };
  }, [dismissed]);

  const dismiss = () => {
    sessionStorage.setItem('menius_sticky_cta_dismissed', '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-[#050505]/95 border-t border-white/[0.08] px-4 py-3 flex items-center gap-2.5">
        <Link
          href="/signup"
          className="flex-1 text-center py-3.5 rounded-xl bg-white text-black font-bold text-[15px] active:bg-gray-100 transition-colors"
        >
          {locale === 'es' ? 'Empezar gratis — sin tarjeta →' : 'Start free — no card needed →'}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={locale === 'es' ? 'Cerrar' : 'Dismiss'}
          className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl text-gray-500 hover:text-white active:bg-white/[0.06] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
