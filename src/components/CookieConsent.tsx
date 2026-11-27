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
  '/', '/blog', '/demo', '/faq', '/changelog', '/cookies', '/accessibility',
  '/privacy', '/terms', '/status', '/support', '/setup-profesional', '/ai-fotos',
]);

function isMarketingPath(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true;
  // Subrutas de marketing (ej. /blog/algun-post)
  return pathname.startsWith('/blog/');
}

// Mismo criterio que el middleware y la landing: inglés salvo que la cookie diga es.
function getLocale(): 'es' | 'en' {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(/menius_locale=(\w+)/);
  return match?.[1] === 'es' ? 'es' : 'en';
}

const t = {
  es: {
    text: 'Usamos cookies esenciales para que la plataforma funcione correctamente (autenticación y sesión). No usamos cookies de rastreo ni publicidad.',
    link: 'Más información',
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
  const [locale, setLocale] = useState<'es' | 'en'>('en');
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

  // Estilo claro de la landing: papel, tinta y el verde de la marca (#047A65).
  return (
    <div
      role="region"
      aria-label={locale === 'en' ? 'Cookie notice' : 'Aviso de cookies'}
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in-up"
    >
      <div className="max-w-xl mx-auto bg-[#FFFDF8] border border-[#DAD0BF] rounded-2xl shadow-[0_1px_2px_rgba(28,25,21,.06),0_18px_40px_-16px_rgba(28,25,21,.28)] p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <p className="flex-1 min-w-0 text-[15px] leading-relaxed text-[#4E473E]">
          {s.text}{' '}
          <Link href="/cookies" className="whitespace-nowrap font-semibold text-[#1C1915] underline underline-offset-4 decoration-[1.5px]">
            {s.link}
          </Link>
        </p>
        <button
          onClick={accept}
          className="flex-shrink-0 min-h-[44px] px-6 rounded-xl bg-[#047A65] text-white text-[15px] font-semibold hover:bg-[#035E4E] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#047A65]"
        >
          {s.accept}
        </button>
      </div>
    </div>
  );
}
