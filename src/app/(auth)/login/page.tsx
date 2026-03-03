'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { login } from '@/lib/actions/auth';
import { loginSchema } from '@/lib/validations';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { useLocale } from '@/providers/locale-provider';
import { getLandingT } from '@/lib/landing-translations';

export default function LoginPage() {
  const locale = useLocale();
  const t = getLandingT(locale).auth.login;

  const [tab, setTab] = useState<'password' | 'magic'>('magic');

  // Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  // Magic link state
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState('');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const result = await login(parsed.data);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicError('');
    if (!magicEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(magicEmail)) {
      setMagicError('Ingresa un email válido');
      return;
    }
    setMagicLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email: magicEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMagicError(error.message);
      } else {
        setMagicSent(true);
      }
    } catch {
      setMagicError('Error al enviar el enlace. Intenta de nuevo.');
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] md:flex md:items-center md:justify-center px-5 md:px-4 landing-bg noise-overlay relative overflow-x-hidden overflow-y-auto w-full max-w-[100vw]">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[180px]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] bg-blue-500/[0.08] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[380px] mx-auto pt-20 md:pt-0">
        <div className="text-center mb-8 md:mb-10">
          <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
            <span className="text-white">MENIUS</span>
          </Link>
          <p className="text-gray-400 md:text-gray-500 text-sm md:text-[13px] mt-2 tracking-wide">{t.subtitle}</p>
        </div>

        <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
          <div className="bg-[#0a0a0a] rounded-2xl p-7 space-y-5">

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl">
              <button
                type="button"
                onClick={() => { setTab('magic'); setError(''); setMagicError(''); setMagicSent(false); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'magic'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                {t.magicLinkTab}
              </button>
              <button
                type="button"
                onClick={() => { setTab('password'); setError(''); setMagicError(''); setMagicSent(false); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'password'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                {t.passwordTab}
              </button>
            </div>

            {/* Magic Link Tab */}
            {tab === 'magic' && (
              <>
                {magicSent ? (
                  <div className="py-6 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-white font-semibold">{t.magicLinkSent}</p>
                    <p className="text-gray-400 text-sm">{t.magicLinkSentDesc}</p>
                    <button
                      type="button"
                      onClick={() => { setMagicSent(false); setMagicEmail(''); }}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-2"
                    >
                      ← Usar otro email
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <p className="text-gray-400 text-sm">{t.magicLinkDesc}</p>

                    {magicError && (
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                        <span className="text-red-400 text-[13px]">{magicError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[13px] font-medium text-gray-400 mb-2">{t.email}</label>
                      <input
                        type="email"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={magicLoading}
                      className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-semibold text-[15px] md:text-sm hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {magicLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          {t.magicLinkLoading}
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          {t.magicLinkSubmit}
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Password Tab */}
            {tab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span className="text-red-400 text-[13px]">{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-medium text-gray-400 mb-2">{t.email}</label>
                  <div className={`relative rounded-xl transition-all duration-300 ${focused === 'email' ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' : ''}`}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                      className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none transition-colors"
                      placeholder="tu@email.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-gray-400">{t.password}</label>
                    <Link href="/forgot-password" className="text-[12px] text-gray-600 hover:text-emerald-400 transition-colors">
                      {t.forgotPassword}
                    </Link>
                  </div>
                  <div className={`relative rounded-xl transition-all duration-300 ${focused === 'password' ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' : ''}`}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      className="w-full px-4 pr-12 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none transition-colors"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
            )}

            {/* Google — always visible */}
            <div className="flex items-center gap-4 py-1">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[11px] text-gray-600 uppercase tracking-widest">{t.or}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <button
              type="button"
              onClick={async () => {
                const supabase = getSupabaseBrowser();
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                });
              }}
              className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 font-medium text-sm hover:bg-white/[0.06] hover:text-white transition-all flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {t.google}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-3 text-center">
          <p className="text-[13px] text-gray-500">
            {t.noAccount}{' '}
            <Link href="/signup" className="text-white font-medium hover:text-emerald-400 transition-colors">
              {t.register}
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
