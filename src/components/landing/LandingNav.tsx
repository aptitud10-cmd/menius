'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = () => setOpen(false);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-[1140px] mx-auto px-5 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
            <span className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-[11px] font-black text-white">M</span>
            MENIUS
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <a href="#producto" className="text-sm text-gray-400 hover:text-white transition-colors">Producto</a>
            <a href="#precios" className="text-sm text-gray-400 hover:text-white transition-colors">Precios</a>
            <Link href="/r/demo" className="text-sm text-gray-400 hover:text-white transition-colors">Demo</Link>
            <Link href="/faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-colors">
              Empezar gratis
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div className="absolute top-0 right-0 w-[280px] h-full bg-[#0a0a0a] border-l border-white/[0.06] flex flex-col pt-16 animate-[slideInRight_0.2s_ease-out]">
            <div className="flex-1 px-6 py-6 space-y-1">
              <Link href="/signup" onClick={close} className="block w-full text-center py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm mb-4">
                Empezar gratis
              </Link>
              <Link href="/login" onClick={close} className="block w-full text-center py-3 rounded-xl border border-white/10 text-gray-300 font-medium text-sm mb-6">
                Iniciar sesión
              </Link>
              <div className="border-t border-white/[0.06] pt-4 space-y-1">
                <SheetLink href="#precios" onClick={close}>Precios</SheetLink>
                <SheetLink href="/r/demo" onClick={close}>Demo en vivo</SheetLink>
                <SheetLink href="/faq" onClick={close}>FAQ</SheetLink>
                <SheetLink href="/blog" onClick={close}>Blog</SheetLink>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SheetLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  const isAnchor = href.startsWith('#');
  const Component = isAnchor ? 'a' : Link;
  return (
    <Component href={href} onClick={onClick} className="block py-3 text-sm text-gray-400 hover:text-white transition-colors">
      {children}
    </Component>
  );
}
