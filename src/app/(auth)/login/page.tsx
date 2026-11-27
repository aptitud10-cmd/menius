'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { login } from '@/lib/actions/auth';
import { getLoginSchema } from '@/lib/validations';
import { useLocale } from '@/providers/locale-provider';
import { getLandingT } from '@/lib/landing-translations';
import { Alert, EyeToggle, GoogleIcon, Spinner, eyeLabels } from '@/components/landing-v2/auth-bits';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const IS_VERCEL_PREVIEW = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

export default function LoginPage() {
  const locale = useLocale();
  const t = getLandingT(locale).auth.login;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);
  // Inside the Counter Android app: Google blocks its OAuth screen in WebViews
  // (disallowed_useragent), and signup/landing links lead nowhere useful there.
  const [inCounterApp, setInCounterApp] = useState(false);
  const [next, setNext] = useState<string | undefined>(undefined);
  useEffect(() => {
    setInCounterApp(navigator.userAgent.includes('MeniusCounterApp'));
    setNext(new URLSearchParams(window.location.search).get('next') ?? undefined);
  }, []);
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
    const parsed = getLoginSchema(locale).safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (requiresTurnstile && !turnstileToken) {
      setError(t.turnstileRequired);
      return;
    }

    setLoading(true);
    const result = await login({ ...parsed.data, turnstileToken, next });
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const ui = locale === 'es'
    ? {
        tsFail: 'No se pudo cargar la verificación anti-bot. Desactiva el bloqueador de anuncios o los escudos de Brave y recarga la página.',
        tsReload: 'Recargar página',
        tsPending: 'Completa la verificación anti-bot para habilitar el botón.',
        connect: '← Conectar con un código',
      }
    : {
        tsFail: 'Could not load anti-bot verification. Disable ad blockers/Brave shields and reload the page.',
        tsReload: 'Reload page',
        tsPending: 'Complete anti-bot verification to enable the button.',
        connect: '← Connect with a code',
      };

  return (
    <main id="main-content" className="auth">
      <div className="wrap">
        <div className="auth-solo">
          <h1>{t.subtitle}</h1>
          <div className="auth-card">
            <div className="form">
              {/* Google first — not offered inside the Counter app (see inCounterApp) */}
              {!inCounterApp && (
                <>
                  {/* <a>, no <Link>: /auth/google es un route handler que redirige a
                      Google. Link lo precargaba al verse el botón, arrancando el OAuth
                      en cada visita (y el navegador bloqueaba el salto por CSP). */}
                  <a
                    href={next ? `/auth/google?flow=login&next=${encodeURIComponent(next)}` : '/auth/google?flow=login'}
                    className="btn-google"
                  >
                    <GoogleIcon />
                    {t.google}
                  </a>
                  <div className="or" role="separator">{t.or}</div>
                </>
              )}

              <form onSubmit={handleSubmit} className="form-contents">
                {error && <Alert>{error}</Alert>}

                <div className="fld">
                  <label htmlFor="login-email">{t.email}</label>
                  <input
                    id="login-email"
                    className="inp"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={locale === 'es' ? 'tu@email.com' : 'you@email.com'}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div className="fld">
                  <div className="lbl-row">
                    <label htmlFor="login-password">{t.password}</label>
                    <Link href="/forgot-password">{t.forgotPassword}</Link>
                  </div>
                  <div className="inp-wrap">
                    <input
                      id="login-password"
                      className="inp"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <EyeToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} {...eyeLabels(locale)} />
                  </div>
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
                        <p>{ui.tsFail}</p>
                        <button type="button" className="tlink" onClick={() => window.location.reload()}>
                          {ui.tsReload}
                        </button>
                      </div>
                    ) : (
                      !turnstileToken && <p className="hint">{ui.tsPending}</p>
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
              </form>
            </div>
          </div>

          <div className="auth-after">
            {inCounterApp ? (
              <a href="/connect">{ui.connect}</a>
            ) : (
              <div className="row">
                {t.noAccount} <Link href="/signup">{t.register}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
