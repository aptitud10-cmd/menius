'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// Desde el checkout la política se abre en otra pestaña (?from=checkout), así
// el comensal no pierde lo que ya escribió. Su botón entonces dice "Back to
// checkout" y cierra esa pestaña; si el navegador no deja cerrarla, va al
// checkout (el carrito vive en localStorage). Se decide en el cliente para que
// la página siga siendo estática.
export function LegalBackButton({ slug, menuLabel, checkoutLabel }: { slug: string; menuLabel: string; checkoutLabel: string }) {
  const [fromCheckout, setFromCheckout] = useState(false);
  useEffect(() => {
    setFromCheckout(new URLSearchParams(window.location.search).get('from') === 'checkout');
  }, []);

  const cls = 'relative -ml-2 flex items-center gap-1 h-11 pr-2 pl-1 rounded-full text-[15px] font-medium text-[#111114] hover:bg-black/4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500';

  if (fromCheckout) {
    return (
      <button
        type="button"
        className={cls}
        onClick={() => {
          window.close();
          // Sigue abierta (pestaña no abierta por script, o el navegador no lo permite).
          window.setTimeout(() => { window.location.href = `/${slug}/checkout`; }, 250);
        }}
      >
        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        {checkoutLabel}
      </button>
    );
  }
  return (
    <Link href={`/${slug}`} className={cls}>
      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
      {menuLabel}
    </Link>
  );
}

// "Ver también" a la otra política sin perder el ?from=checkout: así su botón
// sigue diciendo "Back to checkout". replace no suma historial, y la pestaña
// abierta desde el checkout sigue pudiéndose cerrar con window.close().
export function LegalSeeAlsoLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const [fromCheckout, setFromCheckout] = useState(false);
  useEffect(() => {
    setFromCheckout(new URLSearchParams(window.location.search).get('from') === 'checkout');
  }, []);
  return (
    <Link href={fromCheckout ? `${href}?from=checkout` : href} replace={fromCheckout} className={className}>
      {children}
    </Link>
  );
}
