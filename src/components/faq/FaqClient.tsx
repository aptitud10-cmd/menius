'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { FaqCategory } from '@/lib/faq-data';

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
  totalQuestions: number;
}

export function FaqClient({ categories, pt, totalQuestions }: FaqClientProps) {
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? '');

  const active = categories.find(c => c.id === activeId) ?? categories[0];

  return (
    <>
      {/* Sticky category nav */}
      <section className="sticky top-16 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide -mx-2 px-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveId(cat.id)}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                  activeId === cat.id
                    ? 'text-white bg-white/[0.10] border border-white/[0.08]'
                    : 'text-gray-500 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.title}</span>
                {activeId === cat.id && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {cat.questions.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </section>

      {/* FAQ content — only active category */}
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
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none">
                    <span className="text-[15px] font-medium text-gray-200 pr-4">{faq.q}</span>
                    <span className="faq-icon text-emerald-400 text-xl font-light transition-transform duration-200 flex-shrink-0 group-open:rotate-45">+</span>
                  </summary>
                  <div className="faq-answer px-6 pb-5">
                    <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
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
