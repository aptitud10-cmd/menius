'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_KEY = 'menius-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-fade-in-up">
      <div className="max-w-xl mx-auto bg-brand-950 border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300 leading-relaxed">
            Usamos cookies esenciales para que la plataforma funcione correctamente (autenticacion y sesion).
            No usamos cookies de rastreo ni publicidad.{' '}
            <Link href="/cookies" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
              Mas informacion
            </Link>
          </p>
        </div>
        <button
          onClick={accept}
          className="flex-shrink-0 px-5 py-2 rounded-xl bg-brand-500 text-brand-950 text-sm font-bold hover:bg-brand-400 transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
