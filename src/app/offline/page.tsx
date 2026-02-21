'use client';

import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 18.75h.008v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Sin conexión</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Verifica tu conexión a internet e intenta de nuevo.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="block w-full py-3 px-6 rounded-xl text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            Ir al inicio
          </Link>
        </div>

        <p className="text-xs text-gray-300 mt-12 font-semibold tracking-wider">MENIUS</p>
      </div>
    </div>
  );
}
