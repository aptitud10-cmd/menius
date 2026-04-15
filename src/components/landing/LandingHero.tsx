import Link from 'next/link';
import { getLandingT, type LandingLocale } from '@/lib/landing-translations';
import { PhoneMockup } from './PhoneMockup';

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k+`;
  if (n > 0) return `${n}+`;
  return '—';
}

export function LandingHero({ locale, ordersCount }: { locale: LandingLocale; ordersCount?: number }) {
  const h = getLandingT(locale).hero;

  return (
    <section className="relative min-h-[100vh] min-h-[100dvh] flex items-center overflow-clip">
      <div className="hero-gradient" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-6 w-full pt-16 pb-16 md:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

          <div className="text-center lg:text-left">
            <div className="d-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] mb-6 md:mb-8">
              <span className="w-2 h-2 rounded-full bg-[#05c8a7]" />
              <span className="text-sm text-gray-300 tracking-wide">{h.badge}</span>
            </div>

            <h1
              className="d-fade-up d-delay-1 font-display font-extrabold leading-[1.06] tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)' }}
            >
              {h.titleLine1}
              <span className="text-gradient-premium">{h.titleHighlight}</span>
            </h1>

            <p className="d-fade-up d-delay-2 mt-6 md:mt-7 text-lg sm:text-xl text-gray-300 max-w-[480px] mx-auto lg:mx-0 leading-relaxed font-light">
              {h.subtitle}
            </p>

            <div className="d-fade-up d-delay-3 mt-8 md:mt-9 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3.5">
              <Link
                href="/signup"
                className="group w-full sm:w-auto px-8 py-5 rounded-2xl bg-white text-black font-extrabold text-[17px] hover:bg-gray-100 hover:shadow-[0_6px_24px_rgba(255,255,255,0.22)] active:scale-[0.97] active:shadow-none transition-[transform,box-shadow,background] duration-150 text-center shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
              >
                {h.ctaPrimary}
                <span className="inline-block ml-1.5 group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
              </Link>
              <Link
                href="/#calculadora"
                className="w-full sm:w-auto px-8 py-5 rounded-2xl border-2 border-white/15 text-gray-200 font-bold text-[17px] hover:text-white hover:border-white/30 hover:bg-white/[0.04] active:scale-[0.97] transition-[transform,border-color,background,color] duration-150 text-center"
              >
                {h.ctaSecondary}
              </Link>
            </div>

            <div className="d-fade-up d-delay-4 mt-12 md:mt-14 w-full flex items-start justify-center lg:justify-start gap-4 sm:gap-8">
              {h.stats.map((s, i) => {
                const isDynamic = i === 1 && ordersCount != null && ordersCount > 0;
                const value = isDynamic ? formatCount(ordersCount!) : s.value;
                const label = isDynamic
                  ? (locale === 'es' ? 'Pedidos sin comisión' : 'Orders, zero commission')
                  : s.label;
                return (
                  <div key={s.label} className="text-center lg:text-left min-w-0">
                    <p className="text-xl sm:text-3xl font-semibold text-white tracking-tight">{value}</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1.5 font-medium">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:flex justify-center items-center d-scale-in d-delay-3">
            <PhoneMockup locale={locale} />
          </div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] to-transparent z-20" />
    </section>
  );
}
