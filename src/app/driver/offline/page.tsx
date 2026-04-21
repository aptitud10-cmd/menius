'use client';

import { useEffect, useState } from 'react';

export default function DriverOfflinePage() {
  const [en, setEn] = useState(false);

  useEffect(() => {
    setEn(navigator.language.startsWith('en'));
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <div>
          <p className="text-xl font-black text-white">
            {en ? 'No connection' : 'Sin conexión'}
          </p>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            {en
              ? 'Your actions are saved and will sync automatically when you reconnect.'
              : 'Tus acciones están guardadas y se sincronizarán cuando recuperes la conexión.'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-4 text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-gray-300">
              {en ? 'GPS continues to work offline' : 'El GPS continúa funcionando sin conexión'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-gray-300">
              {en ? 'Status updates queued for sync' : 'Actualizaciones guardadas para sincronizar'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-gray-300">
              {en ? 'No deliveries will be lost' : 'Ninguna entrega se perderá'}
            </span>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-[0.98] transition-all text-white font-black text-base"
        >
          {en ? 'Try again' : 'Intentar de nuevo'}
        </button>

        <p className="text-gray-700 text-xs">Powered by MENIUS</p>
      </div>
    </div>
  );
}
