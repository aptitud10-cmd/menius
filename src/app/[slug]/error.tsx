'use client';

import { useEffect } from 'react';

export default function MenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MenuPage] rendering error:', error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] bg-[#f5f5f3] flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-xs w-full">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-red-50 flex items-center justify-center">
          <span className="text-4xl select-none" aria-hidden="true">😕</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Algo salió mal
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-[220px] mx-auto">
          No pudimos cargar el menú. Verifica tu conexión e intenta de nuevo.
        </p>

        <button
          onClick={reset}
          className="w-full py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform"
        >
          Intentar de nuevo
        </button>

        <button
          onClick={() => window.location.reload()}
          className="mt-3 w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium active:bg-gray-50 transition-colors"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}
