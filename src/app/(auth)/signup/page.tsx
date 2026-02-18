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
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }

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
      <div className="min-h-screen-safe flex items-center justify-center px-4 landing-bg noise-overlay relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/[0.12] rounded-full blur-[180px]" />

        <div className="relative z-10 w-full max-w-[380px] text-center animate-fade-in-up">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
              <span className="text-white">MENIUS</span>
            </Link>
          </div>

          <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
            <div className="bg-[#0a0a0a] rounded-2xl p-8">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/[0.1] border border-purple-500/[0.15] flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2 font-heading">Revisa tu email</h2>
              <p className="text-[13px] text-gray-400 mb-5 leading-relaxed">
                Enviamos un enlace de confirmación a <span className="text-white font-medium">{email}</span>.
                Haz clic en el enlace para activar tu cuenta.
              </p>
              <div className="separator-gradient" />
              <p className="text-[11px] text-gray-600 mt-4">¿No lo ves? Revisa tu carpeta de spam.</p>
            </div>
          </div>

          <p className="text-[13px] text-gray-500 mt-7">
            <Link href="/login" className="text-white font-medium hover:text-purple-400 transition-colors">
              Ir a iniciar sesión →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe flex items-center justify-center px-4 py-12 landing-bg noise-overlay relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/[0.12] rounded-full blur-[180px]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] bg-blue-500/[0.08] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[380px] animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
            <span className="text-white">MENIUS</span>
          </Link>
          <p className="text-gray-500 text-[13px] mt-2.5 tracking-wide">Crea tu cuenta gratis — 14 días de prueba</p>
        </div>

        {/* Card */}
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

            {/* Name */}
            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Nombre completo</label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'name'
                  ? 'ring-1 ring-purple-500/30 shadow-[0_0_20px_rgba(120,80,255,0.08)]'
                  : ''
              }`}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none transition-colors"
                  placeholder="Juan García"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Email</label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'email'
                  ? 'ring-1 ring-purple-500/30 shadow-[0_0_20px_rgba(120,80,255,0.08)]'
                  : ''
              }`}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none transition-colors"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Contraseña</label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'password'
                  ? 'ring-1 ring-purple-500/30 shadow-[0_0_20px_rgba(120,80,255,0.08)]'
                  : ''
              }`}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none transition-colors"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-4 h-4 rounded border border-white/[0.12] bg-white/[0.04] peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all flex items-center justify-center">
                  {acceptedTerms && (
                    <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[12px] text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                Acepto los{' '}
                <Link href="/terms" target="_blank" className="text-gray-300 hover:text-white underline underline-offset-2 transition-colors">
                  Términos y Condiciones
                </Link>{' '}
                y la{' '}
                <Link href="/privacy" target="_blank" className="text-gray-300 hover:text-white underline underline-offset-2 transition-colors">
                  Política de Privacidad
                </Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed mt-1 btn-glow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creando cuenta...
                </span>
              ) : 'Crear cuenta gratis'}
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-8 space-y-3 text-center">
          <p className="text-[13px] text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-white font-medium hover:text-purple-400 transition-colors">
              Inicia sesión
            </Link>
          </p>
          <Link href="/" className="inline-block text-[12px] text-gray-600 hover:text-gray-400 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
