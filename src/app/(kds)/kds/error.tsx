'use client';

export default function KDSError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black mb-2">Error en KDS</h2>
        <p className="text-sm text-gray-400 mb-6">
          Algo falló al cargar la cocina. Puedes reintentar o volver al dashboard.
          {error.digest && (
            <span className="block mt-2 text-xs text-gray-600 font-mono">Ref: {error.digest}</span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/app/orders"
            className="px-5 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
