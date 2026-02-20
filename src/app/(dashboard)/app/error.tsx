'use client';

import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 bg-red-500/[0.1] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1.5">Error en el dashboard</h2>
        <p className="text-sm text-gray-500 mb-6">
          Algo falló al cargar esta sección. Puedes reintentar o volver al inicio.
          {error.digest && (
            <span className="block mt-2 text-xs text-gray-600 font-mono">Ref: {error.digest}</span>
          )}
        </p>
        <div className="flex gap-2.5 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/app"
            className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
