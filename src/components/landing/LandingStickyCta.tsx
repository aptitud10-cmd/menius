'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LandingLocale } from '@/lib/landing-translations';

export function LandingStickyCta({ locale }: { locale: LandingLocale }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // IntersectionObserver on a sentinel div injected into document.body.
    // Immune to Safari's dynamic viewport (address bar show/hide changes
    // window.innerHeight, breaking scroll-based calculations).
    const topSentinel = document.createElement('div');
    topSentinel.style.cssText = 'position:absolute;top:500px;left:0;height:1px;width:1px;pointer-events:none';
    document.body.appendChild(topSentinel);

    const footer = document.querySelector('footer') ?? document.body.lastElementChild;

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
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-[#050505]/95 border-t border-white/[0.08] px-4 py-3">
        <Link
          href="/signup"
          className="block w-full text-center py-3.5 rounded-xl bg-white text-black font-bold text-[15px] active:bg-gray-100 transition-colors"
        >
          {locale === 'es' ? 'Empezar gratis — sin tarjeta →' : 'Start free — no card needed →'}
        </Link>
      </div>
    </div>
  );
}
