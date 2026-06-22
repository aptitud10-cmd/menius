'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const COOKIE_KEY = 'menius-cookie-consent';

// El banner solo aplica a páginas públicas de marketing/sitio. NO debe mostrarse
// en los menús de tienda (/[slug] y subrutas), donde un comensal escanea el QR
// para pedir y el banner le tapa el primer producto + el botón de agregar.
// Allowlist en vez de blocklist: una tienda nueva nunca dispara el banner, y
// las áreas logueadas (dashboard, counter, kds, driver) tampoco lo necesitan.
const MARKETING_PATHS = new Set([
  '/', '/blog', '/demo', '/faq', '/changelog', '/cookies',
  '/privacy', '/terms', '/status', '/support', '/setup-profesional', '/ai-fotos',
]);

function isMarketingPath(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true;
  // Subrutas de marketing (ej. /blog/algun-post)
  return pathname.startsWith('/blog/');
}

function getLocale(): 'es' | 'en' {
  if (typeof document === 'undefined') return 'es';
  const match = document.cookie.match(/menius_locale=(\w+)/);
  return match?.[1] === 'en' ? 'en' : 'es';
}

const t = {
  es: {
    text: 'Usamos cookies esenciales para que la plataforma funcione correctamente (autenticacion y sesion). No usamos cookies de rastreo ni publicidad.',
    link: 'Mas informacion',
    accept: 'Entendido',
  },
  en: {
    text: 'We use essential cookies to keep the platform working properly (authentication and session). We do not use tracking or advertising cookies.',
    link: 'More info',
    accept: 'Got it',
  },
};

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [locale, setLocale] = useState<'es' | 'en'>('es');
  const pathname = usePathname();

  useEffect(() => {
    if (!isMarketingPath(pathname)) return;
    setLocale(getLocale());
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  const s = t[locale];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in-up">
      <div className="max-w-xl mx-auto bg-brand-950 border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300 leading-relaxed">
            {s.text}{' '}
            <Link href="/cookies" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
              {s.link}
            </Link>
          </p>
        </div>
        <button
          onClick={accept}
          className="flex-shrink-0 px-5 py-2 rounded-xl bg-brand-500 text-brand-950 text-sm font-bold hover:bg-brand-400 transition-all"
        >
          {s.accept}
        </button>
      </div>
    </div>
  );
}
