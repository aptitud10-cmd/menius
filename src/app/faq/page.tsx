import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';
import { getFaqCategories, getFaqPageText } from '@/lib/faq-data';
import { FaqClient } from '@/components/faq/FaqClient';

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

  // JSON-LD schema for SEO (all questions, regardless of active category)
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
    <div className="min-h-screen landing-bg relative noise-overlay">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <LandingNav locale={locale} />

      {/* Hero */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm text-[#05c8a7] uppercase tracking-[0.2em] font-medium mb-5">{pt.badge}</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-5">{pt.title}</h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto font-light">
            {totalQuestions}{pt.subtitleSuffix}
          </p>
        </div>
      </section>

      {/* Interactive nav + filtered content */}
      <FaqClient categories={categories} pt={pt} totalQuestions={totalQuestions} />

      <LandingFooter locale={locale} />
    </div>
  );
}
