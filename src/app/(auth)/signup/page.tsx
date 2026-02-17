'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signup } from '@/lib/actions/auth';
import { signupSchema } from '@/lib/validations';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = signupSchema.safeParse({ full_name: fullName, email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const result = await signup(parsed.data);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if ((result as any)?.success === 'confirm_email') {
      setConfirmEmail(true);
      setLoading(false);
    }
  };

  if (confirmEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-brand-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-950 to-brand-900" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10 w-full max-w-sm text-center animate-fade-in-up">
          <div className="text-center mb-6">
            <Link href="/" className="text-2xl font-bold tracking-tight font-heading">
              <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
            </Link>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Revisa tu email</h2>
            <p className="text-sm text-gray-400 mb-4">
              Enviamos un enlace de confirmación a <span className="font-medium text-gray-200">{email}</span>. Haz clic en el enlace para activar tu cuenta.
            </p>
            <p className="text-xs text-gray-600">¿No lo ves? Revisa tu carpeta de spam.</p>
          </div>
          <p className="text-center text-sm text-gray-500 mt-5">
            <Link href="/login" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">Ir a iniciar sesión</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-brand-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-950 to-brand-900" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/8 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight font-heading">
            <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
          </Link>
          <p className="text-gray-400 text-sm mt-2">Crea tu cuenta gratis</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
              placeholder="Juan García"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/40 focus:ring-offset-0"
            />
            <span className="text-xs text-gray-400 leading-relaxed">
              Acepto los{' '}
              <Link href="/terms" target="_blank" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
                Terminos y Condiciones
              </Link>{' '}
              y la{' '}
              <Link href="/privacy" target="_blank" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
                Politica de Privacidad
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="w-full py-2.5 rounded-xl bg-brand-500 text-brand-950 font-semibold text-sm hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">Inicia sesión</Link>
        </p>
        <p className="text-center mt-3">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">← Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
}
