'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { requestPasswordReset } from '@/lib/actions/auth';
import { useLocale } from '@/providers/locale-provider';
import { getLandingT } from '@/lib/landing-translations';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const IS_VERCEL_PREVIEW = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = getLandingT(locale).auth.forgotPassword;

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const requiresTurnstile = TURNSTILE_SITE_KEY.length > 0 && !IS_VERCEL_PREVIEW;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError(t.invalidEmail);
      return;
    }

    if (requiresTurnstile && !turnstileToken) {
      setError(t.turnstileRequired);
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email, turnstileToken || undefined);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4 landing-bg noise-overlay relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[180px]" />

        <div className="relative z-10 w-full max-w-[380px] text-center">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
              <span className="text-white">MENIUS</span>
            </Link>
          </div>

          <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
            <div className="bg-[#0a0a0a] rounded-2xl p-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/[0.1] border border-emerald-500/[0.15] flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2 font-heading">{t.checkInboxTitle}</h2>
              <p className="text-[13px] text-gray-400 mb-5 leading-relaxed">
                {t.checkInboxDesc} <span className="text-white font-medium">{email}</span>,{' '}
                {t.checkInboxDesc2}
              </p>
              <div className="separator-gradient" />
              <p className="text-[11px] text-gray-600 mt-4">{t.spamNote}</p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-[13px] text-gray-500">
              <Link href="/login" className="text-white font-medium hover:text-emerald-400 transition-colors">
                {t.backToLogin}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 landing-bg noise-overlay relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[180px]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] bg-blue-500/[0.08] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[380px]">
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
            <span className="text-white">MENIUS</span>
          </Link>
          <p className="text-gray-500 text-[13px] mt-2.5 tracking-wide">{t.subtitle}</p>
        </div>

        <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
          <form
            onSubmit={handleSubmit}
            className="bg-[#0a0a0a] rounded-2xl p-7 space-y-5"
          >
            {error && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-red-400 text-[13px]">{error}</span>
              </div>
            )}

            <p className="text-[13px] text-gray-400 leading-relaxed">{t.instructions}</p>

            <div>
              <label htmlFor="fp-email" className="block text-[13px] font-medium text-gray-400 mb-2">{t.emailLabel}</label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused
                  ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                  : ''
              }`}>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none transition-colors"
                  placeholder={t.emailPlaceholder}
                  autoFocus
                />
              </div>
            </div>

            {requiresTurnstile && (
              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
                options={{ theme: 'dark', size: 'flexible' }}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-[15px] md:text-sm hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  {t.loading}
                </span>
              ) : t.submit}
            </button>
          </form>
        </div>

        <div className="mt-8 space-y-3 text-center">
          <p className="text-[13px] text-gray-500">
            {t.rememberPassword}{' '}
            <Link href="/login" className="text-white font-medium hover:text-emerald-400 transition-colors">
              {t.signIn}
            </Link>
          </p>
          <Link href="/" className="inline-block text-[12px] text-gray-600 hover:text-gray-400 transition-colors">
            {t.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
