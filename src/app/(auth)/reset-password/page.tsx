'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updatePassword } from '@/lib/actions/auth';
import { useLocale } from '@/providers/locale-provider';
import { getLandingT } from '@/lib/landing-translations';
import { Alert, EyeToggle, Spinner, eyeLabels } from '@/components/landing-v2/auth-bits';

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

  return (
    <main id="main-content" className="auth">
      <div className="wrap">
        <div className="auth-solo">
          {!done && <h1>{t.subtitle}</h1>}
          <div className="auth-card">
            {done ? (
              <div className="sent" role="status">
                <div className="env">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2>{t.doneTitle}</h2>
                <p>{t.doneDesc}</p>
                <Link href="/login" className="btn btn-primary btn-block sent-cta">
                  {t.signIn}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form">
                {error && <Alert>{error}</Alert>}

                <div className="fld">
                  <label htmlFor="rp-password">{t.newPassword}</label>
                  <div className="inp-wrap">
                    <input
                      id="rp-password"
                      className="inp"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.newPasswordPlaceholder}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <EyeToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} {...eyeLabels(locale)} />
                  </div>
                </div>

                <div className="fld">
                  <label htmlFor="rp-confirm">{t.confirmPassword}</label>
                  <div className="inp-wrap">
                    <input
                      id="rp-confirm"
                      className="inp"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder={t.confirmPasswordPlaceholder}
                      autoComplete="new-password"
                    />
                    <EyeToggle shown={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} {...eyeLabels(locale)} />
                  </div>
                </div>

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

          {!done && (
            <div className="auth-after">
              <Link href="/login">{t.backToLogin}</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
