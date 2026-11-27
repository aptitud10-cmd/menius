'use client';

import { useEffect, useState } from 'react';

// A store's 404 (old review link, mistyped dish URL, unknown store). The root
// one is MENIUS-branded, dark and Spanish unless a cookie says otherwise —
// a Buccaneer diner with a stale link landed on "Página no encontrada · Ver
// demo". Client component for the same reason as the root one: reading
// cookies()/headers() on the server would make every store route dynamic and
// kill the menu's ISR. The slug and language come from the browser instead.
const COPY = {
  en: {
    pageTitle: "This page isn't available",
    pageDesc: 'The link may be old or mistyped.',
    back: 'Back to the menu',
    storeTitle: "We couldn't find this menu",
    storeDesc: 'Check the link, or ask the restaurant for their menu link.',
  },
  es: {
    pageTitle: 'Esta página no está disponible',
    pageDesc: 'Puede que el enlace sea viejo o tenga un error.',
    back: 'Volver al menú',
    storeTitle: 'No encontramos este menú',
    storeDesc: 'Revisa el enlace o pídele al restaurante el link de su menú.',
  },
} as const;

export default function StoreNotFound() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [slug, setSlug] = useState<string | null>(null);
  const [isStoreRoot, setIsStoreRoot] = useState(true);

  useEffect(() => {
    const cookie = document.cookie.match(/(?:^|; )menius_locale=(en|es)(?:;|$)/)?.[1];
    setLang(cookie === 'es' || (!cookie && navigator.language.toLowerCase().startsWith('es')) ? 'es' : 'en');
    const parts = window.location.pathname.split('/').filter(Boolean);
    setSlug(parts[0] ?? null);
    // /buccaneer/review/<id> → the store exists, offer its menu.
    // /buccaneer-typo → the store itself is unknown; a "back" link would loop.
    setIsStoreRoot(parts.length <= 1);
  }, []);

  const c = COPY[lang];
  return (
    <main lang={lang} className="min-h-dvh bg-[#f5f5f3] flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-menu text-[38px] leading-[1.1] text-gray-900">
          {isStoreRoot ? c.storeTitle : c.pageTitle}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
          {isStoreRoot ? c.storeDesc : c.pageDesc}
        </p>
        {!isStoreRoot && slug && (
          <a
            href={`/${slug}`}
            className="mt-8 inline-flex h-12 items-center rounded-full bg-brand-500 px-6 text-[15px] font-semibold text-[#04241E] transition-colors hover:bg-[#04b096]"
          >
            {c.back}
          </a>
        )}
      </div>
    </main>
  );
}
