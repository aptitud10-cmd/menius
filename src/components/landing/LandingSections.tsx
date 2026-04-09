'use client';

import { useState } from 'react';
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

const featureAccents = ['indigo', 'blue', 'emerald', 'amber'];

const accentColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  indigo: { bg: 'bg-indigo-500/[0.08]', text: 'text-indigo-400', border: 'border-indigo-500/20', glow: 'bg-indigo-500/20' },
  blue: { bg: 'bg-blue-500/[0.08]', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'bg-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'bg-emerald-500/20' },
  amber: { bg: 'bg-amber-500/[0.08]', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'bg-amber-500/20' },
};

const integrationLogos: { name: string; gradient: string; borderHover: string; logo: React.ReactNode }[] = [
  {
    name: 'Stripe',
    gradient: 'from-indigo-500/10 to-purple-500/10',
    borderHover: 'hover:border-indigo-500/30',
    logo: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#635BFF"/></svg>,
  },
  {
    name: 'WhatsApp',
    gradient: 'from-green-500/10 to-emerald-500/10',
    borderHover: 'hover:border-green-500/30',
    logo: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.124 1.527 5.86L.055 23.765l6.068-1.45A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.855 0-3.632-.5-5.182-1.445l-.372-.22-3.6.86.902-3.498-.243-.387A9.782 9.782 0 012.182 12c0-5.413 4.405-9.818 9.818-9.818S21.818 6.587 21.818 12s-4.405 9.818-9.818 9.818z" fill="#25D366"/></svg>,
  },
  {
    name: 'Supabase',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    borderHover: 'hover:border-emerald-500/30',
    logo: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none"><path d="M13.7 21.8c-.4.5-1.3.2-1.3-.5v-7.9h8.2c.7 0 1.1.9.6 1.4l-7.5 7z" fill="url(#sb-a)"/><path d="M13.7 21.8c-.4.5-1.3.2-1.3-.5v-7.9h8.2c.7 0 1.1.9.6 1.4l-7.5 7z" fill="url(#sb-b)" fillOpacity=".2"/><path d="M10.3 2.2c.4-.5 1.3-.2 1.3.5v7.9H3.4c-.7 0-1.1-.9-.6-1.4l7.5-7z" fill="#3ECF8E"/><defs><linearGradient id="sb-a" x1="12.4" y1="15.4" x2="19" y2="19.3" gradientUnits="userSpaceOnUse"><stop stopColor="#249361"/><stop offset="1" stopColor="#3ECF8E"/></linearGradient><linearGradient id="sb-b" x1="8.6" y1="11.5" x2="12.4" y2="17.5" gradientUnits="userSpaceOnUse"><stop/><stop offset="1" stopOpacity="0"/></linearGradient></defs></svg>,
  },
  {
    name: 'Twilio',
    gradient: 'from-red-500/10 to-pink-500/10',
    borderHover: 'hover:border-red-500/30',
    logo: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 20.25c-4.556 0-8.25-3.694-8.25-8.25S7.444 3.75 12 3.75s8.25 3.694 8.25 8.25-3.694 8.25-8.25 8.25z" fill="#F22F46"/><circle cx="9.15" cy="9.15" r="1.8" fill="#F22F46"/><circle cx="14.85" cy="9.15" r="1.8" fill="#F22F46"/><circle cx="9.15" cy="14.85" r="1.8" fill="#F22F46"/><circle cx="14.85" cy="14.85" r="1.8" fill="#F22F46"/></svg>,
  },
  {
    name: 'Resend',
    gradient: 'from-sky-500/10 to-blue-500/10',
    borderHover: 'hover:border-sky-500/30',
    logo: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none"><path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" stroke="#38BDF8" strokeWidth="1.5"/><path d="M2 6l10 7 10-7" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    name: 'Gemini AI',
    gradient: 'from-amber-500/10 to-orange-500/10',
    borderHover: 'hover:border-amber-500/30',
    logo: <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="url(#gm-a)"/><path d="M12 7.5l1.2 3.3 3.3 1.2-3.3 1.2L12 16.5l-1.2-3.3L7.5 12l3.3-1.2L12 7.5z" fill="white"/><defs><linearGradient id="gm-a" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#4285F4"/><stop offset=".33" stopColor="#9B72CB"/><stop offset=".66" stopColor="#D96570"/><stop offset="1" stopColor="#F0C14E"/></linearGradient></defs></svg>,
  },
];

/* ─── COMPONENTS ─── */

function FeatureTabs({ t }: { t: LandingT }) {
  const [active, setActive] = useState(0);
  const ft = t.features;
  const item = ft.items[active];
  const colors = accentColors[featureAccents[active]];

  return (
    <div>
      <div className="flex flex-wrap gap-1 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-fit mx-auto mb-10 md:mb-14">
        {ft.items.map((feat, i) => (
          <button
            key={feat.tab}
            onClick={() => setActive(i)}
            className={`px-4 sm:px-6 py-3 sm:py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
              active === i
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
            }`}
          >
            {feat.tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <h3 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight tracking-[-0.025em]">
            {item.title}
          </h3>
          <p className="mt-4 md:mt-6 text-lg md:text-xl text-gray-200 md:text-gray-300 leading-relaxed font-light">
            {item.desc}
          </p>
          <div className="mt-7 md:mt-10 space-y-3.5 md:space-y-4">
            {item.details.map((d) => (
              <div key={d} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
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
            <div className={`rounded-2xl border ${colors.border} bg-white/[0.02] backdrop-blur-sm overflow-hidden`}>
              <div className={`px-6 py-5 border-b ${colors.border} flex items-center gap-4`}>
                <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text}`}>
                  {featureIcons[active]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.tab}</p>
                  <p className="text-xs text-gray-500">MENIUS</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#05c8a7] animate-pulse" />
                  <span className="text-[10px] text-gray-500">{ft.cardActive}</span>
                </div>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {item.visualItems.map((vi, i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{vi.label}</span>
                    <span className="text-sm font-medium text-white">{vi.value}</span>
                  </div>
                ))}
              </div>

              <div className={`px-6 py-4 border-t ${colors.border} bg-white/[0.01]`}>
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
        <div className="text-center d-fade-in">
          <p className="text-sm text-[#05c8a7]/80 font-medium mb-8 tracking-wide uppercase">{t.headline}</p>
          <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap">
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

          <div className="mt-14 flex items-center justify-center gap-4 sm:gap-10 md:gap-20">
            {t.stats.map((stat) => (
              <div key={stat.label} className="text-center">
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

function IntegrationsGrid({ t }: { t: LandingT['integrations'] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
      {integrationLogos.map((item, i) => (
        <div key={item.name} className="group">
          <div className={`relative rounded-2xl border border-white/[0.06] bg-gradient-to-br ${item.gradient} p-6 md:p-7 text-center ${item.borderHover} hover:bg-white/[0.04] transition-all duration-300 overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-xl bg-white/[0.06] mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {item.logo}
              </div>
              <p className="text-sm font-semibold text-white">{item.name}</p>
              <p className="text-xs text-gray-500 mt-1">{t.items[i]?.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getRecommendedPlan(revenue: number) {
  if (revenue < 8000) return PLANS.starter;
  if (revenue <= 40000) return PLANS.pro;
  return PLANS.business;
}

function SavingsCalculator({ t }: { t: LandingT['savings'] }) {
  const [revenue, setRevenue] = useState(15000);
  const commissionLoss = Math.round(revenue * 0.25);
  const recommendedPlan = getRecommendedPlan(revenue);
  const meniusCost = recommendedPlan.price.monthly;
  const annualSavings = (commissionLoss - meniusCost) * 12;
  const withMeniusLabel = `${t.withMeniusPrefix ?? 'Con MENIUS'} ${recommendedPlan.name}`;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10 text-center">
        <label className="text-sm text-gray-400 mb-4 block font-medium">{t.sliderLabel}</label>
        <p className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
          ${revenue.toLocaleString()}
          <span className="text-lg text-gray-500 font-normal ml-1">{t.perMonth}</span>
        </p>
        <input
          type="range"
          min={3000}
          max={80000}
          step={1000}
          value={revenue}
          onChange={(e) => setRevenue(Number(e.target.value))}
          className="calc-slider w-full max-w-md"
        />
        <div className="flex justify-between max-w-md mx-auto mt-2">
          <span className="text-xs text-gray-600">$3,000</span>
          <span className="text-xs text-gray-600">$80,000</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">{t.withApps}</p>
          <p className="text-3xl md:text-4xl font-bold text-red-400">${commissionLoss.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1.5">{t.commissionsLabel}</p>
        </div>
        <div className="rounded-2xl border border-[#05c8a7]/20 bg-[#05c8a7]/[0.04] p-6 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">{withMeniusLabel}</p>
          <p className="text-3xl md:text-4xl font-bold text-[#05c8a7]">${meniusCost}</p>
          <p className="text-sm text-gray-500 mt-1.5">{t.flatFeeLabel}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#05c8a7]/20 bg-[#05c8a7]/[0.06] p-6 md:p-8 text-center">
        <p className="text-sm text-gray-400 mb-2 font-medium">{t.savingsLabel}</p>
        <p className="text-4xl md:text-6xl font-bold text-white tracking-tight">
          ${annualSavings.toLocaleString()}
        </p>
        <p className="text-lg text-[#05c8a7] font-semibold mt-1">{t.perYear}</p>
      </div>
    </div>
  );
}

function MidCta({ text, highlight, cta }: { text: string; highlight: string; cta: string }) {
  return (
    <div className="my-2 d-fade-up">
      <Link
        href="/signup"
        className="group flex flex-col sm:flex-row items-center justify-between gap-4 px-7 py-5 rounded-2xl border border-white/[0.08] bg-[#05c8a7]/[0.06] hover:border-[#05c8a7]/30 hover:bg-[#05c8a7]/[0.10] transition-all duration-200"
      >
        <div className="text-center sm:text-left">
          <span className="text-white font-semibold text-[15px]">{text}</span>
          {' '}
          <span className="text-gray-400 text-[15px]">{highlight}</span>
        </div>
        <span className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold group-hover:bg-gray-100 group-hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)] active:scale-[0.97] transition-all duration-150 whitespace-nowrap">
          {cta}
        </span>
      </Link>
    </div>
  );
}

const PLAN_IDS = ['starter', 'pro', 'business'] as const;

const COP_PRICES: Record<typeof PLAN_IDS[number], { monthly: number; annual: number }> = {
  starter:  { monthly: 89_000,  annual: 890_000 },
  pro:      { monthly: 179_000, annual: 1_790_000 },
  business: { monthly: 349_000, annual: 3_490_000 },
};

function formatCOP(amount: number): string {
  return amount.toLocaleString('es-CO');
}

function PricingSection({ t, isColombia }: { t: LandingT; isColombia: boolean }) {
  const [annual, setAnnual] = useState(false);
  const tp = t.pricing;

  return (
    <>
      <div className="text-center mb-10 md:mb-14 d-fade-up">
        <p className="text-sm text-blue-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{tp.sectionLabel}</p>
        <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.025em]">
          {tp.sectionTitle}
        </h2>
        <p className="text-gray-200 md:text-gray-300 mt-4 md:mt-5 text-lg md:text-xl font-light">{tp.sectionDesc}</p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.06] border border-white/[0.08]">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              !annual ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tp.billingMonthly}
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              annual ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tp.billingAnnual}
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors duration-200 ${
              annual ? 'bg-[#05c8a7] text-black' : 'bg-[#05c8a7]/20 text-[#05c8a7]'
            }`}>
              {tp.annualBadge}
            </span>
          </button>
        </div>
      </div>

      <div className="d-scale-in d-delay-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tp.plans.map((plan, idx) => {
            const isPopular = idx === 1;
            const planId = PLAN_IDS[idx];
            const planConfig = PLANS[planId];

            const monthlyPrice = isColombia ? COP_PRICES[planId].monthly : planConfig.price.monthly;
            const annualTotal  = isColombia ? COP_PRICES[planId].annual  : planConfig.price.annual;
            const annualPerMonth = isColombia
              ? Math.floor(COP_PRICES[planId].annual / 12)
              : Math.floor(planConfig.price.annual / 12);
            const displayPrice = annual ? annualPerMonth : monthlyPrice;

            const currencySymbol = isColombia ? '$' : '$';
            const formatPrice = (n: number) => isColombia ? formatCOP(n) : String(n);

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                  isPopular
                    ? 'card-popular-glow bg-white/[0.04] border border-[#05c8a7]/20 shimmer-border'
                    : 'card-gradient-border bg-white/[0.02] rounded-2xl hover:bg-white/[0.04]'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-[#05c8a7] text-black text-[11px] font-semibold rounded-full uppercase tracking-wider shadow-lg shadow-[#05c8a7]/25">
                    {tp.popularBadge}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="text-sm text-gray-400 mt-1.5">{plan.desc}</p>
                <div className="mt-7 mb-1">
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-bold text-white tracking-tight transition-all duration-300">
                      {currencySymbol}{formatPrice(displayPrice)}
                    </span>
                    <span className="text-sm text-gray-400 mb-1.5 leading-tight">
                      {isColombia ? 'COP' : ''}{annual ? tp.annualPerMonth : tp.perMonth}
                    </span>
                  </div>
                  {annual && (
                    <p className="text-xs text-gray-500 mt-1 mb-0">
                      {currencySymbol}{formatPrice(monthlyPrice)}<span className="line-through opacity-60">{tp.annualMonthSuffix}</span>
                      {' '}→{' '}
                      <span className="text-[#05c8a7] font-semibold">{currencySymbol}{formatPrice(annualTotal)}{tp.annualYearSuffix}</span>
                    </p>
                  )}
                </div>
                <ul className="space-y-3.5 flex-1 mt-7 mb-0">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <svg className="w-4 h-4 text-[#05c8a7]/60 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <span className="text-sm text-gray-400 leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/signup?plan=${plan.name.toLowerCase()}${annual ? '&billing=annual' : ''}`}
                  className={`mt-8 block text-center py-4 rounded-xl font-bold text-base active:scale-[0.97] active:shadow-none transition-[transform,box-shadow,background-color,border-color] duration-150 ${
                    isPopular
                      ? 'bg-white text-black hover:bg-gray-100 hover:shadow-[0_4px_16px_rgba(255,255,255,0.18)] btn-glow shadow-lg shadow-white/5'
                      : 'bg-white/[0.06] text-gray-300 border-2 border-white/[0.10] hover:text-white hover:bg-white/[0.1] hover:border-white/[0.18]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <Link
          href="/signup"
          className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] hover:border-emerald-500/30 transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="text-sm text-gray-400">
              {tp.freeBannerPrefix}{' '}
              <strong className="text-emerald-400">{tp.freeBannerPlan}</strong>
              {' '}—{' '}
              <span className="text-gray-400">{tp.freeBannerDesc}</span>
            </span>
          </div>
          <span className="shrink-0 text-sm font-medium text-emerald-400 whitespace-nowrap">
            {tp.freeBannerCta}
          </span>
        </Link>

        <Link
          href="/setup-profesional"
          className="mt-3 flex items-center justify-between p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group"
        >
          <span className="text-sm text-gray-400">{tp.setupCtaPrefix} <strong className="text-gray-200">{tp.setupCtaBold}</strong> {tp.setupCtaSuffix}</span>
          <svg className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </>
  );
}

function TestimonialsSection({ t }: { t: LandingT['testimonials'] }) {
  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-5">
      {t.items.map((item) => (
        <div key={item.name} className="card-premium rounded-2xl p-6 md:p-7 flex flex-col gap-4">
          {/* Big stat */}
          <div className="flex items-start justify-between gap-3">
            <span
              className="font-extrabold tracking-tight text-white leading-none"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)' }}
            >
              {item.name}
            </span>
            <span className="text-2xl flex-shrink-0 mt-1" aria-hidden="true">{item.initials}</span>
          </div>

          {/* Explanation */}
          <p className="text-sm text-gray-300 leading-relaxed flex-1">{item.quote}</p>

          {/* Source attribution */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
            <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[11px] text-gray-600 leading-tight">{item.role}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN ─── */

export function LandingSections({ locale, country }: { locale: LandingLocale; country?: string }) {
  const t = getLandingT(locale);
  const isColombia = country === 'CO';

  return (
    <>
      {/* ── Social Proof ── */}
      <SocialProof t={t.socialProof} />

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Savings Calculator ── */}
      <section className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-[#05c8a7] uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.savings.sectionLabel}</p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.025em]">
              {t.savings.sectionTitle}
            </h2>
            <p className="text-gray-300 mt-4 md:mt-5 text-lg md:text-xl max-w-lg mx-auto font-light">
              {t.savings.sectionDesc}
            </p>
          </div>

          <div className="d-fade-up d-delay-2">
            <SavingsCalculator t={t.savings} />
          </div>
        </div>
      </section>

      {/* ── Mid CTA: after Savings Calculator ── */}
      <div className="max-w-4xl mx-auto px-6 -mt-10 mb-6">
        <MidCta
          text={t.savings.midCta.text}
          highlight={t.savings.midCta.highlight}
          cta={t.savings.midCta.cta}
        />
      </div>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Features with Tabs ── */}
      <section id="funciones" className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-8 d-fade-up">
            <p className="text-sm text-[#05c8a7] uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.features.sectionLabel}</p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.025em]">
              {t.features.sectionTitle}
            </h2>
            <p className="text-gray-200 md:text-gray-300 mt-4 md:mt-5 text-lg md:text-xl max-w-lg mx-auto font-light">
              {t.features.sectionDesc}
            </p>
          </div>

          <div className="d-fade-up d-delay-2">
            <FeatureTabs t={t} />
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Integrations ── */}
      <section className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-teal" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-sky-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.integrations.sectionLabel}</p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.025em]">
              {t.integrations.sectionTitle}
            </h2>
            <p className="text-gray-300 mt-4 md:mt-5 text-lg md:text-xl max-w-lg mx-auto font-light">
              {t.integrations.sectionDesc}
            </p>
          </div>

          <div className="d-scale-in d-delay-2">
            <IntegrationsGrid t={t.integrations} />
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Comparison ── */}
      <section className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-teal" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-sky-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.comparison.sectionLabel}</p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.025em]">
              {t.comparison.sectionTitle}
            </h2>
            <p className="text-gray-200 md:text-gray-300 mt-4 md:mt-5 text-lg md:text-xl max-w-lg mx-auto font-light">
              {t.comparison.sectionDesc}
            </p>
          </div>

          <div>
            <div className="md:hidden space-y-3">
              {t.comparison.mobileRows.map((row) => (
                <div key={row.feature} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">{row.feature}</p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#05c8a7] font-medium mb-1">{t.comparison.meniusHeader}</p>
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

            <div className="hidden md:block rounded-2xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
              <div className="grid grid-cols-3">
                <div className="p-5 border-b border-white/[0.06]" />
                <div className="p-5 text-center border-b border-white/[0.06] bg-[#05c8a7]/[0.06]">
                  <span className="text-sm font-semibold text-white">{t.comparison.meniusHeader}</span>
                </div>
                <div className="p-5 text-center border-b border-white/[0.06]">
                  <span className="text-xs text-gray-400">{t.comparison.otherHeader}</span>
                </div>
              </div>
              {t.comparison.rows.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 ${i < t.comparison.rows.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <div className="px-6 py-4">
                    <p className="text-sm text-gray-400">{row.feature}</p>
                  </div>
                  <div className="px-6 py-4 text-center bg-[#05c8a7]/[0.03]">
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

      {/* ── Mid CTA: after Comparison ── */}
      <div className="max-w-4xl mx-auto px-6 -mt-10 mb-6">
        <MidCta
          text={t.comparison.midCta.text}
          highlight={t.comparison.midCta.highlight}
          cta={t.comparison.midCta.cta}
        />
      </div>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Pricing ── */}
      <section id="precios" className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-blue" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#05c8a7]/15 blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <PricingSection t={t} isColombia={isColombia} />
        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── How it works ── */}
      <section className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-[#05c8a7] uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.howItWorks.sectionLabel}</p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.025em]">
              {t.howItWorks.sectionTitle}
            </h2>
          </div>

          <div className="d-fade-up d-delay-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {t.howItWorks.steps.map((item) => (
                <div key={item.step} className="card-premium rounded-2xl p-6 md:p-8 flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-[#05c8a7]/10 border border-[#05c8a7]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#05c8a7]">{item.step}</span>
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
      <section className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-teal" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-amber-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.testimonials.sectionLabel}</p>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-[-0.025em]">
              {t.testimonials.sectionTitle}
            </h2>
          </div>

          <div className="d-fade-up d-delay-2">
            <TestimonialsSection t={t.testimonials} />
          </div>

        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Final CTA ── */}
      <section className="relative py-24 md:py-52 overflow-clip">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#05c8a7]/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="d-fade-up">
            <h2 className="font-display text-3xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-[-0.03em] leading-[1.05]">
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
                className="w-full sm:w-auto px-10 py-5 rounded-2xl border-2 border-white/15 text-gray-200 font-bold text-[17px] sm:text-base hover:text-white hover:border-white/30 hover:bg-white/[0.04] active:scale-[0.97] transition-[transform,border-color,background,color] duration-150"
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
