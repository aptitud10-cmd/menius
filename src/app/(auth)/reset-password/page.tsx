'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updatePassword } from '@/lib/actions/auth';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
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
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/[0.1] border border-emerald-500/[0.15] flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2 font-heading">Contraseña actualizada</h2>
              <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">
                Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-all duration-300 btn-glow"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe flex items-center justify-center px-4 landing-bg noise-overlay relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/[0.12] rounded-full blur-[180px]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] bg-blue-500/[0.08] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[380px] animate-fade-in-up">
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
            <span className="text-white">MENIUS</span>
          </Link>
          <p className="text-gray-500 text-[13px] mt-2.5 tracking-wide">Crea tu nueva contraseña</p>
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
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Nueva contraseña</label>
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
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Confirmar contraseña</label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'confirm'
                  ? 'ring-1 ring-purple-500/30 shadow-[0_0_20px_rgba(120,80,255,0.08)]'
                  : ''
              }`}>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none transition-colors"
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed mt-1 btn-glow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Actualizando...
                </span>
              ) : 'Restablecer contraseña'}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <Link href="/login" className="inline-block text-[12px] text-gray-600 hover:text-gray-400 transition-colors">
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
