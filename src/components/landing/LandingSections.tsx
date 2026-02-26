'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getLandingT, type LandingLocale, type LandingT } from '@/lib/landing-translations';

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

const integrationStatic = [
  { name: 'Stripe', bg: 'bg-emerald-500/10', icon: '💳' },
  { name: 'WhatsApp', bg: 'bg-emerald-500/10', icon: '💬' },
  { name: 'Google Maps', bg: 'bg-blue-500/10', icon: '📍' },
  { name: 'Twilio', bg: 'bg-red-500/10', icon: '📱' },
  { name: 'Resend', bg: 'bg-sky-500/10', icon: '✉️' },
  { name: 'Gemini AI', bg: 'bg-amber-500/10', icon: '✨' },
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
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
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
          <h3 className="text-3xl md:text-4xl font-semibold text-white leading-tight tracking-tight">
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
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
          <p className="text-sm text-gray-500 font-medium mb-8 tracking-wide">{t.headline}</p>
          <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap">
            {t.logos.map((name) => (
              <span key={name} className="text-lg md:text-xl font-bold text-white/25 tracking-tight whitespace-nowrap hover:text-white/40 transition-colors">
                {name}
              </span>
            ))}
          </div>

          <div className="mt-12 flex items-center justify-center gap-12 md:gap-20">
            {t.stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">{stat.label}</p>
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
      {integrationStatic.map((item, i) => (
        <div key={item.name}>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6 text-center hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
            <div className={`w-12 h-12 rounded-xl ${item.bg} mx-auto mb-3 flex items-center justify-center text-xl`}>
              {item.icon}
            </div>
            <p className="text-sm font-semibold text-white">{item.name}</p>
            <p className="text-xs text-gray-500 mt-1">{t.items[i].desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SavingsCalculator({ t }: { t: LandingT['savings'] }) {
  const [revenue, setRevenue] = useState(15000);
  const commissionLoss = Math.round(revenue * 0.25);
  const meniusCost = 79;
  const annualSavings = (commissionLoss - meniusCost) * 12;

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
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">{t.withMenius}</p>
          <p className="text-3xl md:text-4xl font-bold text-emerald-400">${meniusCost}</p>
          <p className="text-sm text-gray-500 mt-1.5">{t.flatFeeLabel}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-blue-500/[0.04] p-6 md:p-8 text-center">
        <p className="text-sm text-gray-400 mb-2 font-medium">{t.savingsLabel}</p>
        <p className="text-4xl md:text-6xl font-bold text-white tracking-tight">
          ${annualSavings.toLocaleString()}
        </p>
        <p className="text-lg text-emerald-400 font-semibold mt-1">{t.perYear}</p>
      </div>
    </div>
  );
}

function TestimonialsSection({ t }: { t: LandingT['testimonials'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
      {t.items.map((tm) => (
        <div key={tm.name}>
          <div className="card-premium rounded-2xl p-6 md:p-7 h-full flex flex-col">
            <div className="flex gap-0.5 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm text-gray-300 leading-relaxed mb-5 flex-1">&ldquo;{tm.quote}&rdquo;</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{tm.initials}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{tm.name}</p>
                <p className="text-xs text-gray-500">{tm.role}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN ─── */

export function LandingSections({ locale }: { locale: LandingLocale }) {
  const t = getLandingT(locale);

  return (
    <>
      {/* ── Social Proof ── */}
      <SocialProof t={t.socialProof} />

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Features with Tabs ── */}
      <section id="funciones" className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-8 d-fade-up">
            <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.features.sectionLabel}</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
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
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
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
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
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
                      <p className="text-xs text-emerald-400 font-medium mb-1">{t.comparison.meniusHeader}</p>
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
                <div className="p-5 text-center border-b border-white/[0.06] bg-emerald-500/[0.06]">
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
                  <div className="px-6 py-4 text-center bg-emerald-500/[0.03]">
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

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Savings Calculator ── */}
      <section className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.savings.sectionLabel}</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
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

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── Pricing ── */}
      <section id="precios" className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-blue" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-emerald-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-blue-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.pricing.sectionLabel}</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
              {t.pricing.sectionTitle}
            </h2>
            <p className="text-gray-200 md:text-gray-300 mt-4 md:mt-5 text-lg md:text-xl font-light">{t.pricing.sectionDesc}</p>
          </div>

          <div className="d-scale-in d-delay-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.pricing.plans.map((plan, idx) => {
                const isPopular = idx === 1;
                return (
                  <div
                    key={plan.name}
                    className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                      isPopular
                        ? 'card-popular-glow bg-white/[0.04] border border-emerald-500/20 shimmer-border'
                        : 'card-gradient-border bg-white/[0.02] rounded-2xl hover:bg-white/[0.04]'
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-[11px] font-semibold rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/25">
                        {t.pricing.popularBadge}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <p className="text-sm text-gray-400 mt-1.5">{plan.desc}</p>
                    <div className="mt-7 mb-8">
                      <span className="text-5xl font-bold text-white tracking-tight">${plan.price}</span>
                      <span className="text-sm text-gray-400 ml-1.5">{t.pricing.perMonth}</span>
                    </div>
                    <ul className="space-y-3.5 flex-1">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-3">
                          <svg className="w-4 h-4 text-emerald-400/60 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          <span className="text-sm text-gray-400 leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/signup?plan=${plan.name.toLowerCase()}`}
                      className={`mt-8 block text-center py-3.5 rounded-xl font-medium text-[15px] transition-all duration-300 ${
                        isPopular
                          ? 'bg-white text-black hover:bg-gray-100 btn-glow shadow-lg shadow-white/5'
                          : 'bg-white/[0.06] text-gray-300 border border-white/[0.08] hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15]'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>

            <Link
              href="/setup-profesional"
              className="mt-6 flex items-center justify-between p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group"
            >
              <span className="text-sm text-gray-400">{t.pricing.setupCtaPrefix} <strong className="text-gray-200">{t.pricing.setupCtaBold}</strong> {t.pricing.setupCtaSuffix}</span>
              <svg className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      <div className="separator-gradient max-w-5xl mx-auto" />

      {/* ── How it works ── */}
      <section className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-purple" />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.howItWorks.sectionLabel}</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
              {t.howItWorks.sectionTitle}
            </h2>
          </div>

          <div className="d-fade-up d-delay-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
              {t.howItWorks.steps.map((item) => (
                <div key={item.step} className="card-premium rounded-2xl p-6 md:p-8 flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-400">{item.step}</span>
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

      {/* ── Testimonials ── */}
      <section className="relative py-24 md:py-40 overflow-clip">
        <div className="section-glow section-glow-teal" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-14 d-fade-up">
            <p className="text-sm text-amber-400 uppercase tracking-[0.2em] font-medium mb-4 md:mb-5">{t.testimonials.sectionLabel}</p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight">
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-br from-emerald-600/25 to-blue-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="d-fade-up">
            <h2 className="text-3xl md:text-5xl lg:text-7xl font-semibold text-white tracking-tight leading-[1.05]">
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
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-white text-black font-semibold text-base sm:text-[15px] hover:bg-gray-100 transition-all btn-glow"
              >
                {t.finalCta.ctaPrimary} &rarr;
              </Link>
              <Link
                href="/demo"
                className="w-full sm:w-auto px-10 py-4 rounded-2xl border border-white/10 text-gray-200 font-semibold text-base sm:text-[15px] hover:text-white hover:border-white/20 transition-all"
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
