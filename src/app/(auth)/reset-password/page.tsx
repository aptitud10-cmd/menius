'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { updatePassword } from '@/lib/actions/auth';
import { useLocale } from '@/providers/locale-provider';
import { getLandingT } from '@/lib/landing-translations';

export default function ResetPasswordPage() {
  const locale = useLocale();
  const t = getLandingT(locale).auth.resetPassword;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t.minLength);
      return;
    }
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setDone(true);
      setLoading(false);
    }
  };

  if (done) {
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2 font-heading">{t.doneTitle}</h2>
              <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">{t.doneDesc}</p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-all duration-300"
              >
                {t.signIn}
              </Link>
            </div>
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

            <div>
              <label htmlFor="rp-password" className="block text-[13px] font-medium text-gray-400 mb-2">{t.newPassword}</label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'password'
                  ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                  : ''
              }`}>
                <input
                  id="rp-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 pr-12 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none transition-colors"
                  placeholder={t.newPasswordPlaceholder}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="rp-confirm" className="block text-[13px] font-medium text-gray-400 mb-2">{t.confirmPassword}</label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'confirm'
                  ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                  : ''
              }`}>
                <input
                  id="rp-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 pr-12 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none transition-colors"
                  placeholder={t.confirmPasswordPlaceholder}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

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

        <div className="mt-8 text-center">
          <Link href="/login" className="inline-block text-[12px] text-gray-600 hover:text-gray-400 transition-colors">
            {t.backToLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
