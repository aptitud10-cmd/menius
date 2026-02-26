import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';
import { getFaqCategories, getFaqPageText } from '@/lib/faq-data';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — FAQ | MENIUS',
  description: 'Respuestas a las preguntas más comunes sobre MENIUS: configuración, precios, pedidos, pagos, integraciones, soporte, seguridad y más.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ — MENIUS',
    description: 'Todo lo que necesitas saber sobre menús digitales, pedidos online y pagos con MENIUS.',
    type: 'website',
  },
};

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as any).props.children);
  }
  return '';
}

export default function FaqPage() {
  const cookieStore = cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;

  const categories = getFaqCategories(locale);
  const pt = getFaqPageText(locale);
  const totalQuestions = categories.reduce((acc, cat) => acc + cat.questions.length, 0);

  const allQuestions = categories.flatMap((cat) => cat.questions);
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allQuestions.map((q) => ({
      '@type': 'Question',
      name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: extractText(q.a) },
    })),
  };

  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <LandingNav locale={locale} />

      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] font-medium mb-5">{pt.badge}</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-5">{pt.title}</h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto font-light">
            {totalQuestions}{pt.subtitleSuffix}
          </p>
        </div>
      </section>

      <section className="sticky top-16 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide -mx-2 px-2">
            {categories.map((cat) => (
              <a key={cat.id} href={`#${cat.id}`} className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors duration-200">
                <span className="text-base">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.title}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-20">
        {categories.map((cat) => (
          <section key={cat.id} id={cat.id} className="mb-14 last:mb-0 scroll-mt-36">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="text-xl md:text-2xl font-semibold text-white">{cat.title}</h2>
              <span className="ml-auto px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-gray-500">
                {cat.questions.length}
              </span>
            </div>
            <div className="space-y-3">
              {cat.questions.map((faq, i) => (
                <details key={i} className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-emerald-500/20 transition-colors duration-300">
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer">
                    <span className="text-[15px] font-medium text-gray-200 pr-4">{faq.q}</span>
                    <span className="faq-icon text-emerald-400 text-xl font-light transition-transform duration-200 flex-shrink-0">+</span>
                  </summary>
                  <div className="faq-answer px-6 pb-5">
                    <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-20 relative text-center rounded-2xl overflow-hidden p-10 md:p-14">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-blue-600/10 rounded-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-semibold text-white tracking-tight mb-4">{pt.ctaTitle}</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed font-light">{pt.ctaSubtitle}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="mailto:soporte@menius.app" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all btn-glow">
                soporte@menius.app
              </a>
              <Link href="/demo" className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 text-gray-400 font-medium text-[15px] hover:text-white hover:border-white/20 transition-all">
                {pt.ctaDemo}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}
