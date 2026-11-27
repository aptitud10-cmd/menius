'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';
import { signup } from '@/lib/actions/auth';
import { getSignupSchema } from '@/lib/validations';
import { useLocale } from '@/providers/locale-provider';
import { getLandingT } from '@/lib/landing-translations';
import { TRIAL_DAYS } from '@/lib/plans';
import { Alert, CheckDot, EyeToggle, GoogleIcon, MailIcon, Spinner, eyeLabels } from '@/components/landing-v2/auth-bits';

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

// Un solo plan pago a la venta (Pro). Links viejos con ?plan=starter|business
// (o los alias legacy basic|enterprise) se tratan como Pro.
function normalizePublicPlan(plan: string | null): 'free' | 'pro' | null {
  if (!plan) return null;
  if (plan === 'free') return 'free';
  if (['pro', 'starter', 'business', 'basic', 'enterprise'].includes(plan)) return 'pro';
  return null;
}

function PlanBadge({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const selectedPlan = normalizePublicPlan(searchParams.get('plan'));
  const selectedBilling = searchParams.get('billing');
  if (!selectedPlan) return null;
  return (
    <span className="plan-chip">
      {locale === 'es'
        ? `Plan ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} seleccionado${selectedBilling === 'annual' ? ' · Anual' : ''}`
        : `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan selected${selectedBilling === 'annual' ? ' · Annual' : ''}`}
    </span>
  );
}

/** Textos de la columna izquierda (maqueta fase 2, NOTAS.md: "Auth split"). */
function pitchText(locale: string) {
  if (locale === 'es') return {
    stamp: `${TRIAL_DAYS} días gratis`,
    h1: `Prueba Pro gratis por ${TRIAL_DAYS} días,`,
    voice: 'sin tarjeta.',
    points: ['0% de comisión por pedido', 'Mes a mes, cancela cuando quieras', 'Lo configuramos contigo'],
    shotAlt: 'La tablet Counter con un pedido nuevo para recoger, esperando que lo acepten',
    emailPlaceholder: 'tu@email.com',
    viewDemo: 'Ver demo del menú →',
    tsFail: 'No se pudo cargar la verificación anti-bot. Desactiva el bloqueador de anuncios o los escudos de Brave y recarga la página.',
    tsReload: 'Recargar página',
    tsPending: 'Completa la verificación anti-bot para habilitar el botón.',
    legalPre: 'Al crear tu cuenta aceptas los',
    legalTerms: 'Términos',
    legalAnd: 'y la',
    legalPrivacy: 'Política de Privacidad',
    signInArrow: 'Iniciar sesión →',
  };
  return {
    stamp: `${TRIAL_DAYS} days free`,
    h1: `Try Pro free for ${TRIAL_DAYS} days,`,
    voice: 'no card required.',
    points: ['0% commission per order', 'Month-to-month, cancel anytime', 'We set it up with you'],
    shotAlt: 'The Counter tablet with a new pickup order waiting to be accepted',
    emailPlaceholder: 'you@email.com',
    viewDemo: 'View menu demo →',
    tsFail: 'Could not load anti-bot verification. Disable ad blockers/Brave shields and reload the page.',
    tsReload: 'Reload page',
    tsPending: 'Complete anti-bot verification to enable the button.',
    legalPre: 'By creating your account you agree to our',
    legalTerms: 'Terms',
    legalAnd: 'and',
    legalPrivacy: 'Privacy Policy',
    signInArrow: 'Sign in →',
  };
}

const STRENGTH_TONE = ['bad', 'bad', 'warn', 'ok', 'ok'] as const;

export default function SignupPage() {
  const locale = useLocale();
  const t = getLandingT(locale).auth.signup;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
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

    const parsed = getSignupSchema(locale).safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    if (requiresTurnstile && !turnstileToken) {
      setError(t.turnstileRequired);
      return;
    }

    // Persist plan intent in cookie so /auth/callback can propagate it to onboarding
    // even after email confirmation (URL params are lost during magic link flow).
    if (typeof document !== 'undefined') {
      const url = new URL(window.location.href);
      const intendedPlan = normalizePublicPlan(url.searchParams.get('plan'));
      const intendedBilling = url.searchParams.get('billing');
      if (intendedPlan) {
        document.cookie = `menius_intended_plan=${intendedPlan}; path=/; max-age=3600; SameSite=Lax`;
      }
      if (intendedBilling === 'annual') {
        document.cookie = `menius_intended_billing=annual; path=/; max-age=3600; SameSite=Lax`;
      }
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

  const p = pitchText(locale);
  const strength = getPasswordStrength(password);
  const strengthLabels = locale === 'es'
    ? ['Muy corta', 'Muy débil', 'Débil', 'Buena', 'Fuerte']
    : ['Too short', 'Too weak', 'Weak', 'Good', 'Strong'];

  return (
    <main id="main-content" className="auth">
      <div className="wrap">
        <div className="auth-split">
          <div className="auth-pitch">
            <span className="stamp label">{p.stamp}</span>
            <h1>
              {p.h1} <span className="voice">{p.voice}</span>
            </h1>
            <Suspense fallback={null}>
              <PlanBadge locale={locale} />
            </Suspense>
            <ul className="auth-points">
              {p.points.map((pt) => (
                <li key={pt}><CheckDot />{pt}</li>
              ))}
            </ul>
            <div className="auth-shot">
              <div className="tablet">
                <div className="scr">
                  <Image src="/landing/v2/counter-next-v1.webp" alt={p.shotAlt} width={1120} height={1380} quality={80} sizes="320px" />
                </div>
              </div>
            </div>
          </div>

          <div className="auth-form">
            <div className="auth-card">
              {confirmEmail ? (
                <div className="sent" role="status">
                  <div className="env"><MailIcon /></div>
                  <h2>{t.checkEmail}</h2>
                  <p>
                    {t.confirmSent} <b>{email}</b>. {t.confirmClick}
                  </p>
                  <p className="spam">{t.spamNote}</p>
                </div>
              ) : (
                <div className="form">
                  {/* Google first — como Vercel / Linear */}
                  <Link href="/auth/google?flow=signup" className="btn-google">
                    <GoogleIcon />
                    {t.google}
                  </Link>
                  <div className="or" role="separator">{t.or}</div>

                  <form onSubmit={handleSubmit} className="form-contents">
                    {error && (
                      <Alert>
                        {error}
                        {(error.includes('registrado') || error.includes('registered')) && (
                          <>
                            {' '}
                            <Link href="/login">{p.signInArrow}</Link>
                          </>
                        )}
                      </Alert>
                    )}

                    <div className="fld">
                      <label htmlFor="signup-email">{t.email}</label>
                      <div className="inp-wrap">
                        <input
                          id="signup-email"
                          className="inp"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                          placeholder={p.emailPlaceholder}
                          autoComplete="email"
                        />
                        {touched.email && isEmailShape(email) && (
                          <span className="ok-mark" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="fld">
                      <label htmlFor="signup-password">{t.password}</label>
                      <div className="inp-wrap">
                        <input
                          id="signup-password"
                          className="inp"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                          placeholder={t.passwordPlaceholder}
                          autoComplete="new-password"
                        />
                        <EyeToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} {...eyeLabels(locale)} />
                      </div>
                      {/* Barra de fuerza: aparece al empezar a escribir */}
                      {password.length > 0 && (
                        <div className="strength" data-s={strength} data-tone={STRENGTH_TONE[strength]}>
                          <div className="bars" aria-hidden="true">
                            {[1, 2, 3, 4].map((i) => (
                              <i key={i} className={i <= strength ? 'on' : undefined} />
                            ))}
                          </div>
                          <p className="lbl-s" aria-live="polite">{strengthLabels[strength]}</p>
                        </div>
                      )}
                    </div>

                    {requiresTurnstile && (
                      <div className="ts-box">
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
                          options={{ theme: 'light', size: 'flexible' }}
                        />
                        {turnstileError ? (
                          <div className="ts-warn">
                            <p>{p.tsFail}</p>
                            <button type="button" className="tlink" onClick={() => window.location.reload()}>
                              {p.tsReload}
                            </button>
                          </div>
                        ) : (
                          !turnstileToken && <p className="hint">{p.tsPending}</p>
                        )}
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="btn btn-primary btn-block">
                      {loading ? (
                        <>
                          <Spinner />
                          {t.loading}
                        </>
                      ) : t.submit}
                    </button>

                    <p className="legal-line">
                      {p.legalPre}{' '}
                      <Link href="/terms" target="_blank">{p.legalTerms}</Link>{' '}
                      {p.legalAnd}{' '}
                      <Link href="/privacy" target="_blank">{p.legalPrivacy}</Link>.
                    </p>
                  </form>
                </div>
              )}
            </div>
            <div className="auth-after">
              {confirmEmail ? (
                <Link href="/login">{t.goToLogin}</Link>
              ) : (
                <div className="row">
                  {t.hasAccount} <Link href="/login">{t.signIn}</Link>
                </div>
              )}
              <a className="web-only" href="/la-casa-del-sabor" target="_blank" rel="noopener noreferrer">
                {p.viewDemo}
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
