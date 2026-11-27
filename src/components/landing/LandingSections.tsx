'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getLandingT, type LandingLocale, type LandingT } from '@/lib/landing-translations';
import { PLANS } from '@/lib/plans';

/* ─── STATIC DATA ─── */

const featureIcons = [
  <svg key="qr" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
  </svg>,
  <svg key="dash" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>,
  <svg key="pay" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>,
  <svg key="ai" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>,
];

// Single brand accent for all feature tabs (was a 4-color indigo/blue/emerald/amber
// set that broke the mono-accent system — every other section uses #05c8a7).
const brandAccent = {
  bg: 'bg-brand-500/8',
  text: 'text-brand-500',
  border: 'border-brand-500/20',
  glow: 'bg-brand-500/20',
};


/* ─── COMPONENTS ─── */

/* Shared 2026 section heading: numbered mono index + flush-left title + concise
   left body on mobile; falls back to the original centered treatment on md+ so
   desktop stays untouched. This is what gives the 8 sections one coherent
   language instead of 8 different centered eyebrows. */
function SectionHeading({
  index, label, title, desc, className = 'mb-10 md:mb-14',
}: {
  index: string;
  label: string;
  title: string;
  desc?: string;
  className?: string;
}) {
  return (
    <div className={`text-left md:text-center d-fade-up ${className}`}>
      <span className="font-mono text-xs tracking-[0.2em] text-brand-500/70 md:hidden">{index} / {label}</span>
      <p className="hidden md:block text-sm text-brand-500 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{label}</p>
      <h2 className="font-display mt-3 md:mt-0 font-extrabold text-white tracking-[-0.03em] md:tracking-tight leading-[1.05] text-[clamp(2.25rem,9vw,3rem)] md:text-5xl lg:text-6xl">
        {title}
      </h2>
      {desc && (
        <p className="text-gray-300 mt-3 md:mt-5 text-lg md:text-xl font-light max-w-[34ch] md:max-w-lg md:mx-auto">{desc}</p>
      )}
    </div>
  );
}

function FeatureTabs({ t }: { t: LandingT }) {
  const [active, setActive] = useState(0);
  const ft = t.features;
  const item = ft.items[active];
  const colors = brandAccent;

  return (
    <div>
      {/* Mobile: tabs scroll horizontally (no wrap to 2 ugly rows) — the approved
          pattern for tab nav (Sakazuki). Edge-bleed hints there's more. md+: pill row. */}
      <div className="-mx-6 px-6 md:mx-auto md:px-0 overflow-x-auto scrollbar-hide mb-8 md:mb-14 md:w-fit">
        <div className="flex gap-1 p-1.5 rounded-2xl bg-white/4 border border-white/6 w-max md:w-fit md:mx-auto">
          {ft.items.map((feat, i) => (
            <button
              key={feat.tab}
              type="button"
              onClick={() => setActive(i)}
              className={`whitespace-nowrap px-4 sm:px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                active === i
                  ? 'bg-white text-black shadow-lg shadow-white/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/3'
              }`}
            >
              {feat.tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <h3 className="font-display text-[clamp(1.9rem,7vw,2.25rem)] md:text-4xl font-bold text-white leading-tight tracking-tight">
            {item.title}
          </h3>
          <p className="mt-4 md:mt-6 text-lg md:text-xl text-gray-200 md:text-gray-300 leading-relaxed font-light">
            {item.desc}
          </p>
          <div className="mt-7 md:mt-10 space-y-3.5 md:space-y-4">
            {item.details.map((d) => (
              <div key={d} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
                  <svg className={`w-3.5 h-3.5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm md:text-[15px] text-gray-200 md:text-gray-300">{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full ${colors.glow} blur-[80px]`} />

          <div className="relative z-10 w-full max-w-[380px]">
            <div className={`rounded-2xl border ${colors.border} bg-white/2 backdrop-blur-xs overflow-hidden`}>
              <div className={`px-6 py-5 border-b ${colors.border} flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text}`}>
                  {featureIcons[active]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.tab}</p>
                  <p className="text-xs text-gray-500">MENIUS</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                  <span className="text-[10px] text-gray-500">{ft.cardActive}</span>
                </div>
              </div>

              <div className="divide-y divide-white/4">
                {item.visualItems.map((vi, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{vi.label}</span>
                    <span className="text-sm font-medium text-white">{vi.value}</span>
                  </div>
                ))}
              </div>

              <div className={`px-6 py-4 border-t ${colors.border} bg-white/1`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{ft.cardUpdated}</span>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {ft.cardLive}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialProof({ t }: { t: LandingT['socialProof'] }) {
  return (
    <section className="relative py-20 md:py-24 overflow-clip">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-left md:text-center scroll-reveal d-fade-in">
          {/* 01 — numbered index on mobile to match the rest of the system */}
          <span className="font-mono text-xs tracking-[0.2em] text-brand-500/70 mb-6 block md:hidden">01 / {t.headline}</span>
          <p className="hidden md:block text-sm text-brand-500/80 font-medium mb-8 tracking-wide uppercase">{t.headline}</p>
          <div className="flex items-center justify-start md:justify-center gap-7 md:gap-14 flex-wrap">
            {t.logos.map((name) => {
              const brandColor: Record<string, string> = {
                'Stripe': '#635BFF',
                'Google Gemini': '#4285F4',
                'Supabase': '#3ECF8E',
                'Vercel': '#FFFFFF',
                'Sentry': '#F55150',
                'Cloudflare': '#F48120',
              };
              const color = brandColor[name] ?? 'rgba(255,255,255,0.5)';
              return (
                <span
                  key={name}
                  style={{ color }}
                  className="text-base md:text-lg font-bold tracking-tight whitespace-nowrap transition-opacity duration-300 opacity-70 hover:opacity-100"
                >
                  {name}
                </span>
              );
            })}
          </div>

          <div className="mt-14 flex items-center justify-center gap-4 sm:gap-10 md:gap-20 max-w-md md:max-w-none mx-auto w-full">
            {t.stats.map((stat) => (
              <div key={stat.label} className="text-center flex-1">
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-2 font-medium tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


// Un solo plan a la venta desde 2026-11: la calculadora siempre compara contra Pro.
function getRecommendedPlan(_revenue: number) {
  return PLANS.pro;
}

// Animate a number toward `target` over ~500ms with rAF (ease-out). No library.
// Respects reduced-motion by snapping. The savings figure is the money shot of
// this section — it should count up as the user drags, not jump (2026 pattern).
function useCountUp(target: number): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return;
    }
    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;
    let startTs: number | null = null;
    const duration = 500;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + delta * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return display;
}

// Supuestos de la calculadora (se explican en t.savings.footnote):
// - el input son las ventas que HOY entran por apps de delivery, no las totales;
// - la app cobra 20% (rango real 15–30%);
// - con pedido directo el restaurante paga ~3% de procesamiento con tarjeta.
const APP_COMMISSION_RATE = 0.2;
const CARD_PROCESSING_RATE = 0.03;
const SLIDER_MIN = 1000;
const SLIDER_MAX = 50000;

// Separador de miles por idioma: en → 15,000 · es → 15.000. 'es-AR' y no 'es':
// con 'es'/'es-ES' Intl no agrupa números de 4 cifras ("3750").
function makeNumberFormatter(locale: LandingLocale): (n: number) => string {
  const nf = new Intl.NumberFormat(locale === 'es' ? 'es-AR' : 'en-US', { maximumFractionDigits: 0 });
  return (n: number) => nf.format(n);
}

function SavingsCalculator({ t, locale }: { t: LandingT['savings']; locale: LandingLocale }) {
  const [revenue, setRevenue] = useState(10000);
  const fmt = makeNumberFormatter(locale);
  const commissionLoss = Math.round(revenue * APP_COMMISSION_RATE);
  const recommendedPlan = getRecommendedPlan(revenue);
  const cardProcessing = Math.round(revenue * CARD_PROCESSING_RATE);
  const meniusCost = recommendedPlan.price.monthly + cardProcessing;
  const monthlySavings = commissionLoss - meniusCost;
  const annualSavings = monthlySavings * 12;
  const animatedSavings = useCountUp(annualSavings);
  const withMeniusLabel = `${t.withMeniusPrefix ?? 'Con MENIUS'} ${recommendedPlan.name}`;
  const money = (n: number) => `${n < 0 ? '-' : ''}$${fmt(Math.abs(n))}`;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10 text-center">
        <label htmlFor="savings-revenue-slider" className="text-sm text-gray-400 mb-4 block font-medium">{t.sliderLabel}</label>
        <p className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
          {money(revenue)}
          <span className="text-lg text-gray-500 font-normal ml-1">{t.perMonth}</span>
        </p>
        <input
          id="savings-revenue-slider"
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={500}
          value={revenue}
          onChange={(e) => setRevenue(Number(e.target.value))}
          aria-label={t.sliderLabel}
          aria-valuetext={`${money(revenue)} ${t.perMonth}`}
          className="calc-slider w-full max-w-md"
        />
        <div className="flex justify-between max-w-md mx-auto mt-2">
          <span className="text-xs text-gray-600">{money(SLIDER_MIN)}</span>
          <span className="text-xs text-gray-600">{money(SLIDER_MAX)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/4 p-6 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">{t.withApps}</p>
          <p className="text-3xl md:text-4xl font-bold text-red-400">{money(commissionLoss)}</p>
          <p className="text-sm text-gray-500 mt-1.5">{t.commissionsLabel}</p>
        </div>
        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/4 p-6 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">{withMeniusLabel}</p>
          <p className="text-3xl md:text-4xl font-bold text-brand-500">{money(meniusCost)}</p>
          <p className="text-sm text-gray-500 mt-1.5">{t.flatFeeLabel}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-500/20 bg-brand-500/6 p-6 md:p-8 text-center">
        <p className="text-sm text-gray-400 mb-2 font-medium">{t.savingsLabel}</p>
        <p className="font-display font-black text-white tracking-tight tabular-nums text-[clamp(3rem,15vw,4.5rem)] md:text-6xl leading-none">
          {money(animatedSavings)}
        </p>
        <p className="text-lg text-brand-500 font-semibold mt-1">
          {t.perYear} · {money(monthlySavings)}{t.perMonth}
        </p>
      </div>
      <p className="mt-4 text-xs text-gray-300 text-center leading-relaxed max-w-md mx-auto">{t.footnote}</p>
    </div>
  );
}

function MidCta({ text, highlight, cta }: { text: string; highlight: string; cta: string }) {
  return (
    <div className="my-2 d-fade-up">
      <Link
        href="/signup"
        className="group flex flex-col sm:flex-row items-center justify-between gap-4 px-7 py-5 rounded-2xl border border-white/8 bg-brand-500/6 hover:border-brand-500/30 hover:bg-brand-500/10 transition-all duration-200"
      >
        <div className="text-center sm:text-left">
          <span className="text-white font-semibold text-[15px]">{text}</span>
          {' '}
          <span className="text-gray-400 text-[15px]">{highlight}</span>
        </div>
        <span className="shrink-0 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold group-hover:bg-gray-100 group-hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)] active:scale-[0.97] transition-all duration-150 whitespace-nowrap">
          {cta}
        </span>
      </Link>
    </div>
  );
}

// Un solo plan a la venta (Pro). El índice coincide con t.pricing.plans.
const PLAN_IDS = ['pro'] as const;

// Colombia ve el mismo precio que se cobra: Stripe factura la suscripción en USD
// en todos los países (un solo price id por intervalo). Allá solo se aclara "USD".

type ColKey = 'free' | 'pro';

const COL_PRICES: Record<ColKey, string> = {
  free: '$0',
  pro: '$' + PLANS.pro.price.monthly,
};

const COL_PRICE_SUFFIX_KEYS: Record<ColKey, 'perMonth' | ''> = {
  free: '',
  pro: 'perMonth',
};

function CheckIcon() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-500/15">
      <svg className="w-3 h-3 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function DashIcon() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/4">
      <span className="w-2 h-px bg-gray-600 block" />
    </span>
  );
}

type PlanComparisonT = LandingT['pricing']['planComparison'];

function PlanAccordionMobile({
  pc, colKeys, colLabels, isColombia, proIdx, getSuffix,
}: {
  pc: PlanComparisonT;
  colKeys: ColKey[];
  colLabels: string[];
  isColombia: boolean;
  proIdx: number;
  getSuffix: (key: ColKey) => string;
}) {
  // Pro expanded by default — it's the plan we want them to read first.
  const [open, setOpen] = useState<number>(proIdx);

  return (
    <>
      {colKeys.map((key, i) => {
        const isOpen = open === i;
        const isPro = i === proIdx;
        const label = colLabels[i];
        const price = COL_PRICES[key];
        const suffix = getSuffix(key);

        return (
          <div
            key={key}
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isPro ? 'border-brand-500/30 bg-brand-500/5' : 'border-white/8 bg-white/2'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen ? 'true' : 'false'}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-inset"
            >
              <span className="flex items-center gap-2.5">
                <span className={`text-lg font-bold ${isPro ? 'text-brand-500' : 'text-white'}`}>{label}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className={`text-base font-bold ${isPro ? 'text-brand-500' : 'text-gray-200'}`}>
                  {price}
                  {isColombia && key !== 'free' && <span className="text-xs text-gray-500"> USD</span>}
                  {suffix && <span className="text-xs text-gray-500 font-normal">{suffix}</span>}
                </span>
                <span className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </span>
            </button>

            {isOpen && (
              <div className="px-5 pb-4 divide-y divide-white/5">
                {pc.rows.map((row) => {
                  const val = row[key];
                  return (
                    <div key={row.feature} className="flex items-center justify-between gap-4 py-3">
                      <span className="text-sm text-gray-300">{row.feature}</span>
                      <span className="shrink-0">
                        {val === '✓' ? <CheckIcon /> : val === '—' ? <DashIcon /> : (
                          <span className={`text-sm font-semibold ${isPro ? 'text-brand-500' : 'text-gray-200'}`}>{val}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function PlanComparisonTable({ t, isColombia }: { t: LandingT; isColombia: boolean }) {
  const pc = t.pricing.planComparison;
  const colKeys: ColKey[] = ['free', 'pro'];
  const colLabels = colKeys.map((k) => ({ free: pc.colFree, pro: pc.colPro }[k]));

  const isCheck = (v: string) => v === '✓';
  const isDash = (v: string) => v === '—';
  const proIdx = 1;
  const getSuffix = (key: ColKey) => {
    const suffixKey = COL_PRICE_SUFFIX_KEYS[key];
    if (!suffixKey) return '';
    return pc[suffixKey];
  };

  return (
    <div className="d-fade-up">
      <div className="text-center mb-10">
        <p className="text-sm text-brand-500 uppercase tracking-[0.2em] font-medium mb-3">{pc.sectionLabel}</p>
        <h3 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">{pc.sectionTitle}</h3>
        <p className="text-gray-400 mt-2 text-sm max-w-md mx-auto">{pc.sectionDesc}</p>
      </div>

      {/* Mobile: accordion per plan — no horizontal scroll. Each plan expands
          to show its features with ✓/— against every comparison row. */}
      <div className="md:hidden space-y-2.5">
        <PlanAccordionMobile pc={pc} colKeys={colKeys} colLabels={colLabels} isColombia={isColombia} proIdx={proIdx} getSuffix={getSuffix} />
      </div>

      {/* Desktop: full comparison grid */}
      <div className="hidden md:block overflow-x-auto -mx-2 px-2">
        <div className="min-w-[600px] rounded-2xl border border-white/8 overflow-hidden bg-white/2">
          {/* Header */}
          <div className="grid border-b border-white/8" style={{ gridTemplateColumns: `1.4fr repeat(${colKeys.length}, minmax(90px, 1fr))` }}>
            <div className="px-5 py-5" />
            {colLabels.map((label, i) => {
              const key = colKeys[i];
              const isPro = i === proIdx;
              const price = COL_PRICES[key];
              const suffix = getSuffix(key);
              return (
                <div
                  key={key}
                  className={`px-3 py-5 text-center flex flex-col items-center gap-1 ${isPro ? 'bg-brand-500/8' : ''}`}
                >
                  <span className={`text-sm font-bold whitespace-nowrap ${isPro ? 'text-brand-500' : 'text-gray-200'}`}>{label}</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    <span className={`font-semibold ${isPro ? 'text-brand-500/80' : 'text-gray-400'}`}>{price}</span>
                    {isColombia && key !== 'free' && <span className="text-gray-600"> USD</span>}
                    {suffix && <span className="text-gray-600">{suffix}</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {pc.rows.map((row, ri) => (
            <div
              key={row.feature}
              className={`grid items-center ${ri < pc.rows.length - 1 ? 'border-b border-white/4' : ''} ${ri % 2 === 0 ? '' : 'bg-white/1'}`}
              style={{ gridTemplateColumns: `1.4fr repeat(${colKeys.length}, minmax(90px, 1fr))` }}
            >
              <div className="px-5 py-3.5">
                <p className="text-sm font-medium text-gray-300">{row.feature}</p>
              </div>
              {colKeys.map((key, ci) => {
                const val = row[key];
                const isPro = ci === proIdx;
                return (
                  <div key={key} className={`px-3 py-3.5 flex items-center justify-center ${isPro ? 'bg-brand-500/4' : ''}`}>
                    {isCheck(val) ? (
                      <CheckIcon />
                    ) : isDash(val) ? (
                      <DashIcon />
                    ) : (
                      <span className={`text-sm font-medium ${isPro ? 'text-brand-500' : 'text-gray-300'}`}>{val}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── PRICING MOBILE — full 2026 rebuild (not the desktop layout shrunk) ───
   Hero plan (Pro) takes the full width with a protagonist price; Starter +
   Business are subordinated below in an asymmetric bento. Left-aligned,
   numbered index, own vertical rhythm. Desktop keeps PricingSection untouched. */
function PricingMobile({ t, isColombia, annual }: { t: LandingT; isColombia: boolean; annual: boolean }) {
  const tp = t.pricing;

  const priceFor = (idx: number) => {
    const planId = PLAN_IDS[idx];
    const monthly = PLANS[planId].price.monthly;
    const perMonthAnnual = Math.floor(PLANS[planId].price.annual / 12);
    return annual ? perMonthAnnual : monthly;
  };

  const heroIdx = 0; // Pro, el único plan a la venta
  const hero = tp.plans[heroIdx];

  return (
    <div className="md:hidden">
      {/* Hero plan — Pro as protagonist */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-500/30 bg-brand-500/6 p-7 pt-8">
        <div>
          <h3 className="font-display text-3xl font-extrabold tracking-tight text-white">{hero.name}</h3>
          <p className="mt-1.5 text-sm text-gray-300/80 max-w-[26ch]">{hero.desc}</p>

          {/* Protagonist price */}
          <div className="mt-7 flex flex-wrap items-end gap-x-2 gap-y-1">
            <span
              className="font-display font-black tracking-tight text-white leading-[0.9] break-all"
              style={{ fontSize: 'clamp(3.5rem, 18vw, 5rem)' }}
            >
              ${priceFor(heroIdx)}
            </span>
            <span className="mb-2 text-sm text-gray-400">
              {isColombia ? 'USD' : ''}{annual ? tp.annualPerMonth : tp.perMonth}
            </span>
          </div>

          <ul className="mt-7 grid grid-cols-1 gap-x-4 gap-y-3">
            {hero.features.slice(0, 6).map((feat) => (
              <li key={feat} className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span className="text-[15px] leading-snug text-gray-200">{feat}</span>
              </li>
            ))}
          </ul>

          <Link
            href={`/signup?plan=pro${annual ? '&billing=annual' : ''}`}
            className="mt-8 flex items-center justify-center rounded-2xl bg-white py-4 text-[16px] font-extrabold text-black active:scale-[0.97] transition-transform duration-150"
          >
            {hero.cta} <span className="ml-1.5">&rarr;</span>
          </Link>
        </div>
      </div>

    </div>
  );
}

function PricingSection({ t, isColombia }: { t: LandingT; isColombia: boolean }) {
  const [annual, setAnnual] = useState(false);
  const tp = t.pricing;

  return (
    <>
      <div className="text-left md:text-center mb-10 md:mb-14 d-fade-up">
        {/* S1 — numbered index left, not centered uppercase eyebrow */}
        <span className="font-mono text-xs tracking-[0.2em] text-brand-500/70 md:hidden">02 / {tp.sectionLabel}</span>
        <p className="hidden md:block text-sm text-brand-500 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{tp.sectionLabel}</p>
        <h2 className="font-display mt-3 md:mt-0 font-extrabold text-white tracking-[-0.03em] md:tracking-tight leading-[1.05] text-[clamp(2.25rem,9vw,3rem)] md:text-5xl lg:text-6xl">
          {tp.sectionTitle}
        </h2>
        <p className="text-gray-300 mt-3 md:mt-5 text-lg md:text-xl font-light max-w-[34ch] md:max-w-none">{tp.sectionDesc}</p>

        {/* Billing toggle — left on mobile, centered md+ */}
        <div className="mt-7 md:mt-8 inline-flex items-center gap-1 p-1 rounded-xl bg-white/6 border border-white/8">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              !annual ? 'bg-white text-black shadow-xs' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tp.billingMonthly}
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              annual ? 'bg-white text-black shadow-xs' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tp.billingAnnual}
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors duration-200 ${
              annual ? 'bg-brand-500 text-black' : 'bg-brand-500/20 text-brand-500'
            }`}>
              {tp.annualBadge}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile: full 2026 rebuild */}
      <div className="d-fade-up d-delay-2">
        <PricingMobile t={t} isColombia={isColombia} annual={annual} />
      </div>

      {/* Desktop: original 3-card grid */}
      <div className="d-scale-in d-delay-2 hidden md:block">
        <div className={tp.plans.length > 1 ? 'grid grid-cols-1 md:grid-cols-3 gap-6' : 'max-w-md mx-auto'}>
          {tp.plans.map((plan, idx) => {
            // Con un solo plan se destaca la tarjeta, pero sin badge "Popular".
            const isPopular = tp.plans.length === 1 || idx === 1;
            const showPopularBadge = tp.plans.length > 1 && idx === 1;
            const planId = PLAN_IDS[idx];
            const planConfig = PLANS[planId];

            const monthlyPrice = planConfig.price.monthly;
            const annualTotal  = planConfig.price.annual;
            const annualPerMonth = Math.floor(planConfig.price.annual / 12);
            const displayPrice = annual ? annualPerMonth : monthlyPrice;

            const currencySymbol = '$';
            const formatPrice = (n: number) => n.toLocaleString('en-US');

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 lg:p-8 flex flex-col transition-all duration-300 ${
                  isPopular
                    ? 'card-popular-glow bg-brand-500/[0.07] md:bg-white/4 border border-brand-500/30 md:border-brand-500/20 shimmer-border'
                    : 'card-gradient-border bg-white/2 rounded-2xl hover:bg-white/4'
                }`}
              >
                {/* S5 — recommended plan differentiated by fill + left badge, not a
                    centered "Most Popular" pill (2021 tell). */}
                {showPopularBadge && (
                  <span className="absolute -top-3 left-6 md:left-1/2 md:-translate-x-1/2 px-4 py-1.5 bg-brand-500 text-black text-[11px] font-semibold rounded-full uppercase tracking-wider shadow-lg shadow-brand-500/25">
                    {tp.popularBadge}
                  </span>
                )}
                <h3 className={`text-xl md:text-lg font-bold md:font-semibold ${isPopular ? 'text-brand-500' : 'text-white'}`}>{plan.name}</h3>
                <p className="text-sm text-gray-400 mt-1.5">{plan.desc}</p>
                <div className="mt-7 mb-1">
                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl lg:text-5xl font-bold text-white tracking-tight transition-all duration-300">
                      {currencySymbol}{formatPrice(displayPrice)}
                    </span>
                    <span className="text-sm text-gray-400 mb-1.5 leading-tight">
                      {isColombia ? 'USD' : ''}{annual ? tp.annualPerMonth : tp.perMonth}
                    </span>
                  </div>
                  {annual && (
                    <p className="text-xs text-gray-500 mt-1 mb-0">
                      {currencySymbol}{formatPrice(monthlyPrice)}<span className="line-through opacity-60">{tp.annualMonthSuffix}</span>
                      {' '}→{' '}
                      <span className="text-brand-500 font-semibold">{currencySymbol}{formatPrice(annualTotal)}{tp.annualYearSuffix}</span>
                    </p>
                  )}
                </div>
                <ul className="space-y-3.5 flex-1 mt-7 mb-0">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-brand-500/60 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <span className="text-sm text-gray-400 leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/signup?plan=${plan.name.toLowerCase()}${annual ? '&billing=annual' : ''}`}
                  className={`mt-8 block text-center py-4 rounded-xl font-bold text-base active:scale-[0.97] active:shadow-none transition-[transform,box-shadow,background-color,border-color] duration-150 ${
                    isPopular
                      ? 'bg-white text-black hover:bg-gray-100 hover:shadow-[0_4px_16px_rgba(255,255,255,0.18)] btn-glow shadow-lg shadow-white/5'
                      : 'bg-white/6 text-gray-300 border-2 border-white/10 hover:text-white hover:bg-white/10 hover:border-white/18'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Free plan + setup banners — shared mobile + desktop */}
      <Link
        href="/signup"
        className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-5 rounded-2xl border border-brand-500/20 bg-brand-500/4 hover:bg-brand-500/8 hover:border-brand-500/30 transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-sm text-gray-400">
            {tp.freeBannerPrefix}{' '}
            <strong className="text-brand-500">{tp.freeBannerPlan}</strong>
            {' '}—{' '}
            <span className="text-gray-400">{tp.freeBannerDesc}</span>
          </span>
        </div>
        <span className="shrink-0 text-sm font-medium text-brand-500 whitespace-nowrap">
          {tp.freeBannerCta}
        </span>
      </Link>

      <Link
        href="/setup-profesional"
        className="mt-3 flex items-center justify-between p-5 rounded-2xl border border-white/6 bg-white/2 hover:bg-white/4 hover:border-white/10 transition-all group"
      >
        <span className="text-sm text-gray-400">{tp.setupCtaPrefix} <strong className="text-gray-200">{tp.setupCtaBold}</strong> {tp.setupCtaSuffix}</span>
        <svg className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </Link>
    </>
  );
}

function TestimonialsSection({ t }: { t: LandingT['testimonials'] }) {
  return (
    <>
      {/* Mobile: editorial list — the stat is the protagonist (oversized,
          flush-left), quote alongside, hairline divider instead of a boxed card.
          Each insight reads like an entry, not a uniform card. */}
      <div className="md:hidden">
        {t.items.map((item, i) => (
          <div
            key={item.name}
            className={`d-fade-up py-8 ${i < t.items.length - 1 ? 'border-b border-white/[0.07]' : ''}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span
              className="font-display font-black tracking-tight text-brand-500 leading-[0.9] block wrap-break-word"
              style={{ fontSize: 'clamp(3rem, 13vw, 4.5rem)' }}
            >
              {item.name}
            </span>
            <p className="mt-4 text-[15px] text-gray-200 leading-relaxed">{item.quote}</p>
          </div>
        ))}
      </div>

      {/* Desktop: 3-card grid (unchanged) */}
      <div className="hidden md:grid max-w-5xl mx-auto md:grid-cols-3 md:gap-5">
        {t.items.map((item) => (
          <div key={item.name} className="card-premium rounded-2xl p-6 md:p-7 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span
                className="font-display font-extrabold tracking-tight text-brand-500 leading-none"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)' }}
              >
                {item.name}
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed flex-1">{item.quote}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── FAQ SECTION ─── */

const FAQ_ES = [
  { q: '¿Qué es MENIUS?', a: 'MENIUS es una plataforma todo-en-uno para restaurantes: menú digital con QR, pedidos en tiempo real, cocina KDS, asistente IA, analytics, CRM y pagos integrados. El plan Pro tiene 0% de comisión de MENIUS en pagos online.' },
  { q: '¿Mis clientes necesitan descargar una app?', a: 'No. El menú funciona directo en el navegador del celular. El cliente escanea el QR y ve tu menú al instante, sin descargar nada ni registrarse.' },
  { q: '¿Cuánto tiempo toma configurar el menú?', a: 'La configuración básica toma unos 30 minutos. Al crear tu restaurante se genera un menú de ejemplo que solo tienes que editar con tus datos.' },
  { q: '¿MENIUS cobra comisión por pedido?', a: 'No. Los pedidos en efectivo no tienen comisión. En el plan Pro, los pagos online con Stripe tienen 0% de comisión de MENIUS; solo pagas el procesamiento de Stripe (2.9% + 30¢ por pago con tarjeta). El plan Free no incluye pagos online. Con Wompi (Colombia) MENIUS tampoco cobra comisión.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Sin contratos ni penalidades. Cancelas cuando quieras desde tu dashboard: sigues en Pro hasta el final del período que ya pagaste y luego pasas automáticamente al plan Free. Tu cuenta, tu menú y tus datos quedan intactos.' },
  { q: '¿Es seguro?', a: 'Sí. Todos los pagos se procesan a través de Stripe o Wompi (PCI DSS Level 1). Tu menú usa HTTPS con certificado SSL. No almacenamos datos de tarjetas de crédito.' },
  { q: '¿Funciona con mi tipo de restaurante?', a: 'Sí. MENIUS funciona para restaurantes de mesa, comida para llevar (pickup), delivery propio, food trucks, dark kitchens, cafeterías, bares, heladerías y cualquier negocio de alimentos. Si vendes comida, MENIUS funciona.' },
];

const FAQ_EN = [
  { q: 'What is MENIUS?', a: 'MENIUS is an all-in-one platform for restaurants: digital menu with QR, real-time orders, kitchen KDS, AI assistant, analytics, CRM, and built-in payments. The Pro plan has 0% MENIUS commission on online payments.' },
  { q: 'Do my customers need to download an app?', a: 'No. The menu works directly in the phone browser. Customers scan the QR code and see your menu instantly — no downloads, no sign-up required.' },
  { q: 'How long does it take to set up the menu?', a: 'Basic setup takes about 30 minutes. When you create your restaurant, we generate a sample menu for you. Just swap in your own items.' },
  { q: 'Does MENIUS charge a commission per order?', a: 'No. Cash orders carry no commission. On the Pro plan, online payments through Stripe have 0% MENIUS commission; you only pay Stripe processing (2.9% + 30¢ per card payment). The Free plan doesn’t include online payments. With Wompi (Colombia), MENIUS doesn’t charge a commission either.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no penalties. Cancel anytime from your dashboard: you keep Pro until the end of the period you’ve already paid for, then automatically move to the Free plan. Your account, menu and data stay intact.' },
  { q: 'Is it secure?', a: 'Yes. All payments are processed through Stripe or Wompi (PCI DSS Level 1). Your menu uses HTTPS with SSL. We never store credit card data.' },
  { q: 'Does it work for my type of restaurant?', a: 'Yes. MENIUS works for dine-in restaurants, takeout (pickup), in-house delivery, food trucks, dark kitchens, cafés, bars, ice cream shops, and any food business. If you sell food, MENIUS works.' },
];

function FaqSection({ locale }: { locale: LandingLocale }) {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = locale === 'es' ? FAQ_ES : FAQ_EN;
  const isEs = locale === 'es';

  return (
    <section id="faq" className="relative py-24 md:py-28 lg:py-32 overflow-clip">
      <div className="relative z-10 max-w-3xl mx-auto px-6">
        <div className="text-left md:text-center mb-10 md:mb-12">
          <span className="font-mono text-xs tracking-[0.2em] text-brand-500/70 md:hidden">08 / FAQ</span>
          <h2 className="font-display mt-3 md:mt-0 text-[clamp(2.25rem,9vw,3rem)] leading-[1.05] md:text-4xl font-extrabold text-white tracking-[-0.03em] md:tracking-[-0.02em]">
            {isEs ? 'Preguntas frecuentes' : 'Frequently asked questions'}
          </h2>
          <p className="mt-3 text-gray-400 text-base">
            {isEs ? '¿Tienes más dudas?' : 'More questions?'}{' '}
            <a href="/faq" className="text-brand-500 hover:underline">
              {isEs ? 'Ver todas las respuestas →' : 'See all answers →'}
            </a>
          </p>
        </div>

        <div className="space-y-2">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen ? 'true' : 'false'}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-inset"
                >
                  <span className="text-sm sm:text-base font-semibold text-white">{item.q}</span>
                  <span className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── MAIN ─── */

const SECTION_PY = 'py-24 md:py-28 lg:py-40' as const;

export function LandingSections({ locale, country }: { locale: LandingLocale; country?: string }) {
  const t = getLandingT(locale);
  const isColombia = country === 'CO';

  return (
    <>
      {/* ── Social Proof ── */}
      <SocialProof t={t.socialProof} />

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Pricing ── */}
      <section id="precios" className={`relative ${SECTION_PY} overflow-clip`}>
        <div className="section-glow section-glow-blue" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-brand-500/15 blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <PricingSection t={t} isColombia={isColombia} />
          <div className="mt-16">
            <PlanComparisonTable t={t} isColombia={isColombia} />
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Savings Calculator ── */}
      <section id="calculadora" className={`relative py-32 md:py-28 lg:py-40 overflow-clip`}>
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <SectionHeading index="03" label={t.savings.sectionLabel} title={t.savings.sectionTitle} desc={t.savings.sectionDesc} />

          <div className="d-fade-up d-delay-2">
            <SavingsCalculator t={t.savings} locale={locale} />
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Features with Tabs ── */}
      <section id="funciones" className={`relative ${SECTION_PY} overflow-clip`}>
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <SectionHeading index="04" label={t.features.sectionLabel} title={t.features.sectionTitle} desc={t.features.sectionDesc} className="mb-8 md:mb-10" />

          <div className="d-fade-up d-delay-2">
            <FeatureTabs t={t} />
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Comparison ── */}
      <section className={`relative ${SECTION_PY} overflow-clip`}>
        <div className="section-glow section-glow-teal" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <SectionHeading index="05" label={t.comparison.sectionLabel} title={t.comparison.sectionTitle} desc={t.comparison.sectionDesc} />

          <div>
            <div className="md:hidden space-y-3">
              {t.comparison.mobileRows.map((row) => (
                <div key={row.feature} className="rounded-2xl border border-white/6 bg-white/2 p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">{row.feature}</p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-brand-500 font-medium mb-1">{t.comparison.meniusHeader}</p>
                      <p className="text-base font-semibold text-white">{row.menius}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-medium mb-1">{t.comparison.mobileOtherHeader}</p>
                      <p className="text-sm text-gray-500">{row.other}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block rounded-2xl border border-white/6 overflow-hidden bg-white/2">
              <div className="grid grid-cols-3">
                <div className="p-5 border-b border-white/6" />
                <div className="p-5 text-center border-b border-white/6 bg-brand-500/6">
                  <span className="text-sm font-semibold text-white">{t.comparison.meniusHeader}</span>
                </div>
                <div className="p-5 text-center border-b border-white/6">
                  <span className="text-xs text-gray-400">{t.comparison.otherHeader}</span>
                </div>
              </div>
              {t.comparison.rows.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 ${i < t.comparison.rows.length - 1 ? 'border-b border-white/4' : ''}`}>
                  <div className="px-6 py-4">
                    <p className="text-sm text-gray-400">{row.feature}</p>
                  </div>
                  <div className="px-6 py-4 text-center bg-brand-500/3">
                    <p className="text-sm font-medium text-white">{row.menius}</p>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <p className="text-sm text-gray-500">{row.other}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Single Mid CTA: after Comparison ── */}
      <div className="max-w-4xl mx-auto px-6 -mt-10 mb-6">
        <MidCta
          text={t.comparison.midCta.text}
          highlight={t.comparison.midCta.highlight}
          cta={t.comparison.midCta.cta}
        />
      </div>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── How it works ── */}
      <section className={`relative ${SECTION_PY} overflow-clip`}>
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <SectionHeading index="06" label={t.howItWorks.sectionLabel} title={t.howItWorks.sectionTitle} />

          {/* Mobile: numbered steps with a big left index + vertical connector
              line (2026 pattern — Linear/Sakazuki). Desktop keeps the card grid. */}
          <div className="d-fade-up d-delay-2 md:hidden">
            <ol className="relative border-l border-brand-500/20 ml-5">
              {t.howItWorks.steps.map((item) => (
                <li key={item.step} className="relative pl-7 pb-9 last:pb-0">
                  <span className="absolute left-[-1.15rem] -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#050505] font-display text-lg font-extrabold text-brand-500 ring-1 ring-brand-500/30">
                    {item.step}
                  </span>
                  <p className="text-lg font-bold text-white leading-tight">{item.title}</p>
                  <p className="mt-2 text-[15px] text-gray-400 leading-relaxed max-w-[34ch]">{item.desc}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="d-fade-up d-delay-2 hidden md:block">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {t.howItWorks.steps.map((item) => (
                <div key={item.step} className="card-premium rounded-2xl p-6 md:p-8 flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-brand-500">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Industry Insights (replaces fake testimonials) ── */}
      <section className={`relative ${SECTION_PY} overflow-clip`}>
        <div className="section-glow section-glow-teal" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <SectionHeading index="07" label={t.testimonials.sectionLabel} title={t.testimonials.sectionTitle} />

          <div className="d-fade-up d-delay-2">
            <TestimonialsSection t={t.testimonials} />
          </div>

        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── FAQ ── */}
      <FaqSection locale={locale} />

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Final CTA ── */}
      <section className="relative py-24 md:py-32 lg:py-52 overflow-clip">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-brand-500/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="d-fade-up">
            <h2 className="font-display text-[2.9rem] md:text-5xl lg:text-7xl font-extrabold text-white tracking-[-0.035em] md:tracking-[-0.03em] leading-[1.02] md:leading-[1.05]">
              {t.finalCta.line1}
              <br />
              <span className="text-gradient-premium">{t.finalCta.line2}</span>
            </h2>
            <p className="mt-5 md:mt-6 text-lg md:text-xl text-gray-200 md:text-gray-300 font-light max-w-md mx-auto">
              {t.finalCta.subtitle}
            </p>
            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 px-2 sm:px-0 d-fade-up d-delay-2">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-black font-extrabold text-[17px] sm:text-base hover:bg-gray-100 hover:shadow-[0_6px_24px_rgba(255,255,255,0.22)] active:scale-[0.97] active:shadow-none transition-[transform,box-shadow,background-color] duration-150 btn-glow shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
              >
                {t.finalCta.ctaPrimary} &rarr;
              </Link>
              <Link
                href="/demo"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl border-2 border-white/15 text-gray-200 font-bold text-[17px] sm:text-base hover:text-white hover:border-white/30 hover:bg-white/4 active:scale-[0.97] transition-[transform,border-color,background,color] duration-150"
              >
                {t.finalCta.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
