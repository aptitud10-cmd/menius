'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { requestPasswordReset } from '@/lib/actions/auth';
import { useLocale } from '@/providers/locale-provider';
import { getLandingT } from '@/lib/landing-translations';
import { Alert, MailIcon, Spinner } from '@/components/landing-v2/auth-bits';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const IS_VERCEL_PREVIEW = process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = getLandingT(locale).auth.forgotPassword;

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
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

  return (
    <main id="main-content" className="auth">
      <div className="wrap">
        <div className="auth-solo">
          {!sent && (
            <>
              <h1>{t.subtitle}</h1>
              <p className="lead">{t.instructions}</p>
            </>
          )}
          <div className="auth-card">
            {sent ? (
              <div className="sent" role="status">
                <div className="env"><MailIcon /></div>
                <h2>{t.checkInboxTitle}</h2>
                <p>
                  {t.checkInboxDesc} <b>{email}</b>, {t.checkInboxDesc2}
                </p>
                <p className="spam">{t.spamNote}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form">
                {error && <Alert>{error}</Alert>}

                <div className="fld">
                  <label htmlFor="fp-email">{t.emailLabel}</label>
                  <input
                    id="fp-email"
                    className="inp"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {requiresTurnstile && (
                  <div className="ts-box">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onExpire={() => setTurnstileToken('')}
                      onError={() => setTurnstileToken('')}
                      options={{ theme: 'light', size: 'flexible' }}
                    />
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
            )}
          </div>

          <div className="auth-after">
            {sent ? (
              <Link href="/login">{t.backToLogin}</Link>
            ) : (
              <div className="row">
                {t.rememberPassword} <Link href="/login">{t.signIn}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
