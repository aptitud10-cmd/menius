'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';

export default function MenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MenuPage] rendering error:', error);
    Sentry.captureException(error);
  }, [error]);
  // Idioma del cliente (no sabemos el del restaurante si el menú no cargó).
  const [en, setEn] = useState(false);
  useEffect(() => { setEn(!/^es/i.test(navigator.language || '')); }, []);

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f3] flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-xs w-full">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-red-50 flex items-center justify-center">
          <span className="text-4xl select-none" aria-hidden="true">😕</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {en ? 'Something went wrong' : 'Algo salió mal'}
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-[220px] mx-auto">
          {en ? "We couldn't load the menu. Check your connection and try again." : 'No pudimos cargar el menú. Verifica tu conexión e intenta de nuevo.'}
        </p>

        <button
          onClick={reset}
          className="w-full py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform"
        >
          {en ? 'Try again' : 'Intentar de nuevo'}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="mt-3 w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium active:bg-gray-50 transition-colors"
        >
          {en ? 'Reload page' : 'Recargar página'}
        </button>
      </div>
    </div>
  );
}
