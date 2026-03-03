'use client';

export default function OrderTrackingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">No se pudo cargar el pedido</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Hubo un problema al cargar el estado de tu pedido. Por favor intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
