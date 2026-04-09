'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LandingLocale } from '@/lib/landing-translations';

export function LandingStickyCta({ locale }: { locale: LandingLocale }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const nearBottom = scrollY + window.innerHeight > document.body.scrollHeight - 200;
      setVisible(scrollY > 500 && !nearBottom);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-[#050505]/95 backdrop-blur-xl border-t border-white/[0.08] px-4 py-3">
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
