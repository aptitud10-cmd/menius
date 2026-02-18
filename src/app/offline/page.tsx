'use client';

import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-purple-500/[0.12] flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Sin conexión a internet</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Parece que no tienes conexión. Verifica tu conexión a internet e intenta de nuevo.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-6 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="block w-full py-3 px-6 rounded-xl border border-white/[0.08] text-gray-400 font-medium text-sm hover:bg-white/[0.04] transition-colors"
          >
            Ir al inicio
          </Link>
        </div>

        <p className="text-xs text-gray-700 mt-12">MENIUS</p>
      </div>
    </div>
  );
}
