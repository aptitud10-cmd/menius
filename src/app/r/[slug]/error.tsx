'use client';

export default function MenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🍽️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Menu no disponible</h2>
        <p className="text-sm text-gray-500 mb-6">
          Hubo un problema al cargar el menu. Intenta de nuevo en un momento.
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
