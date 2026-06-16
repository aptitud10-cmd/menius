import Link from 'next/link';
import { getLandingT, type LandingLocale } from '@/lib/landing-translations';
import { PhoneMockup } from './PhoneMockup';
import { HeroScrollCue } from './HeroScrollCue';

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k+`;
  if (n > 0) return `${n}+`;
  return '—';
}

export function LandingHero({ locale, ordersCount }: { locale: LandingLocale; ordersCount?: number }) {
  const h = getLandingT(locale).hero;

  return (
    <section className="relative min-h-[640px] md:min-h-svh xl:min-h-[100dvh] flex items-start xl:items-center overflow-clip">
      <div className="hero-gradient" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-6 lg:px-8 w-full pt-28 pb-16 xl:py-0">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-20 items-center">

          {/* Mobile: left-aligned tipographic hero, aggressively trimmed.
              3 levels only — (1) headline dominates, (2) one short line + CTA,
              (3) a single inline trust stat. No eyebrow, no chip row.
              Desktop (xl:) keeps the original product line + full subtitle. */}
          <div className="text-left xl:text-left">
            {/* Product line is desktop-only now — on mobile the headline carries it. */}
            <p className="d-fade-up d-delay-1 hidden xl:inline-flex items-center gap-2 text-[13px] font-medium text-[#05c8a7] tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-[#05c8a7] shadow-[0_0_8px_var(--brand-40)]" />
              {h.productLine}
            </p>

            <h1
              className="d-fade-up d-delay-1 xl:mt-5 font-display font-extrabold leading-[1.02] tracking-[-0.04em] text-white"
              style={{ fontSize: 'clamp(3.25rem, 14vw, 4.5rem)' }}
            >
              {h.titleLine1}
              <span className="text-gradient-premium">{h.titleHighlight}</span>
            </h1>

            {/* Mobile: one short, punchy line. Desktop: the full subtitle. */}
            <p className="d-fade-up d-delay-2 mt-6 xl:hidden text-lg text-gray-300/90 max-w-[300px] leading-snug font-light">
              {h.subtitleShort}
            </p>
            <p className="d-fade-up d-delay-2 mt-5 hidden xl:block text-lg text-gray-300/90 max-w-[440px] leading-relaxed font-light">
              {h.subtitle}
            </p>

            <div className="d-fade-up d-delay-3 mt-10 xl:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center xl:items-start justify-start gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center px-7 py-4 rounded-2xl bg-white text-black font-extrabold text-[16px] hover:bg-gray-100 hover:shadow-[0_6px_24px_rgba(255,255,255,0.22)] active:scale-[0.97] active:shadow-none transition-[transform,box-shadow,background] duration-150 text-center shadow-[0_4px_20px_rgba(255,255,255,0.12)]"
              >
                {h.ctaPrimary}
                <span className="inline-block ml-1.5 group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
              </Link>
              <Link
                href="/#calculadora"
                className="group inline-flex items-center justify-center px-2 py-4 sm:py-0 text-[15px] font-semibold text-gray-300 hover:text-white transition-colors duration-150"
              >
                {h.ctaSecondary}
                <span className="ml-1.5 text-[#05c8a7] group-hover:translate-x-0.5 transition-transform duration-200">&rarr;</span>
              </Link>
            </div>

            {/* Level 3 — one inline trust stat. On mobile that's all the room
                premium hero needs; SSL/Stripe/CCPA chips show from md+ only. */}
            <div className="d-fade-up d-delay-4 mt-12 flex flex-wrap items-center gap-x-3 gap-y-2.5 text-sm">
              {(() => {
                const isDynamic = ordersCount != null && ordersCount > 0;
                const headlineStat = h.stats[0];
                const value = isDynamic ? formatCount(ordersCount!) : headlineStat.value;
                const label = isDynamic
                  ? (locale === 'es' ? 'pedidos sin comisión' : 'orders, zero commission')
                  : headlineStat.label.toLowerCase();
                return (
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
                    <span className="text-gray-400 font-medium">{label}</span>
                  </span>
                );
              })()}
              <span className="hidden md:inline-block h-4 w-px bg-white/10" aria-hidden />
              <span className="hidden md:inline text-gray-500 text-xs tracking-wide">SSL · Stripe · CCPA</span>
            </div>

            <p className="d-fade-up d-delay-4 mt-5 text-xs text-gray-500">{h.badge}</p>
          </div>

          {/* Desktop-only: on mobile the full mockup becomes the LCP element and
              pushes it from 4.6s to ~8.9s on a real build (bad on LatAm 4G). Kept
              to xl+. The GPU-clean motion fix in PhoneMockup still applies. */}
          <div className="hidden xl:flex justify-center items-center d-scale-in d-delay-3">
            <PhoneMockup locale={locale} />
          </div>

        </div>
      </div>

      {/* Bridge to next section — soft fade + brand glow + scroll cue */}
      <div className="hero-bridge" aria-hidden>
        <div className="hero-bridge-fade" />
        <div className="hero-bridge-glow" />
      </div>

      {/* Scroll indicator — desktop only, fades when user scrolls */}
      <HeroScrollCue />
    </section>
  );
}
