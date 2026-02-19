'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Algo salio mal</h1>
            <p className="text-gray-500 mb-6 text-sm">
              Ocurrio un error inesperado. Nuestro equipo ha sido notificado.
              {error.digest && (
                <span className="block mt-2 text-xs text-gray-400 font-mono">
                  Ref: {error.digest}
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => reset()}
                className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                Reintentar
              </button>
              <a
                href="/"
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Ir al inicio
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
