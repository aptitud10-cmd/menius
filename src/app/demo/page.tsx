import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';

export const metadata: Metadata = {
  title: 'Demo — MENIUS',
  description: 'Explore live demos of MENIUS digital menus. Try the full experience — menu, cart, checkout & order tracking.',
  alternates: { canonical: '/demo' },
};

const t = {
  es: {
    badge: 'Demos en vivo',
    title: 'Explora MENIUS en acción',
    subtitle: 'Elige un restaurante de ejemplo para ver cómo funciona la plataforma completa — menú, carrito, checkout y seguimiento.',
    cards: [
      {
        slug: 'la-casa-del-sabor',
        name: 'La Casa del Sabor',
        flag: '🇪🇸',
        lang: 'Español',
        desc: 'Restaurante completo con menú en español, categorías, extras, carrito y checkout.',
        cta: 'Ver menú en vivo',
        cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=340&fit=crop&q=80',
      },
      {
        slug: 'the-grill-house',
        name: 'The Grill House',
        flag: '🇺🇸',
        lang: 'English',
        desc: 'Full restaurant demo with English menu, categories, modifiers, cart & checkout.',
        cta: 'View live menu',
        cover: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=340&fit=crop&q=80',
      },
    ],
    poweredBy: 'Ambos demos funcionan con datos de ejemplo. No se procesan pagos reales.',
    cta: '¿Listo para digitalizar tu restaurante?',
    ctaBtn: 'Empieza gratis',
  },
  en: {
    badge: 'Live Demos',
    title: 'Explore MENIUS in action',
    subtitle: 'Choose a sample restaurant to see the full platform — menu, cart, checkout & order tracking.',
    cards: [
      {
        slug: 'la-casa-del-sabor',
        name: 'La Casa del Sabor',
        flag: '🇪🇸',
        lang: 'Español',
        desc: 'Complete restaurant with Spanish menu, categories, extras, cart & checkout.',
        cta: 'Ver menú en vivo',
        cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=340&fit=crop&q=80',
      },
      {
        slug: 'the-grill-house',
        name: 'The Grill House',
        flag: '🇺🇸',
        lang: 'English',
        desc: 'Full restaurant demo with English menu, categories, modifiers, cart & checkout.',
        cta: 'View live menu',
        cover: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=340&fit=crop&q=80',
      },
    ],
    poweredBy: 'Both demos use sample data. No real payments are processed.',
    cta: 'Ready to digitize your restaurant?',
    ctaBtn: 'Start free trial',
  },
} as const;

export default async function DemoSelectorPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;
  const s = t[locale];

  return (
    <div className="min-h-screen overflow-x-hidden relative" style={{ background: '#070f0b' }}>
      {/* Emerald ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16,185,129,0.15) 0%, transparent 55%)',
            'radial-gradient(ellipse 50% 40% at 80% 100%, rgba(16,185,129,0.06) 0%, transparent 50%)',
            'radial-gradient(ellipse 40% 50% at 10% 60%, rgba(52,211,153,0.05) 0%, transparent 50%)',
          ].join(','),
        }}
      />

      <LandingNav locale={locale} />

      <main className="relative z-10 pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            {s.badge}
          </span>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-tight">
            {s.title}
          </h1>
          <p className="text-base md:text-lg text-gray-400 mt-4 max-w-xl mx-auto leading-relaxed font-light">
            {s.subtitle}
          </p>

          {/* Cards */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {s.cards.map((card) => (
              <Link
                key={card.slug}
                href={`/${card.slug}`}
                className="group relative rounded-2xl overflow-hidden text-left transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: 'rgba(16,185,129,0.03)',
                  border: '1px solid rgba(16,185,129,0.10)',
                }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{
                    boxShadow: '0 0 40px rgba(16,185,129,0.08), inset 0 0 40px rgba(16,185,129,0.03)',
                    border: '1px solid rgba(16,185,129,0.25)',
                  }}
                />

                {/* Cover image */}
                <div className="relative w-full h-44 overflow-hidden">
                  <Image
                    src={card.cover}
                    alt={card.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070f0b] via-transparent to-transparent" />

                  {/* Language pill */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm shadow-lg shadow-emerald-500/25">
                    <span className="text-sm leading-none">{card.flag}</span>
                    <span className="text-xs font-bold text-white tracking-wide">{card.lang}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 pb-5 pt-2">
                  <h2 className="text-lg font-semibold text-white tracking-tight">{card.name}</h2>
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{card.desc}</p>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium group-hover:bg-emerald-400 transition-colors">
                      {card.cta}
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Free trial CTA */}
          <div className="mt-14 flex flex-col items-center gap-4">
            <p className="text-base text-gray-300 font-light">{s.cta}</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              {s.ctaBtn}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* Disclaimer */}
          <p className="mt-8 text-xs text-gray-500 font-medium">
            {s.poweredBy}
          </p>
        </div>
      </main>

      <LandingFooter locale={locale} />
    </div>
  );
}
