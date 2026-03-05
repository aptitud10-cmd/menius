'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen landing-bg relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-red-500/[0.05] rounded-full blur-[180px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
        <Link href="/" className="font-display text-2xl font-bold tracking-[-0.04em] text-white inline-block mb-10">
          MENIUS
        </Link>

        <div className="w-16 h-16 rounded-2xl bg-red-500/[0.1] border border-red-500/[0.15] flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3 font-display tracking-tight">
          Algo salió mal
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-2">
          Ocurrió un error inesperado. Nuestro equipo ha sido notificado automáticamente.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-600 font-mono mb-8">Ref: {error.digest}</p>
        )}
        {!error.digest && <div className="mb-8" />}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 border border-white/[0.1] bg-white/[0.04] text-gray-300 rounded-xl text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
