'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Sparkles, Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';
import { signup } from '@/lib/actions/auth';
import { signupSchema } from '@/lib/validations';
import { useLocale } from '@/providers/locale-provider';
import { getLandingT } from '@/lib/landing-translations';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const IS_VERCEL_PREVIEW = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

function getPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

function isEmailShape(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

function mapAuthError(msg: string, locale: string): string {
  const m = msg.toLowerCase();
  const es = locale === 'es';
  if (m.includes('already registered') || m.includes('already exists'))
    return es ? 'Este email ya está registrado.' : 'This email is already registered.';
  if (m.includes('rate limit') || m.includes('too many'))
    return es ? 'Demasiados intentos. Espera unos minutos.' : 'Too many attempts. Please wait.';
  if (m.includes('invalid') && m.includes('email'))
    return es ? 'El formato del email no es válido.' : 'Invalid email format.';
  if (m.includes('password'))
    return es ? 'La contraseña no cumple los requisitos mínimos.' : 'Password does not meet minimum requirements.';
  return msg;
}

function PlanBadge({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const selectedBilling = searchParams.get('billing');
  if (!selectedPlan) return null;
  return (
    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
      <Sparkles className="w-3 h-3" />
      {locale === 'es'
        ? `Plan ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} seleccionado${selectedBilling === 'annual' ? ' · Anual' : ''}`
        : `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan selected${selectedBilling === 'annual' ? ' · Annual' : ''}`}
    </div>
  );
}

export default function SignupPage() {
  const locale = useLocale();
  const t = getLandingT(locale).auth.signup;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const requiresTurnstile = TURNSTILE_SITE_KEY.length > 0 && !IS_VERCEL_PREVIEW;

  useEffect(() => {
    if (!requiresTurnstile) return;
    const timer = window.setTimeout(() => {
      if (!turnstileReady && !turnstileToken) {
        setTurnstileError(true);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [requiresTurnstile, turnstileReady, turnstileToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    if (requiresTurnstile && !turnstileToken) {
      setError(t.turnstileRequired);
      return;
    }

    setLoading(true);
    const result = await signup({ ...parsed.data, turnstileToken });
    if (result?.error) {
      setError(mapAuthError(result.error, locale));
      setLoading(false);
    } else if ((result as any)?.success === 'confirm_email') {
      setConfirmEmail(true);
      setLoading(false);
    }
  };

  if (confirmEmail) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4 landing-bg noise-overlay relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[180px]" />

        <div className="relative z-10 w-full max-w-[440px] text-center">
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
              <h2 className="text-lg font-bold text-white mb-2 font-heading">{t.checkEmail}</h2>
              <p className="text-[13px] text-gray-400 mb-5 leading-relaxed">
                {t.confirmSent} <span className="text-white font-medium">{email}</span>.
                {' '}{t.confirmClick}
              </p>
              <div className="separator-gradient" />
              <p className="text-[11px] text-gray-600 mt-4">{t.spamNote}</p>
            </div>
          </div>

          <p className="text-[13px] text-gray-500 mt-7">
            <Link href="/login" className="text-white font-medium hover:text-emerald-400 transition-colors">
              {t.goToLogin}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] md:flex md:items-center md:justify-center px-5 md:px-4 py-6 md:py-12 landing-bg noise-overlay relative overflow-x-hidden overflow-y-auto w-full max-w-[100vw]">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[180px]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] bg-blue-500/[0.08] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[440px] mx-auto pt-14 md:pt-0">
        <div className="text-center mb-6 md:mb-10">
          <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
            <span className="text-white">MENIUS</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-4 leading-tight tracking-tight">{t.subtitle}</h1>
          <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
            {(locale === 'es'
              ? ['0% comisión por pedido', 'Sin tarjeta de crédito', 'Listo en 2 minutos']
              : ['0% commission per order', 'No credit card', 'Ready in 2 minutes']
            ).map((chip) => (
              <span key={chip} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-1 h-1 rounded-full bg-emerald-500/60 inline-block flex-shrink-0" />
                {chip}
              </span>
            ))}
          </div>
          <Suspense fallback={null}>
            <PlanBadge locale={locale} />
          </Suspense>
        </div>

        <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
          <div className="bg-[#0a0a0a] rounded-2xl p-8 md:p-10 space-y-6">

            {/* Google first — como Vercel / Linear */}
            <Link
              href="/auth/google?flow=signup"
              className="w-full py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 font-medium text-sm hover:bg-white/[0.06] hover:text-white transition-all flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {t.google}
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[11px] text-gray-600 uppercase tracking-widest">{t.or}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span className="text-red-400 text-sm">
                    {error}
                    {(error.includes('registrado') || error.includes('registered')) && (
                      <Link href="/login" className="text-white underline underline-offset-2 ml-1.5 hover:text-emerald-400 transition-colors">
                        {locale === 'es' ? 'Iniciar sesión →' : 'Sign in →'}
                      </Link>
                    )}
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-400 mb-2">{t.email}</label>
                <div className={`relative rounded-xl transition-all duration-300 ${focused === 'email' ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' : ''}`}>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => { setFocused(null); setTouched(p => ({ ...p, email: true })); }}
                    className="w-full px-4 py-3.5 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none transition-colors"
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                  {touched.email && isEmailShape(email) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-400 mb-2">{t.password}</label>
                <div className={`relative rounded-xl transition-all duration-300 ${focused === 'password' ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' : ''}`}>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => { setFocused(null); setTouched(p => ({ ...p, password: true })); }}
                    className="w-full px-4 pr-12 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none transition-colors"
                    placeholder={t.passwordPlaceholder}
                    autoComplete="new-password"
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
                {/* Password strength bar — aparece al empezar a escribir */}
                {(touched.password || password.length > 0) && password.length > 0 && (() => {
                  const strength = getPasswordStrength(password);
                  const labels = locale === 'es'
                    ? ['Muy corta', 'Muy débil', 'Débil', 'Buena', 'Fuerte']
                    : ['Too short', 'Too weak', 'Weak', 'Good', 'Strong'];
                  const colors = ['bg-red-500/50', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
                  const textColors = ['text-red-400/60', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-emerald-400'];
                  return (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              i <= strength ? colors[strength] : 'bg-white/[0.07]'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-[11px] font-medium transition-colors ${textColors[strength]}`}>
                        {labels[strength]}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {requiresTurnstile && (
                <div className="space-y-2">
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onLoadScript={() => setTurnstileError(false)}
                    onWidgetLoad={() => {
                      setTurnstileReady(true);
                      setTurnstileError(false);
                    }}
                    onSuccess={(token) => {
                      setTurnstileError(false);
                      setTurnstileToken(token);
                    }}
                    onExpire={() => setTurnstileToken('')}
                    onError={() => {
                      setTurnstileToken('');
                      setTurnstileError(true);
                    }}
                    onUnsupported={() => {
                      setTurnstileToken('');
                      setTurnstileError(true);
                    }}
                    scriptOptions={{
                      onError: () => {
                        setTurnstileToken('');
                        setTurnstileError(true);
                        setTurnstileReady(false);
                      },
                    }}
                    options={{ theme: 'dark', size: 'flexible' }}
                  />
                  {turnstileError ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                      <p className="text-[12px] text-amber-300">
                        {locale === 'es'
                          ? 'No se pudo cargar la verificacion anti-bot. Desactiva adblock/Brave shields y recarga la pagina.'
                          : 'Could not load anti-bot verification. Disable ad blockers/Brave shields and reload the page.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-2 text-[12px] text-white underline underline-offset-2 hover:text-emerald-300 transition-colors"
                      >
                        {locale === 'es' ? 'Recargar pagina' : 'Reload page'}
                      </button>
                    </div>
                  ) : (
                    !turnstileToken && (
                      <p className="text-[12px] text-gray-500">
                        {locale === 'es'
                          ? 'Completa la verificacion anti-bot para habilitar el boton.'
                          : 'Complete anti-bot verification to enable the button.'}
                      </p>
                    )
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-[15px] md:text-sm hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    {t.loading}
                  </span>
                ) : t.submit}
              </button>

              <p className="text-[12px] text-gray-500 leading-relaxed text-center">
                {locale === 'es'
                  ? <>Al crear tu cuenta aceptas los{' '}<Link href="/terms" target="_blank" className="text-gray-300 hover:text-white underline underline-offset-2 transition-colors">Términos</Link>{' '}y la{' '}<Link href="/privacy" target="_blank" className="text-gray-300 hover:text-white underline underline-offset-2 transition-colors">Política de Privacidad</Link>.</>
                  : <>By creating your account you agree to our{' '}<Link href="/terms" target="_blank" className="text-gray-300 hover:text-white underline underline-offset-2 transition-colors">Terms</Link>{' '}and{' '}<Link href="/privacy" target="_blank" className="text-gray-300 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</Link>.</>
                }
              </p>
            </form>
          </div>
        </div>

        <div className="mt-8 space-y-3 text-center">
          <p className="text-[13px] text-gray-500">
            {t.hasAccount}{' '}
            <Link href="/login" className="text-white font-medium hover:text-emerald-400 transition-colors">
              {t.signIn}
            </Link>
          </p>
          <Link href="/" className="inline-block text-[12px] text-gray-600 hover:text-gray-400 transition-colors">
            {t.backHome}
          </Link>
          <div>
            <a
              href="/la-casa-del-sabor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[12px] text-gray-600 hover:text-emerald-400 transition-colors"
            >
              {locale === 'es' ? 'Ver demo del menú →' : 'View menu demo →'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
