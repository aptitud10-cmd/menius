'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { FaqCategory } from '@/lib/faq-data';
import { CategoryFilter } from '@/components/ui/CategoryFilter';

interface FaqPageText {
  badge: string;
  title: string;
  subtitleSuffix: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaDemo: string;
}

interface FaqClientProps {
  categories: FaqCategory[];
  pt: FaqPageText;
}

export function FaqClient({ categories, pt }: FaqClientProps) {
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? '');
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      if (y < 80) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  const filterCategories = categories.map((cat) => ({
    id: cat.id,
    label: cat.title,
    count: cat.questions.length,
    icon: cat.icon,
  }));

  return (
    <>
      <section
        className={`sticky top-16 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04] transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <div className="max-w-5xl mx-auto">
          <CategoryFilter
            categories={filterCategories}
            active={activeId}
            onChange={(id) => id && setActiveId(id)}
            hideAll
            ariaLabel="FAQ categories"
          />
        </div>
      </section>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-20">
        {active && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <span className="text-2xl">{active.icon}</span>
              <h2 className="text-xl md:text-2xl font-semibold text-white">{active.title}</h2>
              <span className="ml-auto px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-gray-500">
                {active.questions.length}
              </span>
            </div>
            <div className="space-y-3">
              {active.questions.map((faq, i) => (
                <details key={i} className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-emerald-500/20 transition-colors duration-300">
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-inset">
                    <span className="text-[15px] font-medium text-gray-200 pr-4">{faq.q}</span>
                    <span className="faq-icon text-emerald-400 text-xl font-light transition-transform duration-200 flex-shrink-0 group-open:rotate-45">+</span>
                  </summary>
                  <div className="faq-answer px-6 pb-5">
                    <div className="text-sm text-gray-400 leading-relaxed">{faq.a}</div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        <div className="mt-20 relative text-center rounded-2xl overflow-hidden p-10 md:p-14">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-blue-600/10 rounded-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-semibold text-white tracking-tight mb-4">{pt.ctaTitle}</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed font-light">{pt.ctaSubtitle}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:soporte@menius.app"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all btn-glow"
              >
                soporte@menius.app
              </a>
              <Link
                href="/demo"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 text-gray-400 font-medium text-[15px] hover:text-white hover:border-white/20 transition-all"
              >
                {pt.ctaDemo}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
